import {
  canonicalizeReceizConstitution,
  validateReceizConstitutionRegistry,
  type ReceizLawExpression,
} from "./constitution.js";
import { RECEIZ_CURRENT_CONSTITUTION_REGISTRY } from "./currentRegistry.generated.js";
import { digestReceizCanonicalV122 } from "./v122Canonical.js";
import { validateReceizValueIntentV122, type ReceizWorldValueIntentV122 } from "./v122Value.js";
import type { ReceizPortableExecutionAuthorityEvidenceV124 } from "./v124PortableAuthority.js";

export const RECEIZ_V125_LAWFUL_ACTION_VALUE_PROJECTOR_VERSION = "receiz.lawful-action-value-projector.v125" as const;
export const RECEIZ_V125_UNIVERSAL_VALUE_LAW_ID = "receiz.value.universal-deterministic-kai.v125" as const;
export const RECEIZ_V125_ACTION_REGISTRY_BINDING_LAW_ID = "receiz.action.current-registry-law.v125" as const;

export type ReceizLawfulActionLawV125 = Readonly<{
  schema: "receiz.lawful-action-law.v125";
  version: "125.0.0";
  lawId: string;
  domain: string;
  actionType: string;
  registryDigest: string;
  registryBindingLawId: typeof RECEIZ_V125_ACTION_REGISTRY_BINDING_LAW_ID;
  actorRule: "verified-receiz-id";
  custodyRule: "canonical-current-owner";
  causalPreconditions: readonly ReceizLawExpression[];
  permittedTransition: ReceizLawExpression;
  completionWitness: "sealed-output-commitment";
  duplicateRule: "one-admission-per-proof-digest";
  conservationRule: "one-spendable-membership-per-enclosing-artifact";
  idempotencyRule: "proof-digest-and-causal-heads";
  verifierBinding: "receiz.artifact-admission.v112";
  causalVerifierBinding: "receiz.portable-execution-authority.v124";
  universalValueLawId: typeof RECEIZ_V125_UNIVERSAL_VALUE_LAW_ID;
  authority: Readonly<{
    lawManifestIsProofAuthority: false;
    registrationRequiresSealedEnclosingProof: true;
    developerMayDeclarePhiAmount: false;
    institutionReceivesProofExemption: false;
  }>;
  lawDigest: string;
}>;

export type ReceizLawfulActionProofV125 = Readonly<{
  schema: "receiz.lawful-action-proof.v125";
  version: "125.0.0";
  lawId: string;
  lawDigest: string;
  lawArtifactDigest: string;
  registryDigest: string;
  actorReceizId: string;
  subjectId: string;
  subjectHead: string;
  causalParentHeads: readonly string[];
  inputCommitment: string;
  outputCommitment: string;
  completionWitnessDigest: string;
  startKai: string;
  completionKai: string;
  idempotencyKey: string;
  verifierBinding: "receiz.artifact-admission.v112";
  causalVerifierBinding: "receiz.portable-execution-authority.v124";
  causalCompletionEvidence: ReceizPortableExecutionAuthorityEvidenceV124;
  enclosingProofBinding: "exact-sealed-artifact-derived-at-verification";
  proofDigest: string;
}>;

export type ReceizLawfulActionAdmissionReceiptV125 = Readonly<{
  schema: "receiz.lawful-action-admission.v125";
  proofDigest: string;
  enclosingArtifactId: string;
  enclosingArtifactDigest: string;
  lawDigest: string;
  lawArtifactDigest: string;
  registryDigest: string;
  actorReceizId: string;
  subjectId: string;
  subjectHead: string;
  causalParentHeads: readonly string[];
  idempotencyKey: string;
  startKai: string;
  completionKai: string;
  genesisOwnerReceizId: string;
  currentOwnerReceizId: string;
  ownershipHistoryDigest: string;
  ownershipAppendCount: number;
  priorAdmissionDigest: string | null;
  membershipId: string;
  authority: Readonly<{
    receiptIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
    writesPerformed: 1;
  }>;
  admissionDigest: string;
}>;

