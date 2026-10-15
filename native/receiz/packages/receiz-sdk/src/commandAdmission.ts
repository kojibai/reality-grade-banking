import {
  createReceizInMemoryAdmissionStore,
  type ReceizAdmissionAggregateSeed,
  type ReceizAdmissionStore,
  type ReceizAdmissionStoreInspection,
} from "./admissionStore.js";
import {
  isReceizVerifiedCapability,
  type ReceizCapabilityContext,
  type ReceizSignedCapability,
  type ReceizVerifiedCapability,
} from "./capabilityAuthority.js";
import {
  canonicalizeReceizConstitution,
  digestReceizConstitution,
  evaluateReceizLawSet,
  type ReceizConstitutionJson,
  type ReceizConstitutionRegistry,
} from "./constitution.js";

export type ReceizAuthorityProfile = "artifact-local" | "global-shared" | "projection-only" | "simulation-only";
export type ReceizClaimedCommand = Readonly<{
  schema: "receiz.command.v1"; commandId: string; command: string; domain: string; aggregateId: string;
  authorityProfile: ReceizAuthorityProfile; actor: Readonly<{ id: string }>; tenant: Readonly<{ id: string }> | null;
  capability: ReceizSignedCapability; expectedRevision: number; causalParents: readonly string[];
  registryDigest: string; idempotencyKey: string; input: ReceizConstitutionJson;
  maximumEffects: Readonly<Record<string, number>>;
}>;

export type ReceizAdmissionReceipt = Readonly<{
  schema: "receiz.admission.receipt.v1"; commandId: string; commandDigest: string; registryDigest: string;
  capabilityDigest: string; authorityProfile: ReceizAuthorityProfile; actorId: string; tenantId: string | null; aggregateId: string;
  revision: number; priorHeadDigest: string | null; headDigest: string; events: readonly ReceizConstitutionJson[];
  effects: Readonly<Record<string, number>>; lawDecisionDigest: string;
  authority: Readonly<{ admissionReceiptIsProofAuthority: false; strongerTruth: "sealed-receiz-proof-object" }>;
}>;

const admittedReceipts = new WeakSet<object>();
const PROFILES = new Set<ReceizAuthorityProfile>(["artifact-local", "global-shared", "projection-only", "simulation-only"]);
const ROOT_KEYS = new Set(["schema", "commandId", "command", "domain", "aggregateId", "authorityProfile", "actor", "tenant", "capability", "expectedRevision", "causalParents", "registryDigest", "idempotencyKey", "input", "maximumEffects"]);

function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
function text(value: unknown): value is string { return typeof value === "string" && value.length > 0; }
function signedCapabilityClaim(value: unknown): value is ReceizSignedCapability {
  return record(value)
    && Object.keys(value).every((key) => ["schema", "payload", "alg", "signatureB64u"].includes(key))
    && value.schema === "receiz.signed-capability.v112"
    && (value.alg === "Ed25519" || value.alg === "P-256")
    && text(value.signatureB64u)
    && record(value.payload)
    && value.payload.schema === "receiz.capability.v112";
}

export function parseReceizClaimedCommand(value: unknown):
  | Readonly<{ ok: true; command: ReceizClaimedCommand }>
  | Readonly<{ ok: false; status: "parse-rejection"; code: "COMMAND_INVALID"; issues: readonly string[] }> {
  const issues: string[] = [];
  if (!record(value)) return { ok: false, status: "parse-rejection", code: "COMMAND_INVALID", issues: ["command_object_required"] };
  for (const key of Object.keys(value)) if (!ROOT_KEYS.has(key)) issues.push(`unknown_key:${key}`);
  if (value.schema !== "receiz.command.v1") issues.push("invalid_schema");
  for (const key of ["commandId", "command", "domain", "aggregateId", "registryDigest", "idempotencyKey"]) if (!text(value[key])) issues.push(`${key}_required`);
  if (!PROFILES.has(value.authorityProfile as ReceizAuthorityProfile)) issues.push("authority_profile_invalid");
  if (!record(value.actor) || !text(value.actor.id)) issues.push("actor_required");
  if (value.tenant !== null && (!record(value.tenant) || !text(value.tenant.id))) issues.push("tenant_invalid");
  if (value.authorityProfile === "global-shared" && value.tenant === null) issues.push("tenant_required_for_global_authority");
  if (!signedCapabilityClaim(value.capability)) issues.push("signed_capability_required");
  if (!Number.isInteger(value.expectedRevision) || Number(value.expectedRevision) < 0) issues.push("expected_revision_invalid");
  if (!Array.isArray(value.causalParents) || value.causalParents.some((item) => !text(item))) issues.push("causal_parents_invalid");
  if (!record(value.maximumEffects) || Object.values(value.maximumEffects).some((item) => typeof item !== "number" || !Number.isFinite(item) || item < 0)) issues.push("maximum_effects_invalid");
  try { canonicalizeReceizConstitution(value.input); canonicalizeReceizConstitution(value.capability); } catch { issues.push("input_noncanonical"); }
  return issues.length ? { ok: false, status: "parse-rejection", code: "COMMAND_INVALID", issues: issues.sort() } : { ok: true, command: value as unknown as ReceizClaimedCommand };
}

