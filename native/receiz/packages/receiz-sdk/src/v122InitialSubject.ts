import { deriveReceizSubjectIdV122, digestReceizCanonicalV122 } from "./v122Canonical.js";
import { createReceizArtifactAdmissionEngineWithSourceContext, readReceizIdentityPublicBinding } from "./artifactAdmission.js";
import { assertRuntimeCustodiedReceizArtifactVerification, type ReceizArtifactVerificationResult } from "./artifactVerification.js";
import { admitReceizKksV1ProofCoordinate } from "./v125KaiAuthority.js";
import { RECEIZ_GENERATED_CURRENT_REGISTRY_DIGEST } from "./currentRegistry.generated.js";
import { RECEIZ_LIVING_SUBJECT_REDUCER_DIGEST } from "./livingSubjects.js";
import type { ReceizSubjectStateV122 } from "./v122Subjects.js";

/** Exact projection extracted from the production v122 subject admission server.
 * This builds subordinate state only; callers must establish enclosing proof and
 * owner admission before using it. It does not issue proof or remote admission.
 */
export async function projectReceizInitialSubjectStateV122(input: Readonly<{
  proof: Readonly<{ proofDigest: string; proofObjectId: string; ownerProofDigest: string; immutableProofVersion: string; subjectType: string }>;
  ownerReceizId: string; idempotencyKey: string; registryDigest: string; reducerDigest: string; kai: number;
}>): Promise<ReceizSubjectStateV122> {
  const { proof, ownerReceizId, idempotencyKey } = input;
  const subjectId = await deriveReceizSubjectIdV122(proof.proofDigest);
  const admittedAtKai = input.kai;
  const idempotencyIdentityDigest = await digestReceizCanonicalV122({ schema: "receiz.subject.idempotency.v122", ownerReceizId, idempotencyKey });
  const ownershipHead = await digestReceizCanonicalV122({ schema: "receiz.subject.ownership.genesis.v122", subjectId, ownerReceizId, ownerProofDigest: proof.ownerProofDigest });
  const genesisHead = await digestReceizCanonicalV122({ schema: "receiz.subject.genesis.v122", subjectId, proofDigest: proof.proofDigest, ownershipHead, registryDigest: input.registryDigest, reducerDigest: input.reducerDigest });
  const receiptBasis = {
    schema: "receiz.subject.admission-receipt.v122" as const,
    subjectId,
    proofObjectId: proof.proofObjectId,
    admittedProofDigest: proof.proofDigest,
    immutableProofVersion: proof.immutableProofVersion,
    ownerReceizId,
    ownerProofDigest: proof.ownerProofDigest,
    genesisHead,
    registryDigest: input.registryDigest,
    reducerDigest: input.reducerDigest,
    kai: admittedAtKai,
    idempotencyIdentityDigest,
    authority: { receiptIsProofAuthority: false as const, strongerTruth: "sealed-receiz-proof-object" as const },
  };
  const receipt = Object.freeze({ ...receiptBasis, receiptDigest: await digestReceizCanonicalV122(receiptBasis) });
  const stateBasis = {
    schema: "receiz.subject.state.v122" as const,
    subjectId,
    proofObjectId: proof.proofObjectId,
    admittedProofDigest: proof.proofDigest,
    immutableProofVersion: proof.immutableProofVersion,
    subjectType: proof.subjectType,
    opaqueNamespaces: Object.freeze([]),
    genesisHead,
    head: genesisHead,
    ownerReceizId,
    ownershipHead,
    ownerProofDigest: proof.ownerProofDigest,
    registryDigest: input.registryDigest,
    reducerDigest: input.reducerDigest,
    admissionReceipt: receipt,
    causalParents: Object.freeze([]),
    accessKeyHead: null,
    replay: { appendCursor: genesisHead, eventCursor: "0" },
    authority: { stateIsProofAuthority: false as const, strongerTruth: "sealed-receiz-proof-object" as const },
  };
  const stateDigest = await digestReceizCanonicalV122(stateBasis);
  const state = Object.freeze({ ...stateBasis, stateDigest });
  return state;
}

/** Private initial subject issuance beneath the existing document and identity
 * primitives. A cloned admission, owner string, or bare pulse cannot authorize it.
 */
export async function createReceizInitialSubjectStateV122(input: Readonly<{
  documentVerification: ReceizArtifactVerificationResult; ownerIdentityAdmission: unknown; kksCoordinate: unknown; idempotencyKey: string;
}>): Promise<ReceizSubjectStateV122> {
  const { documentVerification, ownerIdentityAdmission, idempotencyKey } = input;
  const kksCoordinate = structuredClone(input.kksCoordinate);
  const identity = await readReceizIdentityPublicBinding(ownerIdentityAdmission);
  assertRuntimeCustodiedReceizArtifactVerification(documentVerification);
  const admit = await createReceizArtifactAdmissionEngineWithSourceContext(ownerIdentityAdmission);
  const document = await admit(documentVerification, { profile: "document" });
  if (document.profile !== "document" || document.verdict !== "verified-document") throw new TypeError("V122_INITIAL_SUBJECT_DOCUMENT_ADMISSION_REQUIRED");
  if (!identity.signatureVerified || !identity.artifactOwnerReceizId || document.ownerReceizId !== identity.artifactOwnerReceizId) throw new TypeError("V122_INITIAL_SUBJECT_OWNER_MISMATCH");
  if (document.artifactSha256 === identity.artifactSha256) throw new TypeError("V122_INITIAL_SUBJECT_DISTINCT_SOURCE_REQUIRED");
  if (typeof idempotencyKey !== "string" || !idempotencyKey.trim()) throw new TypeError("V122_INITIAL_SUBJECT_IDEMPOTENCY_REQUIRED");
  const coordinate = await admitReceizKksV1ProofCoordinate(kksCoordinate, { expectedPreviousKaiSigilProofHead: null });
  const kai = Number(coordinate.kaiPulse);
  if (!Number.isSafeInteger(kai) || kai < 0) throw new TypeError("V122_INITIAL_SUBJECT_KAI_INVALID");
  const ownerReceizId = identity.artifactOwnerReceizId;
  const ownerProofDigest = await digestReceizCanonicalV122({ schema: "receiz.subject.object-carried-owner.v122", proofObjectId: document.artifactId, admittedProofDigest: document.artifactSha256, ownerReceizId });
  return projectReceizInitialSubjectStateV122({
    proof: { proofDigest: document.artifactSha256, proofObjectId: document.artifactId, ownerProofDigest,
      immutableProofVersion: document.artifactSha256, subjectType: document.artifactId.split(":", 1)[0] || "receiz-proof-object" },
    ownerReceizId, idempotencyKey, kai, registryDigest: RECEIZ_GENERATED_CURRENT_REGISTRY_DIGEST, reducerDigest: RECEIZ_LIVING_SUBJECT_REDUCER_DIGEST,
  });
}