export type ReceizLawfulActionValueHeadV125 = Readonly<{
  schema: "receiz.lawful-action-value-head.v125";
  membershipId: string;
  actionAdmissionDigest: string;
  enclosingArtifactId: string;
  enclosingArtifactDigest: string;
  lawDigest: string;
  registryDigest: string;
  currentOwnerReceizId: string;
  ownershipHistoryDigest: string;
  startKai: string;
  completionKai: string;
  valuationKai: string;
  universalValueLawId: typeof RECEIZ_V125_UNIVERSAL_VALUE_LAW_ID;
  projectorVersion: typeof RECEIZ_V125_LAWFUL_ACTION_VALUE_PROJECTOR_VERSION;
  settlementPhiMicro: string;
  priorValueHeadDigest: string | null;
  authority: Readonly<{
    valueHeadIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
    developerDeclaredAmount: false;
    oneSpendableMembership: true;
  }>;
  valueHeadDigest: string;
}>;

export type ReceizLawfulActionExecutionV125 = Readonly<{
  schema: "receiz.lawful-action-execution.v125";
  valueHeadDigest: string;
  membershipId: string;
  intent: ReceizWorldValueIntentV122 & Readonly<{ rail: "settlement" }>;
  authority: Readonly<{
    executionPlanIsProofAuthority: false;
    strongerTruth: "settlement-proof-object";
    existingExecutionRail: "receiz.world.value-intent.v122";
  }>;
  executionDigest: string;
}>;

const HEX64 = /^[0-9a-f]{64}$/;
const KAI = /^(0|[1-9][0-9]*)$/;
const RECEIZ_ID = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?\.receiz\.id$/;
const NAME = /^[a-z][a-z0-9]*(?:[._:-][a-z0-9]+)*$/;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length
    && actual.every((key) => keys.includes(key))
    && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function exactStringList(value: unknown, limit: number, pattern = NAME): value is readonly string[] {
  return Array.isArray(value)
    && value.length > 0
    && value.length <= limit
    && value.every((entry) => typeof entry === "string" && pattern.test(entry))
    && new Set(value).size === value.length
    && value.every((entry, index) => index === 0 || value[index - 1]!.localeCompare(entry) < 0);
}

function validLawExpression(value: unknown): value is ReceizLawExpression {
  return validateReceizConstitutionRegistry({
    ...RECEIZ_CURRENT_CONSTITUTION_REGISTRY,
    laws: [{
      id: "receiz.lawful-action.predicate-shape.v125",
      version: 1,
      phases: ["admission"],
      denyWhen: { op: "not", value },
      denial: { code: "LAWFUL_ACTION_PREDICATE_FAILED", safeAlternatives: ["write-zero"] },
    }],
  }).ok;
}

function exactLawExpressionList(value: unknown, limit: number): value is readonly ReceizLawExpression[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > limit
    || value.some((entry) => !validLawExpression(entry))) return false;
  const canonical = value.map((entry) => canonicalizeReceizConstitution(entry));
  return new Set(canonical).size === canonical.length
    && canonical.every((entry, index) => index === 0 || canonical[index - 1]!.localeCompare(entry) < 0);
}

function isLawAuthority(value: unknown): boolean {
  return record(value)
    && exactKeys(value, ["lawManifestIsProofAuthority", "registrationRequiresSealedEnclosingProof", "developerMayDeclarePhiAmount", "institutionReceivesProofExemption"])
    && value.lawManifestIsProofAuthority === false
    && value.registrationRequiresSealedEnclosingProof === true
    && value.developerMayDeclarePhiAmount === false
    && value.institutionReceivesProofExemption === false;
}

export function serializeReceizLawfulActionV125(value: unknown): Uint8Array {
  return new TextEncoder().encode(canonicalizeReceizConstitution(value));
}