export function isReceizAdmittedReceipt(value: unknown): value is ReceizAdmissionReceipt {
  return record(value) && admittedReceipts.has(value);
}

type Projection = {
  proposedState: ReceizConstitutionJson;
  events: readonly ReceizConstitutionJson[];
  effects: Readonly<Record<string, number>>;
  outboxIntents?: readonly ReceizConstitutionJson[];
};

type CapabilityVerification =
  | Readonly<{ ok: true; capability: ReceizVerifiedCapability }>
  | Readonly<{ ok: false; code: string }>;

export type ReceizAdmissionResult =
  | Readonly<{ schema: "receiz.admission.result.v1"; ok: false; status: "parse-rejection"; code: "COMMAND_INVALID"; issues: readonly string[] }>
  | Readonly<{ schema: "receiz.admission.result.v1"; status: "policy-denial"; code: string; denials: readonly unknown[] }>
  | Readonly<{ schema: "receiz.admission.result.v1"; status: "conflict"; code: string; expectedRevision?: number | undefined; expectedHead?: string | null | undefined }>
  | Readonly<{ schema: "receiz.admission.result.v1"; status: "admitted"; receipt: ReceizAdmissionReceipt }>;

function receiptFromJson(value: ReceizConstitutionJson): ReceizAdmissionReceipt | null {
  if (!record(value) || value.schema !== "receiz.admission.receipt.v1") return null;
  return value as unknown as ReceizAdmissionReceipt;
}

