import { createReceizCapabilityIssuerResolver, verifyReceizArtifactAdmission, verifyReceizVerifiedActorReference } from "./artifactAdmission.js";
import type { ReceizVerifiedIdentityArtifactAdmission } from "./artifactAdmissionTypes.js";
import { isReceizVerifiedCapability, type ReceizVerifiedCapability, type ReceizCapabilityContext } from "./capabilityAuthority.js";
import type { ReceizCommitDomainId, ReceizPlanDigest } from "./artifactTransition.js";
import { digestReceizAuthority } from "./authorityEncoding.js";
import { type ReceizConstitutionJson } from "./constitution.js";
import { sha256ReceizBytes } from "./artifacts.js";
import { createReceizPortableAssetDocument, serializeReceizPortableAssetDocument, replaceReceizPortableProofHistoryBytes } from "./portableAsset.js";
import { createReceizProofHistoryNode, normalizeReceizProofHistory } from "./proofHistory.js";
import { RECEIZ_CURRENT_REGISTRY_DIGEST } from "./releaseIdentity.js";
import { admitReceizKksV1ProofCoordinate } from "./v125KaiAuthority.js";
import { createReceizAttestationApplicationV125, verifyAndOpenReceizAttestationArtifactV125 } from "./v125Attestation.js";
import { readReceizHeldAttestationDomainV125, type ReceizAttestationAuthorityV125 } from "./v125AttestationAuthority.js";
import { createReceizCredentialV125, verifyAndOpenReceizCredentialArtifactV125 } from "./v125Credential.js";
import { openVerifiedReceizV125ArtifactPayloadBytes, readReceizV125BindingAdmission, type ReceizV125EnclosingArtifactVerifierOptions } from "./v125ArtifactBinding.js";
import { transportReceizSealedArtifactV124, type ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
import type { ReceizSealedArtifact } from "./artifacts.js";
import type { ReceizAdmissionUnitOfWork } from "./admissionStore.js";
import { canonicalizeReceizV122 } from "./v122Canonical.js";
import { closedRecord, freeze } from "./v124Contracts.js";

export type ReceizInitialSourcePlanV125 = Readonly<{
  schema: "receiz.initial-source-plan.v125";
  kind: "attestation" | "credential";
  resource: string;
  ownerReceizId: string;
  actorId: string;
  commitDomain: ReceizCommitDomainId;
  operation: "attestation.create" | "credential.create";
  planDigest: ReceizPlanDigest;
  confirmationDigest: string;
  idempotencyDigest: string;
  proposedGenesisHead: string;
  payloadSha256: string;
  kaiUpulse: string;
  writesPerformed: 0;
  authority: Readonly<{ planIsProofAuthority: false; genesisIsAccepted: false; strongerTruth: "sealed-receiz-proof-object" }>;
}>;
type Common = Readonly<{
  authority: ReceizAttestationAuthorityV125;
  verifiedActorEvidence: unknown;
  expectedDomainArtifactDigest: string;
  expectedDomainHead: string;
  kksCoordinate: unknown;
  commitDomain: ReceizCommitDomainId;
  idempotencyKey: string;
}>;
const COMMON_KEYS = ["authority", "verifiedActorEvidence", "expectedDomainArtifactDigest", "expectedDomainHead",
  "kksCoordinate", "commitDomain", "idempotencyKey"];
function snapshot<T extends Common>(input: T): T {
  const { authority, verifiedActorEvidence, ...material } = input;
  return { ...structuredClone(material), authority, verifiedActorEvidence } as T;
}
type Held = Readonly<{ authority: ReceizAttestationAuthorityV125; actor: ReceizVerifiedIdentityArtifactAdmission;
  payloadBytes: Uint8Array; sourceBindings: ReceizConstitutionJson }>;
const plans = new WeakMap<object, Held>();
function held(plan: ReceizInitialSourcePlanV125): Held {
  const value = plans.get(plan); if (!value) throw new TypeError("V125_INITIAL_PLAN_NOT_SDK_ISSUED"); return value;
}
function invalid(code: string): never { throw new TypeError(`V125_INITIAL_${code}`); }
async function actorAndDomain(input: Common) {
  const domain = readReceizHeldAttestationDomainV125(input.authority);
  if (input.expectedDomainArtifactDigest !== input.authority.domainAuthorityArtifactSha256
    || input.expectedDomainHead !== input.authority.acceptedDomainHead) invalid("DOMAIN_SOURCE_MISMATCH");
  if (input.commitDomain?.scheme !== "receiz-commit-domain.v1" || !input.commitDomain.value.trim()
    || typeof input.idempotencyKey !== "string" || !input.idempotencyKey.trim()) invalid("INPUT_INVALID");
  const actor = await verifyReceizArtifactAdmission(input.verifiedActorEvidence);
  if ("code" in actor || actor.profile !== "identity" || actor.verdict !== "canonical-identity") invalid("IDENTITY_REQUIRED");
  const reference = await verifyReceizVerifiedActorReference(actor.actor, actor);
  if ("code" in reference) invalid("IDENTITY_REQUIRED");
  const coordinate = await admitReceizKksV1ProofCoordinate(input.kksCoordinate, { expectedPreviousKaiSigilProofHead: null });
  return { domain, actor, coordinate };
}
async function prepare(input: Common, kind: ReceizInitialSourcePlanV125["kind"], actor: ReceizVerifiedIdentityArtifactAdmission,
  payload: unknown, ownerReceizId: string, provenanceRoot: string, sourceBindings: ReceizConstitutionJson) {
  const coordinate = await admitReceizKksV1ProofCoordinate(input.kksCoordinate, { expectedPreviousKaiSigilProofHead: null });
  const portable = await createReceizPortableAssetDocument({ assetType: "proof_object",
    payload: { mimeType: `application/vnd.receiz.${kind}+json`, bytes: new TextEncoder().encode(canonicalizeReceizV122(payload)) },
    ownership: { ownerReceizId, custody: "current", proofRef: "genesis" }, provenance: { root: provenanceRoot, appends: [] }, settlement: { state: "none" } });
  const operation = kind === "attestation" ? "attestation.create" : "credential.create";
  const identity = { artifactSha256: actor.artifactSha256, actor: actor.actor };
  const source = { domainArtifactSha256: input.authority.domainAuthorityArtifactSha256,
    acceptedDomainHead: input.authority.acceptedDomainHead, domainProofObjectId: input.authority.domainAuthorityProofObjectId,
    domainDigest: input.authority.domainDigest, identity, sourceBindings };
  const node = await createReceizProofHistoryNode({ artifactId: portable.payload.sha256, registryDigest: RECEIZ_CURRENT_REGISTRY_DIGEST,
    parentDigests: [], kaiPulse: coordinate.kaiPulse,
    receipt: { schema: "receiz.initial-source.v125", operation, ...source } as unknown as ReceizConstitutionJson,
    event: { type: "ownership.transition", fromOwnerReceizId: null, toOwnerReceizId: ownerReceizId },
    namespaceData: { "receiz.kks-v1": coordinate as unknown as ReceizConstitutionJson } });
  const history = await normalizeReceizProofHistory({ artifactId: portable.payload.sha256, registryDigest: RECEIZ_CURRENT_REGISTRY_DIGEST,
    nodes: [node], verifyReceipt: async (receipt, expected) => await digestReceizAuthority("receipt", "receiz.proof-history-receipt.v111", receipt) === expected });
  const payloadBytes = await replaceReceizPortableProofHistoryBytes(serializeReceizPortableAssetDocument(portable), history);
  const basis = { kind, resource: portable.payload.sha256, ownerReceizId, actorId: actor.actor.actorId,
    commitDomain: structuredClone(input.commitDomain), operation, proposedGenesisHead: node.nodeDigest,
    payloadSha256: await sha256ReceizBytes(payloadBytes), kaiUpulse: coordinate.kaiUpulse,
    source, idempotencyDigest: await digestReceizAuthority("idempotency", "receiz.initial-source-idempotency.v125", {
      commitDomain: input.commitDomain, actorId: actor.actor.actorId, operation, key: input.idempotencyKey }) } as const;
  const planDigest: ReceizPlanDigest = { algorithm: "sha-256", binds: "artifact-append-plan",
    value: await digestReceizAuthority("plan", "receiz.initial-source-plan.v125", basis) };
  const plan = freeze({ schema: "receiz.initial-source-plan.v125" as const, ...basis, planDigest,
    confirmationDigest: await digestReceizAuthority("confirmation", "receiz.initial-source-confirmation.v125", { planDigest }),
    writesPerformed: 0 as const, authority: { planIsProofAuthority: false as const, genesisIsAccepted: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const } });
  plans.set(plan, { authority: input.authority, actor, payloadBytes: payloadBytes.slice(), sourceBindings });
  return plan;
}
export async function planReceizInitialAttestationSourceV125(input: Common & Readonly<{
  application: Omit<Parameters<typeof createReceizAttestationApplicationV125>[0], "domain" | "createdKai">;
}>): Promise<ReceizInitialSourcePlanV125> {
  closedRecord(input, [...COMMON_KEYS, "application"], "V125_INITIAL_INPUT_INVALID");
  input = snapshot(input);
  closedRecord(input.application, ["applicationId", "credentialType", "subjectId", "applicantReceizId", "claimSet", "evidenceBundle"], "V125_INITIAL_INPUT_INVALID");
  const { domain, actor, coordinate } = await actorAndDomain(input);
  if (actor.actor.actorId !== input.application.applicantReceizId) invalid("APPLICANT_IDENTITY_MISMATCH");
  const genesis = await createReceizAttestationApplicationV125({ ...input.application, domain, createdKai: coordinate.kaiUpulse }, input.authority);
  return prepare(input, "attestation", actor, { domain, genesis, events: [] }, genesis.applicantReceizId, genesis.applicationId, {});
}
export async function planReceizInitialCredentialSourceV125(input: Common & Readonly<{
  issuanceSource: ReceizPortableSealedArtifactV124;
  expectedIssuanceArtifactDigest: string;
  expectedIssuanceHead: string;
  verifier: ReceizV125EnclosingArtifactVerifierOptions;
}>): Promise<ReceizInitialSourcePlanV125> {
  closedRecord(input, [...COMMON_KEYS, "issuanceSource", "expectedIssuanceArtifactDigest", "expectedIssuanceHead", "verifier"], "V125_INITIAL_INPUT_INVALID");
  input = snapshot(input);
  const { actor, coordinate } = await actorAndDomain(input);
  const source = await verifyAndOpenReceizAttestationArtifactV125({ artifact: input.issuanceSource, verifier: input.verifier }, input.authority);
  const opened = await openVerifiedReceizV125ArtifactPayloadBytes({ artifact: input.issuanceSource, verifier: input.verifier,
    enclosingProofError: "V125_INITIAL_ISSUANCE_SOURCE_INVALID", payloadError: "V125_INITIAL_ISSUANCE_PAYLOAD_INVALID" });
  const admission = readReceizV125BindingAdmission(opened);
  if (source.artifactSha256 !== input.expectedIssuanceArtifactDigest || source.state.status !== "issued"
    || admission.profile !== "portable-state" || admission.verdict !== "bearer-recovery" || !admission.proofHistory
    || admission.proofHistory.headDigests.length !== 1 || admission.proofHistory.headDigests[0] !== input.expectedIssuanceHead
    || admission.proofHistory.currentOwnerReceizId !== source.state.applicantReceizId) invalid("ISSUANCE_SOURCE_MISMATCH");
  const sourceHead = admission.proofHistory.nodes.find((node) => node.nodeDigest === input.expectedIssuanceHead)!;
  const sourceKai = await admitReceizKksV1ProofCoordinate(sourceHead.namespaceData["receiz.kks-v1"]);
  if (BigInt(coordinate.kaiUpulse) < BigInt(sourceKai.kaiUpulse) || BigInt(coordinate.kaiUpulse) < BigInt(source.state.latestKai)) invalid("ISSUANCE_KAI_NONCAUSAL");
  const issuance = { attestation: { domain: source.domain, genesis: source.genesis, events: source.state.history },
    proofObjectId: source.proofObjectId, custodyHead: input.expectedIssuanceHead, predecessorCredentialId: null, predecessorLifecycle: null };
  const credential = await createReceizCredentialV125(issuance, input.authority);
  if (actor.actor.actorId !== credential.issuerReceizId || source.ownerReceizId !== credential.holderReceizId) invalid("ISSUER_IDENTITY_MISMATCH");
  const resolveIssuer = await createReceizCapabilityIssuerResolver({ identityAdmissions: [actor], revokedIssuerKeyIds: new Set() });
  const issuer = await resolveIssuer(credential.issuerAuthorization.actorKeyId);
  if (!issuer || issuer.publicKeyRawB64u !== credential.issuerAuthorization.actorPublicKeyRawB64u
    || issuer.alg !== credential.issuerAuthorization.actorKeyAlg) invalid("ISSUER_IDENTITY_MISMATCH");
  return prepare(input, "credential", actor, { issuance, credential, events: [] }, credential.holderReceizId, source.proofObjectId,
    { issuanceSource: structuredClone(input.issuanceSource), issuanceArtifactSha256: source.artifactSha256, issuanceProofObjectId: source.proofObjectId,
      acceptedIssuanceHistoryHead: input.expectedIssuanceHead, acceptedApplicationHead: source.acceptedHead });
}
export function receizInitialSourceCapabilityContextV125(plan: ReceizInitialSourcePlanV125): ReceizCapabilityContext {
  const custody = held(plan);
  return freeze({ actorId: plan.actorId, tenantId: null, authorityProfile: "artifact-local" as const,
    operation: plan.operation, resourceId: plan.resource, registryDigest: custody.actor.admissionProof.registryDigest,
    maximumEffects: { initialSources: 1 }, operationConstraints: { planDigest: plan.planDigest, commitDomain: plan.commitDomain } });
}
async function capability(plan: ReceizInitialSourcePlanV125, value: ReceizVerifiedCapability) {
  const context = receizInitialSourceCapabilityContextV125(plan);
  if (!isReceizVerifiedCapability(value) || value.payload.actorId !== context.actorId || value.payload.tenantId !== null
    || value.payload.authorityProfile !== context.authorityProfile || !value.payload.operations.includes(context.operation)
    || !value.payload.resourceScopes.includes(plan.resource) || value.payload.registryDigest !== context.registryDigest
    || canonicalizeReceizV122(value.payload.operationConstraints) !== canonicalizeReceizV122(context.operationConstraints)
    || (value.payload.maximumEffects.initialSources ?? 0) < 1
    || BigInt(value.payload.validFromKai) > BigInt(plan.kaiUpulse) || BigInt(value.payload.expiresAtKai) <= BigInt(plan.kaiUpulse)) invalid("CAPABILITY_MISMATCH");
  const resolveIssuer = await createReceizCapabilityIssuerResolver({ identityAdmissions: [held(plan).actor], revokedIssuerKeyIds: new Set() });
  if (!await resolveIssuer(value.payload.issuerKeyId)) invalid("CAPABILITY_IDENTITY_MISMATCH");
}
export type ReceizInitialSourceSealerV125 = (input: Readonly<{ payloadBytes: Uint8Array; ownerReceizId: string;
  proposedGenesisHead: string; kaiUpulse: string; predecessor: null }>) => Promise<ReceizSealedArtifact>;
export type ReceizInitialSourceCommitV125 = Readonly<{ plan: ReceizInitialSourcePlanV125; sourceArtifact: ReceizPortableSealedArtifactV124 }>;
const commits = new WeakMap<object, { capability: ReceizVerifiedCapability; verifier: ReceizV125EnclosingArtifactVerifierOptions }>();
export type ReceizInitialSourceStoreV125 = Readonly<{
  commitDomain: ReceizCommitDomainId;
  findInitialSource(plan: ReceizInitialSourcePlanV125): Promise<ReceizPortableSealedArtifactV124 | null>;
  commitInitialSource(unit: ReceizInitialSourceCommitV125): Promise<Readonly<{ acceptance: "committed" | "idempotent"; sourceArtifact: ReceizPortableSealedArtifactV124 }>>;
}>;
export function readReceizInitialSourcePlanStorageV125(plan: ReceizInitialSourcePlanV125) {
  held(plan);
  return { commandDigest: plan.planDigest.value, idempotencyKey: `${plan.commitDomain.value}\u0000initial\u0000${plan.idempotencyDigest}`,
    aggregateId: `${plan.commitDomain.value}\u0000${plan.resource}` };
}
async function reopen(plan: ReceizInitialSourcePlanV125, artifact: ReceizPortableSealedArtifactV124, verifier: ReceizV125EnclosingArtifactVerifierOptions) {
  const custody = held(plan);
  const opened = await openVerifiedReceizV125ArtifactPayloadBytes({ artifact, verifier,
    enclosingProofError: "V125_INITIAL_SOURCE_INVALID", payloadError: "V125_INITIAL_PAYLOAD_INVALID" });
  const admission = readReceizV125BindingAdmission(opened);
  if (opened.proofObjectId !== plan.resource || opened.ownerReceizId !== plan.ownerReceizId
    || opened.artifactPayloadSha256 !== plan.payloadSha256 || admission.profile !== "portable-state"
    || admission.verdict !== "bearer-recovery" || !admission.proofHistory || admission.proofHistory.nodes.length !== 1
    || admission.proofHistory.headDigests[0] !== plan.proposedGenesisHead
    || admission.verifiedPayload.bytes.length !== custody.payloadBytes.length
    || admission.verifiedPayload.bytes.some((byte, i) => byte !== custody.payloadBytes[i])) invalid("SEALED_PLAN_MISMATCH");
  const node = admission.proofHistory.nodes[0]!;
  const coordinate = await admitReceizKksV1ProofCoordinate(node.namespaceData["receiz.kks-v1"], { expectedPreviousKaiSigilProofHead: null });
  if (coordinate.kaiUpulse !== plan.kaiUpulse || node.parentDigests.length) invalid("KKS_MISMATCH");
  return plan.kind === "attestation" ? verifyAndOpenReceizAttestationArtifactV125({ artifact, verifier }, custody.authority)
    : verifyAndOpenReceizCredentialArtifactV125({ artifact, verifier }, custody.authority);
}
/** Internal store choreography: exact retained bytes are canonically reopened, never trusted by digest alone. */
export async function verifyReceizInitialSourceCommitV125(unit: ReceizInitialSourceCommitV125,
  artifact: ReceizPortableSealedArtifactV124, commitDomain: ReceizCommitDomainId): Promise<ReceizAdmissionUnitOfWork> {
  const custody = commits.get(unit); if (!custody) invalid("COMMIT_NOT_SDK_ISSUED");
  const plan = unit.plan;
  if (canonicalizeReceizV122(commitDomain) !== canonicalizeReceizV122(plan.commitDomain)) invalid("COMMIT_DOMAIN_MISMATCH");
  await capability(plan, custody.capability);
  if (canonicalizeReceizV122(artifact) !== canonicalizeReceizV122(unit.sourceArtifact)) invalid("RETAINED_SOURCE_MISMATCH");
  await reopen(plan, artifact, custody.verifier);
  const storage = readReceizInitialSourcePlanStorageV125(plan);
  return { schema: "receiz.admission.unit-of-work.v1", ...storage, expectedRevision: 0, expectedHeadDigest: null,
    acceptedCommand: { schema: "receiz.initial-source-command.v125", planDigest: plan.planDigest.value, actorId: plan.actorId },
    events: [{ schema: "receiz.initial-source-accepted.v125", artifactSha256: artifact.artifactSha256 }],
    nextHead: { revision: 1, digest: plan.proposedGenesisHead, state: { artifactDigest: artifact.artifactSha256 } },
    resourceEffects: { initialSources: 1 }, receipt: { schema: "receiz.initial-source-receipt.v125", artifactSha256: artifact.artifactSha256,
      acceptedHead: plan.proposedGenesisHead, receiptIsProofAuthority: false, strongerTruth: "sealed-receiz-proof-object" },
    outboxIntents: [], auditReference: { planDigest: plan.planDigest.value, capabilityDigest: custody.capability.digest } };
}
export async function applyReceizInitialSourceV125(input: Readonly<{ plan: ReceizInitialSourcePlanV125;
  confirmationDigest: string; capability: ReceizVerifiedCapability; sealer: ReceizInitialSourceSealerV125;
  store: ReceizInitialSourceStoreV125; verifier: ReceizV125EnclosingArtifactVerifierOptions }>) {
  closedRecord(input, ["plan", "confirmationDigest", "capability", "sealer", "store", "verifier"], "V125_INITIAL_INPUT_INVALID");
  input = { ...input, verifier: structuredClone(input.verifier) };
  const custody = held(input.plan);
  if (input.confirmationDigest !== input.plan.confirmationDigest) invalid("CONFIRMATION_MISMATCH");
  await capability(input.plan, input.capability);
  if (canonicalizeReceizV122(input.store.commitDomain) !== canonicalizeReceizV122(input.plan.commitDomain)) invalid("COMMIT_DOMAIN_MISMATCH");
  const existing = await input.store.findInitialSource(input.plan);
  if (existing) return { sourceArtifact: existing, projection: await reopen(input.plan, existing, input.verifier), writesPerformed: 0 as const };
  const sealed = await input.sealer({ payloadBytes: custody.payloadBytes.slice(), ownerReceizId: input.plan.ownerReceizId,
    proposedGenesisHead: input.plan.proposedGenesisHead, kaiUpulse: input.plan.kaiUpulse, predecessor: null });
  const sourceArtifact = await transportReceizSealedArtifactV124(sealed);
  await reopen(input.plan, sourceArtifact, input.verifier);
  const unit = freeze({ plan: input.plan, sourceArtifact });
  commits.set(unit, { capability: input.capability, verifier: input.verifier });
  const result = await input.store.commitInitialSource(unit);
  // Idempotent racing seals resolve the first accepted exact bytes, never the losing candidate.
  const retained = await input.store.findInitialSource(input.plan);
  if (!retained || canonicalizeReceizV122(retained) !== canonicalizeReceizV122(result.sourceArtifact)) invalid("RETENTION_FAILED");
  return { sourceArtifact: retained, projection: await reopen(input.plan, retained, input.verifier),
    writesPerformed: result.acceptance === "committed" ? 1 as const : 0 as const };
}