export async function validateReceizLawfulActionLawV125(value: unknown): Promise<boolean> {
  if (!record(value) || !exactKeys(value, [
    "schema", "version", "lawId", "domain", "actionType", "registryDigest", "registryBindingLawId",
    "actorRule", "custodyRule", "causalPreconditions", "permittedTransition", "completionWitness",
    "duplicateRule", "conservationRule", "idempotencyRule", "verifierBinding", "causalVerifierBinding", "universalValueLawId",
    "authority", "lawDigest",
  ])) return false;
  if (value.schema !== "receiz.lawful-action-law.v125" || value.version !== "125.0.0"
    || typeof value.lawId !== "string" || !NAME.test(value.lawId)
    || typeof value.domain !== "string" || !NAME.test(value.domain)
    || typeof value.actionType !== "string" || !NAME.test(value.actionType)
    || typeof value.registryDigest !== "string" || !HEX64.test(value.registryDigest)
    || value.registryBindingLawId !== RECEIZ_V125_ACTION_REGISTRY_BINDING_LAW_ID
    || value.actorRule !== "verified-receiz-id" || value.custodyRule !== "canonical-current-owner"
    || !exactLawExpressionList(value.causalPreconditions, 32)
    || !validLawExpression(value.permittedTransition)
    || value.completionWitness !== "sealed-output-commitment"
    || value.duplicateRule !== "one-admission-per-proof-digest"
    || value.conservationRule !== "one-spendable-membership-per-enclosing-artifact"
    || value.idempotencyRule !== "proof-digest-and-causal-heads"
    || value.verifierBinding !== "receiz.artifact-admission.v112"
    || value.causalVerifierBinding !== "receiz.portable-execution-authority.v124"
    || value.universalValueLawId !== RECEIZ_V125_UNIVERSAL_VALUE_LAW_ID
    || !isLawAuthority(value.authority) || typeof value.lawDigest !== "string" || !HEX64.test(value.lawDigest)) return false;
  const { lawDigest, ...basis } = value;
  return await digestReceizCanonicalV122(basis) === lawDigest;
}

export async function validateReceizLawfulActionProofV125(value: unknown): Promise<boolean> {
  if (!record(value) || !exactKeys(value, [
    "schema", "version", "lawId", "lawDigest", "lawArtifactDigest", "registryDigest", "actorReceizId",
    "subjectId", "subjectHead", "causalParentHeads", "inputCommitment", "outputCommitment",
    "completionWitnessDigest", "startKai", "completionKai", "idempotencyKey", "verifierBinding",
    "causalVerifierBinding", "causalCompletionEvidence", "enclosingProofBinding", "proofDigest",
  ])) return false;
  if (value.schema !== "receiz.lawful-action-proof.v125" || value.version !== "125.0.0"
    || typeof value.lawId !== "string" || !NAME.test(value.lawId)
    || typeof value.lawDigest !== "string" || !HEX64.test(value.lawDigest)
    || typeof value.lawArtifactDigest !== "string" || !HEX64.test(value.lawArtifactDigest)
    || typeof value.registryDigest !== "string" || !HEX64.test(value.registryDigest)
    || typeof value.actorReceizId !== "string" || !RECEIZ_ID.test(value.actorReceizId)
    || typeof value.subjectId !== "string" || !value.subjectId || value.subjectId.length > 256
    || typeof value.subjectHead !== "string" || !HEX64.test(value.subjectHead)
    || !exactStringList(value.causalParentHeads, 64, HEX64)
    || typeof value.inputCommitment !== "string" || !HEX64.test(value.inputCommitment)
    || typeof value.outputCommitment !== "string" || !HEX64.test(value.outputCommitment)
    || typeof value.completionWitnessDigest !== "string" || !HEX64.test(value.completionWitnessDigest)
    || typeof value.startKai !== "string" || !KAI.test(value.startKai)
    || typeof value.completionKai !== "string" || !KAI.test(value.completionKai)
    || BigInt(value.completionKai) < BigInt(value.startKai)
    || typeof value.idempotencyKey !== "string" || !value.idempotencyKey || value.idempotencyKey.length > 256
    || value.verifierBinding !== "receiz.artifact-admission.v112"
    || value.causalVerifierBinding !== "receiz.portable-execution-authority.v124"
    || !record(value.causalCompletionEvidence)
    || value.causalCompletionEvidence.schema !== "receiz.portable-execution-authority.v124"
    || value.causalCompletionEvidence.profile !== "portable-state"
    || value.enclosingProofBinding !== "exact-sealed-artifact-derived-at-verification"
    || typeof value.proofDigest !== "string" || !HEX64.test(value.proofDigest)) return false;
  const { proofDigest, ...basis } = value;
  return await digestReceizCanonicalV122(basis) === proofDigest;
}

function isAdmissionAuthority(value: unknown): boolean {
  return record(value)
    && exactKeys(value, ["receiptIsProofAuthority", "strongerTruth", "writesPerformed"])
    && value.receiptIsProofAuthority === false
    && value.strongerTruth === "sealed-receiz-proof-object"
    && value.writesPerformed === 1;
}

