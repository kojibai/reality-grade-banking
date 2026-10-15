import { writeExactByteBlocks } from "./exactByteBlocks.js";
import { ReceizLawfulDeliveryErrorV125, parseReceizLawfulDeliveryV125, unknownReceizLawfulDeliveryV125, type ReceizLawfulDeliveryV125 } from "./v125LawfulDelivery.js";
import { applicationId as validateReceizApplicationIdV124 } from "./v124Contracts.js";

export type ReceizV125LawfulActionProofObjectInput = Readonly<{
  exactBytes: Uint8Array;
  filename: string;
  mimeType: string;
}>;

export type ReceizV125LawfulActionClientOptions = Readonly<{
  baseUrl: string;
  applicationId: string;
  getAccessToken(): string | Promise<string>;
  fetch?: typeof globalThis.fetch;
}>;

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.byteLength; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.byteLength)));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const digest = (value: unknown) => typeof value === "string" && /^[0-9a-f]{64}$/u.test(value);
const text = (value: unknown) => typeof value === "string" && value.length > 0;
const integer = (value: unknown) => typeof value === "string" && /^(0|[1-9][0-9]*)$/u.test(value);
/** Checks response completeness only. A transport response is never proof authority.
 * Legacy bare successes are deliberately unsupported: they cannot prove completion. */
function validSuccess(result: Record<string, unknown>, delivery: ReceizLawfulDeliveryV125, operation: "law" | "action" | "value" | "block") {
  if (result.ok !== true) return false;
  if ("writesPerformed" in result || "writes" in result) return false;
  if (operation === "block") return result.status === "source-staged" && delivery.status === "recoverable"
    && delivery.sourceStorage === "retained" && delivery.domainAppend === "not-entered";
  if (delivery.status !== "verified-completion" || delivery.domainAppend !== "completed") return false;
  const value = record(result[operation === "law" ? "registration" : operation === "action" ? "receipt" : "valueHead"]);
  const authority = record(value?.authority);
  if (!value || authority?.strongerTruth !== "sealed-receiz-proof-object") return false;
  if (operation === "law") return value.schema === "receiz.lawful-action-law-registration.v125"
    && [value.lawId, value.enclosingArtifactId, value.custodianReceizId].every(text)
    && [value.lawDigest, value.enclosingArtifactDigest, value.registryDigest, value.registrationDigest].every(digest)
    && integer(value.admittedAtKai) && authority.registrationIsProofAuthority === false && authority.institutionSubjectToSameProofLaw === true;
  if (![value.enclosingArtifactId, value.currentOwnerReceizId].every(text)
    || ![value.enclosingArtifactDigest, value.lawDigest, value.registryDigest, value.membershipId, value.ownershipHistoryDigest].every(digest)
    || ![value.startKai, value.completionKai].every(integer)) return false;
  if (operation === "action") {
    const completion = record(result.completion);
    return value.schema === "receiz.lawful-action-admission.v125"
      && [value.proofDigest, value.lawArtifactDigest, value.admissionDigest, value.subjectHead].every(digest)
      && [value.actorReceizId, value.subjectId, value.idempotencyKey, value.genesisOwnerReceizId].every(text)
      && Array.isArray(value.causalParentHeads) && value.causalParentHeads.every(digest)
      && Number.isSafeInteger(value.ownershipAppendCount) && Number(value.ownershipAppendCount) >= 0
      && (value.priorAdmissionDigest === null || digest(value.priorAdmissionDigest))
      && authority.receiptIsProofAuthority === false && authority.writesPerformed === 1
      && digest(completion?.currentAdmissionDigest) && typeof completion?.receiptIsCurrentAtObservedHead === "boolean"
      && completion.receiptIsCurrentAtObservedHead === (completion.currentAdmissionDigest === value.admissionDigest);
  }
  return value.schema === "receiz.lawful-action-value-head.v125"
    && [value.actionAdmissionDigest, value.valueHeadDigest].every(digest)
    && [value.valuationKai, value.settlementPhiMicro].every(integer)
    && [value.universalValueLawId, value.projectorVersion].every(text)
    && (value.priorValueHeadDigest === null || digest(value.priorValueHeadDigest))
    && authority.valueHeadIsProofAuthority === false && authority.developerDeclaredAmount === false && authority.oneSpendableMembership === true;
}

export function createReceizV125LawfulActionClient(options: ReceizV125LawfulActionClientOptions) {
  return createReceizV125LawfulActionTransport({ ...options, applicationId: validateReceizApplicationIdV124(
    options.applicationId, "V125_LAWFUL_ACTION_APPLICATION_ID_REQUIRED") });
}

/** Shared SDK/MCP transport. A trusted MCP host may retain its existing token
 * application binding without a query hint; source admission remains unchanged. */
