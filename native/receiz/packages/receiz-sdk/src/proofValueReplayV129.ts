import { createReceizArtifactAdmissionEngine } from "./artifactAdmission.js";
import { readRuntimeCustodiedReceizArtifactSnapshot, readRuntimeCustodiedReceizArtifactVerifierRoots, verifyReceizArtifact } from "./artifactVerification.js";
import { cloneAndFreezeExactValue } from "./exactClone.js";
import { base64UrlDecode, base64UrlEncode } from "./verifier/crypto.js";
import { receizCurrentPinnedSignatureV4Roots } from "./verifier/roots.js";
import { canonicalizeReceizV122, digestReceizCanonicalV122 } from "./v122Canonical.js";
import { SIGIL_VALUATION_ALGORITHM, SIGIL_VALUATION_POLICY_CHECKSUM } from "./sigilValuationCore.js";
import { readReceizProofValueBasisV129, sampleReceizProofValueV129, snapshotReceizProofValueInputV129, type ReceizProofValueOptionsV129,
  type ReceizProofValueResultV129, type ReceizProofValueSourceV129 } from "./proofValueV129.js";
import { exportReceizProofValueSaleRecoveryV129, verifyReceizProofValueSaleRecoveryV129, type ReceizProofValueSaleEvidenceV129 } from "./proofValueTransactionsV129.js";

export const RECEIZ_PROOF_VALUE_REPLAY_LIMITS_V129 = Object.freeze({ canonicalBytes: 64 * 1024 * 1024, saleRecoveries: 256 });
type SaleRecovery = Awaited<ReturnType<typeof exportReceizProofValueSaleRecoveryV129>>;
type ReplayOptions = Omit<ReceizProofValueOptionsV129, "source" | "sales" | "policy" | "expectedProofDigest" | "expectedHistoryHead">;
export type ReceizProofValueReplayV129 = Readonly<{
  schema: "receiz.proof-value-replay.v129";
  sdkVersion: "129.0.0";
  roots: Readonly<{ kind: "sdk-pinned-signature-v4"; digest: string; keyIds: readonly string[] }>;
  source: Readonly<{ exactBytesB64u: string; filename: string; mimeType: string; artifactDigest: string; payloadDigest: string;
    admissionProfile: "portable-state" | null; historyHead: string | null }>;
  policy: Readonly<{ algorithm: typeof SIGIL_VALUATION_ALGORITHM; checksum: string }>;
  options: ReplayOptions;
  saleRecoveries: readonly SaleRecovery[];
  valuationKaiUPulses: readonly string[];
  expectedProjectionDigests: readonly string[];
  replayDigest: string;
}>;
export type ReceizProofValueReplayVerificationV129 = Readonly<{
  status: "verified-replay";
  replayDigest: string;
  samples: readonly ReceizProofValueResultV129[];
  writesPerformed: 0;
  authority: Readonly<{ replayIsSettlementAuthority: false; strongerTruth: "sealed-receiz-proof-object" }>;
}> | Readonly<{ status: "invalid-replay"; code: string; writesPerformed: 0 }>;
const fail = (code: string): never => { throw new TypeError(`V129_REPLAY_${code}`); };
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const closed = (value: unknown, keys: readonly string[]): void => {
  if (!object(value) || Object.keys(value).sort().join(",") !== [...keys].sort().join(",")) fail("SHAPE_INVALID");
};
function boundedSnapshot<T>(value: T): T {
  const text = canonicalizeReceizV122(value);
  if (new TextEncoder().encode(text).byteLength > RECEIZ_PROOF_VALUE_REPLAY_LIMITS_V129.canonicalBytes) fail("LIMIT_EXCEEDED");
  return JSON.parse(text) as T;
}
async function rootsIdentity(roots: ReturnType<typeof receizCurrentPinnedSignatureV4Roots>) {
  const entries = [...roots].sort(([a], [b]) => a.localeCompare(b));
  return { kind: "sdk-pinned-signature-v4" as const, digest: await digestReceizCanonicalV122(entries), keyIds: entries.map(([kid]) => kid) };
}

/** Exports public carried source bytes and projections, never private identity
 * custody. It grants no publication, payment or settlement authority. */
export async function exportReceizProofValueReplayV129(input: ReceizProofValueOptionsV129 & Readonly<{ valuationKaiUPulses: readonly string[] }>): Promise<ReceizProofValueReplayV129> {
  input = snapshotReceizProofValueInputV129(input);
  const sampled = await sampleReceizProofValueV129(input);
  const basis = await readReceizProofValueBasisV129(input);
  if ("status" in basis) return fail(`VALUATION_UNAVAILABLE:${basis.code}`);
  const expectedProjectionDigests = sampled.samples.map(sample => sample.status === "available" ? sample.projectionDigest : fail("VALUATION_UNAVAILABLE"));
  const exact = await readRuntimeCustodiedReceizArtifactSnapshot(basis.verification);
  const roots = await rootsIdentity(readRuntimeCustodiedReceizArtifactVerifierRoots(basis.verification));
  const options: ReplayOptions = {};
  // Retain only public display options; never serialize actual runtime custody.
  for (const key of ["rarityPolicy", "marketReferenceRule", "usdBasis", "askingPricePhiMicro"] as const) {
    if (input[key] !== undefined) (options as Record<string, unknown>)[key] = boundedSnapshot(input[key]);
  }
  const saleRecoveries: SaleRecovery[] = [];
  for (const sale of input.sales ?? []) saleRecoveries.push(await exportReceizProofValueSaleRecoveryV129(sale));
  const body = boundedSnapshot({ schema: "receiz.proof-value-replay.v129" as const, sdkVersion: "129.0.0" as const, roots,
    source: { exactBytesB64u: base64UrlEncode(exact.bytes), filename: exact.filename, mimeType: exact.mimeType,
      artifactDigest: basis.proofDigest, payloadDigest: basis.verification.payloadDigest.value,
      admissionProfile: basis.admission ? "portable-state" as const : null, historyHead: basis.historyHead },
    policy: { algorithm: SIGIL_VALUATION_ALGORITHM, checksum: SIGIL_VALUATION_POLICY_CHECKSUM }, options,
    saleRecoveries, valuationKaiUPulses: [...input.valuationKaiUPulses], expectedProjectionDigests });
  return cloneAndFreezeExactValue({ ...body, replayDigest: await digestReceizCanonicalV122(body) });
}

