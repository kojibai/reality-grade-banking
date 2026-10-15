import { RECEIZ_GENERATED_V126_REGISTRY_DIGEST } from "./v126Registry.generated.js";
import { RECEIZ_CURRENT_CONSTITUTION_REGISTRY, RECEIZ_GENERATED_CURRENT_REGISTRY_DIGEST } from "./currentRegistry.generated.js";
import {
  RECEIZ_CURRENT_RELEASE_FRAME,
  RECEIZ_CURRENT_RELEASE_THEME,
  RECEIZ_CURRENT_RELEASE_VERSION,
} from "./currentRelease.generated.js";
import { RECEIZ_GENERATED_V114_REGISTRY_DIGEST } from "./v114Registry.generated.js";
import { RECEIZ_GENERATED_V115_REGISTRY_DIGEST } from "./v115Registry.generated.js";
import { RECEIZ_GENERATED_V116_REGISTRY_DIGEST } from "./v116Registry.generated.js";
import { RECEIZ_GENERATED_V117_REGISTRY_DIGEST } from "./v117Registry.generated.js";
import { RECEIZ_GENERATED_V118_REGISTRY_DIGEST } from "./v118Registry.generated.js";
import { RECEIZ_GENERATED_V119_REGISTRY_DIGEST } from "./v119Registry.generated.js";
import { RECEIZ_GENERATED_V120_REGISTRY_DIGEST } from "./v120Registry.generated.js";
import { RECEIZ_GENERATED_V121_REGISTRY_DIGEST } from "./v121Registry.generated.js";
import { RECEIZ_GENERATED_V122_REGISTRY_DIGEST } from "./v122Registry.generated.js";
import { RECEIZ_GENERATED_V123_REGISTRY_DIGEST } from "./v123Registry.generated.js";
import { RECEIZ_GENERATED_V124_REGISTRY_DIGEST } from "./v124Registry.generated.js";
import { RECEIZ_GENERATED_V125_REGISTRY_DIGEST } from "./v125Registry.generated.js";
import {
  createReceizV119ReleaseAuthorityBoundary,
  createReceizV120ReleaseAuthorityBoundary,
  createReceizV121ReleaseAuthorityBoundary,
  createReceizV122ReleaseAuthorityBoundary,
  createReceizV123ReleaseAuthorityBoundary,
  createReceizV125ReleaseAuthorityBoundary,
  type ReceizReleaseAuthorityBoundary,
} from "./registryArtifact.js";

export const RECEIZ_RELEASE_VERSION = RECEIZ_CURRENT_RELEASE_VERSION;
// Distribution versions do not redefine the byte-identical admitted ruleset.
export const RECEIZ_RULESET_VERSION = RECEIZ_CURRENT_CONSTITUTION_REGISTRY.version;
export const RECEIZ_RELEASE_THEME = RECEIZ_CURRENT_RELEASE_THEME;
export const RECEIZ_RELEASE_FRAME = RECEIZ_CURRENT_RELEASE_FRAME;
export const RECEIZ_V106_REGISTRY_DIGEST = "bf851c209e807309672c0f466411baa5607ce6b3195fe4eb16755edfeb7f5a1a" as const;
export const RECEIZ_V106_REGISTRY_ARTIFACT = "docs/releases/v106.0.0-constitution-registry.json" as const;
function deepFreezeRegistryTrustHistory<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value)) deepFreezeRegistryTrustHistory(nested);
    Object.freeze(value);
  }
  return value;
}