export async function validateReceizLawfulActionAdmissionV125(value: unknown): Promise<boolean> {
  if (!record(value) || !exactKeys(value, [
    "schema", "proofDigest", "enclosingArtifactId", "enclosingArtifactDigest", "lawDigest", "lawArtifactDigest", "registryDigest",
    "actorReceizId", "subjectId", "subjectHead", "causalParentHeads", "idempotencyKey", "startKai",
    "completionKai", "genesisOwnerReceizId", "currentOwnerReceizId", "ownershipHistoryDigest",
    "ownershipAppendCount", "priorAdmissionDigest", "membershipId", "authority", "admissionDigest",
  ])) return false;
  if (value.schema !== "receiz.lawful-action-admission.v125"
    || typeof value.proofDigest !== "string" || !HEX64.test(value.proofDigest)
    || typeof value.enclosingArtifactId !== "string" || !HEX64.test(value.enclosingArtifactId)
    || typeof value.enclosingArtifactDigest !== "string" || !HEX64.test(value.enclosingArtifactDigest)
    || typeof value.lawDigest !== "string" || !HEX64.test(value.lawDigest)
    || typeof value.lawArtifactDigest !== "string" || !HEX64.test(value.lawArtifactDigest)
    || typeof value.registryDigest !== "string" || !HEX64.test(value.registryDigest)
    || typeof value.actorReceizId !== "string" || !RECEIZ_ID.test(value.actorReceizId)
    || typeof value.subjectId !== "string" || !value.subjectId || value.subjectId.length > 256
    || typeof value.subjectHead !== "string" || !HEX64.test(value.subjectHead)
    || !exactStringList(value.causalParentHeads, 64, HEX64)
    || typeof value.idempotencyKey !== "string" || !value.idempotencyKey || value.idempotencyKey.length > 256
    || typeof value.startKai !== "string" || !KAI.test(value.startKai)
    || typeof value.completionKai !== "string" || !KAI.test(value.completionKai)
    || BigInt(value.completionKai) < BigInt(value.startKai)
    || typeof value.genesisOwnerReceizId !== "string" || !RECEIZ_ID.test(value.genesisOwnerReceizId)
    || typeof value.currentOwnerReceizId !== "string" || !RECEIZ_ID.test(value.currentOwnerReceizId)
    || typeof value.ownershipHistoryDigest !== "string" || !HEX64.test(value.ownershipHistoryDigest)
    || !Number.isSafeInteger(value.ownershipAppendCount) || (value.ownershipAppendCount as number) < 0
    || (value.priorAdmissionDigest !== null && (typeof value.priorAdmissionDigest !== "string" || !HEX64.test(value.priorAdmissionDigest)))
    || typeof value.membershipId !== "string" || !HEX64.test(value.membershipId)
    || !isAdmissionAuthority(value.authority)
    || typeof value.admissionDigest !== "string" || !HEX64.test(value.admissionDigest)) return false;
  if (value.actorReceizId !== value.genesisOwnerReceizId
    || value.membershipId !== await digestReceizCanonicalV122({
      schema: "receiz.lawful-action-membership.v125",
      enclosingArtifactId: value.enclosingArtifactId,
    })) return false;
  const { admissionDigest, ...basis } = value;
  return await digestReceizCanonicalV122(basis) === admissionDigest;
}

function isValueHeadAuthority(value: unknown): boolean {
  return record(value)
    && exactKeys(value, ["valueHeadIsProofAuthority", "strongerTruth", "developerDeclaredAmount", "oneSpendableMembership"])
    && value.valueHeadIsProofAuthority === false
    && value.strongerTruth === "sealed-receiz-proof-object"
    && value.developerDeclaredAmount === false
    && value.oneSpendableMembership === true;
}

export function deriveReceizLawfulActionPhiMicroV125(startKai: string, completionKai: string, valuationKai: string): string {
  if (!KAI.test(startKai) || !KAI.test(completionKai) || !KAI.test(valuationKai)) throw new TypeError("V125_LAWFUL_ACTION_KAI_INVALID");
  const start = BigInt(startKai);
  const completion = BigInt(completionKai);
  const valuation = BigInt(valuationKai);
  if (completion < start || valuation < completion) throw new TypeError("V125_LAWFUL_ACTION_KAI_INVALID");
  return ((completion - start + 1n) * (valuation - completion + 1n)).toString();
}

