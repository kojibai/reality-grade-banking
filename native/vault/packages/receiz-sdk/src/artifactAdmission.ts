import { RECEIZ_CURRENT_CONSTITUTION_REGISTRY } from "./currentRegistry.generated.js";
import { resolvePackagePinnedHistoryRegistry, verifyPackagePinnedHistoryRegistry } from "./currentRegistryAuthority.js";
import { digestReceizConstitution, type ReceizConstitutionRegistry } from "./constitution.js";
import {
  issueCurrentNativeArtifact,
  issueVerifiedPayload,
  sha256ReceizBytes,
  type ReceizOpenedArtifact,
} from "./artifacts.js";
import { digestReceizAuthority } from "./authorityEncoding.js";
import { authorityFailure, type ReceizAuthorityFailure } from "./authorityResults.js";
import {
  RECEIZ_DENIED_ADMISSION_ASSESSMENTS,
  invalidReceizArtifactAdmission,
  receizProofExplanation,
  type ReceizActorEvidenceDigest,
  type ReceizAdmissionAssessments,
  type ReceizAdmissionDigest,
  type ReceizArtifactAdmissionError,
  type ReceizArtifactAdmissionOptions,
  type ReceizArtifactAdmissionResult,
  type ReceizCapabilityIssuerKey,
  type ReceizCapabilityIssuerResolver,
  type ReceizDocumentArtifactAdmission,
  type ReceizProfileDeniedArtifactAdmission,
  type ReceizRegistryDigest,
  type ReceizVerifiedActorReference,
  type ReceizVerifiedArtifactAdmission,
  type ReceizVerifiedProfileShowcaseAdmission,
} from "./artifactAdmissionTypes.js";
import {
  RECEIZ_CURRENT_REGISTRY_DIGEST,
  RECEIZ_CURRENT_REGISTRY_EFFECTIVE_KAI,
  RECEIZ_V114_REGISTRY_DIGEST,
} from "./releaseIdentity.js";
import {
  canonicalizeReceizConstitution,
  type ReceizConstitutionJson,
} from "./constitution.js";
import {
  verifyAndExtractReceizDocumentBytesCanonical,
} from "./verifier/index.js";
import { verifyReceizArtifactExactBytesCanonical, readVerifiedReceizDocumentBytesCanonical } from "./verifier/canonical.js";
import {
  readRuntimeCustodiedReceizArtifactCanonicalOpen,
  readRuntimeCustodiedReceizArtifactSnapshot,
  verifyReceizArtifactWithCanonicalRoots,
  type ReceizArtifactVerificationResult,
} from "./artifactVerification.js";
import type { ReceizSignatureV4RootPublicKey } from "./verifier/signatureV4.js";
import { receizCurrentPinnedSignatureV4Roots } from "./verifier/roots.js";
import {
  projectReceizIdentityAccount,
  receizBase64UrlEncode,
  receizBase64UrlDecode,
  readReceizIdentityArtifact,
  signReceizIdentityLoginProof,
  verifyReceizIdentityLoginProof,
  verifyReceizIdentityPortableStateProof,
  type ReceizIdentityLoginProof,
} from "./identity.js";
import {
  deriveReceizPortableOwnershipContinuity,
  parseReceizPortableAssetDocument,
  parseReceizProfileShowcaseCarrier,
  type ReceizProfileShowcaseCarrier,
} from "./portableAsset.js";
import {
  assertReceizBoundedProfileShowcaseCarriedHeadSemanticsV114,
  assertReceizEconomyShowcaseCarriedHeadSemanticsV114,
  appendReceizCarriedProofHistoryHeadV114,
  createReceizCarriedProofHistoryHeadV114 as _createReceizCarriedProofHistoryHeadV114,
  createReceizBoundedProfileShowcaseCarrierV114,
  deriveReceizProfileShowcaseBoundedGenesisHeadV114,
  parseReceizBoundedProfileShowcaseCarrierV114,
  parseReceizEconomyShowcaseCarrierV114,
  verifyReceizProfileShowcaseCheckpointBundleV114,
  verifyReceizProfileShowcaseCheckpointSnapshotV114,
  verifyReceizProfileShowcaseBoundedMergeV114,
  verifyReceizProfileShowcaseBoundedSuccessorV114,
  type ReceizBoundedProfileShowcaseCarrierV114,
  type ReceizCarriedProofHistoryHeadV114,
  type ReceizProfileShowcaseCheckpointBundleBuildV114,
  type ReceizProfileShowcaseCheckpointSegmentResolverV114,
} from "./compositeProofTransport.js";
import {
  digestReceizCompositeCanonical,
  receizCompositeFibonacciDistancesUpTo,
} from "./compositeProofKernel.js";
import {
  createReceizProfileShowcasePersistentMemoryStoreV114,
  type ReceizProfileShowcasePersistentStateIOV114,
} from "./profileShowcasePersistentState.js";
import {
  deriveReceizProfileShowcaseHistoryBinding,
  createReceizProofHistoryNode,
  verifyReceizCarriedProofHistory,
  verifyReceizProofHistory,
  type ReceizVerifiedProofHistory,
} from "./proofHistory.js";
import {
  assertReceizProfileShowcaseGenesisV114TransportContract as _assertReceizProfileShowcaseGenesisV114TransportContract,
} from "./profileShowcaseTransport.js";
import {
  deriveReceizEconomyShowcaseGenesisHeadV114,
  verifyReceizEconomyShowcaseMergeV114,
  verifyReceizEconomyShowcaseSuccessorV114,
} from "./economyShowcaseTransport.js";
import {
  verifyRuntimeDiscoveredReceizRegistryLaw,
  type ReceizRegistryDiscoveryResult,
} from "./registryDiscovery.js";

export type ReceizArtifactAdmissionDependencies = Readonly<{
  canonicalSignatureV4RootPublicKeys?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
  verifiedRegistryDiscovery?: ReceizRegistryDiscoveryResult;
}>;

type CanonicalOpenSuccess = Extract<
  Awaited<ReturnType<typeof verifyAndExtractReceizDocumentBytesCanonical>>,
  { ok: true }
>;

type IdentityEvidenceBasis = Readonly<{
  schema: "receiz.verified-actor-evidence-basis.v112";
  artifactSha256: string;
  payloadSha256: string;
  artifactOwnerReceizId: string;
  identityOwnerReceizId: string;
  actorId: string;
  keyId: string;
  alg: string;
  publicKeyRawB64u: string;
  challengeDigest: string;
  signatureDigest: string;
  signatureVerified: true;
  registryDigest: string;
}>;

/** Public digest preimage already committed by v124 identity actor evidence.
 * This contains no identity file, private key, account state or proof challenge.
 */
export type ReceizIdentityPublicBinding = Readonly<Omit<IdentityEvidenceBasis,
  "schema" | "challengeDigest" | "signatureDigest"> & {
    schema: "receiz.verified-actor-identity-binding.v124";
  }>;

function publicIdentityBinding(basis: IdentityEvidenceBasis): ReceizIdentityPublicBinding {
  return Object.freeze({ schema: "receiz.verified-actor-identity-binding.v124",
    artifactSha256: basis.artifactSha256, payloadSha256: basis.payloadSha256,
    artifactOwnerReceizId: basis.artifactOwnerReceizId, identityOwnerReceizId: basis.identityOwnerReceizId,
    actorId: basis.actorId, keyId: basis.keyId, alg: basis.alg, publicKeyRawB64u: basis.publicKeyRawB64u,
    signatureVerified: basis.signatureVerified, registryDigest: basis.registryDigest });
}

/** Projection from genuine admitted private custody; a detached basis never
 * admits a source. Consumers must anchor its digest in the enclosing proof.
 */
export async function readReceizIdentityPublicBinding(input: unknown): Promise<ReceizIdentityPublicBinding> {
  const admission = await verifyReceizArtifactAdmission(input);
  if ("code" in admission || admission.profile !== "identity") throw new TypeError("IDENTITY_ADMISSION_CUSTODY_REQUIRED");
  const basis = admissionCustody.get(admission)?.identityEvidenceBasis;
  if (!basis) throw new TypeError("IDENTITY_ADMISSION_CUSTODY_REQUIRED");
  return publicIdentityBinding(basis);
}

/** Device transport composition beneath the exact admitted Identity Seal.
 * Retains only private runtime custody; never reopens a caller path or accepts a
 * reconstructed key projection. This signs the existing local-action envelope,
 * not a capability to change the artifact or its owner.
 */
export async function createReceizIdentityDeviceRelaySigner(input: unknown, passphrase = "") {
  const admission = await verifyReceizArtifactAdmission(input);
  if ("code" in admission || admission.profile !== "identity") throw new TypeError("IDENTITY_ADMISSION_CUSTODY_REQUIRED");
  const custody = admissionCustody.get(admission);
  const basis = custody?.identityEvidenceBasis;
  if (!custody || !basis) throw new TypeError("IDENTITY_ADMISSION_CUSTODY_REQUIRED");
  let identityBytes = custody.identityPayloadBytes;
  if (!identityBytes) {
    const { canonical } = await canonicalReverify({ verification: custody.sourceVerification, roots: custody.verifierRoots });
    if (!canonical?.ok || await sha256ReceizBytes(canonical.payloadBytes) !== basis.payloadSha256) throw new TypeError("IDENTITY_ADMISSION_CUSTODY_REQUIRED");
    identityBytes = canonical.payloadBytes;
  }
  const keyFile = await readReceizIdentityArtifact(identityBytes);
  if (keyFile.keyId !== basis.keyId || keyFile.owner.uid !== basis.identityOwnerReceizId
    || keyFile.crypto.publicKeyRawB64u !== basis.publicKeyRawB64u) throw new TypeError("IDENTITY_ADMISSION_CUSTODY_REQUIRED");
  return async (request: Readonly<{ transportOwnerId: string; bodyText: string; actionId: string }>) => {
    const { transportOwnerId, bodyText, actionId } = request;
    if (!transportOwnerId || transportOwnerId !== transportOwnerId.trim() || !/^[0-9a-f]{64}$/.test(actionId)
      || new TextEncoder().encode(bodyText).byteLength > 1024 * 1024) throw new TypeError("IDENTITY_RELAY_REQUEST_INVALID");
    const challengeText = canonicalizeReceizConstitution({
      schema: "receiz.local.signed-action.v1", actionId, actionKind: "mcp.device.transport", scope: "mcp:device",
      // Descriptive only; neither proof order nor authorization depends on it.
      createdAt: "", actor: { uid: transportOwnerId, localUid: basis.identityOwnerReceizId,
        email: null, username: null, displayName: null, receizKeyId: basis.keyId, publicKeyRawB64u: basis.publicKeyRawB64u },
      request: { method: "POST", path: "/api/mcp/device/host", contentType: "application/json",
        bodyHashHex: await sha256ReceizBytes(new TextEncoder().encode(bodyText)), bodyReplayText: null, replayable: false },
    });
    const proof = await signReceizIdentityLoginProof({ keyFile, challengeText, ...(passphrase ? { passphrase } : {}) });
    return Object.freeze({ "x-receiz-local-action-id": actionId, "x-receiz-local-action-key-id": basis.keyId,
      "x-receiz-local-action-public-key": basis.publicKeyRawB64u, "x-receiz-local-action-challenge": proof.challengeB64Url,
      "x-receiz-local-action-signature": proof.signatureB64Url });
  };
}

type AdmissionCustody = Readonly<{
  sourceVerification: Extract<ReceizArtifactVerificationResult, { status: "verified-artifact" }>;
  artifactBytes: Uint8Array;
  verifierRoots: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
  verifierContext: Readonly<Record<string, unknown>>;
  identityEvidenceBasis: IdentityEvidenceBasis | null;
  identityPayloadBytes: Uint8Array | null;
  registryDigest: string;
  registryEffectiveKai: string;
  registryDiscovery: ReceizRegistryDiscoveryResult | null;
  registryContext: ReceizConstitutionRegistry | null;
}>;

const sdkIssuedAdmissions = new WeakSet<object>();
const sdkAdmittedCapabilityIssuerKeys = new WeakSet<object>();
const admissionCustody = new WeakMap<object, AdmissionCustody>();
const actorReferenceCustody = new WeakMap<object, Readonly<{
  admission: ReceizVerifiedArtifactAdmission;
  admissionDigest: string;
  evidenceDigest: string;
  registryDigest: string;
}>>();

export async function resolveReceizCheckpointChildAdmissionForEvidenceRoot(
  evidenceRoot: string,
  resolve: (evidenceRoot: string) => unknown | Promise<unknown>,
  verify: (candidate: unknown) => Promise<unknown> = verifyReceizArtifactAdmission,
): Promise<ReceizVerifiedArtifactAdmission | null> {
  const candidate = await verify(await resolve(evidenceRoot));
  if (!candidate || typeof candidate !== "object" || "code" in candidate) return null;
  const admission = candidate as ReceizVerifiedArtifactAdmission;
  return admission.admissionProof?.admissionProofDigest === evidenceRoot
    ? admission
    : null;
}