export const RECEIZ_REGISTRY_GOVERNANCE_TRUST_HISTORY = deepFreezeRegistryTrustHistory([
  {
    keyId: "receiz.governance.ed25519.f5a236af5a6646f1",
    alg: "Ed25519",
    publicKeyRawB64u: "KUEXCMUePccoNA65x-4JILQsPJs4Df0kps66F4yd1EY",
    purposes: ["receiz.constitution.registry"],
    validFromKai: "0",
    expiresAtKai: null,
    revokedAtKai: null,
    governanceStatus: "retired",
    governanceCustodyClass: "bootstrap-local",
    trustSource: "receiz-governance-keyring-v1",
  },
  {
    keyId: "receiz.governance.ed25519.e442cc2779f379f1",
    alg: "Ed25519",
    publicKeyRawB64u: "4iOxY-V1t1J5Tp5DYjG9wIVDKaI0Y1K8-5H5qCNBLCQ",
    purposes: ["receiz.constitution.registry"],
    validFromKai: "0",
    expiresAtKai: null,
    revokedAtKai: null,
    governanceStatus: "retired",
    governanceCustodyClass: "managed-kms",
    trustSource: "receiz-governance-keyring-v1",
  },
  {
    keyId: "receiz.governance.ed25519.8c0d360c4c119c6b",
    alg: "Ed25519",
    publicKeyRawB64u: "-Zsq6Nh5ZzcpuxSa2OpGvZMuqp4j15XPf4H1Idtmxtw",
    purposes: ["receiz.constitution.registry"],
    validFromKai: "0",
    expiresAtKai: null,
    revokedAtKai: null,
    governanceStatus: "retired",
    governanceCustodyClass: "managed-kms",
    trustSource: "receiz-governance-keyring-v1",
  },
  {
    keyId: "receiz.governance.ed25519.2a7c4651102d1498",
    alg: "Ed25519",
    publicKeyRawB64u: "kivuxk4FuBjUYy-m31zUEbUopBMd25Mn2IW0UkUuotE",
    purposes: ["receiz.constitution.registry"],
    validFromKai: "0",
    expiresAtKai: null,
    revokedAtKai: null,
    governanceStatus: "active",
    governanceCustodyClass: "managed-kms",
    trustSource: "receiz-governance-keyring-v1",
  },
] as const);
export const RECEIZ_V107_REGISTRY_DIGEST = "4d0caa6172a69c3bf5817c1c35db5630e555b5d6d824091d45a90fb426b86ef6" as const;
export const RECEIZ_V107_REGISTRY_ARTIFACT = "docs/releases/v107.0.0-constitution-registry.json" as const;
export const RECEIZ_V108_REGISTRY_DIGEST = "126ca9283fee4ef4c398dbcb958e861cbea191724fdab8eb08df55ff0c14bb79" as const;
export const RECEIZ_V108_REGISTRY_ARTIFACT = "docs/releases/v108.0.0-constitution-registry.json" as const;
export const RECEIZ_V108_REGISTRY_EFFECTIVE_KAI = "13182786" as const;
export const RECEIZ_V108_REGISTRY_CREATED_AT = "2026-07-18T04:38:26.799Z" as const;
export const RECEIZ_V109_REGISTRY_DIGEST = "17f76b37c9fcd46f710239b5c1660b03cc34ec64bed30d1cc45c18d5d40eab70" as const;
export const RECEIZ_V109_REGISTRY_ARTIFACT = "docs/releases/v109.0.0-constitution-registry.json" as const;
export const RECEIZ_V109_REGISTRY_EFFECTIVE_KAI = "13184788" as const;
export const RECEIZ_V109_REGISTRY_CREATED_AT = "2026-07-18T07:33:09.542Z" as const;
export const RECEIZ_V110_REGISTRY_DIGEST = "824aa4af849c4840ba94535798eab36e45d514703b6ae0cd30d4aa53f3c896e4" as const;
export const RECEIZ_V110_REGISTRY_ARTIFACT = "docs/releases/v110.0.0-constitution-registry.json" as const;
export const RECEIZ_V110_REGISTRY_EFFECTIVE_KAI = "13185897" as const;
export const RECEIZ_V110_REGISTRY_CREATED_AT = "2026-07-18T09:10:00.000Z" as const;
export const RECEIZ_V111_REGISTRY_DIGEST = "cf02d0bce6ad1541cfe84e27bfb1036777b29616bf8a1e5aeafb899a945e359a" as const;
export const RECEIZ_V111_REGISTRY_ARTIFACT = "docs/releases/v111.0.0-constitution-registry.json" as const;
export const RECEIZ_V111_REGISTRY_EFFECTIVE_KAI = "13189908" as const;
export const RECEIZ_V111_REGISTRY_CREATED_AT = "2026-07-18T15:00:00.000Z" as const;
export const RECEIZ_V112_REGISTRY_DIGEST = "1356f8122d0b5fcbe891d7e6ed1e75faca827f15d63d1ed5d950664e11c146ee" as const;
export const RECEIZ_V112_REGISTRY_ARTIFACT = "docs/releases/v112.0.0-constitution-registry.json" as const;
export const RECEIZ_V112_REGISTRY_EFFECTIVE_KAI = "13192000" as const;
export const RECEIZ_V112_REGISTRY_CREATED_AT = "2026-07-18T18:00:00.000Z" as const;
export const RECEIZ_V113_REGISTRY_DIGEST = "4c4aa85f9785d205dcf7e4e5109837a83f8c3bf8e166130ae7e87353f299c637" as const;
export const RECEIZ_V113_REGISTRY_ARTIFACT = "docs/releases/v113.0.0-constitution-registry.json" as const;
export const RECEIZ_V113_REGISTRY_EFFECTIVE_KAI = "13198000" as const;
export const RECEIZ_V113_REGISTRY_CREATED_AT = "2026-07-19T12:00:00.000Z" as const;
export const RECEIZ_V114_REGISTRY_DIGEST = RECEIZ_GENERATED_V114_REGISTRY_DIGEST;
export const RECEIZ_V114_REGISTRY_ARTIFACT = "docs/releases/v114.0.0-constitution-registry.json" as const;
export const RECEIZ_V114_REGISTRY_EFFECTIVE_KAI = "13201000" as const;
export const RECEIZ_V114_REGISTRY_CREATED_AT = "2026-07-24T20:00:00.000Z" as const;
export const RECEIZ_V115_REGISTRY_DIGEST = RECEIZ_GENERATED_V115_REGISTRY_DIGEST;
export const RECEIZ_V115_REGISTRY_ARTIFACT = "docs/releases/v115.0.0-constitution-registry.json" as const;
export const RECEIZ_V115_REGISTRY_EFFECTIVE_KAI = "13206000" as const;
export const RECEIZ_V115_REGISTRY_CREATED_AT = "2026-07-29T15:00:00.000Z" as const;
export const RECEIZ_V116_REGISTRY_DIGEST = RECEIZ_GENERATED_V116_REGISTRY_DIGEST;
export const RECEIZ_V116_REGISTRY_ARTIFACT = "docs/releases/v116.0.0-constitution-registry.json" as const;
export const RECEIZ_V116_REGISTRY_EFFECTIVE_KAI = "13379021" as const;
export const RECEIZ_V116_REGISTRY_CREATED_AT = "2026-07-30T02:03:26.000Z" as const;
export const RECEIZ_V117_REGISTRY_DIGEST = RECEIZ_GENERATED_V117_REGISTRY_DIGEST;
export const RECEIZ_V117_REGISTRY_ARTIFACT = "docs/releases/v117.0.0-constitution-registry.json" as const;
export const RECEIZ_V117_REGISTRY_EFFECTIVE_KAI = "13416483" as const;
export const RECEIZ_V117_REGISTRY_CREATED_AT = "2026-08-01T08:32:39.659Z" as const;
export const RECEIZ_V118_REGISTRY_DIGEST = RECEIZ_GENERATED_V118_REGISTRY_DIGEST;
export const RECEIZ_V118_REGISTRY_ARTIFACT = "docs/releases/v118.0.0-constitution-registry.json" as const;
export const RECEIZ_V118_REGISTRY_EFFECTIVE_KAI = "13417900" as const;
export const RECEIZ_V118_REGISTRY_CREATED_AT = "2026-08-01T10:45:00.000Z" as const;
export const RECEIZ_V119_AUTHORITY_BOUNDARY = createReceizV119ReleaseAuthorityBoundary(
  RECEIZ_V118_REGISTRY_DIGEST,
);
export const RECEIZ_V119_REGISTRY_DIGEST = RECEIZ_GENERATED_V119_REGISTRY_DIGEST;
export const RECEIZ_V119_REGISTRY_ARTIFACT = "docs/releases/v119.0.0-constitution-registry.json" as const;
export const RECEIZ_V119_REGISTRY_EFFECTIVE_KAI = "13423772" as const;
export const RECEIZ_V119_REGISTRY_CREATED_AT = "2026-08-01T19:08:45.796Z" as const;
export const RECEIZ_V120_AUTHORITY_BOUNDARY = createReceizV120ReleaseAuthorityBoundary(
  RECEIZ_V119_REGISTRY_DIGEST,
);
export const RECEIZ_V120_REGISTRY_DIGEST = RECEIZ_GENERATED_V120_REGISTRY_DIGEST;
export const RECEIZ_V120_REGISTRY_ARTIFACT = "docs/releases/v120.0.0-constitution-registry.json" as const;
export const RECEIZ_V120_REGISTRY_EFFECTIVE_KAI = "13571000" as const;
export const RECEIZ_V120_REGISTRY_CREATED_AT = "2026-08-16T12:00:00.000Z" as const;
export const RECEIZ_V121_AUTHORITY_BOUNDARY = createReceizV121ReleaseAuthorityBoundary(
  RECEIZ_V120_REGISTRY_DIGEST,
);
export const RECEIZ_V121_REGISTRY_DIGEST = RECEIZ_GENERATED_V121_REGISTRY_DIGEST;
export const RECEIZ_V121_REGISTRY_ARTIFACT = "docs/releases/v121.0.0-constitution-registry.json" as const;
export const RECEIZ_V121_REGISTRY_EFFECTIVE_KAI = "13725000" as const;
export const RECEIZ_V121_REGISTRY_CREATED_AT = "2026-08-20T00:30:00.000Z" as const;
export const RECEIZ_V122_AUTHORITY_BOUNDARY = createReceizV122ReleaseAuthorityBoundary(RECEIZ_V121_REGISTRY_DIGEST);
export const RECEIZ_V122_REGISTRY_DIGEST = RECEIZ_GENERATED_V122_REGISTRY_DIGEST;
export const RECEIZ_V122_REGISTRY_ARTIFACT = "docs/releases/v122.0.0-constitution-registry.json" as const;
export const RECEIZ_V122_REGISTRY_EFFECTIVE_KAI = "13730000" as const;
export const RECEIZ_V122_REGISTRY_CREATED_AT = "2026-08-21T12:00:00.000Z" as const;
export const RECEIZ_V123_AUTHORITY_BOUNDARY = createReceizV123ReleaseAuthorityBoundary(RECEIZ_V122_REGISTRY_DIGEST);
export const RECEIZ_V123_REGISTRY_DIGEST = RECEIZ_GENERATED_V123_REGISTRY_DIGEST;
export const RECEIZ_V123_REGISTRY_ARTIFACT = "docs/releases/v123.0.0-constitution-registry.json" as const;
export const RECEIZ_V123_REGISTRY_EFFECTIVE_KAI = "13731000" as const;
export const RECEIZ_V123_REGISTRY_CREATED_AT = "2026-08-22T12:00:00.000Z" as const;
export const RECEIZ_V124_AUTHORITY_BOUNDARY = deepFreezeRegistryTrustHistory({
  schema: "receiz.release-authority-boundary.v124",
  predecessorDigest: RECEIZ_V123_REGISTRY_DIGEST,
  compatibleSdkRange: ">=124.0.0 <125.0.0",
  authority: {
    enclosingArtifact: "strongest",
    projectionIsAuthority: false,
    knownTruthPaintsBeforeDiscovery: true,
    kaiSelectsCausalHead: true,
    merkleCommitsExactAppends: true,
    fibonacciProvidesSparseAncestry: true,
    subjectIdentitySurvivesOwnership: true,
    modelOutputRequiresCommandAdmission: true,
    multiSubjectEffectsAreAtomic: true,
    unknownNamespacesAreByteExact: true,
    serverAndDatabaseAreNonAuthoritativeAcceleration: true,
    settledSurfaceNeverWaitsForProjection: true,
    verifiedHydrationBecomesDurableColdTruth: true,
    authenticatedResponsesBindRequestsAndExactHeads: true,
  },
} as const satisfies ReceizReleaseAuthorityBoundary);
export const RECEIZ_V124_REGISTRY_DIGEST = RECEIZ_GENERATED_V124_REGISTRY_DIGEST;
export const RECEIZ_V124_REGISTRY_ARTIFACT = "docs/releases/v124.0.0-constitution-registry.json" as const;
export const RECEIZ_V124_REGISTRY_EFFECTIVE_KAI = "13768543" as const;
export const RECEIZ_V124_REGISTRY_CREATED_AT = "2026-08-22T16:36:10.513Z" as const;
export const RECEIZ_V125_AUTHORITY_BOUNDARY = createReceizV125ReleaseAuthorityBoundary(RECEIZ_V124_REGISTRY_DIGEST);
export const RECEIZ_V125_REGISTRY_DIGEST = RECEIZ_GENERATED_V125_REGISTRY_DIGEST;
export const RECEIZ_V125_REGISTRY_ARTIFACT = "docs/releases/v125.0.0-constitution-registry.json" as const;
export const RECEIZ_V125_REGISTRY_EFFECTIVE_KAI = "13869724" as const;
export const RECEIZ_V125_REGISTRY_CREATED_AT = "2026-08-28T19:46:01.000Z" as const;
export const RECEIZ_V126_REGISTRY_DIGEST = RECEIZ_GENERATED_V126_REGISTRY_DIGEST;
export const RECEIZ_V126_REGISTRY_ARTIFACT = "docs/releases/v126.0.0-constitution-registry.json" as const;
export const RECEIZ_CURRENT_REGISTRY_DIGEST = RECEIZ_GENERATED_CURRENT_REGISTRY_DIGEST;
export const RECEIZ_CURRENT_REGISTRY_ARTIFACT = "docs/releases/v127.0.0-constitution-registry.json" as const;
export const RECEIZ_CURRENT_REGISTRY_EFFECTIVE_KAI = "14301115" as const;
export const RECEIZ_CURRENT_REGISTRY_PREDECESSOR_DIGEST = RECEIZ_V126_REGISTRY_DIGEST;
export const RECEIZ_V108_ARTIFACT_LAWS = [
  "ARTIFACT-001",
  "ARTIFACT-002",
  "ARTIFACT-003",
  "ARTIFACT-004",
  "ARTIFACT-005",
  "ARTIFACT-006",
  "ARTIFACT-007",
  "ARTIFACT-008",
  "ARTIFACT-009",
  "ARTIFACT-010",
] as const;
export const RECEIZ_V109_ARTIFACT_LAWS = [...RECEIZ_V108_ARTIFACT_LAWS, "ARTIFACT-011"] as const;
export const RECEIZ_V110_ARTIFACT_LAWS = [
  ...RECEIZ_V109_ARTIFACT_LAWS,
  "ARTIFACT-012",
  "ARTIFACT-013",
  "ARTIFACT-014",
  "ARTIFACT-015",
] as const;
export const RECEIZ_V111_ARTIFACT_LAWS = [
  ...RECEIZ_V110_ARTIFACT_LAWS,
  "ARTIFACT-016",
  "ARTIFACT-017",
  "ARTIFACT-018",
  "ARTIFACT-019",
  "ARTIFACT-020",
] as const;
export const RECEIZ_V112_ARTIFACT_LAWS = [
  ...RECEIZ_V111_ARTIFACT_LAWS,
  "ARTIFACT-021",
  "ARTIFACT-022",
  "ARTIFACT-023",
  "ARTIFACT-024",
  "ARTIFACT-025",
  "ARTIFACT-026",
  "ARTIFACT-027",
  "ARTIFACT-028",
  "ARTIFACT-029",
  "ARTIFACT-030",
] as const;
export const RECEIZ_V114_ARTIFACT_LAWS = [
  ...RECEIZ_V112_ARTIFACT_LAWS,
  "receiz.profile-showcase.carrier.v114@1",
  "receiz.namespace.profile-showcase-append.v114@1",
  "receiz.namespace.profile-showcase.reducer.v1",
  "profile-showcase.genesis.effects-derived",
  "profile-showcase.append.effects-derived",
  "profile-showcase.literal-stable-identity",
  "profile-showcase.carried-history-required",
] as const;
export const RECEIZ_V115_ARTIFACT_LAWS = [
  ...RECEIZ_V114_ARTIFACT_LAWS,
  "receiz.native-capture.schema.v115@1",
  "receiz.native-capture.camera-ceremony.v115@1",
  "receiz.pbi-proof-object-authorship.schema.v115@1",
  "receiz.pbi-proof-object-authorship.canonical-predecessor.v115@1",
  "receiz.pbi-proof-object-authorship.media-preserved.v115@1",
  "receiz.pbi-proof-object-authorship.ownership-non-transfer.v115@1",
  "receiz.pbi-proof-object-authorship.ordered-append.v115@1",
] as const;
export const RECEIZ_V116_ARTIFACT_LAWS = RECEIZ_V115_ARTIFACT_LAWS;
export const RECEIZ_V117_ARTIFACT_LAWS = RECEIZ_V116_ARTIFACT_LAWS;
export const RECEIZ_V118_ARTIFACT_LAWS = RECEIZ_V117_ARTIFACT_LAWS;
export const RECEIZ_V119_ARTIFACT_LAWS = [
  ...RECEIZ_V118_ARTIFACT_LAWS,
  "receiz.recursive-continuity.head-selection.v119@1",
  "receiz.recursive-continuity.roles.v119@1",
  "receiz.sports-card-proof-object.admission.v119@1",
  "receiz.global-economy.recursive-append.v119@1",
] as const;
export const RECEIZ_V120_ARTIFACT_LAWS = [
  ...RECEIZ_V119_ARTIFACT_LAWS,
  "receiz.subject.identity-immutable.v120",
  "receiz.subject.namespace-byte-preservation.v120",
  "receiz.subject.complete-proof-brain.v120",
  "receiz.subject.model-output-non-authority.v120",
  "receiz.world.command-only-event-admission.v120",
  "receiz.world.zero-write-failure.v120",
  "receiz.world.multi-subject-atomicity.v120",
  "receiz.subject.mandate-runtime-reverification.v120",
  "receiz.subject.event-derived-memory.v120",
  "receiz.bearer.atomic-subject-transfer.v120",
  "receiz.bearer.former-owner-revocation.v120",
  "receiz.subject.portable-mind-complete-history.v120",
  "receiz.subject.performance-noncanonical.v120",
] as const;
export const RECEIZ_V121_ARTIFACT_LAWS = [
  ...RECEIZ_V120_ARTIFACT_LAWS,
  "receiz.proof-publication.source-before-representation.v121",
  "receiz.proof-publication.global-append.v121",
  "receiz.proof-publication.no-settled-remount.v121",
  "receiz.proof-media.byte-commitment-preserved.v121",
  "receiz.proof-projection.strong-fields-preserved.v121",
  "receiz.profile-hydration.durable-cold-head.v121",
  "receiz.settlement.known-truth-first-paint.v121",
  "receiz.identity.accepted-proof-full-session.v121",
] as const;

