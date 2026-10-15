import { verifyReceizArtifactAdmission } from "./artifactAdmission.js";
import type { ReceizVerifiedArtifactAdmission } from "./artifactAdmissionTypes.js";
import { RECEIZ_CURRENT_CONSTITUTION_REGISTRY } from "./currentRegistry.generated.js";
import {
  evaluateReceizLawSet,
  validateReceizConstitutionRegistry,
  type ReceizConstitutionRegistry,
  type ReceizLawExpression,
} from "./constitution.js";
import { receizBase64UrlDecode } from "./identity.js";
import {
  deriveReceizPortableOwnershipContinuity,
  extractReceizPortableAssetPayload,
  type ReceizPortableAssetDocument,
} from "./portableAsset.js";
import {
  assertReceizGlobalProofChildReferenceV119,
  type ReceizGlobalProofChildReferenceV119,
} from "./globalEconomyTransport.js";
import { RECEIZ_CURRENT_REGISTRY_DIGEST } from "./releaseIdentity.js";
import { canonicalizeReceizV122, digestReceizCanonicalV122 } from "./v122Canonical.js";
import { planReceizSettlementV122 } from "./v122Value.js";
import {
  verifyReceizPortableExecutionAuthorityEvidenceV124,
  type ReceizPortableExecutionAuthorityEvidenceV124,
  type ReceizPortableExecutionAuthorityVerifierOptionsV124,
  type ReceizVerifiedPortableExecutionAuthorityV124,
} from "./v124PortableAuthority.js";
import {
  RECEIZ_V125_ACTION_REGISTRY_BINDING_LAW_ID,
  RECEIZ_V125_LAWFUL_ACTION_VALUE_PROJECTOR_VERSION,
  RECEIZ_V125_UNIVERSAL_VALUE_LAW_ID,
  deriveReceizLawfulActionPhiMicroV125,
  serializeReceizLawfulActionV125,
  validateReceizLawfulActionAdmissionV125,
  validateReceizLawfulActionExecutionV125,
  validateReceizLawfulActionLawV125,
  validateReceizLawfulActionProofV125,
  validateReceizLawfulActionValueHeadV125,
  type ReceizLawfulActionAdmissionReceiptV125,
  type ReceizLawfulActionExecutionV125,
  type ReceizLawfulActionLawV125,
  type ReceizLawfulActionProofV125,
  type ReceizLawfulActionValueHeadV125,
} from "./v125LawfulActionSchemas.js";

const HEX64 = /^[0-9a-f]{64}$/;
const RECEIZ_ID = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?\.receiz\.id$/;
const NAME = /^[a-z][a-z0-9]*(?:[._:-][a-z0-9]+)*$/;

const registeredLawCustody = new WeakSet<object>();
const verifiedActionCustody = new WeakSet<object>();
const admittedActionCustody = new WeakSet<object>();
const admittedActionLineage = new WeakMap<object, ReadonlySet<string>>();

export type ReceizRegisteredLawfulActionLawV125 = Readonly<{
  schema: "receiz.registered-lawful-action-law-runtime.v125";
  law: ReceizLawfulActionLawV125;
  enclosingLawArtifactDigest: string;
  lawCustodianReceizId: string;
  authority: Readonly<{
    runtimeCustodyRequired: true;
    registrationIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
    currentRegistryBound: true;
  }>;
}>;