export async function validateReceizLawfulActionValueHeadV125(value: unknown): Promise<boolean> {
  if (!record(value) || !exactKeys(value, [
    "schema", "membershipId", "actionAdmissionDigest", "enclosingArtifactId", "enclosingArtifactDigest", "lawDigest", "registryDigest",
    "currentOwnerReceizId", "ownershipHistoryDigest", "startKai", "completionKai", "valuationKai", "universalValueLawId",
    "projectorVersion", "settlementPhiMicro", "priorValueHeadDigest", "authority", "valueHeadDigest",
  ])) return false;
  if (value.schema !== "receiz.lawful-action-value-head.v125"
    || typeof value.membershipId !== "string" || !HEX64.test(value.membershipId)
    || typeof value.actionAdmissionDigest !== "string" || !HEX64.test(value.actionAdmissionDigest)
    || typeof value.enclosingArtifactId !== "string" || !HEX64.test(value.enclosingArtifactId)
    || typeof value.enclosingArtifactDigest !== "string" || !HEX64.test(value.enclosingArtifactDigest)
    || typeof value.lawDigest !== "string" || !HEX64.test(value.lawDigest)
    || typeof value.registryDigest !== "string" || !HEX64.test(value.registryDigest)
    || typeof value.currentOwnerReceizId !== "string" || !RECEIZ_ID.test(value.currentOwnerReceizId)
    || typeof value.ownershipHistoryDigest !== "string" || !HEX64.test(value.ownershipHistoryDigest)
    || typeof value.startKai !== "string" || !KAI.test(value.startKai)
    || typeof value.completionKai !== "string" || !KAI.test(value.completionKai)
    || typeof value.valuationKai !== "string" || !KAI.test(value.valuationKai)
    || value.universalValueLawId !== RECEIZ_V125_UNIVERSAL_VALUE_LAW_ID
    || value.projectorVersion !== RECEIZ_V125_LAWFUL_ACTION_VALUE_PROJECTOR_VERSION
    || typeof value.settlementPhiMicro !== "string" || !/^[1-9][0-9]*$/.test(value.settlementPhiMicro)
    || (value.priorValueHeadDigest !== null && (typeof value.priorValueHeadDigest !== "string" || !HEX64.test(value.priorValueHeadDigest)))
    || !isValueHeadAuthority(value.authority)
    || typeof value.valueHeadDigest !== "string" || !HEX64.test(value.valueHeadDigest)) return false;
  try {
    if (value.settlementPhiMicro !== deriveReceizLawfulActionPhiMicroV125(value.startKai, value.completionKai, value.valuationKai)) return false;
  } catch { return false; }
  if (value.membershipId !== await digestReceizCanonicalV122({
    schema: "receiz.lawful-action-membership.v125",
    enclosingArtifactId: value.enclosingArtifactId,
  })) return false;
  const { valueHeadDigest, ...basis } = value;
  return await digestReceizCanonicalV122(basis) === valueHeadDigest;
}

function isExecutionAuthority(value: unknown): boolean {
  return record(value)
    && exactKeys(value, ["executionPlanIsProofAuthority", "strongerTruth", "existingExecutionRail"])
    && value.executionPlanIsProofAuthority === false
    && value.strongerTruth === "settlement-proof-object"
    && value.existingExecutionRail === "receiz.world.value-intent.v122";
}

export async function validateReceizLawfulActionExecutionV125(value: unknown): Promise<boolean> {
  if (!record(value) || !exactKeys(value, ["schema", "valueHeadDigest", "membershipId", "intent", "authority", "executionDigest"])) return false;
  if (value.schema !== "receiz.lawful-action-execution.v125"
    || typeof value.valueHeadDigest !== "string" || !HEX64.test(value.valueHeadDigest)
    || typeof value.membershipId !== "string" || !HEX64.test(value.membershipId)
    || !record(value.intent) || !exactKeys(value.intent, [
      "schema", "rail", "amountPhiMicro", "usdPerPhiMicrocents", "quotedUsdCents", "priceBasisDigest",
      "sourceProofObjectId", "sourceValueHead", "destinationSubjectId", "expectedDestinationHead",
      "idempotencyKey", "valueIntentDigest",
    ]) || value.intent.rail !== "settlement" || value.intent.sourceValueHead !== value.valueHeadDigest
    || !await validateReceizValueIntentV122(value.intent as unknown as ReceizWorldValueIntentV122)
    || !isExecutionAuthority(value.authority)
    || typeof value.executionDigest !== "string" || !HEX64.test(value.executionDigest)) return false;
  const { executionDigest, ...basis } = value;
  return await digestReceizCanonicalV122(basis) === executionDigest;
}