export const RECEIZ_V106_RELEASE_AUTHORITY = {
  registryPayloadIsProofAuthority: false,
  strongerTruth: "sealed-receiz-proof-object",
  releaseLockIsAdmission: false,
} as const;

export const RECEIZ_V107_RELEASE_AUTHORITY = {
  registryPayloadIsProofAuthority: false,
  strongerTruth: "sealed-receiz-proof-object",
  releaseLockIsAdmission: false,
  queuedCommandIsGlobalCommitment: false,
} as const;

export const RECEIZ_V108_RELEASE_AUTHORITY = {
  registryPayloadIsProofAuthority: false,
  strongerTruth: "sealed-receiz-proof-object",
  releaseLockIsAdmission: false,
  proofObjectFirst: true,
  receizComReferenceBeforeDeveloperRails: true,
  queuedCommandIsGlobalCommitment: false,
} as const;

export const RECEIZ_V109_RELEASE_AUTHORITY = {
  ...RECEIZ_V108_RELEASE_AUTHORITY,
  localArtifactVerificationRequiresNetwork: false,
  historicalDeveloperSdkInstallable: false,
} as const;

export const RECEIZ_V110_RELEASE_AUTHORITY = {
  ...RECEIZ_V109_RELEASE_AUTHORITY,
  unifiedArtifactAdmission: true,
  recoveryPlanIsProofAuthority: false,
  proofExplanationIsProofAuthority: false,
  recoveryCommitRequiresVerifiedCapability: true,
  recoveryCommitIsAtomic: true,
} as const;