export type ReceizVerifiedLawfulActionV125 = Readonly<{
  schema: "receiz.verified-lawful-action-runtime.v125";
  proof: ReceizLawfulActionProofV125;
  enclosingArtifactDigest: string;
  enclosingArtifactId: string;
  admissionEvidenceRoot: string;
  currentOwnerReceizId: string;
  genesisOwnerReceizId: string;
  ownershipHistoryDigest: string;
  ownershipAppendCount: number;
  priorOwnershipHistoryDigest: string | null;
  authority: Readonly<{
    runtimeCustodyRequired: true;
    enclosingProofVerifiedFirst: true;
    institutionSubjectToSameProofLaw: true;
    causalCompletionVerified: true;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizLawfulActionAdmissionCandidateV125 = Readonly<{
  proofDigest: string;
  enclosingArtifactId: string;
  membershipId: string;
  currentOwnerReceizId: string;
  priorAdmissionDigest: string | null;
  idempotencyKey: string;
  admissionDigest: string;
}>;

export type ReceizLawfulActionAdmissionStoreResultV125 =
  | Readonly<{ status: "admitted" }>
  | Readonly<{ status: "duplicate"; existingAdmissionDigest: string }>
  | Readonly<{ status: "conflict"; existingAdmissionDigest: string }>;

export type ReceizLawfulActionAdmissionStoreV125 = Readonly<{
  admit(candidate: ReceizLawfulActionAdmissionCandidateV125): Promise<ReceizLawfulActionAdmissionStoreResultV125>;
  advance(candidate: ReceizLawfulActionAdmissionCandidateV125): Promise<ReceizLawfulActionAdmissionStoreResultV125>;
}>;

export type ReceizAdmittedLawfulActionV125 = Readonly<{
  status: "admitted";
  receipt: ReceizLawfulActionAdmissionReceiptV125;
}>;

export type ReceizLawfulActionAdmissionResultV125 = ReceizAdmittedLawfulActionV125
  | Readonly<{
    status: "zero-write";
    code: "ACTION_DUPLICATE" | "ACTION_MEMBERSHIP_CONFLICT" | "ACTION_CUSTODY_HEAD_CONFLICT";
    writesPerformed: 0;
    existingAdmissionDigest: string;
  }>;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: unknown, expected: readonly string[], code: string): asserts value is Record<string, unknown> {
  if (!record(value)) throw new TypeError(code);
  const actual = Object.keys(value);
  if (actual.length !== expected.length
    || actual.some((key) => !expected.includes(key))
    || expected.some((key) => !Object.prototype.hasOwnProperty.call(value, key))) throw new TypeError(code);
}

function frozen<T extends object>(value: T): Readonly<T> {
  return Object.freeze(value);
}

function deepFrozenClone<T>(value: T): Readonly<T> {
  const clone = structuredClone(value);
  const visit = (candidate: unknown): void => {
    if (!candidate || typeof candidate !== "object" || Object.isFrozen(candidate)) return;
    for (const nested of Object.values(candidate as Record<string, unknown>)) visit(nested);
    Object.freeze(candidate);
  };
  visit(clone);
  return clone as Readonly<T>;
}

function sortedUnique(values: readonly string[], pattern: RegExp, code: string, limit: number): readonly string[] {
  if (!Array.isArray(values) || values.length < 1 || values.length > limit
    || values.some((value) => typeof value !== "string" || !pattern.test(value))) throw new TypeError(code);
  const sorted = [...values].sort((left, right) => left.localeCompare(right));
  if (new Set(sorted).size !== sorted.length) throw new TypeError(code);
  return Object.freeze(sorted);
}

function canonicalLawExpressions(
  values: readonly ReceizLawExpression[],
  code: string,
  limit: number,
): readonly ReceizLawExpression[] {
  if (!Array.isArray(values) || values.length < 1 || values.length > limit) throw new TypeError(code);
  const entries = values.map((value) => {
    const cloned = deepFrozenClone(value) as ReceizLawExpression;
    if (!validLawExpression(cloned)) throw new TypeError(code);
    return { cloned, canonical: canonicalizeReceizV122(cloned) };
  }).sort((left, right) => left.canonical.localeCompare(right.canonical));
  if (entries.some((entry, index) => index > 0 && entries[index - 1]!.canonical === entry.canonical)) {
    throw new TypeError(code);
  }
  return frozen(entries.map((entry) => entry.cloned));
}

function predicateRegistry(expression: ReceizLawExpression): ReceizConstitutionRegistry {
  const registry = {
    ...RECEIZ_CURRENT_CONSTITUTION_REGISTRY,
    laws: [{
      id: "receiz.lawful-action.predicate.v125",
      version: 1,
      phases: ["admission" as const],
      denyWhen: { op: "not" as const, value: expression },
      denial: { code: "LAWFUL_ACTION_PREDICATE_FAILED", safeAlternatives: ["write-zero"] },
    }],
  };
  if (!validateReceizConstitutionRegistry(registry).ok) {
    throw new TypeError("V125_LAWFUL_ACTION_LAW_INVALID");
  }
  return deepFrozenClone(registry) as ReceizConstitutionRegistry;
}

function validLawExpression(value: unknown): value is ReceizLawExpression {
  try {
    predicateRegistry(value as ReceizLawExpression);
    return true;
  } catch {
    return false;
  }
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
}

async function verifiedPortablePayload(
  admissionInput: unknown,
  code: string,
): Promise<Readonly<{
  admission: ReceizVerifiedArtifactAdmission;
  value: unknown;
  bytes: Uint8Array;
  continuity: Awaited<ReturnType<typeof deriveReceizPortableOwnershipContinuity>>;
  priorOwnershipHistoryDigest: string | null;
}>> {
  const admission = await verifyReceizArtifactAdmission(admissionInput);
  if ("code" in admission || admission.profile !== "portable-state" || admission.verdict !== "bearer-recovery") {
    throw new TypeError(code);
  }
  let portable: unknown;
  try {
    portable = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(admission.verifiedPayload.bytes));
  } catch { throw new TypeError(code); }
  let continuity: Awaited<ReturnType<typeof deriveReceizPortableOwnershipContinuity>>;
  let extracted: Awaited<ReturnType<typeof extractReceizPortableAssetPayload>>;
  try { extracted = await extractReceizPortableAssetPayload(portable); }
  catch { throw new TypeError(code); }
  try { continuity = await deriveReceizPortableOwnershipContinuity(portable as ReceizPortableAssetDocument); }
  catch { throw new TypeError(code); }
  if (extracted.mimeType !== "application/vnd.receiz.lawful-action+json") throw new TypeError(code);
  let value: unknown;
  try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(extracted.bytes)); }
  catch { throw new TypeError(code); }
  const ownershipAppends = (portable as ReceizPortableAssetDocument).provenance.appends
    .filter((append) => append.type === "receiz.ownership.bearer-claim.v108");
  const priorOwnershipHistoryDigest = ownershipAppends.length === 0
    ? null
    : typeof ownershipAppends.at(-1)?.priorHistoryDigestSha256 === "string"
      ? ownershipAppends.at(-1)!.priorHistoryDigestSha256 as string
      : null;
  if ((continuity.appendCount === 0) !== (priorOwnershipHistoryDigest === null)) throw new TypeError(code);
  return Object.freeze({ admission, value, bytes: extracted.bytes.slice(), continuity, priorOwnershipHistoryDigest });
}