export function createReceizAdmissionEngine(options: {
  registry: ReceizConstitutionRegistry;
  capabilityVerifier: (capability: ReceizSignedCapability, context: ReceizCapabilityContext) => CapabilityVerification | Promise<CapabilityVerification>;
  consequenceProjector: (input: { command: ReceizClaimedCommand; previous: Record<string, ReceizConstitutionJson> }) => Projection | Promise<Projection>;
  store?: ReceizAdmissionStore;
}) {
  const store = options.store ?? createReceizInMemoryAdmissionStore();

  async function execute(value: unknown): Promise<ReceizAdmissionResult> {
    const parsed = parseReceizClaimedCommand(value);
    if (!parsed.ok) return { schema: "receiz.admission.result.v1", ...parsed };
    const command = parsed.command;
    const registryDigest = await digestReceizConstitution(options.registry);
    const deny = (code: string, denials: unknown[] = []) => ({ schema: "receiz.admission.result.v1" as const, status: "policy-denial" as const, code, denials });
    if (command.registryDigest !== registryDigest || command.capability.payload.registryDigest !== registryDigest) return deny("REGISTRY_DIGEST_MISMATCH");
    const capabilityResult = await options.capabilityVerifier(command.capability, {
      actorId: command.actor.id,
      tenantId: command.tenant?.id ?? null,
      authorityProfile: command.authorityProfile,
      operation: command.command,
      resourceId: command.aggregateId,
      registryDigest,
      maximumEffects: command.maximumEffects,
      operationConstraints: command.capability.payload.operationConstraints,
    });
    if (!record(capabilityResult) || capabilityResult.ok !== true || !isReceizVerifiedCapability(capabilityResult.capability)) {
      return deny(record(capabilityResult) && capabilityResult.ok === false && text(capabilityResult.code) ? capabilityResult.code : "CAPABILITY_DENIED");
    }
    const verifiedCapability = capabilityResult.capability;
    if (verifiedCapability.payload.offline && command.authorityProfile === "global-shared") return deny("OFFLINE_GLOBAL_AUTHORITY_FORBIDDEN");
    const commandDigest = await digestReceizConstitution({ ...command, capability: command.capability.payload } as unknown as ReceizConstitutionJson);
    const duplicate = await store.readIdempotency(command.idempotencyKey);
    if (duplicate) {
      if (duplicate.commandDigest !== commandDigest) return { schema: "receiz.admission.result.v1", status: "conflict", code: "IDEMPOTENCY_CONFLICT" };
      const receipt = receiptFromJson(duplicate.receipt);
      if (!receipt) return deny("ADMISSION_STORE_INVALID");
      admittedReceipts.add(receipt);
      return { schema: "receiz.admission.result.v1", status: "admitted", receipt };
    }
    const current = await store.readAggregate(command.aggregateId) ?? { revision: 0, headDigest: null, state: {} };
    if (current.revision !== command.expectedRevision) return { schema: "receiz.admission.result.v1", status: "conflict", code: "EXPECTED_REVISION_MISMATCH", expectedRevision: current.revision };
    if (current.headDigest !== null && !command.causalParents.includes(current.headDigest)) return { schema: "receiz.admission.result.v1", status: "conflict", code: "CAUSAL_PARENT_MISMATCH", expectedHead: current.headDigest };
    const projection = await options.consequenceProjector({ command, previous: record(current.state) ? current.state as Record<string, ReceizConstitutionJson> : {} });
    canonicalizeReceizConstitution(projection.proposedState); canonicalizeReceizConstitution(projection.events); canonicalizeReceizConstitution(projection.outboxIntents ?? []);
    for (const [effect, amount] of Object.entries(projection.effects)) if (amount > (command.maximumEffects[effect] ?? 0) || amount > (verifiedCapability.payload.maximumEffects[effect] ?? 0)) return deny("MAXIMUM_EFFECT_EXCEEDED");
    const lawDecision = await evaluateReceizLawSet({ registry: options.registry, phase: "command", context: { previous: current.state, proposed: projection.proposedState, tenant: command.tenant, actor: command.actor, asset: { id: command.aggregateId } }, budget: 4096 });
    if (!lawDecision.allowed) return deny("CONSTITUTION_DENIED", lawDecision.denials);
    const revision = current.revision + 1;
    const lawDecisionDigest = await digestReceizConstitution(lawDecision);
    const receiptBasis = { commandDigest, registryDigest, capabilityDigest: verifiedCapability.digest, revision, priorHeadDigest: current.headDigest, events: projection.events, effects: projection.effects, lawDecisionDigest };
    const receipt: ReceizAdmissionReceipt = {
      schema: "receiz.admission.receipt.v1", commandId: command.commandId, commandDigest, registryDigest,
      capabilityDigest: verifiedCapability.digest, authorityProfile: command.authorityProfile, actorId: command.actor.id,
      tenantId: command.tenant?.id ?? null, aggregateId: command.aggregateId, revision, priorHeadDigest: current.headDigest,
      headDigest: await digestReceizConstitution(receiptBasis), events: projection.events, effects: projection.effects, lawDecisionDigest,
      authority: { admissionReceiptIsProofAuthority: false, strongerTruth: "sealed-receiz-proof-object" },
    };
    const commit = await store.commit({
      schema: "receiz.admission.unit-of-work.v1",
      aggregateId: command.aggregateId,
      commandDigest,
      idempotencyKey: command.idempotencyKey,
      expectedRevision: command.expectedRevision,
      expectedHeadDigest: current.headDigest,
      acceptedCommand: command as unknown as ReceizConstitutionJson,
      events: projection.events,
      nextHead: { revision, digest: receipt.headDigest, state: projection.proposedState },
      resourceEffects: projection.effects,
      receipt: receipt as unknown as ReceizConstitutionJson,
      outboxIntents: projection.outboxIntents ?? [],
      auditReference: { commandId: command.commandId, commandDigest, receiptDigest: receipt.headDigest },
    });
    if (commit.status === "conflict") return { schema: "receiz.admission.result.v1", status: "conflict", code: commit.code, expectedRevision: commit.expectedRevision, expectedHead: commit.expectedHead };
    if (commit.status === "failed" || commit.status === "rejected") return deny(commit.code);
    const committedReceipt = receiptFromJson(commit.receipt);
    if (!committedReceipt) return deny("ADMISSION_STORE_INVALID");
    admittedReceipts.add(committedReceipt);
    return { schema: "receiz.admission.result.v1", status: "admitted", receipt: committedReceipt };
  }

  return {
    execute,
    seed(input: ReceizAdmissionAggregateSeed): Promise<void> { return store.seedAggregate(input); },
    snapshot(aggregateId: string) { return store.readAggregate(aggregateId); },
    inspectStore(): Promise<ReceizAdmissionStoreInspection> { return store.inspect(); },
  };
}