export const RECEIZ_V111_RELEASE_AUTHORITY = {
  ...RECEIZ_V110_RELEASE_AUTHORITY,
  admissionDerivedFromCanonicalExactBytes: true,
  recoveryHistoryRequiresIndependentEvidenceRoots: true,
  canonicalIdentityRequiresSigningChallenge: true,
  planIdentityDistinctFromAttemptIdentity: true,
  terminalMcpAttemptConfirmationReusable: false,
} as const;

export const RECEIZ_V112_RELEASE_AUTHORITY = {
  ...RECEIZ_V111_RELEASE_AUTHORITY,
  admissionIsOperationAuthority: false,
  transitionDigestExcludesPlanCoordination: true,
  effectsDerivedByRegistryOperationLaw: true,
  commitDomainNamedAndAtomic: true,
  receiptIsOperationAuthority: false,
  browserAdmissionStoreCarriesProofObjects: false,
} as const;

export const RECEIZ_V113_RELEASE_AUTHORITY = {
  ...RECEIZ_V112_RELEASE_AUTHORITY,
  globalMeansNamedCoordinationDomain: true,
  databaseManufacturesArtifactTruth: false,
  connectTokenIsArtifactAuthority: false,
  offlineDivergenceResolution: "structural-only",
} as const;

export const RECEIZ_V114_RELEASE_AUTHORITY = {
  ...RECEIZ_V113_RELEASE_AUTHORITY,
  profileShowcaseArtifactIdentityIsPayloadDigest: false,
  profileShowcaseLiteralIdentity: "profile-showcase:<owner>",
  profileShowcaseSuccessorHistoryTravelsInSealedBytes: true,
  profileShowcaseIntroducesNewSignerIssuerOrHeadAuthority: false,
} as const;