/** Existing canonical verification runs before payload/history projection.
 * Carried root JSON identifies the SDK-pinned roots; it never overrides them. */
export async function verifyReceizProofValueReplayV129(input: unknown): Promise<ReceizProofValueReplayVerificationV129> {
  try {
    const replay = boundedSnapshot(input) as ReceizProofValueReplayV129;
    closed(replay, ["schema", "sdkVersion", "roots", "source", "policy", "options", "saleRecoveries", "valuationKaiUPulses", "expectedProjectionDigests", "replayDigest"]);
    if (replay.schema !== "receiz.proof-value-replay.v129" || replay.sdkVersion !== "129.0.0") fail("VERSION_UNSUPPORTED");
    closed(replay.source, ["exactBytesB64u", "filename", "mimeType", "artifactDigest", "payloadDigest", "admissionProfile", "historyHead"]);
    closed(replay.roots, ["kind", "digest", "keyIds"]);
    closed(replay.policy, ["algorithm", "checksum"]);
    if (replay.policy.algorithm !== SIGIL_VALUATION_ALGORITHM || replay.policy.checksum !== SIGIL_VALUATION_POLICY_CHECKSUM) fail("POLICY_MISMATCH");
    if (canonicalizeReceizV122(replay.roots) !== canonicalizeReceizV122(await rootsIdentity(receizCurrentPinnedSignatureV4Roots()))) fail("PINNED_ROOTS_MISMATCH");
    const { replayDigest, ...body } = replay;
    if (typeof replayDigest !== "string" || await digestReceizCanonicalV122(body) !== replayDigest) fail("DIGEST_MISMATCH");
    if (!Array.isArray(replay.saleRecoveries) || replay.saleRecoveries.length > RECEIZ_PROOF_VALUE_REPLAY_LIMITS_V129.saleRecoveries
      || !Array.isArray(replay.expectedProjectionDigests) || !Array.isArray(replay.valuationKaiUPulses)
      || replay.expectedProjectionDigests.length !== replay.valuationKaiUPulses.length) fail("SAMPLES_INVALID");
    if (!object(replay.options) || Object.keys(replay.options).some(key => !["rarityPolicy", "marketReferenceRule", "usdBasis", "askingPricePhiMicro"].includes(key))) fail("OPTIONS_INVALID");
    if (typeof replay.source.filename !== "string" || typeof replay.source.mimeType !== "string" || typeof replay.source.exactBytesB64u !== "string"
      || !/^[0-9a-f]{64}$/.test(replay.source.artifactDigest) || !/^[0-9a-f]{64}$/.test(replay.source.payloadDigest)
      || (replay.source.historyHead !== null && typeof replay.source.historyHead !== "string")) fail("SOURCE_INVALID");
    const bytes = base64UrlDecode(replay.source.exactBytesB64u);
    const verification = await verifyReceizArtifact(new File([new Uint8Array(bytes).buffer], replay.source.filename, { type: replay.source.mimeType }));
    if (verification.status !== "verified-artifact" || verification.artifactDigest.value !== replay.source.artifactDigest
      || verification.payloadDigest.value !== replay.source.payloadDigest) fail("SOURCE_NOT_VERIFIED");
    let source: ReceizProofValueSourceV129 = verification;
    if (replay.source.admissionProfile === "portable-state") {
      const admission = await createReceizArtifactAdmissionEngine()(verification, { profile: "portable-state" });
      if (admission.profile !== "portable-state" || (admission.verdict !== "bearer-recovery" && admission.verdict !== "foreign-owner")) return fail("HISTORY_NOT_ADMITTED");
      source = admission;
    } else if (replay.source.admissionProfile !== null) fail("ADMISSION_PROFILE_INVALID");
    const sales: ReceizProofValueSaleEvidenceV129[] = [];
    for (const sale of replay.saleRecoveries) sales.push(await verifyReceizProofValueSaleRecoveryV129(sale));
    const sampled = await sampleReceizProofValueV129({ source, policy: replay.policy,
      expectedProofDigest: replay.source.artifactDigest,
      ...(replay.source.historyHead === null ? {} : { expectedHistoryHead: replay.source.historyHead }),
      ...replay.options, ...(sales.length ? { sales } : {}), valuationKaiUPulses: replay.valuationKaiUPulses });
    const basis = await readReceizProofValueBasisV129({ source });
    if ("status" in basis || basis.historyHead !== replay.source.historyHead) fail("HISTORY_BINDING_MISMATCH");
    if (sampled.samples.some((sample, index) => sample.status !== "available" || sample.projectionDigest !== replay.expectedProjectionDigests[index])) fail("PROJECTION_MISMATCH");
    return cloneAndFreezeExactValue({ status: "verified-replay", replayDigest, samples: sampled.samples, writesPerformed: 0,
      authority: { replayIsSettlementAuthority: false, strongerTruth: "sealed-receiz-proof-object" } });
  } catch (error) {
    return Object.freeze({ status: "invalid-replay", code: error instanceof Error ? error.message : "V129_REPLAY_INVALID", writesPerformed: 0 });
  }
}