export type ReceizInspectedLegacyProfileShowcaseV114 = Readonly<{
  schema: "receiz.inspected-legacy-profile-showcase.v114";
  status: "inspection-only";
  artifactId: `profile-showcase:${string}`;
  artifactSha256: string;
  payloadSha256: string;
  ownerReceizIdentity: string;
  historyHeadDigest: string;
  resultingOperationCount: number;
  headKaiUpulse: string;
  currentStateRoot: string;
  authority: Readonly<{
    inspectionIsProofAuthority: false;
    paintAllowed: false;
    appendAllowed: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizInspectedBoundedProfileShowcaseV114 = Readonly<{
  schema: "receiz.inspected-bounded-profile-showcase.v114";
  status: "inspection-only";
  artifactId: `profile-showcase:${string}`;
  artifactSha256: string;
  payloadSha256: string;
  ownerReceizIdentity: string;
  parentArtifactDigest: string | null;
  historyNodeDigest: string;
  authority: Readonly<{
    inspectionIsProofAuthority: false;
    paintAllowed: false;
    appendAllowed: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizVerifiedProfileShowcaseCheckpointV114 = Readonly<{
  schema: "receiz.verified-profile-showcase-checkpoint.v114";
  status: "verified-checkpoint";
  artifactId: `profile-showcase:${string}`;
  checkpointArtifactSha256: string;
  checkpointPayloadSha256: string;
  ownerReceizIdentity: string;
  operationCount: number;
  segmentCount: number;
  historyHeadDigest: string;
  authority: Readonly<{
    checkpointIsProofAuthority: true;
    projectionIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

type LegacyProfileShowcaseInspectionCustody = Readonly<{
  sourceVerification: Extract<ReceizArtifactVerificationResult, { status: "verified-artifact" }>;
  artifactBytes: Uint8Array;
  verifierRoots: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
  registryDiscovery: ReceizRegistryDiscoveryResult | null;
  carrier: ReceizProfileShowcaseCarrier;
  history: ReceizVerifiedProofHistory;
  internalAdmission: ReceizVerifiedProfileShowcaseAdmission;
}>;

const legacyProfileShowcaseInspectionCustody =
  new WeakMap<object, LegacyProfileShowcaseInspectionCustody>();
const boundedProfileShowcaseInspectionCustody =
  new WeakMap<object, ReceizBoundedProfileShowcaseCarrierV114>();
type ProfileShowcaseCheckpointCustody = Readonly<{
  persistentStateIO: ReceizProfileShowcasePersistentStateIOV114 | null;
  sourceArtifact: Blob;
  exactArtifactBytes: Uint8Array;
  filename: string;
  mimeType: string;
  verifierRoots: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
  build: ReceizProfileShowcaseCheckpointBundleBuildV114;
  historyHead: ReceizCarriedProofHistoryHeadV114;
  predecessorAdmission: ReceizVerifiedArtifactAdmission;
  actorAdmission: ReceizVerifiedArtifactAdmission | null;
  actorPublicBinding: ReceizIdentityPublicBinding | null;
  children: readonly ReceizVerifiedArtifactAdmission[];
  resolveAdmittedChild: (
    evidenceRoot: string,
  ) => Promise<ReceizVerifiedArtifactAdmission | null>;
  segmentIds: readonly string[];
  resolveSegment: ReceizProfileShowcaseCheckpointSegmentResolverV114;
}>;
const profileShowcaseCheckpointCustody =
  new WeakMap<object, ProfileShowcaseCheckpointCustody>();

const MAX_ARTIFACT_BYTES = 500 * 1024 * 1024;
const CANONICAL_ZIP_LIMITS = Object.freeze({
  maxEntries: 5_000,
  maxEntryUncompressedBytes: 1024 * 1024 * 1024,
  maxTotalUncompressedBytes: 2 * 1024 * 1024 * 1024,
});

const IDENTITY_ASSESSMENTS: ReceizAdmissionAssessments = Object.freeze({
  localRestoration: "available",
  signingKeyCorrespondence: "verified",
  ownership: "denied",
  publication: "denied",
  transfer: "denied",
  settlement: "denied",
  append: "denied",
});

const PORTABLE_ASSESSMENTS: ReceizAdmissionAssessments = Object.freeze({
  localRestoration: "available",
  signingKeyCorrespondence: "unverified",
  ownership: "requires",
  publication: "requires",
  transfer: "requires",
  settlement: "requires",
  append: "requires",
});

async function assertProfileShowcaseCarriedHeadSemantics(
  carrier: Awaited<ReturnType<typeof parseReceizProfileShowcaseCarrier>>,
  history: ReceizVerifiedProofHistory,
): Promise<void> {
  const binding = await deriveReceizProfileShowcaseHistoryBinding({
    artifactId: carrier.artifactId,
    ownerReceizIdentity: carrier.ownerReceizIdentity,
    showcase: carrier["profile-showcase"],
    registryDigest: RECEIZ_V114_REGISTRY_DIGEST,
  });
  if (history.registryDigest !== RECEIZ_V114_REGISTRY_DIGEST
    || history.headDigests.length !== 1) {
    throw new Error("PROFILE_SHOWCASE_CARRIED_HISTORY_MISMATCH");
  }
  const head = history.nodes.find((node) => node.nodeDigest === history.headDigests[0]);
  if (!head || head.artifactId !== binding.artifactId
    || head.registryDigest !== binding.registryDigest
    || head.event.type !== "profile-showcase.transition"
    || canonicalizeReceizConstitution(head.event)
      !== canonicalizeReceizConstitution({
        type: "profile-showcase.transition",
        parentShowcaseDigests: binding.parentShowcaseDigests,
        predecessorShowcaseDigest: binding.predecessorShowcaseDigest,
        showcaseBodyDigest: binding.showcaseBodyDigest,
        operationDigest: binding.operationDigest,
        directOperations: binding.directOperations,
        childAdmissionEvidenceRoots: binding.childAdmissionEvidenceRoots,
        registryDigest: binding.registryDigest,
        kaiUpulse: binding.kaiUpulse,
      })
    || (binding.predecessorShowcaseDigest === null
      ? history.nodes.length !== 1 || head.parentDigests.length !== 0
      : history.nodes.length < 2
        || head.parentDigests.length !== binding.parentShowcaseDigests.length)) {
    throw new Error("PROFILE_SHOWCASE_CARRIED_HISTORY_MISMATCH");
  }
}

function registryDigest(value: string): ReceizRegistryDigest {
  return Object.freeze({
    algorithm: "sha-256",
    binds: "constitution-registry",
    value,
  });
}

function admissionDigest(value: string): ReceizAdmissionDigest {
  return Object.freeze({ algorithm: "sha-256", binds: "verified-admission", value });
}

function actorEvidenceDigest(value: string): ReceizActorEvidenceDigest {
  return Object.freeze({ algorithm: "sha-256", binds: "verified-actor-evidence", value });
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)
    && !(value instanceof Blob) && !(value instanceof Uint8Array)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  }
  return value;
}

function freezeRecord<T extends Readonly<Record<string, unknown>>>(value: T): T {
  return deepFreeze(structuredClone(value)) as T;
}

function containsNonAuthorityNumber(value: unknown): boolean {
  if (typeof value === "number") return !Number.isSafeInteger(value);
  if (value && typeof value === "object") return Object.values(value).some(containsNonAuthorityNumber);
  return false;
}

function cloneRoots(
  roots: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>,
): ReadonlyMap<string, ReceizSignatureV4RootPublicKey> {
  return new Map([...roots.entries()].map(([kid, root]) => [kid, Object.freeze({ ...root })]));
}

function rootSetBasis(roots: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>) {
  return [...roots.entries()].map(([mapKid, root]) => ({
    mapKid,
    kid: root.kid,
    alg: root.alg,
    publicKeyRawB64u: root.publicKeyRawB64u,
    status: root.status,
    ...(root.activeFromPulse ? { activeFromPulse: root.activeFromPulse } : {}),
    ...(root.retiredAtPulse ? { retiredAtPulse: root.retiredAtPulse } : {}),
  })).sort((left, right) => left.mapKid.localeCompare(right.mapKid));
}

async function verifierContext(input: {
  canonical: CanonicalOpenSuccess;
  filename: string;
  mimeType: string;
  roots: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}): Promise<Readonly<Record<string, unknown>>> {
  return deepFreeze({
    schema: "receiz.canonical-verifier-context.v112",
    verifier: "receiz.sdk.canonical-artifact-verifier",
    verifierVersion: "112.0.0",
    carrier: input.canonical.legacyCompatibility,
    filename: input.filename,
    mimeType: input.mimeType,
    trustRootSetDigest: await digestReceizAuthority(
      "identity",
      "receiz.signature-v4-trust-root-set.v112",
      rootSetBasis(input.roots),
    ),
    resourceLimits: {
      maxArtifactBytes: MAX_ARTIFACT_BYTES,
      zip: CANONICAL_ZIP_LIMITS,
    },
  });
}

function ownerError(expected: string, actual: string | null): ReceizArtifactAdmissionError {
  return Object.freeze({
    code: "OWNER_MISMATCH",
    details: Object.freeze({ ownerConstraint: expected, artifactOwnerReceizId: actual }),
  });
}

function ownerFromCanonical(canonical: CanonicalOpenSuccess): string | null {
  const seal = canonical.nativeRecordSeal;
  if (seal && typeof seal.ownerReceizId === "string" && seal.ownerReceizId.trim()) {
    return seal.ownerReceizId.trim();
  }
  const continuity = canonical.verification.assetContinuity;
  return continuity && typeof continuity.ownerReceizId === "string" && continuity.ownerReceizId.trim()
    ? continuity.ownerReceizId.trim()
    : null;
}

function artifactIdentityFromVerification(
  verification: Extract<ReceizArtifactVerificationResult, { status: "verified-artifact" }>,
): string {
  const claimId = verification.verification.bundle?.receizClaimId;
  return typeof claimId === "string" && claimId.trim()
    ? claimId.trim()
    : `artifact:${verification.artifactDigest.value}`;
}

function ownerFromVerification(
  verification: Extract<ReceizArtifactVerificationResult, { status: "verified-artifact" }>,
): string | null {
  const seal = verification.verification.bundle?.nativeRecordSeal;
  if (seal && typeof seal === "object" && typeof (seal as { ownerReceizId?: unknown }).ownerReceizId === "string") {
    return (seal as { ownerReceizId: string }).ownerReceizId.trim() || null;
  }
  return typeof verification.continuity.ownerReceizId === "string"
    ? verification.continuity.ownerReceizId.trim() || null
    : null;
}

function identityPayloadBindsArtifactOwner(
  keyFile: Awaited<ReturnType<typeof readReceizIdentityArtifact>>,
  artifactOwnerReceizId: string | null,
): boolean {
  if (artifactOwnerReceizId === null) return false;
  if (keyFile.owner.uid === artifactOwnerReceizId) return true;
  const username = keyFile.owner.username?.trim().replace(/^@+/, "").toLowerCase() ?? "";
  return username.length > 0 && `${username}.receiz.id` === artifactOwnerReceizId;
}

function openedArtifactFromCanonical(input: {
  canonical: CanonicalOpenSuccess;
  artifactBytes: Uint8Array;
  artifactSha256: string;
  payloadSha256: string;
  filename: string;
  mimeType: string;
}): ReceizOpenedArtifact | null {
  const seal = input.canonical.nativeRecordSeal;
  const bundle = input.canonical.verification.bundle;
  if (!seal || !bundle
    || typeof seal.ownerReceizId !== "string"
    || typeof seal.recordId !== "string"
    || typeof bundle.receizClaimId !== "string"
    || typeof bundle.verifyPath !== "string") return null;
  const artifact = new File([input.artifactBytes.slice()], input.filename, { type: input.mimeType });
  const sealedArtifact = issueCurrentNativeArtifact({
    artifact,
    filename: input.filename,
    mimeType: input.mimeType,
    artifactSha256: input.artifactSha256,
    payloadSha256: input.payloadSha256,
    payloadFilename: input.canonical.payloadFilename,
    payloadMimeType: input.canonical.payloadMimeType,
    continuity: {
      carrier: "native-record-seal",
      ownerReceizId: seal.ownerReceizId,
      recordId: seal.recordId,
      claimId: bundle.receizClaimId,
      verifyPath: bundle.verifyPath,
      signatureVersion: 4,
    },
    verification: input.canonical.verification as never,
  });
  return {
    sealedArtifact,
    verifiedPayload: issueVerifiedPayload({
      bytes: input.canonical.payloadBytes,
      filename: input.canonical.payloadFilename,
      mimeType: input.canonical.payloadMimeType,
      sha256: input.payloadSha256,
    }),
    verification: input.canonical.verification as never,
    legacyCompatibility: "current-native",
  };
}

function profileDenied(input: {
  profile: ReceizArtifactAdmissionOptions["profile"];
  artifactSha256: string;
  payloadSha256: string;
  ownerReceizId: string | null;
  actorConstraint: string | null;
  error?: ReceizArtifactAdmissionError;
  summaryCode?: string;
}): ReceizProfileDeniedArtifactAdmission {
  const error = input.error ?? Object.freeze({
    code: "ADMISSION_PROFILE_DENIED" as const,
    details: Object.freeze({ profile: input.profile }),
  });
  return deepFreeze({
    schema: "receiz.artifact-admission.v112" as const,
    profile: input.profile,
    verdict: "profile-denied" as const,
    error,
    recoveryPlan: null,
    artifactSha256: input.artifactSha256,
    payloadSha256: input.payloadSha256,
    ownerReceizId: input.ownerReceizId,
    actorConstraint: input.actorConstraint,
    assessments: RECEIZ_DENIED_ADMISSION_ASSESSMENTS,
    explanation: receizProofExplanation({
      outcome: "profile-denied",
      summaryCode: input.summaryCode ?? error.code,
      facts: [
        { code: "ADMISSION_PROFILE", value: input.profile },
        { code: "ARTIFACT_SHA256", value: input.artifactSha256 },
        { code: "PAYLOAD_SHA256", value: input.payloadSha256 },
      ],
    }),
    writesPerformed: 0 as const,
    authority: {
      admissionIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    },
  });
}

function documentAdmission(input: {
  verification: Extract<ReceizArtifactVerificationResult, { status: "verified-artifact" }>;
  ownerReceizId: string | null;
}): ReceizDocumentArtifactAdmission {
  return deepFreeze({
    schema: "receiz.artifact-admission.v112" as const,
    profile: "document" as const,
    verdict: "verified-document" as const,
    error: null,
    recoveryPlan: null,
    artifactId: artifactIdentityFromVerification(input.verification),
    artifactSha256: input.verification.artifactDigest.value,
    payloadSha256: input.verification.payloadDigest.value,
    ownerReceizId: input.ownerReceizId,
    assessments: RECEIZ_DENIED_ADMISSION_ASSESSMENTS,
    explanation: receizProofExplanation({
      outcome: "verified-document",
      summaryCode: "DOCUMENT_PROFILE_VERIFIED",
      facts: [
        { code: "ARTIFACT_SHA256", value: input.verification.artifactDigest.value },
        { code: "PAYLOAD_SHA256", value: input.verification.payloadDigest.value },
      ],
    }),
    writesPerformed: 0 as const,
    authority: {
      admissionIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    },
  });
}

function admissionProofBasis(input: {
  registryDigest: string;
  registryEffectiveKai: string;
  profile: "identity" | "portable-state" | "profile-showcase" | "economy-showcase";
  verdict: ReceizVerifiedArtifactAdmission["verdict"];
  artifactId: string;
  artifactSha256: string;
  payloadSha256: string;
  ownerReceizId: string | null;
  actorConstraint: string | null;
  recoveredState: Readonly<Record<string, unknown>> | string;
  assessments: ReceizAdmissionAssessments;
  continuity: unknown;
  verifierContextDigest: string;
  identityBindingDigest: string | null;
}) {
  return {
    schema: "receiz.artifact-admission-proof-basis.v112",
    registryDigest: input.registryDigest,
    registryEffectiveKai: input.registryEffectiveKai,
    profile: input.profile,
    verdict: input.verdict,
    artifactId: input.artifactId,
    artifactSha256: input.artifactSha256,
    payloadSha256: input.payloadSha256,
    ownerReceizId: input.ownerReceizId,
    actorConstraint: input.actorConstraint,
    recoveredState: input.recoveredState,
    assessments: input.assessments,
    continuity: input.continuity,
    verifierContextDigest: input.verifierContextDigest,
    identityBindingDigest: input.identityBindingDigest,
  };
}

async function verifiedResult(input: {
  registryDigest: string;
  registryEffectiveKai: string;
  registryDiscovery: ReceizRegistryDiscoveryResult | null;
  registryContext?: ReceizConstitutionRegistry | null;
  profile: "identity" | "portable-state" | "profile-showcase" | "economy-showcase";
  verdict: ReceizVerifiedArtifactAdmission["verdict"];
  opened: ReceizOpenedArtifact | null;
  historicalIdentitySource?: Readonly<{
    verifiedPayload: ReceizOpenedArtifact["verifiedPayload"];
    continuity: Readonly<{carrier: "identity-seal"; ownerReceizId: string; keyId: string; portableStateDigest: string}>;
  }>;
  identityPayloadBytes?: Uint8Array;
  artifactId: string;
  ownerReceizId: string | null;
  actorConstraint: string | null;
  recoveredState: Readonly<Record<string, unknown>>;
  assessments: ReceizAdmissionAssessments;
  error?: ReceizArtifactAdmissionError | null;
  summaryCode: string;
  sourceVerification: Extract<ReceizArtifactVerificationResult, { status: "verified-artifact" }>;
  exactArtifactBytes: Uint8Array;
  verifierRoots: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
  verifierContext: Readonly<Record<string, unknown>>;
  identityEvidenceBasis?: IdentityEvidenceBasis | null;
  proofHistory?: ReceizVerifiedProofHistory | null;
  proofHistoryHead?: ReceizCarriedProofHistoryHeadV114 | null;
}): Promise<ReceizVerifiedArtifactAdmission> {
  const artifactBytes = input.exactArtifactBytes.slice();
  const historical = input.profile === "identity" ? input.historicalIdentitySource : undefined;
  if (!input.opened && !historical) throw new Error("ADMISSION_ARTIFACT_REVALIDATION_FAILED");
  const source = input.opened?.sealedArtifact;
  const artifactSha256 = source?.artifactSha256 ?? input.sourceVerification.artifactDigest.value;
  const payloadSha256 = source?.payloadSha256 ?? input.sourceVerification.payloadDigest.value;
  const continuity = source?.continuity ?? historical!.continuity;
  const verifiedPayload = input.opened?.verifiedPayload ?? historical!.verifiedPayload;
  const openedBytes = source ? new Uint8Array(await source.artifact.arrayBuffer()) : artifactBytes;
  if (artifactBytes.byteLength === 0 || artifactBytes.byteLength > MAX_ARTIFACT_BYTES
    || openedBytes.byteLength !== artifactBytes.byteLength
    || openedBytes.some((byte, index) => byte !== artifactBytes[index])
    || await sha256ReceizBytes(artifactBytes) !== artifactSha256) {
    throw new Error("ADMISSION_ARTIFACT_REVALIDATION_FAILED");
  }
  const recoveredState = freezeRecord(input.recoveredState);
  // Identity snapshots already carry verified JSON, including fractional display
  // projections. Bind that exact JSON through the existing canonical serializer;
  // do not turn its numbers into integer authority or alter the returned state.
  // Preserve every existing integer-only admission digest byte-for-byte.
  const recoveredStateBasis = input.profile === "identity" && containsNonAuthorityNumber(recoveredState)
    ? canonicalizeReceizConstitution(recoveredState)
    : recoveredState;
  const assessments = deepFreeze({ ...input.assessments });
  const verifierContextDigest = await digestReceizAuthority(
    "admission",
    "receiz.canonical-verifier-context.v112",
    input.verifierContext,
  );
  const identityBindingDigest = input.identityEvidenceBasis
    ? await digestReceizAuthority(
        "identity",
        "receiz.verified-actor-identity-binding.v124",
        publicIdentityBinding(input.identityEvidenceBasis),
      )
    : null;
  const basis = admissionProofBasis({
    ...input,
    artifactSha256,
    payloadSha256,
    recoveredState: recoveredStateBasis,
    assessments,
    continuity,
    verifierContextDigest,
    identityBindingDigest,
  });
  const continuityDigest = await digestReceizAuthority(
    "artifact",
    "receiz.artifact-continuity.v112",
    continuity,
  );
  const recoveredStateDigest = await digestReceizAuthority("state", "receiz.recovered-state.v112", recoveredStateBasis);
  const assessmentsDigest = await digestReceizAuthority("admission", "receiz.admission-assessments.v112", assessments);
  const admissionProofDigest = await digestReceizAuthority(
    "admission",
    "receiz.artifact-admission-proof-basis.v112",
    basis,
  );
  const actor = input.identityEvidenceBasis ? deepFreeze<ReceizVerifiedActorReference>({
    actorId: input.identityEvidenceBasis.actorId,
    evidenceDigest: actorEvidenceDigest(identityBindingDigest!),
    admissionProfile: "identity",
    registryDigest: registryDigest(input.registryDigest),
  }) : null;
  const common = {
    schema: "receiz.artifact-admission.v112" as const,
    profile: input.profile,
    verdict: input.verdict,
    error: input.error ?? null,
    recoveryPlan: null,
    artifactId: input.artifactId,
    artifactSha256,
    payloadSha256,
    ownerReceizId: input.ownerReceizId,
    actorConstraint: input.actorConstraint,
    openedArtifact: input.opened,
    verifiedPayload,
    proofHistory: input.proofHistory ?? null,
    proofHistoryHead: input.proofHistoryHead ?? null,
    admissionProof: {
      schema: "receiz.artifact-admission-proof.v112" as const,
      registryDigest: input.registryDigest,
      registryEffectiveKai: input.registryEffectiveKai,
      artifactSha256,
      payloadSha256,
      continuityDigest,
      recoveredStateDigest,
      assessmentsDigest,
      verifierContextDigest,
      identityBindingDigest,
      admissionProofDigest,
    },
    recoveredState,
    assessments,
    explanation: receizProofExplanation({
      outcome: input.verdict,
      summaryCode: input.summaryCode,
      facts: [
        { code: "ADMISSION_PROFILE", value: input.profile },
        { code: "ARTIFACT_SHA256", value: artifactSha256 },
        { code: "OWNER_RECEIZ_ID", value: input.ownerReceizId },
        { code: "PAYLOAD_SHA256", value: payloadSha256 },
      ],
    }),
    writesPerformed: 0 as const,
    authority: Object.freeze({
      admissionIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  };
  const admission = deepFreeze<ReceizVerifiedArtifactAdmission>(
    input.profile === "identity" && actor
      ? {
        ...common,
        profile: "identity" as const,
        verdict: "canonical-identity" as const,
        actor,
        admissionDigest: admissionDigest(admissionProofDigest),
      }
      : input.profile === "profile-showcase"
        ? {
            ...common, openedArtifact: input.opened!,
            profile: "profile-showcase" as const,
            verdict: "bearer-recovery" as const,
          }
        : input.profile === "economy-showcase"
          ? {
              ...common, openedArtifact: input.opened!,
              profile: "economy-showcase" as const,
              verdict: "bearer-recovery" as const,
            }
        : {
        ...common, openedArtifact: input.opened!,
        profile: "portable-state" as const,
        verdict: input.verdict === "foreign-owner" ? "foreign-owner" as const : "bearer-recovery" as const,
          },
  );
  sdkIssuedAdmissions.add(admission);
  admissionCustody.set(admission, Object.freeze({
    sourceVerification: input.sourceVerification,
    artifactBytes,
    verifierRoots: cloneRoots(input.verifierRoots),
    verifierContext: input.verifierContext,
    identityEvidenceBasis: input.identityEvidenceBasis ?? null,
    identityPayloadBytes: input.identityPayloadBytes?.slice() ?? null,
    registryDigest: input.registryDigest,
    registryEffectiveKai: input.registryEffectiveKai,
    registryDiscovery: input.registryDiscovery,
    registryContext: input.registryContext ?? null,
  }));
  if (admission.profile === "identity") {
    actorReferenceCustody.set(admission.actor, Object.freeze({
      admission,
      admissionDigest: admission.admissionDigest.value,
      evidenceDigest: admission.actor.evidenceDigest.value,
      registryDigest: admission.actor.registryDigest.value,
    }));
  }
  return admission;
}

async function canonicalReverify(input: {
  verification: Extract<ReceizArtifactVerificationResult, { status: "verified-artifact" }>;
  roots: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}) {
  const snapshot = await readRuntimeCustodiedReceizArtifactSnapshot(input.verification);
  if (await sha256ReceizBytes(snapshot.bytes) !== input.verification.artifactDigest.value) {
    throw new Error("ADMISSION_ARTIFACT_REVALIDATION_FAILED");
  }
  const retained = await readRuntimeCustodiedReceizArtifactCanonicalOpen(
    input.verification,
    input.roots,
  );
  if (retained) {
    const nativeRecordSeal =
      input.verification.verification.bundle.nativeRecordSeal ?? null;
    return {
      snapshot,
      canonical: {
        ok: true as const,
        verification: input.verification.verification,
        artifactBytes: snapshot.bytes,
        payloadBytes: retained.payloadBytes,
        payloadFilename: retained.payloadFilename,
        payloadMimeType: retained.payloadMimeType,
        nativeRecordSeal: nativeRecordSeal as Readonly<Record<string, unknown>> | null,
        legacyCompatibility: nativeRecordSeal
          ? "current-native" as const
          : "verified-legacy-read" as const,
      },
    };
  }
  const canonical = await verifyAndExtractReceizDocumentBytesCanonical({
    fileBytes: snapshot.bytes,
    filename: snapshot.filename,
    mime: snapshot.mimeType,
    signatureV4RootPublicKeys: input.roots,
    zipGuardLimits: CANONICAL_ZIP_LIMITS,
  });
  if (!canonical.ok) return { snapshot, canonical: null };
  if (await sha256ReceizBytes(canonical.payloadBytes) !== input.verification.payloadDigest.value) {
    throw new Error("ADMISSION_ARTIFACT_REVALIDATION_FAILED");
  }
  return { snapshot, canonical };
}

/**
 * Explicit compatibility boundary for an exact cumulative-v114 sealed
 * showcase. The result is inspection-only: it is deliberately not registered
 * as an artifact admission and therefore cannot enter ordinary paint or append
 * paths. Its hidden custody is consumed only by the native migration rail.
 */
export async function inspectReceizLegacyProfileShowcaseV114(input: Readonly<{
  verification: ReceizArtifactVerificationResult;
  ownerConstraint: string;
  dependencies?: ReceizArtifactAdmissionDependencies;
}>): Promise<ReceizInspectedLegacyProfileShowcaseV114> {
  if (!input || typeof input !== "object"
    || !input.verification || typeof input.ownerConstraint !== "string"
    || input.ownerConstraint.trim().length === 0) {
    throw new TypeError("LEGACY_PROFILE_SHOWCASE_INSPECTION_INPUT_INVALID");
  }
  if (input.verification.status !== "verified-artifact") {
    throw new TypeError("LEGACY_PROFILE_SHOWCASE_EXACT_ARTIFACT_REQUIRED");
  }
  const dependencies = input.dependencies ?? {};
  const roots = cloneRoots(
    dependencies.canonicalSignatureV4RootPublicKeys ?? receizCurrentPinnedSignatureV4Roots(),
  );
  const registryDiscovery = dependencies.verifiedRegistryDiscovery
    ? verifyRuntimeDiscoveredReceizRegistryLaw(dependencies.verifiedRegistryDiscovery)
    : null;
  const { snapshot, canonical } = await canonicalReverify({
    verification: input.verification,
    roots,
  });
  if (!canonical || canonical.legacyCompatibility !== "current-native") {
    throw new TypeError("LEGACY_PROFILE_SHOWCASE_EXACT_ARTIFACT_REQUIRED");
  }
  const ownerReceizIdentity = ownerFromCanonical(canonical);
  if (ownerReceizIdentity !== input.ownerConstraint.trim()) {
    throw new TypeError("LEGACY_PROFILE_SHOWCASE_OWNER_MISMATCH");
  }
  const decoded = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(canonical.payloadBytes),
  ) as unknown;
  const carrier = await parseReceizProfileShowcaseCarrier(decoded);
  if (
    carrier.ownerReceizIdentity !== ownerReceizIdentity
    || carrier.artifactId !== `profile-showcase:${ownerReceizIdentity}`
  ) throw new TypeError("LEGACY_PROFILE_SHOWCASE_CARRIER_MISMATCH");
  const context = await verifierContext({
    canonical,
    filename: snapshot.filename,
    mimeType: snapshot.mimeType,
    roots,
  });
  const contextDigest = await digestReceizAuthority(
    "admission",
    "receiz.canonical-verifier-context.v112",
    context,
  );
  const history = await verifyReceizCarriedProofHistory({
    history: carrier.receizProofHistory.history,
    artifactId: carrier.artifactId,
    registryDigest: RECEIZ_V114_REGISTRY_DIGEST,
    artifactDigest: input.verification.artifactDigest.value,
    verifierContextDigest: contextDigest,
  });
  await assertProfileShowcaseCarriedHeadSemantics(carrier, history);
  const opened = openedArtifactFromCanonical({
    canonical,
    artifactBytes: snapshot.bytes,
    artifactSha256: input.verification.artifactDigest.value,
    payloadSha256: input.verification.payloadDigest.value,
    filename: snapshot.filename,
    mimeType: snapshot.mimeType,
  });
  if (!opened) throw new TypeError("LEGACY_PROFILE_SHOWCASE_EXACT_ARTIFACT_REQUIRED");
  const internalAdmission = await verifiedResult({
    registryDigest: registryDiscovery?.trustEvidence.currentRegistryDigest.value
      ?? RECEIZ_CURRENT_REGISTRY_DIGEST,
    registryEffectiveKai: registryDiscovery?.trustEvidence.currentEffectiveKai
      ?? RECEIZ_CURRENT_REGISTRY_EFFECTIVE_KAI,
    registryDiscovery,
    profile: "profile-showcase",
    verdict: "bearer-recovery",
    opened,
    artifactId: carrier.artifactId,
    ownerReceizId: ownerReceizIdentity,
    actorConstraint: null,
    recoveredState: carrier as unknown as Readonly<Record<string, unknown>>,
    assessments: PORTABLE_ASSESSMENTS,
    summaryCode: "PROFILE_SHOWCASE_LEGACY_INSPECTION_ONLY",
    sourceVerification: input.verification,
    exactArtifactBytes: snapshot.bytes,
    verifierRoots: roots,
    verifierContext: context,
    proofHistory: history,
  });
  if (internalAdmission.profile !== "profile-showcase") {
    throw new TypeError("LEGACY_PROFILE_SHOWCASE_EXACT_ARTIFACT_REQUIRED");
  }
  const head = carrier["profile-showcase"] as Readonly<Record<string, unknown>>;
  if (
    typeof head.resultingOperationCount !== "number"
    || !Number.isSafeInteger(head.resultingOperationCount)
    || head.resultingOperationCount < 1
    || typeof head.headKaiUpulse !== "string"
    || !/^(0|[1-9][0-9]*)$/.test(head.headKaiUpulse)
    || typeof head.currentStateRoot !== "string"
    || !/^[0-9a-f]{64}$/.test(head.currentStateRoot)
  ) throw new TypeError("LEGACY_PROFILE_SHOWCASE_CARRIER_MISMATCH");
  const inspected = deepFreeze<ReceizInspectedLegacyProfileShowcaseV114>({
    schema: "receiz.inspected-legacy-profile-showcase.v114",
    status: "inspection-only",
    artifactId: carrier.artifactId,
    artifactSha256: input.verification.artifactDigest.value,
    payloadSha256: input.verification.payloadDigest.value,
    ownerReceizIdentity,
    historyHeadDigest: history.headDigests[0]!,
    resultingOperationCount: head.resultingOperationCount,
    headKaiUpulse: head.headKaiUpulse,
    currentStateRoot: head.currentStateRoot,
    authority: {
      inspectionIsProofAuthority: false,
      paintAllowed: false,
      appendAllowed: false,
      strongerTruth: "sealed-receiz-proof-object",
    },
  });
  legacyProfileShowcaseInspectionCustody.set(inspected, Object.freeze({
    sourceVerification: input.verification,
    artifactBytes: snapshot.bytes.slice(),
    verifierRoots: roots,
    registryDiscovery,
    carrier,
    history,
    internalAdmission,
  }));
  return inspected;
}

export function isSdkInspectedLegacyProfileShowcaseV114(
  value: unknown,
): value is ReceizInspectedLegacyProfileShowcaseV114 {
  return value !== null
    && typeof value === "object"
    && legacyProfileShowcaseInspectionCustody.has(value);
}

/** Package-internal migration mechanics; this object remains non-admissible. */
export function readReceizLegacyProfileShowcaseInspectionCustody(
  value: ReceizInspectedLegacyProfileShowcaseV114,
): LegacyProfileShowcaseInspectionCustody {
  const custody = legacyProfileShowcaseInspectionCustody.get(value);
  if (!custody) throw new TypeError("LEGACY_PROFILE_SHOWCASE_INSPECTION_NOT_SDK_ISSUED");
  return custody;
}

/**
 * Exact-byte structural inspection for cold predecessor resolution. This is
 * intentionally not an admission and cannot paint or append by itself.
 */
export async function inspectReceizBoundedProfileShowcaseV114(input: Readonly<{
  verification: ReceizArtifactVerificationResult;
  ownerConstraint: string;
  dependencies?: ReceizArtifactAdmissionDependencies;
}>): Promise<ReceizInspectedBoundedProfileShowcaseV114> {
  if (
    !input || typeof input !== "object"
    || input.verification.status !== "verified-artifact"
    || typeof input.ownerConstraint !== "string"
    || input.ownerConstraint.trim().length === 0
  ) throw new TypeError("BOUNDED_PROFILE_SHOWCASE_INSPECTION_INPUT_INVALID");
  const roots = cloneRoots(
    input.dependencies?.canonicalSignatureV4RootPublicKeys
      ?? receizCurrentPinnedSignatureV4Roots(),
  );
  const { canonical } = await canonicalReverify({
    verification: input.verification,
    roots,
  });
  if (!canonical) throw new TypeError("BOUNDED_PROFILE_SHOWCASE_EXACT_ARTIFACT_REQUIRED");
  const ownerReceizIdentity = ownerFromCanonical(canonical);
  if (ownerReceizIdentity !== input.ownerConstraint.trim()) {
    throw new TypeError("BOUNDED_PROFILE_SHOWCASE_OWNER_MISMATCH");
  }
  const carrier = await parseReceizBoundedProfileShowcaseCarrierV114(JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(canonical.payloadBytes),
  ));
  await assertReceizBoundedProfileShowcaseCarriedHeadSemanticsV114(carrier);
  if (
    carrier.ownerReceizIdentity !== ownerReceizIdentity
    || carrier.artifactId !== `profile-showcase:${ownerReceizIdentity}`
  ) throw new TypeError("BOUNDED_PROFILE_SHOWCASE_CARRIER_MISMATCH");
  const parents = carrier["profile-showcase"].parentHeads as readonly Record<string, unknown>[];
  const inspected = deepFreeze<ReceizInspectedBoundedProfileShowcaseV114>({
    schema: "receiz.inspected-bounded-profile-showcase.v114",
    status: "inspection-only",
    artifactId: carrier.artifactId,
    artifactSha256: input.verification.artifactDigest.value,
    payloadSha256: input.verification.payloadDigest.value,
    ownerReceizIdentity,
    parentArtifactDigest: parents[0]?.artifactDigest as string | undefined ?? null,
    historyNodeDigest: carrier.receizProofHistory.currentNode.nodeDigest,
    authority: {
      inspectionIsProofAuthority: false,
      paintAllowed: false,
      appendAllowed: false,
      strongerTruth: "sealed-receiz-proof-object",
    },
  });
  boundedProfileShowcaseInspectionCustody.set(inspected, carrier);
  return inspected;
}

/** Package-internal cold resolver mechanics; the inspection remains non-authoritative. */
export function readReceizBoundedProfileShowcaseInspectionCarrier(
  value: ReceizInspectedBoundedProfileShowcaseV114,
): ReceizBoundedProfileShowcaseCarrierV114 {
  const carrier = boundedProfileShowcaseInspectionCustody.get(value);
  if (!carrier) throw new TypeError("BOUNDED_PROFILE_SHOWCASE_INSPECTION_NOT_SDK_ISSUED");
  return carrier;
}

type ProfileShowcaseCheckpointAdmissionInput = Readonly<{
  checkpointArtifact: Blob;
  canonicalSignatureV4RootPublicKeys: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
  verifiedActorEvidence: unknown;
  admittedChildren: readonly unknown[];
  resolveAdmittedChild?: (evidenceRoot: string) => unknown | Promise<unknown>;
  resolvePredecessorAdmission: (
    artifactDigest: string,
  ) => unknown | Promise<unknown>;
  resolveSegment: ReceizProfileShowcaseCheckpointSegmentResolverV114;
  persistentStateIO?: ReceizProfileShowcasePersistentStateIOV114;
  auditMode?: "full" | "bounded-snapshot";
}>;

export async function admitReceizProfileShowcaseCheckpointBundleV114(input: ProfileShowcaseCheckpointAdmissionInput): Promise<ReceizVerifiedProfileShowcaseCheckpointV114> {
  return admitProfileShowcaseCheckpointBundle(input);
}

/** The public preimage is usable only beneath this exact canonical checkpoint.
 * It never becomes identity custody or authority for a new transition. */
export async function admitReceizProfileShowcaseCheckpointBundleWithSourceActorBindingV114(
  input: Omit<ProfileShowcaseCheckpointAdmissionInput, "verifiedActorEvidence" | "auditMode"> & Readonly<{ actorPublicBinding: unknown }>,
): Promise<ReceizVerifiedProfileShowcaseCheckpointV114> {
  return admitProfileShowcaseCheckpointBundle({ ...input, verifiedActorEvidence: null, auditMode: "full" }, input.actorPublicBinding);
}

async function admitProfileShowcaseCheckpointBundle(input: ProfileShowcaseCheckpointAdmissionInput, sourceActorBinding?: unknown): Promise<ReceizVerifiedProfileShowcaseCheckpointV114> {
  if (
    !input || typeof input !== "object"
    || !(input.checkpointArtifact instanceof Blob)
    || !Array.isArray(input.admittedChildren)
    || typeof input.resolvePredecessorAdmission !== "function"
    || typeof input.resolveSegment !== "function"
  ) throw new TypeError("PROFILE_SHOWCASE_CHECKPOINT_ADMISSION_INVALID");
  const roots = cloneRoots(input.canonicalSignatureV4RootPublicKeys);
  const verification = await verifyReceizArtifactWithCanonicalRoots(
    input.checkpointArtifact,
    roots,
  );
  if (verification.status !== "verified-artifact") {
    throw new TypeError("PROFILE_SHOWCASE_CHECKPOINT_ARTIFACT_INVALID");
  }
  const { snapshot, canonical } = await canonicalReverify({ verification, roots });
  if (!canonical) throw new TypeError("PROFILE_SHOWCASE_CHECKPOINT_ARTIFACT_INVALID");
  const ownerReceizIdentity = ownerFromCanonical(canonical);
  let actorAdmission: ReceizVerifiedArtifactAdmission | null = null;
  let actorPublicBinding: ReceizIdentityPublicBinding | null = null;
  if (sourceActorBinding !== undefined) {
    const binding = sourceActorBinding as ReceizIdentityPublicBinding | null;
    const keys = ["schema", "artifactSha256", "payloadSha256", "artifactOwnerReceizId", "identityOwnerReceizId",
      "actorId", "keyId", "alg", "publicKeyRawB64u", "signatureVerified", "registryDigest"];
    if (!binding || typeof binding !== "object" || Object.keys(binding).sort().join(",") !== keys.sort().join(",")
      || binding.schema !== "receiz.verified-actor-identity-binding.v124" || binding.signatureVerified !== true
      || !/^[0-9a-f]{64}$/.test(binding.artifactSha256) || !/^[0-9a-f]{64}$/.test(binding.payloadSha256)
      || !/^[0-9a-f]{64}$/.test(binding.registryDigest) || !binding.actorId || !binding.keyId || !binding.publicKeyRawB64u
      || (binding.alg !== "Ed25519" && binding.alg !== "P-256")) {
      throw new TypeError("PROFILE_SHOWCASE_CHECKPOINT_ACTOR_INVALID");
    }
    actorPublicBinding = deepFreeze(structuredClone(binding));
  } else {
    const actor = await verifyReceizArtifactAdmission(input.verifiedActorEvidence);
    if ("code" in actor || actor.profile !== "identity") throw new TypeError("PROFILE_SHOWCASE_CHECKPOINT_ACTOR_INVALID");
    actorAdmission = actor;
    const basis = admissionCustody.get(actor)?.identityEvidenceBasis;
    actorPublicBinding = basis ? publicIdentityBinding(basis) : null;
  }
  const actorEvidenceRoot = sourceActorBinding !== undefined
    ? await digestReceizAuthority("identity", actorPublicBinding!.schema, actorPublicBinding!)
    : actorAdmission!.actor.evidenceDigest.value;
  const actorId = sourceActorBinding !== undefined ? actorPublicBinding!.actorId : actorAdmission!.actor.actorId;
  const children = await Promise.all(input.admittedChildren.map(
    (candidate) => verifyReceizArtifactAdmission(candidate),
  ));
  if (children.some((candidate) => "code" in candidate)) {
    throw new TypeError("PROFILE_SHOWCASE_CHECKPOINT_CHILD_INVALID");
  }
  const childByEvidence = new Map(
    children.flatMap((candidate) => "code" in candidate ? [] : [[
      candidate.admissionProof.admissionProofDigest,
      candidate,
    ] as const]),
  );
  const resolveChild = async (evidenceRoot: string) => {
    const known = childByEvidence.get(evidenceRoot);
    if (known) return known;
    if (!input.resolveAdmittedChild) return null;
    return resolveReceizCheckpointChildAdmissionForEvidenceRoot(
      evidenceRoot,
      input.resolveAdmittedChild,
    );
  };
  const segmentIds: string[] = [];
  const resolveVerifiedSegment: ReceizProfileShowcaseCheckpointSegmentResolverV114 =
    async (segmentIndex) => {
      const segment = await input.resolveSegment(segmentIndex);
      if (!segment) return null;
      segmentIds[segmentIndex] = segment.commitment.segmentId;
      for (const operation of segment.operations as readonly Record<string, unknown>[]) {
        if (operation.authorityEvidenceRoot !== actorEvidenceRoot) {
          throw new TypeError("PROFILE_SHOWCASE_CHECKPOINT_ACTOR_INVALID");
        }
        if (operation.kind === "showcase.append") {
          const child = operation.child as Record<string, unknown>;
          const admitted = await resolveChild(child.admissionEvidenceRoot as string);
          if (
            !admitted
            || admitted.artifactId !== child.stableChildArtifactId
            || admitted.artifactSha256 !== child.childArtifactDigest
            || admitted.payloadSha256 !== child.contentDigest
          ) throw new TypeError("PROFILE_SHOWCASE_CHECKPOINT_CHILD_INVALID");
        }
      }
      return segment;
    };
  const decodedBundle = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(canonical.payloadBytes),
  );
  // Retain the state already built during full admission. This is source
  // custody, so complete readers need not replay an admitted archive again.
  const persistentStateIO = input.persistentStateIO
    ?? (input.auditMode === "bounded-snapshot" ? null
      : createReceizProfileShowcasePersistentMemoryStoreV114());
  const build = input.auditMode === "bounded-snapshot"
    ? await verifyReceizProfileShowcaseCheckpointSnapshotV114({
        bundle: decodedBundle,
        ...(persistentStateIO
          ? { persistentStateIO }
          : {}),
      })
    : await verifyReceizProfileShowcaseCheckpointBundleV114({
        bundle: decodedBundle,
        resolveSegment: resolveVerifiedSegment,
        ...(persistentStateIO
          ? { persistentStateIO }
          : {}),
      });
  const bundle = build.bundle;
  if (input.auditMode === "bounded-snapshot") {
    for (
      const child of bundle.firstPaintWindow.children as readonly Record<string, unknown>[]
    ) {
      const reference = child.reference as Record<string, unknown>;
      const admitted = await resolveChild(
        reference.admissionEvidenceRoot as string,
      );
      if (
        !admitted
        || admitted.artifactId !== reference.stableChildArtifactId
        || admitted.artifactSha256 !== reference.childArtifactDigest
        || admitted.payloadSha256 !== reference.contentDigest
      ) throw new TypeError("PROFILE_SHOWCASE_CHECKPOINT_CHILD_INVALID");
    }
  }
  if (
    bundle.ownerReceizIdentity !== ownerReceizIdentity
    || bundle.artifactId !== `profile-showcase:${ownerReceizIdentity}`
    || bundle.profileIdentity !== actorId
    || bundle.actorEvidenceRoot !== actorEvidenceRoot
    || bundle.checkpointHistoryNode.artifactId !== bundle.artifactId
    || bundle.checkpointHistoryNode.registryDigest !== bundle.versions.registryDigest
  ) throw new TypeError("PROFILE_SHOWCASE_CHECKPOINT_BINDING_INVALID");
  const predecessorAdmission = await verifyReceizArtifactAdmission(
    await input.resolvePredecessorAdmission(bundle.predecessorArtifactDigest),
  );
  if (
    "code" in predecessorAdmission
    || predecessorAdmission.profile !== "profile-showcase"
    || predecessorAdmission.artifactSha256 !== bundle.predecessorArtifactDigest
    || predecessorAdmission.proofHistoryHead?.headDigest
      !== bundle.predecessorHistoryHeadDigest
  ) throw new TypeError("PROFILE_SHOWCASE_CHECKPOINT_PREDECESSOR_INVALID");
  const predecessorCarrier =
    await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(
      predecessorAdmission,
    );
  const historyHead = await appendReceizCarriedProofHistoryHeadV114({
    predecessor: predecessorCarrier.receizProofHistory,
    predecessorArtifactDigest: bundle.predecessorArtifactDigest,
    appendNode: bundle.checkpointHistoryNode,
  });
  const verified = deepFreeze<ReceizVerifiedProfileShowcaseCheckpointV114>({
    schema: "receiz.verified-profile-showcase-checkpoint.v114",
    status: "verified-checkpoint",
    artifactId: bundle.artifactId,
    checkpointArtifactSha256: verification.artifactDigest.value,
    checkpointPayloadSha256: verification.payloadDigest.value,
    ownerReceizIdentity,
    operationCount: bundle.operationCount,
    segmentCount: bundle.segmentCount,
    historyHeadDigest: historyHead.headDigest,
    authority: {
      checkpointIsProofAuthority: true,
      projectionIsProofAuthority: false,
      strongerTruth: "sealed-receiz-proof-object",
    },
  });
  profileShowcaseCheckpointCustody.set(verified, Object.freeze({
    persistentStateIO,
    sourceArtifact: input.checkpointArtifact,
    exactArtifactBytes: snapshot.bytes.slice(),
    filename: snapshot.filename,
    mimeType: snapshot.mimeType,
    verifierRoots: roots,
    build,
    historyHead,
    predecessorAdmission,
    actorAdmission,
    actorPublicBinding,
    children: children as readonly ReceizVerifiedArtifactAdmission[],
    resolveAdmittedChild: resolveChild,
    segmentIds: Object.freeze(segmentIds.slice()),
    resolveSegment: input.resolveSegment,
  }));
  return verified;
}

export function isSdkVerifiedProfileShowcaseCheckpointV114(
  value: unknown,
): value is ReceizVerifiedProfileShowcaseCheckpointV114 {
  return value !== null
    && typeof value === "object"
    && profileShowcaseCheckpointCustody.has(value);
}

export function readReceizProfileShowcaseCheckpointCustodyV114(
  value: ReceizVerifiedProfileShowcaseCheckpointV114,
): ProfileShowcaseCheckpointCustody {
  const custody = profileShowcaseCheckpointCustody.get(value);
  if (!custody) throw new TypeError("PROFILE_SHOWCASE_CHECKPOINT_NOT_SDK_ISSUED");
  return custody;
}

export async function createReceizProfileShowcaseCheckpointCarrierV114(
  checkpoint: ReceizVerifiedProfileShowcaseCheckpointV114,
): Promise<ReceizBoundedProfileShowcaseCarrierV114> {
  const custody = readReceizProfileShowcaseCheckpointCustodyV114(checkpoint);
  const bundle = custody.build.bundle;
  const stateRoot = digestReceizCompositeCanonical({
    kind: "receiz.profile-showcase.sealed-checkpoint-state.v114",
    checkpointArtifactDigest: checkpoint.checkpointArtifactSha256,
    checkpointStateRoot: bundle.currentStateRoot,
  });
  const referencedSegmentIds = new Set(
    (bundle.firstPaintWindow.children as readonly Record<string, unknown>[])
      .map((child) =>
        (child.membershipWitness as Record<string, unknown>).segmentId as string),
  );
  const segmentWindow = bundle.firstPaintSegmentWindow.filter(
    (segment) => referencedSegmentIds.has(segment.segmentId),
  );
  const head = {
    schema: "receiz.profile-showcase-head.v114",
    artifactId: bundle.artifactId,
    ownerReceizIdentity: bundle.ownerReceizIdentity,
    profileIdentity: bundle.profileIdentity,
    headKaiUpulse: bundle.headKaiUpulse,
    parentHeads: [{
      artifactDigest: checkpoint.checkpointArtifactSha256,
      historyHeadDigest: custody.historyHead.headDigest,
      headKaiUpulse: bundle.headKaiUpulse,
      operationCount: bundle.operationCount,
      stateRoot,
    }],
    priorOperationCount: bundle.operationCount,
    resultingOperationCount: bundle.operationCount,
    directDelta: [],
    currentStateRoot: stateRoot,
    placementRoot: bundle.placementRoot,
    orderRoot: bundle.orderRoot,
    merkle: bundle.merkle,
    fibonacci: {
      basis: "sparse-checkpoint/v1",
      operationCount: bundle.operationCount,
      checkpoints: receizCompositeFibonacciDistancesUpTo(bundle.operationCount)
        .filter((distance) => distance < bundle.operationCount)
        .map((distance) => ({
          distance,
          operationCount: bundle.operationCount - distance,
          artifactDigest: checkpoint.checkpointArtifactSha256,
        })),
    },
    segmentWindow,
    counts: bundle.counts,
    firstPaintWindow: bundle.firstPaintWindow,
    firstPaintWitnessNodes: bundle.firstPaintWitnessNodes,
    stateTransitionWitnessNodes: [],
    versions: bundle.versions,
    authority: {
      showcaseIsProofAuthority: true,
      strongerTruth: "sealed-receiz-proof-object",
      historyIsProofAuthority: false,
      projectionIsProofAuthority: false,
    },
  };
  const showcaseBodyDigest = await digestReceizAuthority(
    "namespace",
    "receiz.namespace-body.v112",
    new TextEncoder().encode(
      canonicalizeReceizConstitution(head as unknown as ReceizConstitutionJson),
    ),
  );
  const appendNode = await createReceizProofHistoryNode({
    artifactId: bundle.artifactId,
    registryDigest: bundle.versions.registryDigest,
    parentDigests: [custody.historyHead.headDigest],
    kaiPulse: bundle.headKaiUpulse,
    receipt: {},
    event: {
      type: "profile-showcase.transition",
      parentShowcaseDigests: [checkpoint.checkpointArtifactSha256],
      predecessorShowcaseDigest: checkpoint.checkpointArtifactSha256,
      showcaseBodyDigest,
      operationDigest: await digestReceizAuthority(
        "operation",
        "receiz.profile-showcase.transition-operations.v114",
        [],
      ),
      directOperations: [],
      childAdmissionEvidenceRoots: [],
      registryDigest: bundle.versions.registryDigest,
      kaiUpulse: bundle.headKaiUpulse,
    },
    namespaceData: {},
  });
  const historyHead = await appendReceizCarriedProofHistoryHeadV114({
    predecessor: custody.historyHead,
    predecessorArtifactDigest: checkpoint.checkpointArtifactSha256,
    appendNode,
  });
  return createReceizBoundedProfileShowcaseCarrierV114({
    artifactId: bundle.artifactId,
    ownerReceizIdentity: bundle.ownerReceizIdentity,
    head,
    historyHead,
  });
}

export async function admitReceizProfileShowcaseCheckpointCarrierWithContextV114(
  input: Readonly<{
    checkpoint: ReceizVerifiedProfileShowcaseCheckpointV114;
    candidateArtifact: Blob;
  }>,
): Promise<Extract<ReceizVerifiedArtifactAdmission, { profile: "profile-showcase" }>> {
  const custody = readReceizProfileShowcaseCheckpointCustodyV114(input.checkpoint);
  if (!(input.candidateArtifact instanceof Blob)) {
    throw new TypeError("PROFILE_SHOWCASE_CHECKPOINT_CARRIER_INVALID");
  }
  const verification = await verifyReceizArtifactWithCanonicalRoots(
    input.candidateArtifact,
    custody.verifierRoots,
  );
  const admission = await createReceizArtifactAdmissionEngineInternal({
    canonicalSignatureV4RootPublicKeys: custody.verifierRoots,
  }, true)(verification, {
    profile: "profile-showcase",
    ownerConstraint: input.checkpoint.ownerReceizIdentity,
  });
  if (admission.profile !== "profile-showcase" || admission.verdict !== "bearer-recovery") {
    throw new TypeError("PROFILE_SHOWCASE_CHECKPOINT_CARRIER_INVALID");
  }
  const expected = await createReceizProfileShowcaseCheckpointCarrierV114(
    input.checkpoint,
  );
  const actual = await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(admission);
  if (
    canonicalizeReceizConstitution(
      expected as unknown as ReceizConstitutionJson,
    ) !== canonicalizeReceizConstitution(
      actual as unknown as ReceizConstitutionJson,
    )
  ) throw new TypeError("PROFILE_SHOWCASE_CHECKPOINT_CARRIER_MISMATCH");
  return admission;
}

export type ReceizAdmissionBoundArtifactReverification = Readonly<{
  artifact: import("./artifacts.js").ReceizSealedArtifact;
  exactBytes: Uint8Array;
  payloadBytes: Uint8Array;
  artifactDigest: import("./artifactTransition.js").ReceizArtifactDigest;
  payloadDigest: import("./artifactTransition.js").ReceizPayloadDigest;
  verifierContextDigest: string;
}>;

export async function admitReceizProfileShowcaseSuccessorWithPredecessorContext(
  input: Readonly<{
    predecessorAdmission: unknown;
    candidateArtifact: unknown;
    resolveVerifiedHistoricalArtifactDigest?: (
      operationCount: number,
    ) => Promise<string | null> | string | null;
  }>,
): Promise<Extract<ReceizVerifiedArtifactAdmission, { profile: "profile-showcase" }>> {
  if (!input || typeof input !== "object"
    || !("candidateArtifact" in input)
    || !("predecessorAdmission" in input)
    || Object.keys(input).some((key) => ![
      "candidateArtifact",
      "predecessorAdmission",
      "resolveVerifiedHistoricalArtifactDigest",
    ].includes(key))) {
    throw new TypeError("PROFILE_SHOWCASE_SUCCESSOR_ADMISSION_INVALID");
  }
  const predecessor = await verifyReceizArtifactAdmission(input.predecessorAdmission);
  if ("code" in predecessor || predecessor.profile !== "profile-showcase") {
    throw new TypeError("PROFILE_SHOWCASE_PREDECESSOR_NOT_VERIFIED");
  }
  const custody = admissionCustody.get(predecessor);
  const candidate = input.candidateArtifact as { artifact?: unknown } | null;
  if (!custody || !candidate || typeof candidate !== "object" || !(candidate.artifact instanceof Blob)) {
    throw new TypeError("PROFILE_SHOWCASE_SUCCESSOR_ADMISSION_INVALID");
  }
  const verification = await verifyReceizArtifactWithCanonicalRoots(
    candidate.artifact,
    custody.verifierRoots,
  );
  const admission = await createReceizArtifactAdmissionEngineInternal({
    canonicalSignatureV4RootPublicKeys: custody.verifierRoots,
    ...(custody.registryDiscovery ? { verifiedRegistryDiscovery: custody.registryDiscovery } : {}),
  }, true)(verification, {
    profile: "profile-showcase",
    ...(predecessor.ownerReceizId ? { ownerConstraint: predecessor.ownerReceizId } : {}),
    ...(predecessor.actorConstraint ? { actorConstraint: predecessor.actorConstraint } : {}),
  });
  if (admission.profile !== "profile-showcase" || admission.verdict !== "bearer-recovery") {
    throw new TypeError("PROFILE_SHOWCASE_SUCCESSOR_ADMISSION_INVALID");
  }
  const predecessorCarrier =
    await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(predecessor);
  const successorCarrier =
    await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(admission);
  await verifyReceizProfileShowcaseBoundedSuccessorV114({
    predecessorCarrier,
    predecessorArtifactDigest: predecessor.artifactSha256,
    candidateHead: successorCarrier["profile-showcase"],
    ...(input.resolveVerifiedHistoricalArtifactDigest
      ? { resolveVerifiedHistoricalArtifactDigest: input.resolveVerifiedHistoricalArtifactDigest }
      : {}),
  });
  return admission;
}

export async function admitReceizEconomyShowcaseSuccessorWithPredecessorContext(
  input: Readonly<{
    predecessorAdmission: unknown;
    candidateArtifact: unknown;
  }>,
): Promise<Extract<ReceizVerifiedArtifactAdmission, {
  profile: "economy-showcase";
}>> {
  if (
    !input
    || typeof input !== "object"
    || Object.keys(input).sort().join(",")
      !== "candidateArtifact,predecessorAdmission"
  ) throw new TypeError("ECONOMY_SHOWCASE_SUCCESSOR_ADMISSION_INVALID");
  const predecessor = await verifyReceizArtifactAdmission(
    input.predecessorAdmission,
  );
  if ("code" in predecessor || predecessor.profile !== "economy-showcase") {
    throw new TypeError("ECONOMY_SHOWCASE_PREDECESSOR_NOT_VERIFIED");
  }
  const custody = admissionCustody.get(predecessor);
  const candidate = input.candidateArtifact as { artifact?: unknown } | null;
  if (
    !custody
    || !candidate
    || typeof candidate !== "object"
    || !(candidate.artifact instanceof Blob)
  ) throw new TypeError("ECONOMY_SHOWCASE_SUCCESSOR_ADMISSION_INVALID");
  const verification = await verifyReceizArtifactWithCanonicalRoots(
    candidate.artifact,
    custody.verifierRoots,
  );
  const admission = await createReceizArtifactAdmissionEngineInternal({
    canonicalSignatureV4RootPublicKeys: custody.verifierRoots,
    ...(custody.registryDiscovery
      ? { verifiedRegistryDiscovery: custody.registryDiscovery }
      : {}),
  }, true)(verification, {
    profile: "economy-showcase",
    ...(predecessor.ownerReceizId
      ? { ownerConstraint: predecessor.ownerReceizId }
      : {}),
    ...(predecessor.actorConstraint
      ? { actorConstraint: predecessor.actorConstraint }
      : {}),
  });
  if (
    admission.profile !== "economy-showcase"
    || admission.verdict !== "bearer-recovery"
  ) throw new TypeError("ECONOMY_SHOWCASE_SUCCESSOR_ADMISSION_INVALID");
  const predecessorCarrier =
    await rederiveReceizEconomyShowcaseCarrierFromAdmission(predecessor);
  const successorCarrier =
    await rederiveReceizEconomyShowcaseCarrierFromAdmission(admission);
  await verifyReceizEconomyShowcaseSuccessorV114({
    predecessorHead: predecessorCarrier["economy-showcase"],
    predecessorArtifactDigest: predecessor.artifactSha256,
    candidateHead: successorCarrier["economy-showcase"],
  });
  return admission;
}

export async function admitReceizEconomyShowcaseGenesisWithActorContext(
  input: Readonly<{
    verifiedActorEvidence: unknown;
    candidateArtifact: unknown;
  }>,
): Promise<Extract<ReceizVerifiedArtifactAdmission, {
  profile: "economy-showcase";
}>> {
  if (
    !input
    || typeof input !== "object"
    || Object.keys(input).sort().join(",")
      !== "candidateArtifact,verifiedActorEvidence"
  ) throw new TypeError("ECONOMY_SHOWCASE_GENESIS_ADMISSION_INVALID");
  const actorAdmission = await verifyReceizArtifactAdmission(
    input.verifiedActorEvidence,
  );
  if ("code" in actorAdmission || actorAdmission.profile !== "identity") {
    throw new TypeError("ECONOMY_SHOWCASE_GENESIS_ADMISSION_INVALID");
  }
  const custody = admissionCustody.get(actorAdmission);
  const candidate = input.candidateArtifact as { artifact?: unknown } | null;
  if (
    !custody
    || !candidate
    || typeof candidate !== "object"
    || !(candidate.artifact instanceof Blob)
  ) throw new TypeError("ECONOMY_SHOWCASE_GENESIS_ADMISSION_INVALID");
  const verification = await verifyReceizArtifactWithCanonicalRoots(
    candidate.artifact,
    custody.verifierRoots,
  );
  const admission = await createReceizArtifactAdmissionEngineInternal({
    canonicalSignatureV4RootPublicKeys: custody.verifierRoots,
    ...(custody.registryDiscovery
      ? { verifiedRegistryDiscovery: custody.registryDiscovery }
      : {}),
  }, true)(verification, {
    profile: "economy-showcase",
    ownerConstraint: "economy.receiz.id",
  });
  if (
    admission.profile !== "economy-showcase"
    || admission.verdict !== "bearer-recovery"
    || admission.artifactId !== "economy-showcase:receiz.com"
    || admission.proofHistoryHead === null
  ) throw new TypeError("ECONOMY_SHOWCASE_GENESIS_ADMISSION_INVALID");
  try {
    const carrier =
      await rederiveReceizEconomyShowcaseCarrierFromAdmission(admission);
    const head = carrier["economy-showcase"];
    const expected = await deriveReceizEconomyShowcaseGenesisHeadV114({
      genesisKaiUpulse: head.headKaiUpulse,
      registryDigest: head.versions.registryDigest,
    });
    if (
      carrier.receizProofHistory.nodeCount !== 1
      || carrier.receizProofHistory.parentRefs.length !== 0
      || canonicalizeReceizConstitution(
        head as unknown as ReceizConstitutionJson,
      ) !== canonicalizeReceizConstitution(
        expected as unknown as ReceizConstitutionJson,
      )
    ) throw new TypeError("ECONOMY_SHOWCASE_GENESIS_ADMISSION_INVALID");
  } catch {
    throw new TypeError("ECONOMY_SHOWCASE_GENESIS_ADMISSION_INVALID");
  }
  return admission;
}

export async function admitReceizEconomyShowcaseMergeWithParentContext(
  input: Readonly<{
    commonPredecessorAdmission: unknown;
    parentAdmissions: readonly [unknown, unknown];
    candidateArtifact: unknown;
  }>,
): Promise<Extract<ReceizVerifiedArtifactAdmission, {
  profile: "economy-showcase";
}>> {
  if (
    !input
    || typeof input !== "object"
    || Object.keys(input).sort().join(",")
      !== "candidateArtifact,commonPredecessorAdmission,parentAdmissions"
    || !Array.isArray(input.parentAdmissions)
    || input.parentAdmissions.length !== 2
  ) throw new TypeError("ECONOMY_SHOWCASE_MERGE_ADMISSION_INVALID");
  const common = await verifyReceizArtifactAdmission(
    input.commonPredecessorAdmission,
  );
  const parents = await Promise.all(input.parentAdmissions.map(
    (parent) => verifyReceizArtifactAdmission(parent),
  ));
  if (
    "code" in common
    || common.profile !== "economy-showcase"
    || parents.some((parent) =>
      "code" in parent || parent.profile !== "economy-showcase")
  ) throw new TypeError("ECONOMY_SHOWCASE_MERGE_PARENT_NOT_VERIFIED");
  const verifiedParents = parents as [
    Extract<ReceizVerifiedArtifactAdmission, { profile: "economy-showcase" }>,
    Extract<ReceizVerifiedArtifactAdmission, { profile: "economy-showcase" }>,
  ];
  const custody = admissionCustody.get(verifiedParents[0]);
  const candidate = input.candidateArtifact as { artifact?: unknown } | null;
  if (
    !custody
    || !candidate
    || typeof candidate !== "object"
    || !(candidate.artifact instanceof Blob)
  ) throw new TypeError("ECONOMY_SHOWCASE_MERGE_ADMISSION_INVALID");
  const verification = await verifyReceizArtifactWithCanonicalRoots(
    candidate.artifact,
    custody.verifierRoots,
  );
  const admission = await createReceizArtifactAdmissionEngineInternal({
    canonicalSignatureV4RootPublicKeys: custody.verifierRoots,
    ...(custody.registryDiscovery
      ? { verifiedRegistryDiscovery: custody.registryDiscovery }
      : {}),
  }, true)(verification, {
    profile: "economy-showcase",
    ...(verifiedParents[0].ownerReceizId
      ? { ownerConstraint: verifiedParents[0].ownerReceizId }
      : {}),
  });
  if (
    admission.profile !== "economy-showcase"
    || admission.verdict !== "bearer-recovery"
    || admission.proofHistoryHead === null
  ) throw new TypeError("ECONOMY_SHOWCASE_MERGE_ADMISSION_INVALID");
  const commonCarrier =
    await rederiveReceizEconomyShowcaseCarrierFromAdmission(common);
  const parentCarriers = await Promise.all(verifiedParents.map(
    (parent) => rederiveReceizEconomyShowcaseCarrierFromAdmission(parent),
  ));
  const candidateCarrier =
    await rederiveReceizEconomyShowcaseCarrierFromAdmission(admission);
  await verifyReceizEconomyShowcaseMergeV114({
    commonPredecessorHead: commonCarrier["economy-showcase"],
    commonPredecessorArtifactDigest: common.artifactSha256,
    parents: [
      {
        artifactDigest: verifiedParents[0].artifactSha256,
        head: parentCarriers[0]!["economy-showcase"],
      },
      {
        artifactDigest: verifiedParents[1].artifactSha256,
        head: parentCarriers[1]!["economy-showcase"],
      },
    ],
    candidateHead: candidateCarrier["economy-showcase"],
  });
  const expectedHistoryParents = verifiedParents.map((parent) => ({
    nodeDigest: parent.proofHistoryHead!.headDigest,
    artifactDigest: parent.artifactSha256,
  })).sort((left, right) => left.nodeDigest.localeCompare(right.nodeDigest));
  const actualHistoryParents = candidateCarrier.receizProofHistory.parentRefs
    .map((parent) => ({
      nodeDigest: parent.nodeDigest,
      artifactDigest: parent.artifactDigest,
    }))
    .sort((left, right) => left.nodeDigest.localeCompare(right.nodeDigest));
  if (
    canonicalizeReceizConstitution(
      expectedHistoryParents as unknown as ReceizConstitutionJson,
    ) !== canonicalizeReceizConstitution(
      actualHistoryParents as unknown as ReceizConstitutionJson,
    )
  ) throw new TypeError("ECONOMY_SHOWCASE_MERGE_ADMISSION_INVALID");
  return admission;
}

export async function admitReceizProfileShowcaseMergeWithParentContext(
  input: Readonly<{
    resolveVerifiedHistoricalArtifactDigest?: (operationCount: number) => Promise<string | null> | string | null;
    commonPredecessorAdmission: unknown;
    parentAdmissions: readonly [unknown, unknown];
    candidateArtifact: unknown;
  }>,
): Promise<Extract<ReceizVerifiedArtifactAdmission, {
  profile: "profile-showcase";
}>> {
  if (
    !input
    || typeof input !== "object"
    || Object.keys(input).filter(key => key !== "resolveVerifiedHistoricalArtifactDigest").sort().join(",")
      !== "candidateArtifact,commonPredecessorAdmission,parentAdmissions"
    || (input.resolveVerifiedHistoricalArtifactDigest !== undefined && typeof input.resolveVerifiedHistoricalArtifactDigest !== "function")
    || !Array.isArray(input.parentAdmissions)
    || input.parentAdmissions.length !== 2
  ) throw new TypeError("PROFILE_SHOWCASE_MERGE_ADMISSION_INVALID");
  const common = await verifyReceizArtifactAdmission(
    input.commonPredecessorAdmission,
  );
  const parents = await Promise.all(input.parentAdmissions.map(
    (parent) => verifyReceizArtifactAdmission(parent),
  ));
  if (
    "code" in common
    || common.profile !== "profile-showcase"
    || common.proofHistoryHead === null
    || parents.some((parent) =>
      "code" in parent
      || parent.profile !== "profile-showcase"
      || parent.proofHistoryHead === null)
  ) throw new TypeError("PROFILE_SHOWCASE_MERGE_PARENT_NOT_VERIFIED");
  const verifiedParents = parents as [
    Extract<ReceizVerifiedArtifactAdmission, { profile: "profile-showcase" }>,
    Extract<ReceizVerifiedArtifactAdmission, { profile: "profile-showcase" }>,
  ];
  const custody = admissionCustody.get(verifiedParents[0]);
  const candidate = input.candidateArtifact as { artifact?: unknown } | null;
  if (
    !custody
    || !candidate
    || typeof candidate !== "object"
    || !(candidate.artifact instanceof Blob)
  ) throw new TypeError("PROFILE_SHOWCASE_MERGE_ADMISSION_INVALID");
  const verification = await verifyReceizArtifactWithCanonicalRoots(
    candidate.artifact,
    custody.verifierRoots,
  );
  const admission = await createReceizArtifactAdmissionEngineInternal({
    canonicalSignatureV4RootPublicKeys: custody.verifierRoots,
    ...(custody.registryDiscovery
      ? { verifiedRegistryDiscovery: custody.registryDiscovery }
      : {}),
  }, true)(verification, {
    profile: "profile-showcase",
    ...(verifiedParents[0].ownerReceizId
      ? { ownerConstraint: verifiedParents[0].ownerReceizId }
      : {}),
  });
  if (
    admission.profile !== "profile-showcase"
    || admission.verdict !== "bearer-recovery"
    || admission.proofHistoryHead === null
  ) throw new TypeError("PROFILE_SHOWCASE_MERGE_ADMISSION_INVALID");
  const commonCarrier =
    await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(common);
  const parentCarriers = await Promise.all(verifiedParents.map(
    (parent) => rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(parent),
  ));
  const candidateCarrier =
    await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(admission);
  const candidateHead = candidateCarrier["profile-showcase"];
  if (!Array.isArray(candidateHead.directDelta)) {
    throw new TypeError("PROFILE_SHOWCASE_MERGE_ADMISSION_INVALID");
  }
  await verifyReceizProfileShowcaseBoundedMergeV114({
    commonPredecessorCarrier: commonCarrier,
    commonPredecessorArtifactDigest: common.artifactSha256,
    parents: [
      {
        artifactDigest: verifiedParents[0].artifactSha256,
        carrier: parentCarriers[0]!,
      },
      {
        artifactDigest: verifiedParents[1].artifactSha256,
        carrier: parentCarriers[1]!,
      },
    ],
    directDelta: candidateHead.directDelta,
    candidateHead,
    ...(input.resolveVerifiedHistoricalArtifactDigest ? { resolveVerifiedHistoricalArtifactDigest: input.resolveVerifiedHistoricalArtifactDigest } : {}),
  });
  const expectedHistoryParents = verifiedParents.map((parent) => ({
    nodeDigest: parent.proofHistoryHead!.headDigest,
    artifactDigest: parent.artifactSha256,
  })).sort((left, right) => left.nodeDigest.localeCompare(right.nodeDigest));
  const actualHistoryParents = candidateCarrier.receizProofHistory.parentRefs
    .map((parent) => ({
      nodeDigest: parent.nodeDigest,
      artifactDigest: parent.artifactDigest,
    }))
    .sort((left, right) => left.nodeDigest.localeCompare(right.nodeDigest));
  if (
    canonicalizeReceizConstitution(
      expectedHistoryParents as unknown as ReceizConstitutionJson,
    ) !== canonicalizeReceizConstitution(
      actualHistoryParents as unknown as ReceizConstitutionJson,
    )
  ) throw new TypeError("PROFILE_SHOWCASE_MERGE_ADMISSION_INVALID");
  return admission;
}

export async function admitReceizProfileShowcaseMergeWithExactParentContext(
  input: Readonly<{
    resolveVerifiedHistoricalArtifactDigest?: (operationCount: number) => Promise<string | null> | string | null;
    commonPredecessorArtifact: Blob;
    parentArtifacts: readonly [Blob, Blob];
    parentHistoryNodes: readonly [unknown, unknown];
    candidateArtifact: Blob;
    canonicalSignatureV4RootPublicKeys: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
  }>,
): Promise<Extract<ReceizVerifiedArtifactAdmission, {
  profile: "profile-showcase";
}>> {
  if (
    !input
    || typeof input !== "object"
    || !(input.commonPredecessorArtifact instanceof Blob)
    || !Array.isArray(input.parentArtifacts)
    || input.parentArtifacts.length !== 2
    || input.parentArtifacts.some((artifact) => !(artifact instanceof Blob))
    || !Array.isArray(input.parentHistoryNodes)
    || input.parentHistoryNodes.length !== 2
    || input.parentHistoryNodes.some((node) => !node || typeof node !== "object")
    || !(input.candidateArtifact instanceof Blob)
  ) throw new TypeError("PROFILE_SHOWCASE_EXACT_MERGE_CONTEXT_INVALID");
  const roots = cloneRoots(input.canonicalSignatureV4RootPublicKeys);
  const verifications = await Promise.all([
    input.commonPredecessorArtifact,
    ...input.parentArtifacts,
  ].map((artifact) => verifyReceizArtifactWithCanonicalRoots(artifact, roots)));
  const admitWithContext = createReceizArtifactAdmissionEngineInternal({
    canonicalSignatureV4RootPublicKeys: roots,
  }, true);
  const admissions = await Promise.all(verifications.map((verification) =>
    admitWithContext(verification, { profile: "profile-showcase" })));
  const [common, first, second] = admissions;
  if (
    !common
    || common.profile !== "profile-showcase"
    || common.verdict !== "bearer-recovery"
    || !first
    || first.profile !== "profile-showcase"
    || first.verdict !== "bearer-recovery"
    || !second
    || second.profile !== "profile-showcase"
    || second.verdict !== "bearer-recovery"
  ) throw new TypeError("PROFILE_SHOWCASE_EXACT_MERGE_CONTEXT_INVALID");
  const verifiedParents = [first, second] as const;
  const parentCarriers = await Promise.all(verifiedParents.map((parent) =>
    rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(parent)));
  for (let index = 0; index < 2; index += 1) {
    if (canonicalizeReceizConstitution(
      input.parentHistoryNodes[index] as ReceizConstitutionJson,
    ) !== canonicalizeReceizConstitution(
      parentCarriers[index]!.receizProofHistory.currentNode as unknown as ReceizConstitutionJson,
    )) throw new TypeError("PROFILE_SHOWCASE_EXACT_MERGE_CONTEXT_INVALID");
  }
  return admitReceizProfileShowcaseMergeWithParentContext({
    commonPredecessorAdmission: common,
    parentAdmissions: verifiedParents,
    candidateArtifact: { artifact: input.candidateArtifact },
    ...(input.resolveVerifiedHistoricalArtifactDigest ? { resolveVerifiedHistoricalArtifactDigest: input.resolveVerifiedHistoricalArtifactDigest } : {}),
  });
}

/**
 * Cold-runtime form of predecessor-context admission. Both proof objects are
 * reverified from their exact sealed bytes under the same out-of-band roots.
 * The separately persisted history node must be the predecessor's exact
 * current node and the candidate's exact parent reference. A durable active
 * pointer is deliberately not accepted as authority here.
 */
export async function admitReceizProfileShowcaseSuccessorWithExactPredecessorContext(
  input: Readonly<{
    predecessorArtifact: Blob;
    candidateArtifact: Blob;
    predecessorHistoryNode: unknown;
    resolveVerifiedHistoricalArtifactDigest?: (operationCount: number) => Promise<string | null> | string | null;
    canonicalSignatureV4RootPublicKeys: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
  }>,
): Promise<Extract<ReceizVerifiedArtifactAdmission, { profile: "profile-showcase" }>> {
  if (
    !input || typeof input !== "object"
    || !(input.predecessorArtifact instanceof Blob)
    || !(input.candidateArtifact instanceof Blob)
    || !input.predecessorHistoryNode
    || typeof input.predecessorHistoryNode !== "object"
  ) throw new TypeError("PROFILE_SHOWCASE_EXACT_PREDECESSOR_CONTEXT_INVALID");
  const roots = cloneRoots(input.canonicalSignatureV4RootPublicKeys);
  const predecessorVerification = await verifyReceizArtifactWithCanonicalRoots(
    input.predecessorArtifact,
    roots,
  );
  const candidateVerification = await verifyReceizArtifactWithCanonicalRoots(
    input.candidateArtifact,
    roots,
  );
  const admitWithContext = createReceizArtifactAdmissionEngineInternal({
    canonicalSignatureV4RootPublicKeys: roots,
  }, true);
  const predecessor = await admitWithContext(predecessorVerification, {
    profile: "profile-showcase",
  });
  const candidate = await admitWithContext(candidateVerification, {
    profile: "profile-showcase",
  });
  if (
    predecessor.profile !== "profile-showcase"
    || predecessor.verdict !== "bearer-recovery"
    || candidate.profile !== "profile-showcase"
    || candidate.verdict !== "bearer-recovery"
  ) throw new TypeError("PROFILE_SHOWCASE_EXACT_PREDECESSOR_CONTEXT_INVALID");
  const predecessorCarrier =
    await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(predecessor);
  const candidateCarrier =
    await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(candidate);
  const predecessorNode = predecessorCarrier.receizProofHistory.currentNode;
  const candidateParent = candidateCarrier.receizProofHistory.parentRefs[0];
  if (
    canonicalizeReceizConstitution(
      predecessorNode as unknown as ReceizConstitutionJson,
    ) !== canonicalizeReceizConstitution(
      input.predecessorHistoryNode as ReceizConstitutionJson,
    )
    || !candidateParent
    || candidateParent.nodeDigest !== predecessorNode.nodeDigest
    || candidateParent.artifactDigest !== predecessor.artifactSha256
    || candidateParent.nodeCount !== predecessorCarrier.receizProofHistory.nodeCount
    || candidateParent.accumulatorRoot
      !== predecessorCarrier.receizProofHistory.accumulator.root
  ) throw new TypeError("PROFILE_SHOWCASE_EXACT_PREDECESSOR_HISTORY_INVALID");
  await verifyReceizProfileShowcaseBoundedSuccessorV114({
    predecessorCarrier,
    predecessorArtifactDigest: predecessor.artifactSha256,
    candidateHead: candidateCarrier["profile-showcase"],
    ...(input.resolveVerifiedHistoricalArtifactDigest
      ? { resolveVerifiedHistoricalArtifactDigest: input.resolveVerifiedHistoricalArtifactDigest }
      : {}),
  });
  return candidate;
}

export async function admitReceizLegacyProfileShowcaseMigrationWithInspectionContext(
  input: Readonly<{
    inspection: ReceizInspectedLegacyProfileShowcaseV114;
    candidateArtifact: unknown;
    expectedHead: Readonly<Record<string, unknown>>;
  }>,
): Promise<Extract<ReceizVerifiedArtifactAdmission, { profile: "profile-showcase" }>> {
  if (
    !input || typeof input !== "object"
    || !isSdkInspectedLegacyProfileShowcaseV114(input.inspection)
  ) throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_ADMISSION_INVALID");
  const custody = readReceizLegacyProfileShowcaseInspectionCustody(input.inspection);
  const candidate = input.candidateArtifact as { artifact?: unknown } | null;
  if (!candidate || !(candidate.artifact instanceof Blob)) {
    throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_ADMISSION_INVALID");
  }
  const verification = await verifyReceizArtifactWithCanonicalRoots(
    candidate.artifact,
    custody.verifierRoots,
  );
  const admission = await createReceizArtifactAdmissionEngineInternal({
    canonicalSignatureV4RootPublicKeys: custody.verifierRoots,
    ...(custody.registryDiscovery
      ? { verifiedRegistryDiscovery: custody.registryDiscovery }
      : {}),
  }, true)(verification, {
    profile: "profile-showcase",
    ownerConstraint: input.inspection.ownerReceizIdentity,
  });
  if (
    admission.profile !== "profile-showcase"
    || admission.verdict !== "bearer-recovery"
    || admission.proofHistoryHead === null
  ) throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_ADMISSION_INVALID");
  const carrier = await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(admission);
  const parent = (
    carrier["profile-showcase"].parentHeads as readonly Record<string, unknown>[]
  )[0];
  const historyParent = carrier.receizProofHistory.parentRefs[0];
  if (
    canonicalizeReceizConstitution(
      carrier["profile-showcase"] as ReceizConstitutionJson,
    ) !== canonicalizeReceizConstitution(input.expectedHead as ReceizConstitutionJson)
    || !parent
    || parent.artifactDigest !== input.inspection.artifactSha256
    || parent.historyHeadDigest !== input.inspection.historyHeadDigest
    || parent.headKaiUpulse !== input.inspection.headKaiUpulse
    || parent.operationCount !== input.inspection.resultingOperationCount
    || parent.stateRoot !== input.inspection.currentStateRoot
    || !historyParent
    || historyParent.nodeDigest !== input.inspection.historyHeadDigest
    || historyParent.artifactDigest !== input.inspection.artifactSha256
  ) throw new TypeError("LEGACY_PROFILE_SHOWCASE_MIGRATION_ADMISSION_INVALID");
  return admission;
}

export async function admitReceizProfileShowcaseGenesisWithActorContext(
  input: Readonly<{
    verifiedActorEvidence: unknown;
    candidateArtifact: unknown;
    artifactId: `profile-showcase:${string}`;
    ownerReceizId: string;
  }>,
): Promise<Extract<ReceizVerifiedArtifactAdmission, { profile: "profile-showcase" }>> {
  const actorAdmission = await verifyReceizArtifactAdmission(input.verifiedActorEvidence);
  if ("code" in actorAdmission || actorAdmission.profile !== "identity"
    || input.artifactId !== `profile-showcase:${input.ownerReceizId}`) {
    throw new TypeError("PROFILE_SHOWCASE_GENESIS_ADMISSION_INVALID");
  }
  const custody = admissionCustody.get(actorAdmission);
  const candidate = input.candidateArtifact as { artifact?: unknown } | null;
  if (!custody || !candidate || typeof candidate !== "object"
    || !(candidate.artifact instanceof Blob)) {
    throw new TypeError("PROFILE_SHOWCASE_GENESIS_ADMISSION_INVALID");
  }
  const verification = await verifyReceizArtifactWithCanonicalRoots(
    candidate.artifact,
    custody.verifierRoots,
  );
  const admission = await createReceizArtifactAdmissionEngine({
    canonicalSignatureV4RootPublicKeys: custody.verifierRoots,
    ...(custody.registryDiscovery ? { verifiedRegistryDiscovery: custody.registryDiscovery } : {}),
  })(verification, {
    profile: "profile-showcase",
    ownerConstraint: input.ownerReceizId,
  });
  if (admission.profile !== "profile-showcase"
    || admission.verdict !== "bearer-recovery"
    || admission.artifactId !== input.artifactId) {
    throw new TypeError("PROFILE_SHOWCASE_GENESIS_ADMISSION_INVALID");
  }
  try {
    const carrier = await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(admission);
    const head = carrier["profile-showcase"];
    const directDelta = head.directDelta as readonly ReceizConstitutionJson[];
    const expected = await deriveReceizProfileShowcaseBoundedGenesisHeadV114({
      artifactId: input.artifactId,
      ownerReceizIdentity: input.ownerReceizId,
      profileIdentity: actorAdmission.actor.actorId,
      genesisKaiUpulse: head.headKaiUpulse as string,
      directDelta,
      registryDigest: (
        head.versions as Readonly<Record<string, unknown>>
      ).registryDigest as string,
    });
    const carriedEvent = carrier.receizProofHistory.currentNode.event;
    const carriedActorRoot = carriedEvent.type === "profile-showcase.transition" ? carriedEvent.actorEvidenceRoot : undefined;
    if (carriedActorRoot !== undefined && carriedActorRoot !== actorAdmission.actor.evidenceDigest.value) {
      throw new TypeError("PROFILE_SHOWCASE_GENESIS_ADMISSION_INVALID");
    }
    if (
      carrier.receizProofHistory.nodeCount !== 1
      || carrier.receizProofHistory.parentRefs.length !== 0
      || canonicalizeReceizConstitution(head as ReceizConstitutionJson)
        !== canonicalizeReceizConstitution(expected as ReceizConstitutionJson)
    ) throw new TypeError("PROFILE_SHOWCASE_GENESIS_ADMISSION_INVALID");
  } catch {
    throw new TypeError("PROFILE_SHOWCASE_GENESIS_ADMISSION_INVALID");
  }
  return admission;
}

/** Package-internal: reuses only verifier roots retained by the predecessor admission. */
export async function reverifyReceizArtifactWithAdmissionContext(input: Readonly<{
  predecessorAdmission: unknown;
  candidateArtifact: unknown;
}>): Promise<ReceizAdmissionBoundArtifactReverification> {
  const predecessor = await verifyReceizArtifactAdmission(input.predecessorAdmission);
  if ("code" in predecessor) throw new Error("CANDIDATE_VERIFICATION_FAILED");
  const custody = admissionCustody.get(predecessor);
  const candidate = input.candidateArtifact as Partial<import("./artifacts.js").ReceizSealedArtifact> | null;
  if (!custody || !candidate || typeof candidate !== "object"
    || !(candidate.artifact instanceof Blob)
    || typeof candidate.filename !== "string" || !candidate.filename
    || typeof candidate.mimeType !== "string" || !candidate.mimeType
    || typeof candidate.artifactSha256 !== "string"
    || typeof candidate.payloadSha256 !== "string") {
    throw new Error("CANDIDATE_VERIFICATION_FAILED");
  }
  if (!predecessor.openedArtifact
    || candidate.filename !== predecessor.openedArtifact.sealedArtifact.filename
    || candidate.mimeType !== predecessor.openedArtifact.sealedArtifact.mimeType
    || predecessor.openedArtifact.legacyCompatibility !== "current-native") {
    throw new Error("CANDIDATE_VERIFICATION_FAILED");
  }
  const exactBytes = new Uint8Array(await candidate.artifact.arrayBuffer());
  if (exactBytes.byteLength === 0 || exactBytes.byteLength > MAX_ARTIFACT_BYTES) {
    throw new Error("CANDIDATE_VERIFICATION_FAILED");
  }
  const artifactSha256 = await sha256ReceizBytes(exactBytes);
  if (artifactSha256 !== candidate.artifactSha256) throw new Error("CANDIDATE_VERIFICATION_FAILED");
  const exact = await verifyReceizArtifactExactBytesCanonical({
    fileBytes: exactBytes,
    filename: candidate.filename,
    mimeType: candidate.mimeType,
    signatureV4RootPublicKeys: custody.verifierRoots,
  });
  if (!exact.ok || exact.payloadSha256 !== candidate.payloadSha256) {
    throw new Error("CANDIDATE_VERIFICATION_FAILED");
  }
  const canonical = await verifyAndExtractReceizDocumentBytesCanonical({
    fileBytes: exactBytes,
    filename: candidate.filename,
    mime: candidate.mimeType,
    signatureV4RootPublicKeys: custody.verifierRoots,
    zipGuardLimits: CANONICAL_ZIP_LIMITS,
  });
  if (!canonical.ok
    || !canonical.nativeRecordSeal
    || canonical.legacyCompatibility !== "current-native"
    || canonical.nativeRecordSeal.ownerReceizId !== predecessor.ownerReceizId
    || await sha256ReceizBytes(canonical.payloadBytes) !== exact.payloadSha256) {
    throw new Error("CANDIDATE_VERIFICATION_FAILED");
  }
  const opened = openedArtifactFromCanonical({
    canonical,
    artifactBytes: exactBytes,
    artifactSha256,
    payloadSha256: exact.payloadSha256,
    filename: candidate.filename,
    mimeType: candidate.mimeType,
  });
  if (!opened || opened.sealedArtifact.kind !== "receiz.native-record-seal"
    || opened.sealedArtifact.continuity.carrier !== "native-record-seal"
    || opened.sealedArtifact.continuity.signatureVersion !== 4) {
    throw new Error("CANDIDATE_VERIFICATION_FAILED");
  }
  return Object.freeze({
    artifact: opened.sealedArtifact,
    exactBytes: exactBytes.slice(),
    payloadBytes: canonical.payloadBytes.slice(),
    artifactDigest: Object.freeze({
      algorithm: "sha-256" as const,
      binds: "exact-artifact-bytes" as const,
      value: artifactSha256,
    }),
    payloadDigest: Object.freeze({
      algorithm: "sha-256" as const,
      binds: "verified-payload-bytes" as const,
      value: exact.payloadSha256,
    }),
    verifierContextDigest: predecessor.admissionProof.verifierContextDigest,
  });
}

/** Package-internal: genesis verification reuses only roots retained by the verified actor admission. */
export async function reverifyReceizProfileShowcaseGenesisWithActorContext(input: Readonly<{
  verifiedActorEvidence: unknown;
  candidateArtifact: unknown;
  ownerReceizId: string;
}>): Promise<ReceizAdmissionBoundArtifactReverification> {
  const actorAdmission = await verifyReceizArtifactAdmission(input.verifiedActorEvidence);
  if ("code" in actorAdmission || actorAdmission.profile !== "identity") {
    throw new Error("PROFILE_SHOWCASE_GENESIS_VERIFICATION_FAILED");
  }
  const custody = admissionCustody.get(actorAdmission);
  const candidate = input.candidateArtifact as Partial<import("./artifacts.js").ReceizSealedArtifact> | null;
  if (!custody || !candidate || typeof candidate !== "object"
    || !(candidate.artifact instanceof Blob)
    || typeof candidate.filename !== "string" || !candidate.filename
    || typeof candidate.mimeType !== "string" || !candidate.mimeType
    || typeof candidate.artifactSha256 !== "string"
    || typeof candidate.payloadSha256 !== "string") {
    throw new Error("PROFILE_SHOWCASE_GENESIS_VERIFICATION_FAILED");
  }
  const exactBytes = new Uint8Array(await candidate.artifact.arrayBuffer());
  if (exactBytes.byteLength === 0 || exactBytes.byteLength > MAX_ARTIFACT_BYTES
    || await sha256ReceizBytes(exactBytes) !== candidate.artifactSha256) {
    throw new Error("PROFILE_SHOWCASE_GENESIS_VERIFICATION_FAILED");
  }
  const exact = await verifyReceizArtifactExactBytesCanonical({
    fileBytes: exactBytes,
    filename: candidate.filename,
    mimeType: candidate.mimeType,
    signatureV4RootPublicKeys: custody.verifierRoots,
  });
  const canonical = await verifyAndExtractReceizDocumentBytesCanonical({
    fileBytes: exactBytes,
    filename: candidate.filename,
    mime: candidate.mimeType,
    signatureV4RootPublicKeys: custody.verifierRoots,
    zipGuardLimits: CANONICAL_ZIP_LIMITS,
  });
  if (!exact.ok || exact.payloadSha256 !== candidate.payloadSha256
    || !canonical.ok || !canonical.nativeRecordSeal
    || canonical.legacyCompatibility !== "current-native"
    || canonical.nativeRecordSeal.ownerReceizId !== input.ownerReceizId
    || await sha256ReceizBytes(canonical.payloadBytes) !== exact.payloadSha256) {
    throw new Error("PROFILE_SHOWCASE_GENESIS_VERIFICATION_FAILED");
  }
  const opened = openedArtifactFromCanonical({
    canonical,
    artifactBytes: exactBytes,
    artifactSha256: candidate.artifactSha256,
    payloadSha256: exact.payloadSha256,
    filename: candidate.filename,
    mimeType: candidate.mimeType,
  });
  if (!opened || opened.sealedArtifact.kind !== "receiz.native-record-seal"
    || opened.sealedArtifact.continuity.carrier !== "native-record-seal"
    || opened.sealedArtifact.continuity.signatureVersion !== 4) {
    throw new Error("PROFILE_SHOWCASE_GENESIS_VERIFICATION_FAILED");
  }
  return Object.freeze({
    artifact: opened.sealedArtifact,
    exactBytes: exactBytes.slice(),
    payloadBytes: canonical.payloadBytes.slice(),
    artifactDigest: Object.freeze({
      algorithm: "sha-256" as const,
      binds: "exact-artifact-bytes" as const,
      value: candidate.artifactSha256,
    }),
    payloadDigest: Object.freeze({
      algorithm: "sha-256" as const,
      binds: "verified-payload-bytes" as const,
      value: exact.payloadSha256,
    }),
    verifierContextDigest: actorAdmission.admissionProof.verifierContextDigest,
  });
}

export function isSdkIssuedReceizArtifactAdmission(
  value: unknown,
): value is ReceizVerifiedArtifactAdmission {
  return typeof value === "object" && value !== null && sdkIssuedAdmissions.has(value);
}

/**
 * Package-internal, in-memory compatibility projection for the single bounded
 * genesis node. The sealed carrier and active append authority remain the
 * bounded proof-history head; this projection is never serialized or admitted
 * from caller data and cannot grow across successors.
 */
export async function projectReceizBoundedGenesisAdmissionHistoryCompatibility(
  admissionInput: unknown,
  historyInput: ReceizVerifiedProofHistory,
): Promise<ReceizVerifiedProfileShowcaseAdmission> {
  const admission = await verifyReceizArtifactAdmission(admissionInput);
  if (
    "code" in admission
    || admission.profile !== "profile-showcase"
    || admission.proofHistoryHead === null
    || admission.proofHistoryHead.nodeCount !== 1
    || admission.proofHistoryHead.parentRefs.length !== 0
  ) throw new TypeError("PROFILE_SHOWCASE_GENESIS_HISTORY_PROJECTION_INVALID");
  const history = await verifyReceizProofHistory(historyInput);
  if (
    history.artifactId !== admission.artifactId
    || history.nodes.length !== 1
    || history.headDigests.length !== 1
  ) throw new TypeError("PROFILE_SHOWCASE_GENESIS_HISTORY_PROJECTION_INVALID");
  const custody = admissionCustody.get(admission);
  if (!custody) throw new TypeError("PROFILE_SHOWCASE_GENESIS_HISTORY_PROJECTION_INVALID");
  const projected = deepFreeze({
    ...admission,
    proofHistory: history,
  }) as ReceizVerifiedProfileShowcaseAdmission;
  sdkIssuedAdmissions.add(projected);
  admissionCustody.set(projected, custody);
  return projected;
}

function assertCustodiedReceizVerifiedActorReference(
  actor: unknown,
  admission: unknown,
): ReceizVerifiedActorReference | ReceizAuthorityFailure {
  if (!actor || typeof actor !== "object") return authorityFailure("ACTOR_NOT_VERIFIED");
  const custody = actorReferenceCustody.get(actor);
  if (!custody) return authorityFailure("ACTOR_NOT_VERIFIED");
  if (!admission || typeof admission !== "object"
    || !sdkIssuedAdmissions.has(admission)
    || custody.admission !== admission
    || custody.admission.profile !== "identity"
    || custody.admission.actor !== actor) {
    return authorityFailure("ACTOR_ADMISSION_MISMATCH");
  }
  const verifiedAdmission = custody.admission;
  if (verifiedAdmission.admissionDigest.value !== custody.admissionDigest
    || verifiedAdmission.actor.evidenceDigest.value !== custody.evidenceDigest
    || verifiedAdmission.actor.registryDigest.value !== custody.registryDigest
    || verifiedAdmission.actor.registryDigest.value !== verifiedAdmission.admissionProof.registryDigest
    || verifiedAdmission.admissionProof.identityBindingDigest !== custody.evidenceDigest
    || verifiedAdmission.admissionProof.admissionProofDigest !== custody.admissionDigest) {
    return authorityFailure("ACTOR_PROOF_MISMATCH");
  }
  return verifiedAdmission.actor;
}

export async function verifyReceizArtifactAdmission(
  admission: unknown,
): Promise<ReceizVerifiedArtifactAdmission | ReceizAuthorityFailure> {
  if (!isSdkIssuedReceizArtifactAdmission(admission)) return authorityFailure("ADMISSION_NOT_VERIFIED");
  if (!admissionCustody.has(admission)) return authorityFailure("ADMISSION_NOT_VERIFIED");

  // The admission engine already verified the exact sealed bytes, derived every
  // proof digest, deep-froze the result, and bound this object identity to
  // private runtime custody. Reopening the same proof object here adds no truth
  // and wrongly lets a later SDK read veto stronger verified local truth.
  // Transported/cloned values still fail the WeakSet + WeakMap custody checks
  // above and must be admitted again from their sealed bytes at that boundary.
  return admission;
}

/** Package-internal retained enclosing source for read-only projection/replay.
 * Reuses existing custody and never accepts detached source/header JSON. */
export async function readReceizArtifactAdmissionRetainedSource(admissionInput: unknown) {
  const admission = await verifyReceizArtifactAdmission(admissionInput);
  if ("code" in admission) throw new TypeError(admission.code);
  const source = admissionCustody.get(admission)?.sourceVerification;
  if (!source || source.artifactDigest.value !== admission.artifactSha256
    || source.payloadDigest.value !== admission.payloadSha256) throw new TypeError("ADMISSION_SOURCE_BINDING_INVALID");
  return source;
}

export async function rederiveReceizProfileShowcaseCarrierFromAdmission(
  admissionInput: unknown,
): Promise<ReceizProfileShowcaseCarrier> {
  const admission = await verifyReceizArtifactAdmission(admissionInput);
  if ("code" in admission || admission.profile !== "profile-showcase") {
    throw new TypeError("PROFILE_SHOWCASE_ADMISSION_NOT_VERIFIED");
  }
  const custody = admissionCustody.get(admission);
  if (!custody) throw new TypeError("PROFILE_SHOWCASE_ADMISSION_NOT_VERIFIED");
  const { snapshot, canonical } = await canonicalReverify({
    verification: custody.sourceVerification,
    roots: custody.verifierRoots,
  });
  if (!canonical
    || snapshot.bytes.byteLength !== custody.artifactBytes.byteLength
    || snapshot.bytes.some((byte, index) => byte !== custody.artifactBytes[index])
    || await sha256ReceizBytes(snapshot.bytes) !== admission.artifactSha256
    || await sha256ReceizBytes(canonical.payloadBytes) !== admission.payloadSha256) {
    throw new TypeError("PROFILE_SHOWCASE_ADMISSION_REDERIVATION_FAILED");
  }
  const decoded = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(canonical.payloadBytes),
  ) as unknown;
  const carrier = await parseReceizProfileShowcaseCarrier(decoded);
  if (carrier.artifactId !== admission.artifactId
    || carrier.ownerReceizIdentity !== admission.ownerReceizId) {
    throw new TypeError("PROFILE_SHOWCASE_ADMISSION_REDERIVATION_FAILED");
  }
  return carrier;
}

export async function rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(
  admissionInput: unknown,
): Promise<Awaited<ReturnType<typeof parseReceizBoundedProfileShowcaseCarrierV114>>> {
  const admission = await verifyReceizArtifactAdmission(admissionInput);
  if ("code" in admission || admission.profile !== "profile-showcase"
    || admission.proofHistoryHead === null) {
    throw new TypeError("PROFILE_SHOWCASE_BOUNDED_ADMISSION_NOT_VERIFIED");
  }
  const custody = admissionCustody.get(admission);
  if (!custody) throw new TypeError("PROFILE_SHOWCASE_BOUNDED_ADMISSION_NOT_VERIFIED");
  const { snapshot, canonical } = await canonicalReverify({
    verification: custody.sourceVerification,
    roots: custody.verifierRoots,
  });
  if (!canonical
    || snapshot.bytes.byteLength !== custody.artifactBytes.byteLength
    || snapshot.bytes.some((byte, index) => byte !== custody.artifactBytes[index])
    || await sha256ReceizBytes(snapshot.bytes) !== admission.artifactSha256
    || await sha256ReceizBytes(canonical.payloadBytes) !== admission.payloadSha256) {
    throw new TypeError("PROFILE_SHOWCASE_BOUNDED_ADMISSION_REDERIVATION_FAILED");
  }
  const carrier = await parseReceizBoundedProfileShowcaseCarrierV114(JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(canonical.payloadBytes),
  ));
  await assertReceizBoundedProfileShowcaseCarriedHeadSemanticsV114(carrier);
  if (carrier.artifactId !== admission.artifactId
    || carrier.ownerReceizIdentity !== admission.ownerReceizId) {
    throw new TypeError("PROFILE_SHOWCASE_BOUNDED_ADMISSION_REDERIVATION_FAILED");
  }
  return carrier;
}

export async function rederiveReceizEconomyShowcaseCarrierFromAdmission(
  admissionInput: unknown,
): Promise<Awaited<ReturnType<typeof parseReceizEconomyShowcaseCarrierV114>>> {
  const admission = await verifyReceizArtifactAdmission(admissionInput);
  if (
    "code" in admission
    || admission.profile !== "economy-showcase"
    || admission.proofHistoryHead === null
  ) throw new TypeError("ECONOMY_SHOWCASE_ADMISSION_NOT_VERIFIED");
  const custody = admissionCustody.get(admission);
  if (!custody) throw new TypeError("ECONOMY_SHOWCASE_ADMISSION_NOT_VERIFIED");
  const { snapshot, canonical } = await canonicalReverify({
    verification: custody.sourceVerification,
    roots: custody.verifierRoots,
  });
  if (
    !canonical
    || snapshot.bytes.byteLength !== custody.artifactBytes.byteLength
    || snapshot.bytes.some((byte, index) => byte !== custody.artifactBytes[index])
    || await sha256ReceizBytes(snapshot.bytes) !== admission.artifactSha256
    || await sha256ReceizBytes(canonical.payloadBytes) !== admission.payloadSha256
  ) throw new TypeError("ECONOMY_SHOWCASE_ADMISSION_REDERIVATION_FAILED");
  const carrier = await parseReceizEconomyShowcaseCarrierV114(JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(canonical.payloadBytes),
  ));
  await assertReceizEconomyShowcaseCarriedHeadSemanticsV114(carrier);
  if (carrier.artifactId !== admission.artifactId) {
    throw new TypeError("ECONOMY_SHOWCASE_ADMISSION_REDERIVATION_FAILED");
  }
  return carrier;
}