export const RECEIZ_V115_RELEASE_AUTHORITY = {
  ...RECEIZ_V114_RELEASE_AUTHORITY,
  nativeCaptureAttestsDedicatedCameraCeremonyOnly: true,
  pbiAuthorshipRequiresCanonicalEnclosingPredecessor: true,
  pbiAuthorshipChangesOwnership: false,
  pbiAuthorshipChangesMediaTruth: false,
  pbiAuthorshipAppendsInVerifiedOrder: true,
  offlineSettlementWaitsForGlobalPublication: false,
} as const;

export const RECEIZ_V116_RELEASE_AUTHORITY = RECEIZ_V115_RELEASE_AUTHORITY;
export const RECEIZ_V117_RELEASE_AUTHORITY = RECEIZ_V116_RELEASE_AUTHORITY;
export const RECEIZ_V118_RELEASE_AUTHORITY = RECEIZ_V117_RELEASE_AUTHORITY;
export const RECEIZ_V119_RELEASE_AUTHORITY = {
  ...RECEIZ_V118_RELEASE_AUTHORITY,
  enclosingArtifact: "strongest",
  projectionIsAuthority: false,
  knownTruthPaintsBeforeDiscovery: true,
  kaiSelectsCausalHead: true,
  merkleCommitsExactAppends: true,
  fibonacciProvidesSparseAncestry: true,
} as const;

