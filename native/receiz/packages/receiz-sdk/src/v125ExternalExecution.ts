import { digestReceizAuthority } from "./authorityEncoding.js";
import { freeze } from "./v124Contracts.js";

const HEX64 = /^[0-9a-f]{64}$/u;
const KAI = /^(0|[1-9][0-9]*)$/u;
const TOKEN = /^[A-Za-z0-9:._-]{1,256}$/u;
const SAFE_MODEL_FIELDS = new Set(["operationId", "status", "amountMinor", "currency", "templateId"]);
const TERMINAL = new Set(["succeeded", "failed", "canceled", "expired"]);
const NONTERMINAL = new Set(["pending", "processing", "queued"]);
const UNRESOLVED = new Set([...NONTERMINAL, "unknown", "conflicting"]);

export type ReceizExternalExecutionKindV125 = "payment" | "refund" | "notification" | "external-action";
export type ReceizExternalExecutionTerminalStatusV125 = "succeeded" | "failed" | "canceled" | "expired";

export type ReceizExternalExecutionProfileV125 = Readonly<{
  schema: "receiz.external-execution.profile.v125";
  profileId: string;
  operationKind: ReceizExternalExecutionKindV125;
  requestSchema: string;
  providerEvidenceSchema: string;
  requiredProofHeads: readonly string[];
  terminalMapping: Readonly<Record<string, ReceizExternalExecutionTerminalStatusV125>>;
  privacy: Readonly<{ modelVisibleFields: readonly string[] }>;
  authority: Readonly<{ providerIsAuthority: false; strongerTruth: "sealed-receiz-proof-object" }>;
}>;