export function isSdkAdmittedReceizCapabilityIssuerKey(
  value: unknown,
): value is ReceizCapabilityIssuerKey {
  return typeof value === "object"
    && value !== null
    && sdkAdmittedCapabilityIssuerKeys.has(value);
}

function sameCapabilityIssuerEvidence(
  left: ReceizCapabilityIssuerKey,
  right: ReceizCapabilityIssuerKey,
): boolean {
  return left.keyId === right.keyId
    && left.alg === right.alg
    && left.publicKeyRawB64u === right.publicKeyRawB64u
    && left.actorId === right.actorId
    && left.registryDigest.algorithm === right.registryDigest.algorithm
    && left.registryDigest.binds === right.registryDigest.binds
    && left.registryDigest.value === right.registryDigest.value
    && left.revoked === right.revoked;
}

export async function createReceizCapabilityIssuerResolver(input: Readonly<{
  identityAdmissions: readonly ReceizVerifiedArtifactAdmission[];
  revokedIssuerKeyIds: ReadonlySet<string>;
}>): Promise<ReceizCapabilityIssuerResolver> {
  const identityAdmissions = [...input.identityAdmissions];
  const revokedIssuerKeyIds = new Set(input.revokedIssuerKeyIds);
  const issuers = new Map<string, ReceizCapabilityIssuerKey>();
  for (const identityAdmission of identityAdmissions) {
    const verifiedAdmission = await verifyReceizArtifactAdmission(identityAdmission);
    if ("code" in verifiedAdmission || verifiedAdmission.profile !== "identity") {
      throw new Error("IDENTITY_ADMISSION_NOT_VERIFIED");
    }
    const custody = admissionCustody.get(verifiedAdmission);
    const basis = custody?.identityEvidenceBasis;
    if (!custody || !basis || (basis.alg !== "Ed25519" && basis.alg !== "P-256")) {
      throw new Error("IDENTITY_ADMISSION_NOT_VERIFIED");
    }
    const issuer: ReceizCapabilityIssuerKey = Object.freeze({
      keyId: basis.keyId,
      alg: basis.alg,
      publicKeyRawB64u: basis.publicKeyRawB64u,
      actorId: basis.actorId,
      registryDigest: registryDigest(custody.registryDigest),
      revoked: revokedIssuerKeyIds.has(basis.keyId),
    });
    const existing = issuers.get(issuer.keyId);
    if (existing && !sameCapabilityIssuerEvidence(existing, issuer)) {
      throw new Error("CAPABILITY_ISSUER_EVIDENCE_CONFLICT");
    }
    if (!existing) {
      sdkAdmittedCapabilityIssuerKeys.add(issuer);
      issuers.set(issuer.keyId, issuer);
    }
  }
  return (issuerKeyId: string) => issuers.get(issuerKeyId) ?? null;
}