export const RECEIZ_V120_RELEASE_AUTHORITY = {
  ...RECEIZ_V119_RELEASE_AUTHORITY,
  subjectIdentitySurvivesOwnershipTransfer: true,
  proofBrainIndexIsAuthority: false,
  modelOutputRequiresCommandAdmission: true,
  factualMemoryRequiresAdmittedEventCitations: true,
  multiSubjectEffectsAreAtomic: true,
  failedDecisionsWriteZeroIncludingKai: true,
  mandatesReverifiedAtExecution: true,
  unknownNamespacesPreservedByteExact: true,
  bearerClaimPreservesSubjectIdentity: true,
  formerOwnerAuthorityRevokedImmediately: true,
} as const;

export const RECEIZ_V121_RELEASE_AUTHORITY = {
  ...RECEIZ_V120_RELEASE_AUTHORITY,
  serverAndDatabaseAreAuthority: false,
  serverAndDatabaseAccelerateDistributionAndRestore: true,
  sealedProofObjectRemainsAuthority: true,
  settledSurfaceWaitsForGlobalProjection: false,
  verifiedHydrationBecomesDurableColdTruth: true,
  weakerProjectionMayDropStrongerKnownFields: false,
} as const;

export const RECEIZ_V122_RELEASE_AUTHORITY = RECEIZ_V121_RELEASE_AUTHORITY;
export const RECEIZ_V123_RELEASE_AUTHORITY = {
  ...RECEIZ_V122_RELEASE_AUTHORITY,
  proofObjectAuthorityMayBeReplacedByCapability: false,
  edgeVerificationRemainsPrimary: true,
  proofAuthorityRequiresExplicitApplicationConsent: true,
  proofAuthorityCapabilityIsRefreshable: false,
  phiMovesOnlyThroughExplicitSettlementOrReserve: true,
  usdIsMovedValueAuthority: false,
  ambiguousValueExecutionRequiresLookupBeforeRetry: true,
} as const;

export const RECEIZ_V124_RELEASE_AUTHORITY = {
  ...RECEIZ_V123_RELEASE_AUTHORITY,
  sealedProofObjectRemainsStorageAndContinuityAuthority: true,
  serverDatabaseSdkAndSessionAreProofAuthority: false,
  runtimeResponsesRequireAuthenticatedRequestAndHeadBinding: true,
  persistedPlansAndTerminalOutcomesRemainSubordinate: true,
  exactParticipantHeadFailureWritesZero: true,
  privateCoordinatesAreFilteredBeforeResponse: true,
  capabilityAvailabilityRequiresOperationalEvidence: true,
  applicationAdmissionIntroduced: false,
} as const;

export const RECEIZ_V125_RELEASE_AUTHORITY = {
  ...RECEIZ_V124_RELEASE_AUTHORITY,
  institutionsAreAutomaticProofAuthority: false,
  actionLawMustBeCurrentRegistryBound: true,
  lawfulActionValueHeadsRequireEnclosingProof: true,
  developersMayDeclarePhiAmount: false,
  oneArtifactOneSpendableSettlementMembership: true,
  activationMintsValue: false,
  reserveIsLegacyRail: true,
  settlementIsProofNativeSpendableValue: true,
} as const;