export function createReceizV125LawfulActionTransport(options: Omit<ReceizV125LawfulActionClientOptions, "applicationId"> & { applicationId?: string }) {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new TypeError("V125_LAWFUL_ACTION_FETCH_REQUIRED");
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const applicationId = options.applicationId === undefined ? undefined : validateReceizApplicationIdV124(
    options.applicationId, "V125_LAWFUL_ACTION_APPLICATION_ID_REQUIRED");

  type Operation = "law" | "action" | "value";
  type Context = { operation: Operation; retainedBlocks: number; uncertainBlocks: number; finalEntered: boolean };
  const context = (operation: Operation): Context => ({ operation, retainedBlocks: 0, uncertainBlocks: 0, finalEntered: false });
  function aggregate(state: Context, evidence: ReceizLawfulDeliveryV125): ReceizLawfulDeliveryV125 {
    const staged = state.retainedBlocks + state.uncertainBlocks > 0;
    return Object.freeze({ ...evidence,
      status: staged && evidence.status === "pre-write-rejection" ? "recoverable" : evidence.status,
      sourceStorage: state.retainedBlocks > 0 ? "retained" : state.uncertainBlocks > 0 ? "unknown" : evidence.sourceStorage,
      ...(staged ? { stagedSource: Object.freeze({ retainedBlocks: state.retainedBlocks, uncertainBlocks: state.uncertainBlocks }) } : {}),
    });
  }
  function unknown(state: Context, block = false): ReceizLawfulDeliveryV125 {
    return { ...unknownReceizLawfulDeliveryV125(state.operation === "value"),
      ...(!state.finalEntered || block ? { domainAppend: "not-entered" as const } : {}),
      ...(!state.finalEntered && !block ? { sourceStorage: "not-entered" as const } : {}),
    };
  }
  async function operation<T>(state: Context, run: () => Promise<T>): Promise<T> {
    try { return await run(); }
    catch (error) {
      const evidence = error instanceof ReceizLawfulDeliveryErrorV125 ? error.delivery : unknown(state);
      throw new ReceizLawfulDeliveryErrorV125(error instanceof ReceizLawfulDeliveryErrorV125 ? error.message : "V125_LAWFUL_ACTION_LOCAL_DELIVERY_UNKNOWN", aggregate(state, evidence));
    }
  }
  async function post(path: string, body: unknown, state: Context): Promise<Record<string, unknown>> {
    const block = path.endsWith("/blocks");
    const token = (await options.getAccessToken()).trim();
    if (!token) throw new TypeError("V125_LAWFUL_ACTION_ACCESS_TOKEN_REQUIRED");
    const encoded = JSON.stringify(body);
    let response: Response;
    if (block) state.uncertainBlocks++; else state.finalEntered = true;
    try { response = await fetchImpl(`${baseUrl}${path}${applicationId ? `?applicationId=${encodeURIComponent(applicationId)}` : ""}`, {
      method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: encoded,
    }); } catch { throw new ReceizLawfulDeliveryErrorV125("V125_LAWFUL_ACTION_HTTP_DELIVERY_UNKNOWN", unknown(state, block)); }
    let result: unknown;
    try { result = await response.json(); }
    catch { throw new ReceizLawfulDeliveryErrorV125(`V125_LAWFUL_ACTION_HTTP_${response.status}`, unknown(state, block)); }
    const object = record(result);
    const parsed = parseReceizLawfulDeliveryV125(object?.delivery);
    const evidence = parsed?.retry === (state.operation === "value" ? "do-not-rederive" : "same-source-and-key")
      && (!block || (parsed.domainAppend === "not-entered" && parsed.status !== "verified-completion"))
      && (state.operation !== "value" || parsed.sourceStorage === "not-entered") ? parsed : null;
    if (!response.ok || object?.ok === false) {
      if (block && evidence?.sourceStorage === "not-entered") state.uncertainBlocks--;
      if (block && evidence?.sourceStorage === "retained") { state.uncertainBlocks--; state.retainedBlocks++; }
      const candidate = typeof object?.code === "string" ? object.code : String(response.status);
      const safe = /^[A-Z][A-Z0-9_]{0,127}$/u.test(candidate) ? candidate : String(response.status);
      throw new ReceizLawfulDeliveryErrorV125(`V125_LAWFUL_ACTION_HTTP_${safe}`, evidence?.status !== "verified-completion" ? evidence ?? unknown(state, block) : unknown(state, block));
    }
    if (!object || !evidence || !validSuccess(object, evidence, block ? "block" : state.operation)) {
      throw new ReceizLawfulDeliveryErrorV125("V125_LAWFUL_ACTION_HTTP_DELIVERY_UNKNOWN", unknown(state, block));
    }
    if (block) { state.uncertainBlocks--; state.retainedBlocks++; }
    return { ...object, delivery: aggregate(state, evidence) };
  }

  async function proofObject(value: ReceizV125LawfulActionProofObjectInput, state: Context) {
    if (value.exactBytes.byteLength > 32 * 1024 * 1024) {
      const root = await writeExactByteBlocks(new Blob([value.exactBytes.slice().buffer]), async (reference, bytes) => {
        await post("/api/sdk/v1/lawful-actions/sources/blocks", { operation: state.operation, reference, exactBytesB64u: base64url(bytes) }, state);
      });
      return Object.freeze({ exactSource: { schema: "receiz.lawful-action-exact-source.v125", root }, filename: value.filename, mimeType: value.mimeType });
    }
    return Object.freeze({ exactBytesB64u: base64url(value.exactBytes), filename: value.filename, mimeType: value.mimeType });
  }

  return Object.freeze({
    async registerLaw(input: Readonly<{ proofObject: ReceizV125LawfulActionProofObjectInput; idempotencyKey: string }>) {
      const state = context("law");
      return operation(state, async () => post("/api/sdk/v1/lawful-actions/laws/register", { ...input, proofObject: await proofObject(input.proofObject, state) }, state));
    },
    async admit(input: Readonly<{
      lawDigest: string;
      proofObject: ReceizV125LawfulActionProofObjectInput;
      expectedPriorAdmissionDigest: string | null;
      idempotencyKey: string;
    }>) {
      const state = context("action");
      return operation(state, async () => post("/api/sdk/v1/lawful-actions/admit", { ...input, proofObject: await proofObject(input.proofObject, state) }, state));
    },
    deriveValueHead(input: Readonly<{ membershipId: string; expectedPriorValueHeadDigest: string | null }>) {
      const state = context("value");
      return operation(state, () => post("/api/sdk/v1/lawful-actions/value-head/derive", input, state));
    },
  });
}