export async function verifyReceizArtifactAdmissionRegistryDiscovery(
  admission: unknown,
  discovery: unknown,
): Promise<ReceizRegistryDiscoveryResult> {
  const verifiedAdmission = await verifyReceizArtifactAdmission(admission);
  if ("code" in verifiedAdmission) throw new Error(verifiedAdmission.code);
  const custody = admissionCustody.get(verifiedAdmission);
  const verifiedDiscovery = verifyRuntimeDiscoveredReceizRegistryLaw(discovery);
  if (!custody
    || custody.registryDiscovery !== verifiedDiscovery
    || custody.registryDigest !== verifiedDiscovery.trustEvidence.currentRegistryDigest.value
    || custody.registryEffectiveKai !== verifiedDiscovery.trustEvidence.currentEffectiveKai
    || verifiedAdmission.admissionProof.registryDigest !== custody.registryDigest
    || verifiedAdmission.admissionProof.registryEffectiveKai !== custody.registryEffectiveKai) {
    throw new Error("ADMISSION_REGISTRY_DISCOVERY_MISMATCH");
  }
  return verifiedDiscovery;
}

export type ReceizArtifactAdmissionRegistryEvidence = Readonly<{
  registryDigest: string;
  registryEffectiveKai: string;
}>;

export async function verifyReceizArtifactAdmissionRegistryEvidence(
  admission: unknown,
): Promise<ReceizArtifactAdmissionRegistryEvidence> {
  const verifiedAdmission = await verifyReceizArtifactAdmission(admission);
  if ("code" in verifiedAdmission) throw new Error(verifiedAdmission.code);
  const custody = admissionCustody.get(verifiedAdmission);
  if (!custody
    || verifiedAdmission.admissionProof.registryDigest !== custody.registryDigest
    || verifiedAdmission.admissionProof.registryEffectiveKai !== custody.registryEffectiveKai) {
    throw new Error("ADMISSION_REGISTRY_EVIDENCE_MISMATCH");
  }
  if (custody.registryDiscovery) {
    const discovery = await verifyReceizArtifactAdmissionRegistryDiscovery(verifiedAdmission, custody.registryDiscovery);
    if (discovery.trustEvidence.currentRegistryDigest.value !== custody.registryDigest
      || discovery.trustEvidence.currentEffectiveKai !== custody.registryEffectiveKai) {
      throw new Error("ADMISSION_REGISTRY_EVIDENCE_MISMATCH");
    }
  } else if (custody.registryContext) {
    await verifyPackagePinnedHistoryRegistry(custody.registryContext);
    if (await digestReceizConstitution(custody.registryContext) !== custody.registryDigest
      || custody.registryContext.effectiveKai !== custody.registryEffectiveKai) throw new Error("ADMISSION_REGISTRY_EVIDENCE_MISMATCH");
  } else if (custody.registryDigest !== RECEIZ_CURRENT_REGISTRY_DIGEST
    || custody.registryEffectiveKai !== RECEIZ_CURRENT_REGISTRY_EFFECTIVE_KAI) {
    throw new Error("ADMISSION_REGISTRY_EVIDENCE_MISMATCH");
  }
  return Object.freeze({
    registryDigest: custody.registryDigest,
    registryEffectiveKai: custody.registryEffectiveKai,
  });
}