export async function createReceizLawfulActionLawV125(input: Readonly<{
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
}>): Promise<ReceizLawfulActionLawV125> {
  exactKeys(input, [
    "lawId", "domain", "actionType", "registryDigest", "registryBindingLawId", "actorRule", "custodyRule",
    "causalPreconditions", "permittedTransition", "completionWitness", "duplicateRule", "conservationRule",
    "idempotencyRule", "verifierBinding", "causalVerifierBinding", "universalValueLawId",
  ], "V125_LAWFUL_ACTION_LAW_INVALID");
  if (!NAME.test(input.lawId) || !NAME.test(input.domain) || !NAME.test(input.actionType)
    || input.registryDigest !== RECEIZ_CURRENT_REGISTRY_DIGEST
    || input.registryBindingLawId !== RECEIZ_V125_ACTION_REGISTRY_BINDING_LAW_ID
    || input.actorRule !== "verified-receiz-id" || input.custodyRule !== "canonical-current-owner"
    || !validLawExpression(input.permittedTransition)
    || input.completionWitness !== "sealed-output-commitment"
    || input.duplicateRule !== "one-admission-per-proof-digest"
    || input.conservationRule !== "one-spendable-membership-per-enclosing-artifact"
    || input.idempotencyRule !== "proof-digest-and-causal-heads"
    || input.verifierBinding !== "receiz.artifact-admission.v112"
    || input.causalVerifierBinding !== "receiz.portable-execution-authority.v124"
    || input.universalValueLawId !== RECEIZ_V125_UNIVERSAL_VALUE_LAW_ID) {
    throw new TypeError("V125_LAWFUL_ACTION_LAW_INVALID");
  }
  const causalPreconditions = canonicalLawExpressions(input.causalPreconditions, "V125_LAWFUL_ACTION_LAW_INVALID", 32);
  const permittedTransition = deepFrozenClone(input.permittedTransition) as ReceizLawExpression;
  const basis = {
    schema: "receiz.lawful-action-law.v125" as const,
    version: "125.0.0" as const,
    lawId: input.lawId,
    domain: input.domain,
    actionType: input.actionType,
    registryDigest: input.registryDigest,
    registryBindingLawId: input.registryBindingLawId,
    actorRule: input.actorRule,
    custodyRule: input.custodyRule,
    causalPreconditions,
    permittedTransition,
    completionWitness: input.completionWitness,
    duplicateRule: input.duplicateRule,
    conservationRule: input.conservationRule,
    idempotencyRule: input.idempotencyRule,
    verifierBinding: input.verifierBinding,
    causalVerifierBinding: input.causalVerifierBinding,
    universalValueLawId: input.universalValueLawId,
    authority: frozen({
      lawManifestIsProofAuthority: false as const,
      registrationRequiresSealedEnclosingProof: true as const,
      developerMayDeclarePhiAmount: false as const,
      institutionReceivesProofExemption: false as const,
    }),
  };
  return frozen({ ...basis, lawDigest: await digestReceizCanonicalV122(basis) });
}

export async function registerReceizLawfulActionLawV125(input: Readonly<{
  law: ReceizLawfulActionLawV125;
  enclosingArtifactAdmission: unknown;
}>): Promise<ReceizRegisteredLawfulActionLawV125> {
  exactKeys(input, ["law", "enclosingArtifactAdmission"], "V125_LAWFUL_ACTION_LAW_REGISTRATION_INVALID");
  const enclosed = await verifiedPortablePayload(input.enclosingArtifactAdmission, "V125_LAWFUL_ACTION_LAW_ENCLOSING_PROOF_INVALID");
  if (!await validateReceizLawfulActionLawV125(enclosed.value)
    || !bytesEqual(enclosed.bytes, serializeReceizLawfulActionV125(input.law))
    || !await validateReceizLawfulActionLawV125(input.law)
    || input.law.registryDigest !== RECEIZ_CURRENT_REGISTRY_DIGEST
    || !RECEIZ_CURRENT_CONSTITUTION_REGISTRY.laws.some((law) => law.id === input.law.registryBindingLawId)
    || !RECEIZ_CURRENT_CONSTITUTION_REGISTRY.laws.some((law) => law.id === input.law.universalValueLawId)
    || !enclosed.admission.ownerReceizId) {
    throw new TypeError("V125_LAWFUL_ACTION_LAW_REGISTRATION_INVALID");
  }
  const registered = frozen({
    schema: "receiz.registered-lawful-action-law-runtime.v125" as const,
    law: input.law,
    enclosingLawArtifactDigest: enclosed.admission.artifactSha256,
    lawCustodianReceizId: enclosed.admission.ownerReceizId,
    authority: frozen({
      runtimeCustodyRequired: true as const,
      registrationIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
      currentRegistryBound: true as const,
    }),
  });
  registeredLawCustody.add(registered);
  return registered;
}

type ReceizLawfulActionCausalCompletionBindingV125 = Readonly<{
  evidence: ReceizPortableExecutionAuthorityEvidenceV124;
  verified: ReceizVerifiedPortableExecutionAuthorityV124;
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
}>;