export type ReceizExternalExecutionPlanV125 = Readonly<{
  schema: "receiz.external-execution.plan.v125";
  operationId: string;
  profileId: string;
  operationKind: ReceizExternalExecutionKindV125;
  requestDigest: string;
  proofHeads: Readonly<Record<string, string>>;
  idempotencyKey: string;
  planIdentity: string;
  confirmationDigest: string;
  confirmationRequired: true;
  writesPerformed: 0;
  authority: Readonly<{
    planIsOutcome: false;
    providerIsAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizExternalExecutionOutcomeV125 = Readonly<{
  schema: "receiz.external-execution.outcome.v125";
  operationId: string;
  profileId: string;
  planIdentity: string;
  requestDigest: string;
  proofHeads: Readonly<Record<string, string>>;
  providerEvidenceDigest: string;
  terminalStatus: ReceizExternalExecutionTerminalStatusV125;
  resolvedKai: string;
  outcomeDigest: string;
  durableHandle: string;
  authority: Readonly<{
    providerIsAuthority: false;
    receiptIsAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizExternalExecutionResolutionV125 =
  | Readonly<{ status: "committed"; outcome: ReceizExternalExecutionOutcomeV125; writesPerformed: 1 }>
  | Readonly<{ status: "pending"; code: "V125_EXTERNAL_EXECUTION_PENDING"; writesPerformed: 0 }>
  | Readonly<{ status: "unknown"; code: "V125_EXTERNAL_EXECUTION_UNKNOWN"; writesPerformed: 0 }>;

export type ReceizExternalExecutionProviderRequestV125 = Readonly<{
  operationId: string;
  planIdentity: string;
  requestDigest: string;
  idempotencyKey: string;
}>;

export type ReceizExternalExecutionProviderV125 = (
  request: ReceizExternalExecutionProviderRequestV125,
) => Promise<Readonly<{ status: string; evidence: unknown }>>;

export type ReceizExternalExecutionStoreV125 = Readonly<{
  load(planIdentity: string): Promise<ReceizExternalExecutionOutcomeV125 | null>;
  claimIdempotency(idempotencyKey: string, planIdentity: string): Promise<string | null>;
  saveIfAbsent(outcome: ReceizExternalExecutionOutcomeV125): Promise<ReceizExternalExecutionOutcomeV125>;
}>;

export class ReceizExternalExecutionZeroWriteErrorV125 extends TypeError {
  readonly writesPerformed = 0 as const;
  constructor(readonly code: string) {
    super(code);
    this.name = "ReceizExternalExecutionZeroWriteErrorV125";
  }
}

function fail(code: string): never {
  throw new ReceizExternalExecutionZeroWriteErrorV125(code);
}

function token(value: unknown, code: string): string {
  if (typeof value !== "string" || !TOKEN.test(value) || value.normalize("NFC") !== value) fail(code);
  return value;
}

function digest(value: unknown, code: string): string {
  if (typeof value !== "string" || !HEX64.test(value)) fail(code);
  return value;
}

function authorityPlan() {
  return freeze({
    planIsOutcome: false as const,
    providerIsAuthority: false as const,
    strongerTruth: "sealed-receiz-proof-object" as const,
  });
}

function authorityOutcome() {
  return freeze({
    providerIsAuthority: false as const,
    receiptIsAuthority: false as const,
    strongerTruth: "sealed-receiz-proof-object" as const,
  });
}

export function createReceizExternalExecutionProfileV125(input: Readonly<{
  profileId: string;
  operationKind: ReceizExternalExecutionKindV125;
  requestSchema: string;
  providerEvidenceSchema: string;
  requiredProofHeads: readonly string[];
  terminalMapping: Readonly<Record<string, ReceizExternalExecutionTerminalStatusV125>>;
  privacy: Readonly<{ modelVisibleFields: readonly string[] }>;
}>): ReceizExternalExecutionProfileV125 {
  if (!["payment", "refund", "notification", "external-action"].includes(input.operationKind)) {
    fail("V125_EXTERNAL_EXECUTION_KIND_INVALID");
  }
  const requiredProofHeads = [...input.requiredProofHeads].map((value) => token(value, "V125_EXTERNAL_EXECUTION_PROOF_HEAD_INVALID")).sort();
  if (requiredProofHeads.length < 1 || new Set(requiredProofHeads).size !== requiredProofHeads.length) {
    fail("V125_EXTERNAL_EXECUTION_PROOF_HEAD_INVALID");
  }
  const terminalMappingEntries = Object.entries(input.terminalMapping).sort(([left], [right]) => left.localeCompare(right));
  if (terminalMappingEntries.length < 4
    || terminalMappingEntries.some(([providerStatus, status]) => !TOKEN.test(providerStatus)
      || UNRESOLVED.has(providerStatus) || !TERMINAL.has(status))
    || new Set(terminalMappingEntries.map(([, status]) => status)).size !== 4) {
    fail("V125_EXTERNAL_EXECUTION_TERMINAL_MAPPING_INVALID");
  }
  const modelVisibleFields = [...input.privacy.modelVisibleFields].map((value) => token(value, "V125_EXTERNAL_EXECUTION_PRIVACY_INVALID"));
  if (new Set(modelVisibleFields).size !== modelVisibleFields.length
    || modelVisibleFields.some((field) => !SAFE_MODEL_FIELDS.has(field))) {
    fail("V125_EXTERNAL_EXECUTION_PRIVACY_INVALID");
  }
  return freeze({
    schema: "receiz.external-execution.profile.v125" as const,
    profileId: token(input.profileId, "V125_EXTERNAL_EXECUTION_PROFILE_INVALID"),
    operationKind: input.operationKind,
    requestSchema: token(input.requestSchema, "V125_EXTERNAL_EXECUTION_REQUEST_SCHEMA_INVALID"),
    providerEvidenceSchema: token(input.providerEvidenceSchema, "V125_EXTERNAL_EXECUTION_EVIDENCE_SCHEMA_INVALID"),
    requiredProofHeads: freeze(requiredProofHeads),
    terminalMapping: freeze(Object.fromEntries(terminalMappingEntries)),
    privacy: freeze({ modelVisibleFields: freeze(modelVisibleFields) }),
    authority: freeze({ providerIsAuthority: false as const, strongerTruth: "sealed-receiz-proof-object" as const }),
  });
}

function exactProofHeads(
  proofHeads: Readonly<Record<string, string>>,
  profile: ReceizExternalExecutionProfileV125,
): Readonly<Record<string, string>> {
  const keys = Object.keys(proofHeads).sort();
  if (keys.length !== profile.requiredProofHeads.length
    || keys.some((key, index) => key !== profile.requiredProofHeads[index])) {
    fail("V125_EXTERNAL_EXECUTION_PROOF_HEADS_MISMATCH");
  }
  return freeze(Object.fromEntries(keys.map((key) => [key, digest(proofHeads[key], "V125_EXTERNAL_EXECUTION_PROOF_HEAD_INVALID")])));
}

function rejectCallerResult(request: unknown): void {
  if (request && typeof request === "object" && !Array.isArray(request)
    && ["result", "outcome", "terminalStatus", "providerEvidence"].some((key) => Object.prototype.hasOwnProperty.call(request, key))) {
    fail("V125_EXTERNAL_EXECUTION_CALLER_RESULT_FORBIDDEN");
  }
}

function planBasis(plan: Omit<ReceizExternalExecutionPlanV125, "schema" | "planIdentity" | "confirmationDigest" | "confirmationRequired" | "writesPerformed" | "authority">) {
  return freeze({
    operationId: token(plan.operationId, "V125_EXTERNAL_EXECUTION_OPERATION_INVALID"),
    profileId: token(plan.profileId, "V125_EXTERNAL_EXECUTION_PROFILE_INVALID"),
    operationKind: plan.operationKind,
    requestDigest: digest(plan.requestDigest, "V125_EXTERNAL_EXECUTION_REQUEST_DIGEST_INVALID"),
    proofHeads: freeze({ ...plan.proofHeads }),
    idempotencyKey: token(plan.idempotencyKey, "V125_EXTERNAL_EXECUTION_IDEMPOTENCY_INVALID"),
  });
}

export async function planReceizExternalExecutionV125(input: Readonly<{
  profile: ReceizExternalExecutionProfileV125;
  operationId: string;
  request: unknown;
  proofHeads: Readonly<Record<string, string>>;
  idempotencyKey: string;
}>): Promise<ReceizExternalExecutionPlanV125> {
  rejectCallerResult(input.request);
  const basis = planBasis({
    operationId: input.operationId,
    profileId: input.profile.profileId,
    operationKind: input.profile.operationKind,
    requestDigest: await digestReceizAuthority("operation", input.profile.requestSchema, input.request),
    proofHeads: exactProofHeads(input.proofHeads, input.profile),
    idempotencyKey: input.idempotencyKey,
  });
  const planIdentity = await digestReceizAuthority("plan", "receiz.external-execution.plan.v125", basis);
  return freeze({
    schema: "receiz.external-execution.plan.v125" as const,
    ...basis,
    planIdentity,
    confirmationDigest: await digestReceizAuthority("confirmation", "receiz.external-execution.confirmation.v125", {
      planIdentity,
      operationId: basis.operationId,
      requestDigest: basis.requestDigest,
      proofHeads: basis.proofHeads,
    }),
    confirmationRequired: true as const,
    writesPerformed: 0 as const,
    authority: authorityPlan(),
  });
}

export async function verifyReceizExternalExecutionPlanV125(input: Readonly<{
  profile: ReceizExternalExecutionProfileV125;
  plan: ReceizExternalExecutionPlanV125;
  request: unknown;
}>): Promise<boolean> {
  try {
    if (input.plan.schema !== "receiz.external-execution.plan.v125"
      || input.plan.profileId !== input.profile.profileId
      || input.plan.operationKind !== input.profile.operationKind
      || input.plan.confirmationRequired !== true || input.plan.writesPerformed !== 0
      || input.plan.authority.planIsOutcome !== false || input.plan.authority.providerIsAuthority !== false) return false;
    rejectCallerResult(input.request);
    const expected = await planReceizExternalExecutionV125({
      profile: input.profile,
      operationId: input.plan.operationId,
      request: input.request,
      proofHeads: input.plan.proofHeads,
      idempotencyKey: input.plan.idempotencyKey,
    });
    return input.plan.planIdentity === expected.planIdentity
      && input.plan.confirmationDigest === expected.confirmationDigest;
  } catch {
    return false;
  }
}

function memoryStore(): ReceizExternalExecutionStoreV125 {
  const outcomes = new Map<string, ReceizExternalExecutionOutcomeV125>();
  const idempotency = new Map<string, string>();
  return freeze({
    async load(planIdentity) { return outcomes.get(planIdentity) ?? null; },
    async claimIdempotency(idempotencyKey, planIdentity) {
      const prior = idempotency.get(idempotencyKey) ?? null;
      if (!prior) idempotency.set(idempotencyKey, planIdentity);
      return prior;
    },
    async saveIfAbsent(outcome) {
      const prior = outcomes.get(outcome.planIdentity);
      if (prior) return prior;
      outcomes.set(outcome.planIdentity, outcome);
      return outcome;
    },
  });
}

async function makeOutcome(input: Readonly<{
  profile: ReceizExternalExecutionProfileV125;
  plan: ReceizExternalExecutionPlanV125;
  providerEvidence: unknown;
  terminalStatus: ReceizExternalExecutionTerminalStatusV125;
  resolvedKai: string;
}>): Promise<ReceizExternalExecutionOutcomeV125> {
  if (!KAI.test(input.resolvedKai)) fail("V125_EXTERNAL_EXECUTION_KAI_INVALID");
  const providerEvidenceDigest = await digestReceizAuthority("receipt", input.profile.providerEvidenceSchema, input.providerEvidence);
  const basis = freeze({
    operationId: input.plan.operationId,
    profileId: input.plan.profileId,
    planIdentity: input.plan.planIdentity,
    requestDigest: input.plan.requestDigest,
    proofHeads: input.plan.proofHeads,
    providerEvidenceDigest,
    terminalStatus: input.terminalStatus,
    resolvedKai: input.resolvedKai,
  });
  const outcomeDigest = await digestReceizAuthority("receipt", "receiz.external-execution.outcome.v125", basis);
  return freeze({
    schema: "receiz.external-execution.outcome.v125" as const,
    ...basis,
    outcomeDigest,
    durableHandle: await digestReceizAuthority("history", "receiz.external-execution.durable-handle.v125", {
      planIdentity: input.plan.planIdentity,
      outcomeDigest,
    }),
    authority: authorityOutcome(),
  });
}

export async function verifyReceizExternalExecutionOutcomeV125(input: Readonly<{
  profile: ReceizExternalExecutionProfileV125;
  plan: ReceizExternalExecutionPlanV125;
  outcome: ReceizExternalExecutionOutcomeV125;
}>): Promise<boolean> {
  try {
    const outcome = input.outcome;
    if (outcome.schema !== "receiz.external-execution.outcome.v125"
      || outcome.operationId !== input.plan.operationId || outcome.profileId !== input.profile.profileId
      || outcome.planIdentity !== input.plan.planIdentity || outcome.requestDigest !== input.plan.requestDigest
      || !TERMINAL.has(outcome.terminalStatus) || !KAI.test(outcome.resolvedKai)
      || outcome.authority.providerIsAuthority !== false || outcome.authority.receiptIsAuthority !== false) return false;
    const basis = freeze({
      operationId: outcome.operationId, profileId: outcome.profileId, planIdentity: outcome.planIdentity,
      requestDigest: outcome.requestDigest, proofHeads: outcome.proofHeads,
      providerEvidenceDigest: digest(outcome.providerEvidenceDigest, "V125_EXTERNAL_EXECUTION_EVIDENCE_DIGEST_INVALID"),
      terminalStatus: outcome.terminalStatus, resolvedKai: outcome.resolvedKai,
    });
    const expectedDigest = await digestReceizAuthority("receipt", "receiz.external-execution.outcome.v125", basis);
    const expectedHandle = await digestReceizAuthority("history", "receiz.external-execution.durable-handle.v125", {
      planIdentity: input.plan.planIdentity, outcomeDigest: expectedDigest,
    });
    return outcome.outcomeDigest === expectedDigest && outcome.durableHandle === expectedHandle
      && JSON.stringify(outcome.proofHeads) === JSON.stringify(input.plan.proofHeads);
  } catch {
    return false;
  }
}

export function createReceizExternalExecutionRuntimeV125(
  input: Readonly<{ store?: ReceizExternalExecutionStoreV125 }> = {},
) {
  const store = input.store ?? memoryStore();
  const inFlight = new Map<string, Promise<ReceizExternalExecutionResolutionV125>>();
  const execute = async (request: Readonly<{
    profile: ReceizExternalExecutionProfileV125;
    plan: ReceizExternalExecutionPlanV125;
    request: unknown;
    confirmationDigest: string;
    resolvedKai: string;
    provider: ReceizExternalExecutionProviderV125;
  }>): Promise<ReceizExternalExecutionResolutionV125> => {
    if (!await verifyReceizExternalExecutionPlanV125(request)
      || request.confirmationDigest !== request.plan.confirmationDigest) {
      fail("V125_EXTERNAL_EXECUTION_CONFIRMATION_INVALID");
    }
    if (!KAI.test(request.resolvedKai)) fail("V125_EXTERNAL_EXECUTION_KAI_INVALID");
    const priorIdempotency = await store.claimIdempotency(request.plan.idempotencyKey, request.plan.planIdentity);
    if (priorIdempotency && priorIdempotency !== request.plan.planIdentity) fail("V125_EXTERNAL_EXECUTION_IDEMPOTENCY_CONFLICT");
    const committed = await store.load(request.plan.planIdentity);
    if (committed) return freeze({ status: "committed" as const, outcome: committed, writesPerformed: 1 as const });
    const pending = inFlight.get(request.plan.planIdentity);
    if (pending) return pending;
    const operation = (async () => {
      const provider = await request.provider(freeze({
        operationId: request.plan.operationId,
        planIdentity: request.plan.planIdentity,
        requestDigest: request.plan.requestDigest,
        idempotencyKey: request.plan.idempotencyKey,
      }));
      const terminalStatus = Object.hasOwn(request.profile.terminalMapping, provider.status) ? request.profile.terminalMapping[provider.status] : undefined;
      if (!terminalStatus) {
        return NONTERMINAL.has(provider.status)
          ? freeze({ status: "pending" as const, code: "V125_EXTERNAL_EXECUTION_PENDING" as const, writesPerformed: 0 as const })
          : freeze({ status: "unknown" as const, code: "V125_EXTERNAL_EXECUTION_UNKNOWN" as const, writesPerformed: 0 as const });
      }
      const outcome = await makeOutcome({
        profile: request.profile, plan: request.plan, providerEvidence: provider.evidence,
        terminalStatus, resolvedKai: request.resolvedKai,
      });
      const committedOutcome = await store.saveIfAbsent(outcome);
      return freeze({ status: "committed" as const, outcome: committedOutcome, writesPerformed: 1 as const });
    })();
    inFlight.set(request.plan.planIdentity, operation);
    try { return await operation; }
    finally { inFlight.delete(request.plan.planIdentity); }
  };
  return freeze({
    execute,
    async recover(input: Readonly<{ planIdentity: string; durableHandle: string }>) {
      const outcome = await store.load(digest(input.planIdentity, "V125_EXTERNAL_EXECUTION_PLAN_ID_INVALID"));
      if (!outcome || outcome.durableHandle !== digest(input.durableHandle, "V125_EXTERNAL_EXECUTION_HANDLE_INVALID")) {
        return freeze({ status: "unknown" as const, code: "V125_EXTERNAL_EXECUTION_UNKNOWN" as const, writesPerformed: 0 as const });
      }
      return freeze({ status: "committed" as const, outcome, writesPerformed: 0 as const });
    },
  });
}

export const RECEIZ_PAYMENT_EXECUTION_PROFILE_V125 = createReceizExternalExecutionProfileV125({
  profileId: "receiz.payment.standard.v125",
  operationKind: "payment",
  requestSchema: "receiz.external-execution.payment-request.v125",
  providerEvidenceSchema: "receiz.external-execution.payment-evidence.v125",
  requiredProofHeads: ["order", "payer"],
  terminalMapping: { paid: "succeeded", failed: "failed", canceled: "canceled", expired: "expired" },
  privacy: { modelVisibleFields: ["operationId", "status", "amountMinor", "currency"] },
});

export const RECEIZ_REFUND_EXECUTION_PROFILE_V125 = createReceizExternalExecutionProfileV125({
  profileId: "receiz.refund.standard.v125",
  operationKind: "refund",
  requestSchema: "receiz.external-execution.refund-request.v125",
  providerEvidenceSchema: "receiz.external-execution.refund-evidence.v125",
  requiredProofHeads: ["payment", "refund-request"],
  terminalMapping: { refunded: "succeeded", failed: "failed", canceled: "canceled", expired: "expired" },
  privacy: { modelVisibleFields: ["operationId", "status", "amountMinor", "currency"] },
});

export const RECEIZ_NOTIFICATION_EXECUTION_PROFILE_V125 = createReceizExternalExecutionProfileV125({
  profileId: "receiz.notification.standard.v125",
  operationKind: "notification",
  requestSchema: "receiz.external-execution.notification-request.v125",
  providerEvidenceSchema: "receiz.external-execution.notification-evidence.v125",
  requiredProofHeads: ["recipient", "template"],
  terminalMapping: { delivered: "succeeded", failed: "failed", canceled: "canceled", expired: "expired" },
  privacy: { modelVisibleFields: ["operationId", "status", "templateId"] },
});