export async function verifyReceizVerifiedActorReference(
  actor: unknown,
  admission: unknown,
): Promise<ReceizVerifiedActorReference | ReceizAuthorityFailure> {
  const verifiedAdmission = await verifyReceizArtifactAdmission(admission);
  if ("code" in verifiedAdmission) return verifiedAdmission;
  return assertCustodiedReceizVerifiedActorReference(actor, verifiedAdmission);
}

function normalizeAdmissionOptions(value: unknown): ReceizArtifactAdmissionOptions | null {
  if (value && typeof value === "object" && "profile" in value) {
    const candidate = value as Record<string, unknown>;
    const ownerConstraint = candidate.ownerConstraint;
    const actorConstraint = candidate.actorConstraint;
    if ((ownerConstraint !== undefined && typeof ownerConstraint !== "string")
      || (actorConstraint !== undefined && typeof actorConstraint !== "string")) return null;
    if (candidate.profile === "identity"
      && Object.keys(candidate).every((key) => ["profile", "ownerConstraint", "actorConstraint", "identityPassphrase"].includes(key))
      && typeof candidate.identityPassphrase === "string") {
      return {
        profile: "identity",
        ...(ownerConstraint !== undefined ? { ownerConstraint } : {}),
        ...(actorConstraint !== undefined ? { actorConstraint } : {}),
        identityPassphrase: candidate.identityPassphrase,
      };
    }
    if (candidate.profile === "identity"
      && Object.keys(candidate).every((key) => ["profile", "ownerConstraint", "actorConstraint", "identityExactChallenge", "identityProof"].includes(key))
      && typeof candidate.identityExactChallenge === "string"
      && candidate.identityExactChallenge.length > 0
      && candidate.identityProof !== null
      && typeof candidate.identityProof === "object") {
      return {
        profile: "identity",
        ...(ownerConstraint !== undefined ? { ownerConstraint } : {}),
        ...(actorConstraint !== undefined ? { actorConstraint } : {}),
        identityExactChallenge: candidate.identityExactChallenge,
        identityProof: structuredClone(candidate.identityProof) as ReceizIdentityLoginProof,
      };
    }
    if (candidate.profile === "identity"
      && Object.keys(candidate).every((key) => ["profile", "ownerConstraint", "actorConstraint", "identityExactChallengeB64Url", "identityProof"].includes(key))
      && typeof candidate.identityExactChallengeB64Url === "string"
      && /^[A-Za-z0-9_-]+$/.test(candidate.identityExactChallengeB64Url)
      && candidate.identityProof !== null && typeof candidate.identityProof === "object") {
      try {
        if (receizBase64UrlEncode(receizBase64UrlDecode(candidate.identityExactChallengeB64Url)) !== candidate.identityExactChallengeB64Url) return null;
      } catch { return null; }
      return {
        profile: "identity",
        ...(ownerConstraint !== undefined ? { ownerConstraint } : {}),
        ...(actorConstraint !== undefined ? { actorConstraint } : {}),
        identityExactChallengeB64Url: candidate.identityExactChallengeB64Url,
        identityProof: structuredClone(candidate.identityProof) as ReceizIdentityLoginProof,
      };
    }
    if (candidate.profile === "portable-state"
      && Object.keys(candidate).every((key) => ["profile", "ownerConstraint", "actorConstraint", "verifiedHistory"].includes(key))) {
      return {
        profile: "portable-state",
        ...(ownerConstraint !== undefined ? { ownerConstraint } : {}),
        ...(actorConstraint !== undefined ? { actorConstraint } : {}),
        ...(candidate.verifiedHistory !== undefined
          ? { verifiedHistory: candidate.verifiedHistory as ReceizVerifiedProofHistory }
          : {}),
      };
    }
    if (candidate.profile === "profile-showcase"
      && Object.keys(candidate).every((key) => ["profile", "ownerConstraint", "actorConstraint"].includes(key))) {
      return {
        profile: "profile-showcase",
        ...(ownerConstraint !== undefined ? { ownerConstraint } : {}),
        ...(actorConstraint !== undefined ? { actorConstraint } : {}),
      };
    }
    if (candidate.profile === "economy-showcase"
      && Object.keys(candidate).every((key) =>
        ["profile", "ownerConstraint", "actorConstraint"].includes(key))) {
      return {
        profile: "economy-showcase",
        ...(ownerConstraint !== undefined ? { ownerConstraint } : {}),
        ...(actorConstraint !== undefined ? { actorConstraint } : {}),
      };
    }
    if (candidate.profile === "document" && Object.keys(candidate).length === 1) return { profile: "document" };
    return null;
  }
  return null;
}