async function verifyLawfulActionCausalCompletionV125(input: Readonly<{
  law: ReceizLawfulActionLawV125;
  evidence: unknown;
  verifierOptions: ReceizPortableExecutionAuthorityVerifierOptionsV124;
}>): Promise<ReceizLawfulActionCausalCompletionBindingV125> {
  const evidence = deepFrozenClone(input.evidence) as ReceizPortableExecutionAuthorityEvidenceV124;
  let verified: ReceizVerifiedPortableExecutionAuthorityV124;
  try {
    verified = await verifyReceizPortableExecutionAuthorityEvidenceV124(evidence, input.verifierOptions);
  } catch (error) {
    throw new TypeError("V125_LAWFUL_ACTION_CAUSAL_COMPLETION_INVALID", { cause: error });
  }
  // Complete KKS-bearing sources retain exact micro-pulse causality. The V124
  // whole-pulse compatibility projections must not truncate these coordinates.
  const startKai = verified.exactKksCoordinates?.priorHead.kaiUpulse ?? verified.priorHeadKai;
  const completionKai = verified.exactKksCoordinates?.completion.kaiUpulse ?? verified.completionKai;
  const causalParentHeads = sortedUnique(
    Object.values(verified.plan.expectedParticipantHeads),
    HEX64,
    "V125_LAWFUL_ACTION_CAUSAL_COMPLETION_INVALID",
    64,
  );
  if (input.law.causalVerifierBinding !== "receiz.portable-execution-authority.v124"
    || verified.plan.registryDigest !== RECEIZ_CURRENT_REGISTRY_DIGEST
    || verified.plan.domainId !== input.law.domain
    || verified.plan.operationKind !== input.law.actionType
    || !RECEIZ_ID.test(verified.actorReceizId)
    || verified.participantId.length > 256
    || !causalParentHeads.includes(verified.priorHead)
    || verified.committedHead !== verified.carriedHistoryHead
    || BigInt(completionKai) < BigInt(startKai)) {
    throw new TypeError("V125_LAWFUL_ACTION_CAUSAL_COMPLETION_INVALID");
  }
  let exactPlan: unknown;
  try {
    exactPlan = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(
      receizBase64UrlDecode(verified.plan.exactPlanBytesB64u),
    ));
  } catch {
    throw new TypeError("V125_LAWFUL_ACTION_LAW_PREDICATE_FAILED");
  }
  const predicateContext = frozen({
    plan: verified.plan,
    exactPlan,
    request: verified.request,
    outcome: verified.outcome,
    transition: frozen({
      actorReceizId: verified.actorReceizId,
      participantId: verified.participantId,
      priorHead: verified.priorHead,
      priorHeadKai: startKai,
      committedHead: verified.committedHead,
      carriedHistoryHead: verified.carriedHistoryHead,
      completionKai,
      causalParentHeads,
    }),
  });
  const predicate = frozen({
    op: "all" as const,
    values: frozen([...input.law.causalPreconditions, input.law.permittedTransition]),
  });
  const budget = RECEIZ_CURRENT_CONSTITUTION_REGISTRY.protocolLimits?.lawExpressionOperations ?? 1;
  let predicateAllowed = false;
  try {
    predicateAllowed = (await evaluateReceizLawSet({
      registry: predicateRegistry(predicate),
      context: predicateContext,
      phase: "admission",
      budget,
    })).allowed;
  } catch {
    throw new TypeError("V125_LAWFUL_ACTION_LAW_PREDICATE_FAILED");
  }
  if (!predicateAllowed) throw new TypeError("V125_LAWFUL_ACTION_LAW_PREDICATE_FAILED");
  return frozen({
    evidence,
    verified,
    actorReceizId: verified.actorReceizId,
    subjectId: verified.participantId,
    subjectHead: verified.committedHead,
    causalParentHeads,
    inputCommitment: verified.requestDigest,
    outputCommitment: String(verified.outcome.outcomeDigest),
    completionWitnessDigest: await digestReceizCanonicalV122(evidence),
    startKai,
    completionKai,
    idempotencyKey: verified.plan.semanticIdempotencyKey,
  });
}

export async function planReceizLawfulActionProofV125(input: Readonly<{
  registeredLaw: ReceizRegisteredLawfulActionLawV125;
  causalCompletionEvidence: unknown;
  causalCompletionVerifierOptions: ReceizPortableExecutionAuthorityVerifierOptionsV124;
}>): Promise<ReceizLawfulActionProofV125> {
  exactKeys(input, ["registeredLaw", "causalCompletionEvidence", "causalCompletionVerifierOptions"], "V125_LAWFUL_ACTION_PROOF_INVALID");
  if (!registeredLawCustody.has(input.registeredLaw)) throw new TypeError("V125_LAWFUL_ACTION_PROOF_INVALID");
  const law = input.registeredLaw.law;
  const causal = await verifyLawfulActionCausalCompletionV125({
    law,
    evidence: input.causalCompletionEvidence,
    verifierOptions: input.causalCompletionVerifierOptions,
  });
  const basis = {
    schema: "receiz.lawful-action-proof.v125" as const,
    version: "125.0.0" as const,
    lawId: law.lawId,
    lawDigest: law.lawDigest,
    lawArtifactDigest: input.registeredLaw.enclosingLawArtifactDigest,
    registryDigest: law.registryDigest,
    actorReceizId: causal.actorReceizId,
    subjectId: causal.subjectId,
    subjectHead: causal.subjectHead,
    causalParentHeads: causal.causalParentHeads,
    inputCommitment: causal.inputCommitment,
    outputCommitment: causal.outputCommitment,
    completionWitnessDigest: causal.completionWitnessDigest,
    startKai: causal.startKai,
    completionKai: causal.completionKai,
    idempotencyKey: causal.idempotencyKey,
    verifierBinding: law.verifierBinding,
    causalVerifierBinding: law.causalVerifierBinding,
    causalCompletionEvidence: causal.evidence,
    enclosingProofBinding: "exact-sealed-artifact-derived-at-verification" as const,
  };
  return frozen({ ...basis, proofDigest: await digestReceizCanonicalV122(basis) });
}