function createReceizArtifactAdmissionEngineInternal(
  dependencies: ReceizArtifactAdmissionDependencies,
  allowProfileShowcaseNonGenesis: boolean,
  pinnedRegistryContext: ReceizConstitutionRegistry | null = null,
) {
  const roots = cloneRoots(
    dependencies.canonicalSignatureV4RootPublicKeys ?? receizCurrentPinnedSignatureV4Roots(),
  );
  const registryDiscovery = dependencies.verifiedRegistryDiscovery
    ? verifyRuntimeDiscoveredReceizRegistryLaw(dependencies.verifiedRegistryDiscovery)
    : null;
  return async function admit(
    verificationInput: ReceizArtifactVerificationResult,
    admissionOptions: ReceizArtifactAdmissionOptions,
  ): Promise<ReceizArtifactAdmissionResult> {
    const verification = verificationInput;
    const options = normalizeAdmissionOptions(admissionOptions);
    if (!options) return invalidReceizArtifactAdmission("MISSING_AUTHORITY");
    let registryContext = registryDiscovery ? null : pinnedRegistryContext ?? RECEIZ_CURRENT_CONSTITUTION_REGISTRY;
    let admissionRegistryDigest = registryDiscovery?.trustEvidence.currentRegistryDigest.value
      ?? (pinnedRegistryContext ? await digestReceizConstitution(pinnedRegistryContext) : RECEIZ_CURRENT_REGISTRY_DIGEST);
    let admissionRegistryEffectiveKai = registryDiscovery?.trustEvidence.currentEffectiveKai
      ?? registryContext?.effectiveKai ?? RECEIZ_CURRENT_REGISTRY_EFFECTIVE_KAI;

    if (!verification || typeof verification !== "object" || !("status" in verification)) {
      return invalidReceizArtifactAdmission("MISSING_AUTHORITY");
    }
    if (verification.status !== "verified-artifact") {
      return invalidReceizArtifactAdmission(
        verification.status === "unsupported" ? "UNSUPPORTED_LEGACY_FORMAT" : "ARTIFACT_TAMPERED",
      );
    }
    let snapshot: Awaited<ReturnType<typeof readRuntimeCustodiedReceizArtifactSnapshot>>;
    let canonical: CanonicalOpenSuccess | null;
    try {
      const reverified = await canonicalReverify({ verification, roots });
      snapshot = reverified.snapshot;
      canonical = reverified.canonical;
    } catch {
      return invalidReceizArtifactAdmission("MISSING_AUTHORITY");
    }
    const artifactSha256 = verification.artifactDigest.value;
    const payloadSha256 = verification.payloadDigest.value;
    let historicalIdentityKey: Awaited<ReturnType<typeof readReceizIdentityArtifact>> | null = null;
    // Existing Identity Seals predate native Record Seal custody. Their original
    // enclosing proof and signed portable-state identity remain the authority.
    // Read that source without manufacturing a native artifact or resealing it.
    if (!canonical && options.profile === "identity" && !verification.verification.bundle?.nativeRecordSeal) {
      try {
        const read = await readVerifiedReceizDocumentBytesCanonical({
          fileBytes: snapshot.bytes, filename: snapshot.filename, mime: snapshot.mimeType,
          signatureV4RootPublicKeys: roots, zipGuardLimits: CANONICAL_ZIP_LIMITS,
        });
        if (read.ok && await sha256ReceizBytes(read.payloadBytes) === verification.payloadDigest.value) {
          const key = await readReceizIdentityArtifact(snapshot.bytes);
          if (await verifyReceizIdentityPortableStateProof(key) === "verified") {
            const account = (key.portableState?.snapshot as {account?: {userId?: unknown; username?: unknown}} | null)?.account;
            const normalizeUsername = (value: unknown) => typeof value === "string" ? value.trim().replace(/^@+/, "").normalize("NFC").toLowerCase() : "";
            // Historical PNG artwork/trailers are not owner authority. The
            // existing signed account state must bind its exact identity owner.
            if (account?.userId === key.owner.uid
              && normalizeUsername(account.username) === normalizeUsername(key.owner.username)) {
              historicalIdentityKey = key;
              canonical = { ...read, legacyCompatibility: "verified-legacy-read" };
            }
          }
        }
      } catch { /* Fail closed; no weaker identity or replacement is admitted. */ }
    }
    const identityOwner = historicalIdentityKey?.owner;
    const username = identityOwner?.username?.trim().replace(/^@+/, "").toLowerCase();
    const ownerReceizId = historicalIdentityKey
      ? ownerFromVerification(verification) ?? (username ? `${username}.receiz.id` : identityOwner!.uid)
      : canonical ? ownerFromCanonical(canonical) : ownerFromVerification(verification);
    const actorConstraint = options.profile === "document" ? null : options.actorConstraint?.trim() || null;
    if (options.profile === "document") {
      return documentAdmission({ verification, ownerReceizId });
    }
    if (!canonical) {
      return profileDenied({
        profile: options.profile,
        artifactSha256,
        payloadSha256,
        ownerReceizId,
        actorConstraint,
        summaryCode: "CANONICAL_ARTIFACT_REQUIRED",
      });
    }
    const opened = openedArtifactFromCanonical({
      canonical,
      artifactBytes: snapshot.bytes,
      artifactSha256,
      payloadSha256,
      filename: snapshot.filename,
      mimeType: snapshot.mimeType,
    });
    if (!opened && !historicalIdentityKey) {
      return profileDenied({
        profile: options.profile,
        artifactSha256,
        payloadSha256,
        ownerReceizId,
        actorConstraint,
        summaryCode: "CURRENT_NATIVE_ARTIFACT_REQUIRED",
      });
    }
    const ownerConstraint = options.ownerConstraint?.trim() || null;
    if (ownerConstraint && ownerConstraint !== ownerReceizId) {
      return profileDenied({
        profile: options.profile,
        artifactSha256,
        payloadSha256,
        ownerReceizId,
        actorConstraint,
        error: ownerError(ownerConstraint, ownerReceizId),
        summaryCode: "OWNER_CONSTRAINT_DENIED",
      });
    }
    const verificationContext = await verifierContext({
      canonical,
      filename: snapshot.filename,
      mimeType: snapshot.mimeType,
      roots,
    });

    if (options.profile === "identity") {
      let passphrase = "identityPassphrase" in options ? options.identityPassphrase : "";
      try {
        const keyFile = historicalIdentityKey ?? await readReceizIdentityArtifact(canonical.payloadBytes);
        const projection = await projectReceizIdentityAccount(keyFile);
        const ownerBound = identityPayloadBindsArtifactOwner(keyFile, ownerReceizId);
        const keyIdentityBound = projection.keyId === keyFile.keyId;
        const actorId = keyFile.owner.uid;
        if (!ownerBound) {
          return profileDenied({
            profile: "identity",
            artifactSha256,
            payloadSha256,
            ownerReceizId,
            actorConstraint,
            summaryCode: "IDENTITY_OWNER_BINDING_DENIED",
          });
        }
        if (!keyIdentityBound) {
          return profileDenied({
            profile: "identity",
            artifactSha256,
            payloadSha256,
            ownerReceizId,
            actorConstraint,
            summaryCode: "IDENTITY_KEY_BINDING_DENIED",
          });
        }
        if (actorConstraint !== null && actorConstraint !== actorId) {
          return profileDenied({
            profile: "identity",
            artifactSha256,
            payloadSha256,
            ownerReceizId,
            actorConstraint,
            summaryCode: "IDENTITY_ACTOR_BINDING_DENIED",
          });
        }
        const challengeText = "identityExactChallenge" in options
          ? options.identityExactChallenge
          : [
              "RECEIZ-IDENTITY-ADMISSION-V112",
              artifactSha256,
              payloadSha256,
              keyFile.keyId,
              ownerReceizId,
              admissionRegistryDigest,
            ].join("\n");
        const proof = "identityProof" in options
          ? options.identityProof
          : await signReceizIdentityLoginProof({
              keyFile,
              challengeText,
              ...(passphrase ? { passphrase } : {}),
            });
        const exactChallengeB64Url = "identityExactChallengeB64Url" in options
          ? options.identityExactChallengeB64Url
          : receizBase64UrlEncode(new TextEncoder().encode(challengeText));
        if (proof.keyId !== keyFile.keyId
          || proof.alg !== keyFile.alg
          || proof.challengeB64Url !== exactChallengeB64Url) {
          throw new Error("identity_signing_proof_mismatch");
        }
        const signingProofVerified = await verifyReceizIdentityLoginProof({
          keyFile,
          challengeB64Url: proof.challengeB64Url,
          signatureB64Url: proof.signatureB64Url,
        });
        if (!signingProofVerified) throw new Error("identity_signing_proof_invalid");
        const identityEvidenceBasis: IdentityEvidenceBasis = Object.freeze({
          schema: "receiz.verified-actor-evidence-basis.v112",
          artifactSha256,
          payloadSha256,
          artifactOwnerReceizId: ownerReceizId!,
          identityOwnerReceizId: keyFile.owner.uid,
          actorId,
          keyId: keyFile.keyId,
          alg: keyFile.alg,
          publicKeyRawB64u: keyFile.crypto.publicKeyRawB64u,
          // Binary challenges retain byte semantics; existing text challenges
          // keep their frozen text encoding and digest unchanged.
          challengeDigest: await digestReceizAuthority(
            "identity",
            "receiz.identity-signing-challenge.v112",
            "identityExactChallengeB64Url" in options
              ? receizBase64UrlDecode(exactChallengeB64Url)
              : challengeText,
          ),
          signatureDigest: await digestReceizAuthority(
            "identity",
            "receiz.identity-signature-evidence.v112",
            proof.signatureB64Url,
          ),
          signatureVerified: true,
          registryDigest: admissionRegistryDigest,
        });
        return verifiedResult({
          registryDigest: admissionRegistryDigest,
          registryEffectiveKai: admissionRegistryEffectiveKai,
          registryDiscovery,
          registryContext,
          profile: "identity",
          verdict: "canonical-identity",
          opened,
          ...(historicalIdentityKey ? { historicalIdentitySource: {
            verifiedPayload: issueVerifiedPayload({bytes: canonical.payloadBytes, filename: canonical.payloadFilename,
              mimeType: canonical.payloadMimeType, sha256: payloadSha256}),
            continuity: {carrier: "identity-seal" as const, ownerReceizId: ownerReceizId!, keyId: keyFile.keyId,
              portableStateDigest: keyFile.portableState!.proof!.digestSha256Hex},
          } } : {}),
          identityPayloadBytes: historicalIdentityKey ? snapshot.bytes : canonical.payloadBytes,
          artifactId: `identity:${projection.keyId}`,
          ownerReceizId,
          actorConstraint,
          recoveredState: projection as unknown as Readonly<Record<string, unknown>>,
          assessments: IDENTITY_ASSESSMENTS,
          summaryCode: "CANONICAL_IDENTITY_VERIFIED",
          sourceVerification: verification,
          exactArtifactBytes: snapshot.bytes,
          verifierRoots: roots,
          verifierContext: verificationContext,
          identityEvidenceBasis,
        });
      } catch {
        return profileDenied({
          profile: "identity",
          artifactSha256,
          payloadSha256,
          ownerReceizId,
          actorConstraint,
          summaryCode: "IDENTITY_SIGNING_PROOF_DENIED",
        });
      } finally {
        passphrase = "";
      }
    }

    try {
      const decoded = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(
        canonical.payloadBytes,
      )) as unknown;
      if (options.profile === "profile-showcase") {
        const boundedCarrier = await parseReceizBoundedProfileShowcaseCarrierV114(decoded);
        const parentHeads = boundedCarrier["profile-showcase"].parentHeads as readonly unknown[];
        if (!allowProfileShowcaseNonGenesis && parentHeads.length !== 0) {
          return profileDenied({
            profile: "profile-showcase",
            artifactSha256,
            payloadSha256,
            ownerReceizId,
            actorConstraint,
            summaryCode: "PROFILE_SHOWCASE_PREDECESSOR_CONTEXT_REQUIRED",
          });
        }
        if (boundedCarrier.ownerReceizIdentity !== ownerReceizId) {
          return profileDenied({
            profile: "profile-showcase",
            artifactSha256,
            payloadSha256,
            ownerReceizId,
            actorConstraint,
          });
        }
        await assertReceizBoundedProfileShowcaseCarriedHeadSemanticsV114(boundedCarrier);
        return verifiedResult({
          registryDigest: admissionRegistryDigest,
          registryEffectiveKai: admissionRegistryEffectiveKai,
          registryDiscovery,
          registryContext,
          profile: "profile-showcase",
          verdict: "bearer-recovery",
          opened,
          artifactId: boundedCarrier.artifactId,
          ownerReceizId,
          actorConstraint,
          recoveredState: boundedCarrier as unknown as Readonly<Record<string, unknown>>,
          assessments: PORTABLE_ASSESSMENTS,
          summaryCode: "PROFILE_SHOWCASE_BOUNDED_CONTINUITY_VERIFIED",
          sourceVerification: verification,
          exactArtifactBytes: snapshot.bytes,
          verifierRoots: roots,
          verifierContext: verificationContext,
          proofHistoryHead: boundedCarrier.receizProofHistory,
        });
      }
      if (options.profile === "economy-showcase") {
        const economyCarrier = await parseReceizEconomyShowcaseCarrierV114(decoded);
        await assertReceizEconomyShowcaseCarriedHeadSemanticsV114(economyCarrier);
        return verifiedResult({
          registryDigest: admissionRegistryDigest,
          registryEffectiveKai: admissionRegistryEffectiveKai,
          registryDiscovery,
          registryContext,
          profile: "economy-showcase",
          verdict: "bearer-recovery",
          opened,
          artifactId: economyCarrier.artifactId,
          ownerReceizId,
          actorConstraint,
          recoveredState: economyCarrier as unknown as Readonly<Record<string, unknown>>,
          assessments: PORTABLE_ASSESSMENTS,
          summaryCode: "ECONOMY_SHOWCASE_BOUNDED_CONTINUITY_VERIFIED",
          sourceVerification: verification,
          exactArtifactBytes: snapshot.bytes,
          verifierRoots: roots,
          verifierContext: verificationContext,
          proofHistoryHead: economyCarrier.receizProofHistory,
        });
      }
      const portable = await parseReceizPortableAssetDocument(decoded);
      const continuity = await deriveReceizPortableOwnershipContinuity(portable);
      if (continuity.ownerReceizId !== ownerReceizId) {
        return profileDenied({
          profile: "portable-state",
          artifactSha256,
          payloadSha256,
          ownerReceizId,
          actorConstraint,
        });
      }
      const verifierContextDigest = await digestReceizAuthority(
        "admission",
        "receiz.canonical-verifier-context.v112",
        verificationContext,
      );
      if (portable.receizProofHistory && !registryDiscovery) {
        const selected = await resolvePackagePinnedHistoryRegistry(portable.receizProofHistory.history.registryDigest);
        if (pinnedRegistryContext && selected !== pinnedRegistryContext) throw new TypeError("ADMISSION_SOURCE_REGISTRY_CONTEXT_MISMATCH");
        registryContext = selected;
        admissionRegistryDigest = await digestReceizConstitution(selected);
        admissionRegistryEffectiveKai = selected.effectiveKai;
      }
      const proofHistory = portable.receizProofHistory
        ? await verifyReceizCarriedProofHistory({
            history: portable.receizProofHistory.history,
            artifactId: continuity.artifactId,
            registryDigest: admissionRegistryDigest,
            artifactDigest: artifactSha256,
            verifierContextDigest,
          })
        : null;
      if (proofHistory && proofHistory.currentOwnerReceizId !== null
        && proofHistory.currentOwnerReceizId !== portable.ownership.ownerReceizId) {
        throw new Error("HISTORY_OWNER_MISMATCH");
      }
      return verifiedResult({
        registryDigest: admissionRegistryDigest,
        registryEffectiveKai: admissionRegistryEffectiveKai,
        registryDiscovery,
        registryContext,
        profile: "portable-state",
        verdict: "bearer-recovery",
        opened,
        artifactId: continuity.artifactId,
        ownerReceizId,
        actorConstraint,
        recoveredState: portable as unknown as Readonly<Record<string, unknown>>,
        assessments: PORTABLE_ASSESSMENTS,
        summaryCode: "BEARER_CONTINUITY_VERIFIED",
        sourceVerification: verification,
        exactArtifactBytes: snapshot.bytes,
        verifierRoots: roots,
        verifierContext: verificationContext,
        proofHistory,
      });
    } catch {
      return profileDenied({
        profile: options.profile,
        artifactSha256,
        payloadSha256,
        ownerReceizId,
        actorConstraint,
      });
    }
  };
}