export async function verifyReceizLawfulActionProofV125(input: Readonly<{
  registeredLaw: ReceizRegisteredLawfulActionLawV125;
  proof: ReceizLawfulActionProofV125;
  enclosingArtifactAdmission: unknown;
  causalCompletionVerifierOptions: ReceizPortableExecutionAuthorityVerifierOptionsV124;
}>): Promise<ReceizVerifiedLawfulActionV125> {
  exactKeys(input, ["registeredLaw", "proof", "enclosingArtifactAdmission", "causalCompletionVerifierOptions"], "V125_LAWFUL_ACTION_PROOF_INVALID");
  const enclosed = await verifiedPortablePayload(input.enclosingArtifactAdmission, "V125_LAWFUL_ACTION_ENCLOSING_PROOF_INVALID");
  if (!registeredLawCustody.has(input.registeredLaw)
    || !await validateReceizLawfulActionProofV125(enclosed.value)
    || !bytesEqual(enclosed.bytes, serializeReceizLawfulActionV125(input.proof))
    || !await validateReceizLawfulActionProofV125(input.proof)) {
    throw new TypeError("V125_LAWFUL_ACTION_ENCLOSING_PAYLOAD_MISMATCH");
  }
  const proof = enclosed.value as ReceizLawfulActionProofV125;
  const law = input.registeredLaw.law;
  const causal = await verifyLawfulActionCausalCompletionV125({
    law,
    evidence: proof.causalCompletionEvidence,
    verifierOptions: input.causalCompletionVerifierOptions,
  });
  if (proof.lawId !== law.lawId || proof.lawDigest !== law.lawDigest
    || proof.lawArtifactDigest !== input.registeredLaw.enclosingLawArtifactDigest
    || proof.registryDigest !== RECEIZ_CURRENT_REGISTRY_DIGEST
    || proof.verifierBinding !== law.verifierBinding
    || proof.causalVerifierBinding !== law.causalVerifierBinding
    || proof.actorReceizId !== enclosed.continuity.genesisOwnerReceizId
    || enclosed.admission.artifactId !== enclosed.continuity.artifactId
    || enclosed.admission.ownerReceizId !== enclosed.continuity.ownerReceizId
    || !enclosed.admission.ownerReceizId) throw new TypeError("V125_LAWFUL_ACTION_PROOF_INVALID");
  if (proof.actorReceizId !== causal.actorReceizId
    || proof.subjectId !== causal.subjectId
    || proof.subjectHead !== causal.subjectHead
    || canonicalizeReceizV122(proof.causalParentHeads) !== canonicalizeReceizV122(causal.causalParentHeads)
    || proof.inputCommitment !== causal.inputCommitment
    || proof.outputCommitment !== causal.outputCommitment
    || proof.completionWitnessDigest !== causal.completionWitnessDigest
    || proof.startKai !== causal.startKai
    || proof.completionKai !== causal.completionKai
    || proof.idempotencyKey !== causal.idempotencyKey) {
    throw new TypeError("V125_LAWFUL_ACTION_CAUSAL_COMPLETION_MISMATCH");
  }
  const verified = frozen({
    schema: "receiz.verified-lawful-action-runtime.v125" as const,
    proof,
    enclosingArtifactDigest: enclosed.admission.artifactSha256,
    enclosingArtifactId: enclosed.admission.artifactId,
    admissionEvidenceRoot: enclosed.admission.admissionProof.admissionProofDigest,
    currentOwnerReceizId: enclosed.admission.ownerReceizId,
    genesisOwnerReceizId: enclosed.continuity.genesisOwnerReceizId,
    ownershipHistoryDigest: enclosed.continuity.historyDigestSha256,
    ownershipAppendCount: enclosed.continuity.appendCount,
    priorOwnershipHistoryDigest: enclosed.priorOwnershipHistoryDigest,
    authority: frozen({
      runtimeCustodyRequired: true as const,
      enclosingProofVerifiedFirst: true as const,
      institutionSubjectToSameProofLaw: true as const,
      causalCompletionVerified: true as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
  verifiedActionCustody.add(verified);
  return verified;
}

export function deriveReceizLawfulActionGlobalChildReferenceV125(
  verifiedAction: ReceizVerifiedLawfulActionV125,
): ReceizGlobalProofChildReferenceV119 {
  if (!verifiedActionCustody.has(verifiedAction)) throw new TypeError("V125_LAWFUL_ACTION_VERIFIED_RUNTIME_REQUIRED");
  const reference = frozen({
    schema: "receiz.global-proof-child-reference.v119" as const,
    namespace: `receiz.${verifiedAction.proof.lawId.split(".").slice(0, 2).join(".")}` as `receiz.${string}`,
    artifactId: verifiedAction.enclosingArtifactId,
    artifactDigest: verifiedAction.enclosingArtifactDigest,
    immutableVersion: verifiedAction.enclosingArtifactDigest,
    parentArtifactDigests: verifiedAction.proof.causalParentHeads,
    historyHeadDigest: verifiedAction.proof.subjectHead,
    admissionEvidenceRoot: verifiedAction.admissionEvidenceRoot,
    headKaiUpulse: verifiedAction.proof.completionKai,
    verifierBinding: frozen({
      registryDigest: verifiedAction.proof.registryDigest,
      lawId: "receiz.action.enclosing-proof-first.v125",
      verifierVersion: "receiz.lawful-action.verifier.v125",
    }),
  });
  assertReceizGlobalProofChildReferenceV119(reference);
  return reference;
}

export function createReceizLawfulActionAdmissionStoreV125(): ReceizLawfulActionAdmissionStoreV125 {
  const proofAdmissions = new Map<string, string>();
  const memberships = new Map<string, Readonly<{ admissionDigest: string; proofDigest: string; enclosingArtifactId: string; currentOwnerReceizId: string }>>();
  let tail: Promise<void> = Promise.resolve();
  return frozen({
    admit(candidate: ReceizLawfulActionAdmissionCandidateV125) {
      const operation = tail.then((): ReceizLawfulActionAdmissionStoreResultV125 => {
        const existingProof = proofAdmissions.get(candidate.proofDigest);
        if (existingProof) return frozen({ status: "duplicate" as const, existingAdmissionDigest: existingProof });
        const existingMembership = memberships.get(candidate.membershipId);
        if (existingMembership) return frozen({ status: "conflict" as const, existingAdmissionDigest: existingMembership.admissionDigest });
        if (candidate.priorAdmissionDigest !== null) return frozen({ status: "conflict" as const, existingAdmissionDigest: candidate.priorAdmissionDigest });
        proofAdmissions.set(candidate.proofDigest, candidate.admissionDigest);
        memberships.set(candidate.membershipId, frozen({
          admissionDigest: candidate.admissionDigest,
          proofDigest: candidate.proofDigest,
          enclosingArtifactId: candidate.enclosingArtifactId,
          currentOwnerReceizId: candidate.currentOwnerReceizId,
        }));
        return frozen({ status: "admitted" as const });
      });
      tail = operation.then(() => undefined, () => undefined);
      return operation;
    },
    advance(candidate: ReceizLawfulActionAdmissionCandidateV125) {
      const operation = tail.then((): ReceizLawfulActionAdmissionStoreResultV125 => {
        const current = memberships.get(candidate.membershipId);
        if (!current || candidate.priorAdmissionDigest !== current.admissionDigest
          || current.proofDigest !== candidate.proofDigest
          || current.enclosingArtifactId !== candidate.enclosingArtifactId
          || current.currentOwnerReceizId === candidate.currentOwnerReceizId) {
          return frozen({ status: "conflict" as const, existingAdmissionDigest: current?.admissionDigest ?? candidate.priorAdmissionDigest ?? candidate.admissionDigest });
        }
        proofAdmissions.set(candidate.proofDigest, candidate.admissionDigest);
        memberships.set(candidate.membershipId, frozen({
          admissionDigest: candidate.admissionDigest,
          proofDigest: candidate.proofDigest,
          enclosingArtifactId: candidate.enclosingArtifactId,
          currentOwnerReceizId: candidate.currentOwnerReceizId,
        }));
        return frozen({ status: "admitted" as const });
      });
      tail = operation.then(() => undefined, () => undefined);
      return operation;
    },
  });
}

export async function admitReceizLawfulActionV125(input: Readonly<{
  verifiedAction: ReceizVerifiedLawfulActionV125;
  store: ReceizLawfulActionAdmissionStoreV125;
}>): Promise<ReceizLawfulActionAdmissionResultV125> {
  exactKeys(input, ["verifiedAction", "store"], "V125_LAWFUL_ACTION_ADMISSION_INVALID");
  if (!verifiedActionCustody.has(input.verifiedAction) || !input.store || typeof input.store.admit !== "function") {
    throw new TypeError("V125_LAWFUL_ACTION_ADMISSION_INVALID");
  }
  const action = input.verifiedAction;
  const proof = action.proof;
  const membershipId = await digestReceizCanonicalV122({
    schema: "receiz.lawful-action-membership.v125",
    enclosingArtifactId: action.enclosingArtifactId,
  });
  const basis = {
    schema: "receiz.lawful-action-admission.v125" as const,
    proofDigest: proof.proofDigest,
    enclosingArtifactId: action.enclosingArtifactId,
    enclosingArtifactDigest: action.enclosingArtifactDigest,
    lawDigest: proof.lawDigest,
    lawArtifactDigest: proof.lawArtifactDigest,
    registryDigest: proof.registryDigest,
    actorReceizId: proof.actorReceizId,
    subjectId: proof.subjectId,
    subjectHead: proof.subjectHead,
    causalParentHeads: proof.causalParentHeads,
    idempotencyKey: proof.idempotencyKey,
    startKai: proof.startKai,
    completionKai: proof.completionKai,
    genesisOwnerReceizId: action.genesisOwnerReceizId,
    currentOwnerReceizId: action.currentOwnerReceizId,
    ownershipHistoryDigest: action.ownershipHistoryDigest,
    ownershipAppendCount: action.ownershipAppendCount,
    priorAdmissionDigest: null,
    membershipId,
    authority: frozen({
      receiptIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
      writesPerformed: 1 as const,
    }),
  };
  const receipt = frozen({ ...basis, admissionDigest: await digestReceizCanonicalV122(basis) });
  const stored = await input.store.admit(frozen({
    proofDigest: proof.proofDigest,
    enclosingArtifactId: action.enclosingArtifactId,
    membershipId,
    currentOwnerReceizId: action.currentOwnerReceizId,
    priorAdmissionDigest: null,
    idempotencyKey: proof.idempotencyKey,
    admissionDigest: receipt.admissionDigest,
  }));
  if (stored.status === "duplicate") return frozen({
    status: "zero-write" as const,
    code: "ACTION_DUPLICATE" as const,
    writesPerformed: 0 as const,
    existingAdmissionDigest: stored.existingAdmissionDigest,
  });
  if (stored.status === "conflict") return frozen({
    status: "zero-write" as const,
    code: "ACTION_MEMBERSHIP_CONFLICT" as const,
    writesPerformed: 0 as const,
    existingAdmissionDigest: stored.existingAdmissionDigest,
  });
  if (stored.status !== "admitted" || !await validateReceizLawfulActionAdmissionV125(receipt)) {
    throw new TypeError("V125_LAWFUL_ACTION_ADMISSION_STORE_INVALID");
  }
  const admitted = frozen({ status: "admitted" as const, receipt });
  admittedActionCustody.add(admitted);
  admittedActionLineage.set(admitted, frozen(new Set([receipt.admissionDigest])));
  return admitted;
}

export async function advanceReceizLawfulActionCustodyV125(input: Readonly<{
  priorAdmission: ReceizAdmittedLawfulActionV125;
  verifiedAction: ReceizVerifiedLawfulActionV125;
  store: ReceizLawfulActionAdmissionStoreV125;
}>): Promise<ReceizLawfulActionAdmissionResultV125> {
  exactKeys(input, ["priorAdmission", "verifiedAction", "store"], "V125_LAWFUL_ACTION_CUSTODY_INVALID");
  if (!admittedActionCustody.has(input.priorAdmission) || !verifiedActionCustody.has(input.verifiedAction)
    || !input.store || typeof input.store.advance !== "function"
    || !await validateReceizLawfulActionAdmissionV125(input.priorAdmission.receipt)) {
    throw new TypeError("V125_LAWFUL_ACTION_CUSTODY_INVALID");
  }
  const prior = input.priorAdmission.receipt;
  const priorLineage = admittedActionLineage.get(input.priorAdmission);
  const action = input.verifiedAction;
  const proof = action.proof;
  if (!priorLineage || !priorLineage.has(prior.admissionDigest)
    || proof.proofDigest !== prior.proofDigest || action.enclosingArtifactId !== prior.enclosingArtifactId
    || action.genesisOwnerReceizId !== prior.genesisOwnerReceizId
    || action.currentOwnerReceizId === prior.currentOwnerReceizId
    || action.ownershipAppendCount !== prior.ownershipAppendCount + 1
    || action.priorOwnershipHistoryDigest !== prior.ownershipHistoryDigest) {
    throw new TypeError("V125_LAWFUL_ACTION_CUSTODY_INVALID");
  }
  const basis = {
    ...prior,
    enclosingArtifactDigest: action.enclosingArtifactDigest,
    currentOwnerReceizId: action.currentOwnerReceizId,
    ownershipHistoryDigest: action.ownershipHistoryDigest,
    ownershipAppendCount: action.ownershipAppendCount,
    priorAdmissionDigest: prior.admissionDigest,
  } as Record<string, unknown>;
  delete basis.admissionDigest;
  const receipt = frozen({ ...basis, admissionDigest: await digestReceizCanonicalV122(basis) }) as ReceizLawfulActionAdmissionReceiptV125;
  if (!await validateReceizLawfulActionAdmissionV125(receipt)) throw new TypeError("V125_LAWFUL_ACTION_CUSTODY_INVALID");
  const stored = await input.store.advance(frozen({
    proofDigest: proof.proofDigest,
    enclosingArtifactId: action.enclosingArtifactId,
    membershipId: prior.membershipId,
    currentOwnerReceizId: action.currentOwnerReceizId,
    priorAdmissionDigest: prior.admissionDigest,
    idempotencyKey: proof.idempotencyKey,
    admissionDigest: receipt.admissionDigest,
  }));
  if (stored.status !== "admitted") return frozen({
    status: "zero-write" as const,
    code: "ACTION_CUSTODY_HEAD_CONFLICT" as const,
    writesPerformed: 0 as const,
    existingAdmissionDigest: stored.existingAdmissionDigest,
  });
  const admitted = frozen({ status: "admitted" as const, receipt });
  admittedActionCustody.add(admitted);
  admittedActionLineage.set(admitted, frozen(new Set([...priorLineage, receipt.admissionDigest])));
  return admitted;
}

export async function deriveReceizLawfulActionValueHeadV125(input: Readonly<{
  admission: ReceizAdmittedLawfulActionV125;
  valuationKai: string;
  priorValueHead: ReceizLawfulActionValueHeadV125 | null;
}>): Promise<ReceizLawfulActionValueHeadV125> {
  exactKeys(input, ["admission", "valuationKai", "priorValueHead"], "V125_LAWFUL_ACTION_VALUE_HEAD_INVALID");
  if (!admittedActionCustody.has(input.admission) || !await validateReceizLawfulActionAdmissionV125(input.admission.receipt)) {
    throw new TypeError("V125_LAWFUL_ACTION_ADMISSION_RUNTIME_REQUIRED");
  }
  const receipt = input.admission.receipt;
  const admissionLineage = admittedActionLineage.get(input.admission);
  if (!admissionLineage || !admissionLineage.has(receipt.admissionDigest)) {
    throw new TypeError("V125_LAWFUL_ACTION_ADMISSION_RUNTIME_REQUIRED");
  }
  const settlementPhiMicro = deriveReceizLawfulActionPhiMicroV125(receipt.startKai, receipt.completionKai, input.valuationKai);
  if (input.priorValueHead !== null) {
    if (!await validateReceizLawfulActionValueHeadV125(input.priorValueHead)
      || input.priorValueHead.membershipId !== receipt.membershipId
      || input.priorValueHead.enclosingArtifactId !== receipt.enclosingArtifactId
      || !admissionLineage.has(input.priorValueHead.actionAdmissionDigest)
      || BigInt(input.valuationKai) <= BigInt(input.priorValueHead.valuationKai)) {
      throw new TypeError("V125_LAWFUL_ACTION_PRIOR_VALUE_HEAD_INVALID");
    }
  }
  const basis = {
    schema: "receiz.lawful-action-value-head.v125" as const,
    membershipId: receipt.membershipId,
    actionAdmissionDigest: receipt.admissionDigest,
    enclosingArtifactId: receipt.enclosingArtifactId,
    enclosingArtifactDigest: receipt.enclosingArtifactDigest,
    lawDigest: receipt.lawDigest,
    registryDigest: receipt.registryDigest,
    currentOwnerReceizId: receipt.currentOwnerReceizId,
    ownershipHistoryDigest: receipt.ownershipHistoryDigest,
    startKai: receipt.startKai,
    completionKai: receipt.completionKai,
    valuationKai: input.valuationKai,
    universalValueLawId: RECEIZ_V125_UNIVERSAL_VALUE_LAW_ID,
    projectorVersion: RECEIZ_V125_LAWFUL_ACTION_VALUE_PROJECTOR_VERSION,
    settlementPhiMicro,
    priorValueHeadDigest: input.priorValueHead?.valueHeadDigest ?? null,
    authority: frozen({
      valueHeadIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
      developerDeclaredAmount: false as const,
      oneSpendableMembership: true as const,
    }),
  };
  return frozen({ ...basis, valueHeadDigest: await digestReceizCanonicalV122(basis) });
}

export async function planReceizLawfulActionSettlementV125(input: Readonly<{
  valueHead: ReceizLawfulActionValueHeadV125;
  amountPhiMicro: string;
  destinationSubjectId: string;
  expectedDestinationHead: string;
  usdPerPhiMicrocents: string;
  priceBasis: unknown;
}>): Promise<ReceizLawfulActionExecutionV125> {
  exactKeys(input, [
    "valueHead", "amountPhiMicro", "destinationSubjectId", "expectedDestinationHead", "usdPerPhiMicrocents", "priceBasis",
  ], "V125_LAWFUL_ACTION_SETTLEMENT_INVALID");
  if (!await validateReceizLawfulActionValueHeadV125(input.valueHead)
    || !/^[1-9][0-9]*$/.test(input.amountPhiMicro)
    || BigInt(input.amountPhiMicro) > BigInt(input.valueHead.settlementPhiMicro)) {
    throw new TypeError("V125_LAWFUL_ACTION_SETTLEMENT_AMOUNT_INVALID");
  }
  const intent = await planReceizSettlementV122({
    amountPhiMicro: input.amountPhiMicro,
    sourceProofObjectId: input.valueHead.enclosingArtifactDigest,
    sourceValueHead: input.valueHead.valueHeadDigest,
    destinationSubjectId: input.destinationSubjectId,
    expectedDestinationHead: input.expectedDestinationHead,
    usdPerPhiMicrocents: input.usdPerPhiMicrocents,
    priceBasis: input.priceBasis,
    idempotencyKey: `receiz:v125:lawful-action:${await digestReceizCanonicalV122({
      valueHeadDigest: input.valueHead.valueHeadDigest,
      amountPhiMicro: input.amountPhiMicro,
      destinationSubjectId: input.destinationSubjectId,
      expectedDestinationHead: input.expectedDestinationHead,
    })}`,
  });
  const basis = {
    schema: "receiz.lawful-action-execution.v125" as const,
    valueHeadDigest: input.valueHead.valueHeadDigest,
    membershipId: input.valueHead.membershipId,
    intent: intent as ReceizLawfulActionExecutionV125["intent"],
    authority: frozen({
      executionPlanIsProofAuthority: false as const,
      strongerTruth: "settlement-proof-object" as const,
      existingExecutionRail: "receiz.world.value-intent.v122" as const,
    }),
  };
  const execution = frozen({ ...basis, executionDigest: await digestReceizCanonicalV122(basis) });
  if (!await validateReceizLawfulActionExecutionV125(execution)) throw new TypeError("V125_LAWFUL_ACTION_SETTLEMENT_INVALID");
  return execution;
}

export {
  deriveReceizLawfulActionPhiMicroV125,
  serializeReceizLawfulActionV125,
  validateReceizLawfulActionAdmissionV125,
  validateReceizLawfulActionExecutionV125,
  validateReceizLawfulActionLawV125,
  validateReceizLawfulActionProofV125,
  validateReceizLawfulActionValueHeadV125,
};
export type {
  ReceizLawfulActionAdmissionReceiptV125,
  ReceizLawfulActionExecutionV125,
  ReceizLawfulActionLawV125,
  ReceizLawfulActionProofV125,
  ReceizLawfulActionValueHeadV125,
};