export function createReceizArtifactAdmissionEngine(
  dependencies: ReceizArtifactAdmissionDependencies = {},
) {
  return createReceizArtifactAdmissionEngineInternal(dependencies, false);
}

/** Package-internal: reuse an admitted source's exact pinned lineage interpretation for actor/capability admission. */
export async function createReceizArtifactAdmissionEngineWithSourceContext(source: unknown) {
  const admission = await verifyReceizArtifactAdmission(source);
  if ("code" in admission) throw new TypeError(admission.code);
  await verifyReceizArtifactAdmissionRegistryEvidence(admission);
  const custody = admissionCustody.get(admission)!;
  if (!custody.registryContext) throw new TypeError("ADMISSION_PINNED_SOURCE_CONTEXT_REQUIRED");
  await verifyPackagePinnedHistoryRegistry(custody.registryContext);
  return createReceizArtifactAdmissionEngineInternal({ canonicalSignatureV4RootPublicKeys: custody.verifierRoots }, false, custody.registryContext);
}
/** Package-internal: verify carried exact bytes under the admitted source's
 * existing pinned roots. No caller-supplied root or verifier context is accepted. */
export async function verifyReceizArtifactWithSourceContext(source: unknown, input: Parameters<typeof verifyReceizArtifactWithCanonicalRoots>[0]) {
  const admission = await verifyReceizArtifactAdmission(source);
  if ("code" in admission) throw new TypeError(admission.code);
  await verifyReceizArtifactAdmissionRegistryEvidence(admission);
  const custody = admissionCustody.get(admission)!;
  if (!custody.registryContext) throw new TypeError("ADMISSION_PINNED_SOURCE_CONTEXT_REQUIRED");
  await verifyPackagePinnedHistoryRegistry(custody.registryContext);
  return verifyReceizArtifactWithCanonicalRoots(input, custody.verifierRoots);
}
/** Existing admission custody, not a transported registry claim. */
export async function readReceizArtifactAdmissionPinnedRegistry(admissionInput: unknown): Promise<ReceizConstitutionRegistry> {
  const admission = await verifyReceizArtifactAdmission(admissionInput);
  if ("code" in admission) throw new TypeError(admission.code);
  await verifyReceizArtifactAdmissionRegistryEvidence(admission);
  const registry = admissionCustody.get(admission)?.registryContext;
  if (!registry) throw new TypeError("ADMISSION_PINNED_SOURCE_CONTEXT_REQUIRED");
  await verifyPackagePinnedHistoryRegistry(registry);
  return registry;
}

/** Reopen retained identity evidence under its original package-pinned interpretation.
 * This selects historical mechanics only; exact enclosing proof and original
 * admission/actor/context digests must still agree in the custody caller.
 */
export async function createReceizIdentityAdmissionEngineForRetainedRegistry(registryDigest: string) {
  const registry = await resolvePackagePinnedHistoryRegistry(registryDigest);
  const engine = createReceizArtifactAdmissionEngineInternal({}, false, registry);
  return (verification: ReceizArtifactVerificationResult, options: Extract<ReceizArtifactAdmissionOptions, { profile: "identity" }>) => engine(verification, options);
}
