import {
  RECEIZ_V114_REGISTRY_DIGEST,
  createReceizCapabilityIssuerResolver,
  createReceizCapabilityVerifier,
  deriveReceizProfileShowcaseNativeOperationDigestV114,
  digestReceizAuthority,
  planReceizProfileShowcaseGenesis,
  receizProfileShowcaseGenesisCapabilityContext,
  signReceizCapability,
  type ReceizCapabilityPayload,
  type ReceizCommitDomainId,
  type ReceizConstitutionJson,
  type ReceizKeyFile,
  type ReceizVerifiedIdentityArtifactAdmission,
  type ReceizVerifiedPortableStateAdmission,
} from "../../../../packages/receiz-sdk/src/index";
import {
  RECEIZ_V114_APPLICATION_OPERATION_MATRIX_DIGEST,
} from "../../../../packages/receiz-sdk/src/appContract";
import {
  createVerifiedProfileShowcaseGenesis,
  type ProfileShowcaseSealer,
  type VerifiedProfileShowcase,
} from "./artifact";
import {
  createEmptyProfileShowcaseMerkleState,
  appendProfileShowcaseMerkleLeaf,
  PROFILE_SHOWCASE_FIBONACCI_MECHANICS_AUTHORITY,
} from "./commitments";
import {
  deriveProfileShowcaseFirstPaintWindow,
} from "./firstPaintWindow";
import {
  createEmptyProfileShowcaseFoldState,
  foldProfileShowcaseOperations,
} from "./operations";
import { sealProfileShowcaseSegment } from "./segments";
import type {
  ProfileShowcasePayloadV1,
  ProfileShowcaseOperationV1,
} from "./types";
import {
  PROFILE_SHOWCASE_AUTHORITY,
} from "./types";

const DIGEST_RE = /^[0-9a-f]{64}$/;
const KAI_RE = /^(0|[1-9][0-9]*)$/;

export type ProfileShowcaseMigrationException =
  | Readonly<{ code: "missing-artifact"; legacyIdentity: string }>
  | Readonly<{
      code: "failed-verification";
      legacyIdentity: string;
      evidenceDigest: string;
    }>
  | Readonly<{
      code: "duplicate-identity";
      legacyIdentity: string;
      evidenceDigest: string;
    }>
  | Readonly<{
      code: "unresolved-immutable-version";
      legacyIdentity: string;
    }>
  | Readonly<{ code: "malformed-entry"; evidenceDigest: string }>
  | Readonly<{
      code: "ambiguous-ordering";
      legacyIdentity: string;
      evidenceDigest: string;
    }>;

export type ProfileShowcaseMigrationObservedChild = Readonly<{
  stableChildArtifactId: string;
  immutableVersion: string;
  childArtifactDigest: string;
  admissionEvidenceRoot: string;
  contentDigest: string;
  kaiUpulse: string;
}>;

export type ProfileShowcaseMigrationCommitment = Readonly<{
  schema: "receiz.profile-showcase.migration-commitment.v1";
  method: "observed-and-adopted";
  legacyManifestDigest: string;
  migrationKaiUpulse: string;
  migratedChildren: readonly ProfileShowcaseMigrationObservedChild[];
  exceptions: readonly ProfileShowcaseMigrationException[];
  exceptionCommitment: string;
  segmentRoots: readonly string[];
  authority: Readonly<{
    migrationCommitmentIsProofAuthority: false;
    legacyManifestIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
    adoptionStatus: "requires-native-genesis-and-provenance-transition";
  }>;
}>;

export type PreparedProfileShowcaseMigrationCommitment = Readonly<{
  commitment: ProfileShowcaseMigrationCommitment;
  commitmentDigest: string;
}>;

const MIGRATION_COMMITMENT_AUTHORITY =
  Object.freeze({
    migrationCommitmentIsProofAuthority: false as const,
    legacyManifestIsProofAuthority: false as const,
    strongerTruth: "sealed-receiz-proof-object" as const,
    adoptionStatus:
      "requires-native-genesis-and-provenance-transition" as const,
  });

async function emptyMigrationGenesisPayload(input: Readonly<{
  ownerReceizIdentity: string;
  profileIdentity: string;
  migrationKaiUpulse: string;
}>): Promise<ProfileShowcasePayloadV1> {
  const artifactId =
    `profile-showcase:${input.ownerReceizIdentity}` as const;
  const merkle = createEmptyProfileShowcaseMerkleState();
  const withoutFirstPaint = {
    schema: "receiz.profile-showcase.v1" as const,
    artifactId,
    ownerReceizIdentity: input.ownerReceizIdentity,
    profileIdentity: input.profileIdentity,
    headKaiUpulse: input.migrationKaiUpulse,
    parentArtifactDigests: [],
    priorOperationCount: 0,
    resultingOperationCount: 0,
    directOperations: [],
    currentStateRoot: await digestReceizAuthority(
      "state",
      "receiz.profile-showcase.empty-migration-genesis.v114",
      {
        artifactId,
        ownerReceizIdentity: input.ownerReceizIdentity,
        profileIdentity: input.profileIdentity,
        migrationKaiUpulse: input.migrationKaiUpulse,
      },
    ),
    merkle,
    fibonacci: {
      basis: "sparse-checkpoint/v1" as const,
      operationCount: 0,
      checkpoints: [],
      authority: PROFILE_SHOWCASE_FIBONACCI_MECHANICS_AUTHORITY,
    },
    segments: [],
    counts: {
      operationCount: 0,
      membershipCount: 0,
      visibleCount: 0,
      hiddenCount: 0,
      unlistedCount: 0,
      pinnedCount: 0,
    },
    proofHistoryEvidenceRoots: [],
    versions: {
      ordering:
        "parent/prior-count/delta/kai/operation/child.v1" as const,
      projectionSchemaVersion: "receiz.profile-showcase.projection.v1",
      verifierVersion: "receiz.verifier.v114",
      kernelVersion: "receiz.kernel.v114",
      registryVersion: "receiz.registry.v114",
      operationMatrixVersion:
        "receiz.profile-showcase.operations.v1",
      registryDigest: RECEIZ_V114_REGISTRY_DIGEST,
      operationRegistryDigest:
        RECEIZ_V114_APPLICATION_OPERATION_MATRIX_DIGEST,
    },
    authority: PROFILE_SHOWCASE_AUTHORITY,
  };
  return {
    ...withoutFirstPaint,
    firstPaintWindow: await deriveProfileShowcaseFirstPaintWindow({
      foldState: createEmptyProfileShowcaseFoldState(),
      payload: {
        segments: withoutFirstPaint.segments,
        fibonacci: withoutFirstPaint.fibonacci,
        merkle: withoutFirstPaint.merkle,
      },
    }),
  };
}

export async function createAndSealProfileShowcaseMigrationGenesis(
  input: Readonly<{
    ownerReceizIdentity: string;
    migrationKaiUpulse: string;
    actorAdmission: ReceizVerifiedIdentityArtifactAdmission;
    keyFile: ReceizKeyFile;
    passphrase: string;
    commitDomain: ReceizCommitDomainId;
    sealer: ProfileShowcaseSealer;
    migrationChild?: ReceizVerifiedPortableStateAdmission;
  }>,
): Promise<VerifiedProfileShowcase> {
  if (
    !validIdentity(input.ownerReceizIdentity)
    || !KAI_RE.test(input.migrationKaiUpulse)
  ) fail("PROFILE_SHOWCASE_MIGRATION_GENESIS_INPUT_INVALID");
  const actor = input.actorAdmission;
  let showcase = await emptyMigrationGenesisPayload({
    ownerReceizIdentity: input.ownerReceizIdentity,
    profileIdentity: actor.actor.actorId,
    migrationKaiUpulse: input.migrationKaiUpulse,
  });
  let admittedChildren: readonly ReceizVerifiedPortableStateAdmission[] = [];
  let operations: readonly ProfileShowcaseOperationV1[] = [];
  if (input.migrationChild) {
    const child = input.migrationChild;
    if (
      child.profile !== "portable-state"
      || child.ownerReceizId !== input.ownerReceizIdentity
    ) {
      fail("PROFILE_SHOWCASE_MIGRATION_CHILD_NOT_VERIFIED");
    }
    const operationBasis = {
      schema: "receiz.profile-showcase.operation.v1" as const,
      kind: "showcase.append" as const,
      parentArtifactDigest: null,
      priorCommittedCount: 0,
      directDeltaPosition: 0,
      kai: { upulse: input.migrationKaiUpulse },
      authorityEvidenceRoot: actor.actor.evidenceDigest.value,
      child: {
        stableChildArtifactId: child.artifactId,
        immutableVersion: child.payloadSha256,
        childArtifactDigest: child.artifactSha256,
        admissionEvidenceRoot: child.admissionProof.admissionProofDigest,
        contentDigest: child.payloadSha256,
      },
    };
    const operation = Object.freeze({
      ...operationBasis,
      operationDigest:
        deriveReceizProfileShowcaseNativeOperationDigestV114(operationBasis),
    });
    const segment = await sealProfileShowcaseSegment([operation]);
    const foldState = foldProfileShowcaseOperations({
      prior: createEmptyProfileShowcaseFoldState(),
      operations: [operation],
    });
    const merkle = appendProfileShowcaseMerkleLeaf(
      createEmptyProfileShowcaseMerkleState(),
      operation.operationDigest,
    );
    const nextWithoutFirstPaint: ProfileShowcasePayloadV1 = {
      ...showcase,
      resultingOperationCount: 1,
      directOperations: [operation],
      currentStateRoot: await digestReceizAuthority(
        "state",
        "receiz.profile-showcase.observed-adopted-genesis.v1",
        {
          artifactId: showcase.artifactId,
          operationDigest: operation.operationDigest,
          merkleRoot: merkle.root,
        },
      ),
      merkle,
      fibonacci: {
        ...showcase.fibonacci,
        operationCount: 1,
        checkpoints: [{
          distance: 1,
          operationCount: 0,
          artifactDigest: actor.artifactSha256,
        }],
      },
      segments: [segment.commitment],
      counts: {
        operationCount: 1,
        membershipCount: 1,
        visibleCount: 1,
        hiddenCount: 0,
        unlistedCount: 0,
        pinnedCount: 0,
      },
      proofHistoryEvidenceRoots: [
        child.admissionProof.admissionProofDigest,
      ],
    };
    showcase = {
      ...nextWithoutFirstPaint,
      firstPaintWindow: await deriveProfileShowcaseFirstPaintWindow({
        foldState,
        payload: nextWithoutFirstPaint,
      }),
    };
    admittedChildren = [child];
    operations = [operation];
  }
  const artifactId = showcase.artifactId;
  const plan = await planReceizProfileShowcaseGenesis({
    artifactId,
    ownerReceizIdentity: input.ownerReceizIdentity,
    showcase: showcase as unknown as Readonly<
      Record<string, ReceizConstitutionJson>
    >,
    verifiedActorEvidence: actor,
    commitDomain: input.commitDomain,
    genesisKaiUpulse: input.migrationKaiUpulse,
    unacceptedExpectation: {
      scheme: "receiz-unaccepted-head.v1",
      value: null,
    },
    idempotencyKey: [
      "profile-showcase",
      "migration-genesis",
      input.ownerReceizIdentity,
      input.migrationKaiUpulse,
    ].join(":"),
  });
  const context = receizProfileShowcaseGenesisCapabilityContext(plan);
  const capabilityPayload: ReceizCapabilityPayload = {
    schema: "receiz.capability.v112",
    capabilityId: `cap:${plan.planDigest.value}`,
    issuerKeyId: input.keyFile.keyId,
    actorId: actor.actor.actorId,
    tenantId: null,
    audience: "receiz:sdk",
    authorityProfile: "artifact-local",
    operations: ["profile-showcase.genesis"],
    resourceScopes: [artifactId],
    maximumEffects: context.maximumEffects,
    registryDigest: actor.admissionProof.registryDigest,
    validFromKai: input.migrationKaiUpulse,
    expiresAtKai: (BigInt(input.migrationKaiUpulse) + 1n).toString(),
    nonce: `nonce:${plan.planDigest.value}`,
    parentDigest: null,
    delegationDepth: 0,
    maximumDelegationDepth: 0,
    offline: true,
    operationConstraints: context.operationConstraints,
  };
  const signed = await signReceizCapability({
    keyFile: input.keyFile,
    passphrase: input.passphrase,
    payload: capabilityPayload,
  });
  const resolveAdmittedIssuer = await createReceizCapabilityIssuerResolver({
    identityAdmissions: [actor],
    revokedIssuerKeyIds: new Set(),
  });
  const capability = await createReceizCapabilityVerifier({
    resolveAdmittedIssuer,
    currentKai: input.migrationKaiUpulse,
    audience: "receiz:sdk",
    revokedCapabilityDigests: new Set(),
  })(signed, context);
  if (!capability.ok) {
    fail(`PROFILE_SHOWCASE_MIGRATION_CAPABILITY_${capability.code}`);
  }
  return createVerifiedProfileShowcaseGenesis({
    admittedChildren,
    operations,
    authority: {
      verifiedActorEvidence: actor,
      plan,
      capability: capability.capability,
      sealer: input.sealer,
    },
  });
}

function fail(code: string): never {
  throw new TypeError(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype
      || Object.getPrototypeOf(value) === null);
}

function exactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length
    && actual.every((key) => keys.includes(key))
    && keys.every((key) => key in value);
}

function validIdentity(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value === value.normalize("NFC")
    && !/[\u0000-\u001f\u007f]/u.test(value);
}

function validDigest(value: unknown): value is string {
  return typeof value === "string" && DIGEST_RE.test(value);
}

function canonicalExceptionKey(
  value: ProfileShowcaseMigrationException,
): string {
  const identity = "legacyIdentity" in value ? value.legacyIdentity : "";
  const evidence = "evidenceDigest" in value ? value.evidenceDigest : "";
  return `${value.code}\u0000${identity}\u0000${evidence}`;
}

function assertMigrationException(
  value: unknown,
): asserts value is ProfileShowcaseMigrationException {
  if (!isRecord(value) || typeof value.code !== "string") {
    fail("PROFILE_SHOWCASE_MIGRATION_EXCEPTION_INVALID");
  }
  const identityOnly = ["code", "legacyIdentity"] as const;
  const evidenceOnly = ["code", "evidenceDigest"] as const;
  const identityAndEvidence =
    ["code", "legacyIdentity", "evidenceDigest"] as const;
  if (
    (value.code === "missing-artifact"
      || value.code === "unresolved-immutable-version")
    && exactKeys(value, identityOnly)
    && validIdentity(value.legacyIdentity)
  ) return;
  if (
    value.code === "malformed-entry"
    && exactKeys(value, evidenceOnly)
    && validDigest(value.evidenceDigest)
  ) return;
  if (
    (value.code === "failed-verification"
      || value.code === "duplicate-identity"
      || value.code === "ambiguous-ordering")
    && exactKeys(value, identityAndEvidence)
    && validIdentity(value.legacyIdentity)
    && validDigest(value.evidenceDigest)
  ) return;
  fail("PROFILE_SHOWCASE_MIGRATION_EXCEPTION_INVALID");
}

export function canonicalizeProfileShowcaseMigrationExceptions(
  exceptions: readonly ProfileShowcaseMigrationException[],
): readonly ProfileShowcaseMigrationException[] {
  if (!Array.isArray(exceptions)) {
    fail("PROFILE_SHOWCASE_MIGRATION_EXCEPTION_INVALID");
  }
  const canonical = exceptions.map((entry) => {
    assertMigrationException(entry);
    return Object.freeze(structuredClone(entry));
  }).sort((left, right) =>
    canonicalExceptionKey(left).localeCompare(canonicalExceptionKey(right)));
  const keys = canonical.map(canonicalExceptionKey);
  if (new Set(keys).size !== keys.length) {
    fail("PROFILE_SHOWCASE_MIGRATION_EXCEPTION_DUPLICATE");
  }
  return Object.freeze(canonical);
}

function assertObservedChild(
  value: ProfileShowcaseMigrationObservedChild,
): void {
  if (
    !isRecord(value)
    || !exactKeys(value, [
      "stableChildArtifactId",
      "immutableVersion",
      "childArtifactDigest",
      "admissionEvidenceRoot",
      "contentDigest",
      "kaiUpulse",
    ])
    || !validIdentity(value.stableChildArtifactId)
    || !validIdentity(value.immutableVersion)
    || !validDigest(value.childArtifactDigest)
    || !validDigest(value.admissionEvidenceRoot)
    || !validDigest(value.contentDigest)
    || typeof value.kaiUpulse !== "string"
    || !KAI_RE.test(value.kaiUpulse)
  ) fail("PROFILE_SHOWCASE_MIGRATION_CHILD_INVALID");
}

function compareObservedChildren(
  left: ProfileShowcaseMigrationObservedChild,
  right: ProfileShowcaseMigrationObservedChild,
): number {
  const leftKai = BigInt(left.kaiUpulse);
  const rightKai = BigInt(right.kaiUpulse);
  if (leftKai !== rightKai) return leftKai < rightKai ? -1 : 1;
  return left.childArtifactDigest.localeCompare(right.childArtifactDigest);
}

function canonicalizeObservedChildren(
  children: readonly ProfileShowcaseMigrationObservedChild[],
): readonly ProfileShowcaseMigrationObservedChild[] {
  if (!Array.isArray(children)) {
    fail("PROFILE_SHOWCASE_MIGRATION_CHILD_INVALID");
  }
  const canonical = children.map((child) => {
    assertObservedChild(child);
    return Object.freeze(structuredClone(child));
  }).sort(compareObservedChildren);
  const bindingKeys = canonical.map((child) =>
    `${child.stableChildArtifactId}\u0000${child.immutableVersion}`);
  if (new Set(bindingKeys).size !== bindingKeys.length) {
    fail("PROFILE_SHOWCASE_MIGRATION_CHILD_DUPLICATE");
  }
  return Object.freeze(canonical);
}

export function partitionProfileShowcaseMigrationChildren(
  children: readonly ProfileShowcaseMigrationObservedChild[],
): readonly (readonly ProfileShowcaseMigrationObservedChild[])[] {
  const canonical = canonicalizeObservedChildren(children);
  const batches: (readonly ProfileShowcaseMigrationObservedChild[])[] = [];
  for (let index = 0; index < canonical.length; index += 256) {
    batches.push(Object.freeze(canonical.slice(index, index + 256)));
  }
  return Object.freeze(batches);
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const copy = bytes.slice();
  const hashed = await globalThis.crypto.subtle.digest("SHA-256", copy.buffer);
  return Array.from(new Uint8Array(hashed))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function buildProfileShowcaseMigrationCommitment(
  input: Readonly<{
    legacyManifestBytes: Uint8Array;
    migratedChildren: readonly ProfileShowcaseMigrationObservedChild[];
    exceptions: readonly ProfileShowcaseMigrationException[];
    migrationKaiUpulse: string;
    segmentRoots: readonly string[];
  }>,
): Promise<PreparedProfileShowcaseMigrationCommitment> {
  if (
    !input
    || typeof input !== "object"
    || !(input.legacyManifestBytes instanceof Uint8Array)
    || input.legacyManifestBytes.byteLength === 0
    || !KAI_RE.test(input.migrationKaiUpulse)
    || !Array.isArray(input.segmentRoots)
    || input.segmentRoots.some((root) => !validDigest(root))
  ) fail("PROFILE_SHOWCASE_MIGRATION_COMMITMENT_INVALID");
  const migratedChildren = canonicalizeObservedChildren(
    input.migratedChildren,
  );
  const exceptions = canonicalizeProfileShowcaseMigrationExceptions(
    input.exceptions,
  );
  const segmentRoots = Object.freeze(
    [...new Set(input.segmentRoots)].sort(),
  );
  const exceptionCommitment = await digestReceizAuthority(
    "state",
    "receiz.profile-showcase.migration-exceptions.v1",
    exceptions,
  );
  const commitment = Object.freeze({
    schema: "receiz.profile-showcase.migration-commitment.v1" as const,
    method: "observed-and-adopted" as const,
    legacyManifestDigest: await sha256(input.legacyManifestBytes),
    migrationKaiUpulse: input.migrationKaiUpulse,
    migratedChildren,
    exceptions,
    exceptionCommitment,
    segmentRoots,
    authority: MIGRATION_COMMITMENT_AUTHORITY,
  });
  const commitmentDigest = await digestReceizAuthority(
    "state",
    "receiz.profile-showcase.migration-commitment.v1",
    commitment,
  );
  return Object.freeze({ commitment, commitmentDigest });
}

export function buildProfileShowcaseMigrationGenesisOperations(
  input: Readonly<{
    migratedChildren: readonly ProfileShowcaseMigrationObservedChild[];
    migrationKaiUpulse: string;
    authorityEvidenceRoot: string;
  }>,
): readonly Extract<
  ProfileShowcaseOperationV1,
  { kind: "showcase.append" }
>[] {
  if (
    !KAI_RE.test(input.migrationKaiUpulse)
    || !validDigest(input.authorityEvidenceRoot)
  ) {
    fail("PROFILE_SHOWCASE_MIGRATION_AUTHORITY_INVALID");
  }
  return buildProfileShowcaseMigrationOperations({
    migratedChildren: input.migratedChildren,
    parentArtifactDigest: null,
    priorOperationCount: 0,
    migrationKaiUpulse: input.migrationKaiUpulse,
    authorityEvidenceRoot: input.authorityEvidenceRoot,
  });
}

function buildProfileShowcaseMigrationOperations(
  input: Readonly<{
    migratedChildren: readonly ProfileShowcaseMigrationObservedChild[];
    parentArtifactDigest: string | null;
    priorOperationCount: number;
    migrationKaiUpulse: string;
    authorityEvidenceRoot: string;
  }>,
): readonly Extract<
  ProfileShowcaseOperationV1,
  { kind: "showcase.append" }
>[] {
  if (
    (input.parentArtifactDigest !== null
      && !validDigest(input.parentArtifactDigest))
    || !Number.isSafeInteger(input.priorOperationCount)
    || input.priorOperationCount < 0
    || !KAI_RE.test(input.migrationKaiUpulse)
    || !validDigest(input.authorityEvidenceRoot)
  ) fail("PROFILE_SHOWCASE_MIGRATION_AUTHORITY_INVALID");
  const children = canonicalizeObservedChildren(input.migratedChildren);
  if (children.length === 0 || children.length > 256) {
    fail("PROFILE_SHOWCASE_MIGRATION_BATCH_INVALID");
  }
  return Object.freeze(children.map((child, directDeltaPosition) => {
    const basis = {
      schema: "receiz.profile-showcase.operation.v1" as const,
      kind: "showcase.append" as const,
      parentArtifactDigest: input.parentArtifactDigest,
      priorCommittedCount: input.priorOperationCount,
      directDeltaPosition,
      kai: { upulse: input.migrationKaiUpulse },
      authorityEvidenceRoot: input.authorityEvidenceRoot,
      child: {
        stableChildArtifactId: child.stableChildArtifactId,
        immutableVersion: child.immutableVersion,
        childArtifactDigest: child.childArtifactDigest,
        admissionEvidenceRoot: child.admissionEvidenceRoot,
        contentDigest: child.contentDigest,
      },
    };
    return Object.freeze({
      ...basis,
      operationDigest:
        deriveReceizProfileShowcaseNativeOperationDigestV114(basis),
    });
  }));
}

export function buildProfileShowcaseMigrationAppendOperations(
  input: Readonly<{
    migratedChildren: readonly ProfileShowcaseMigrationObservedChild[];
    parentArtifactDigest: string;
    priorOperationCount: number;
    migrationKaiUpulse: string;
    authorityEvidenceRoot: string;
  }>,
): readonly Extract<
  ProfileShowcaseOperationV1,
  { kind: "showcase.append" }
>[] {
  if (input.migratedChildren.length !== 1) {
    fail("PROFILE_SHOWCASE_MIGRATION_SUCCESSOR_DELTA_INVALID");
  }
  return buildProfileShowcaseMigrationOperations(input);
}

export function buildProfileShowcaseObservedAndAdoptedOperations(
  input: Readonly<{
    migratedChildren: readonly ProfileShowcaseMigrationObservedChild[];
    parentArtifactDigest: string;
    priorOperationCount: number;
    migrationKaiUpulse: string;
    authorityEvidenceRoot: string;
    migrationCommitmentDigest: string;
  }>,
): readonly Extract<
  ProfileShowcaseOperationV1,
  { kind: "showcase.provenance.bind" }
>[] {
  if (
    !validDigest(input.parentArtifactDigest)
    || !Number.isSafeInteger(input.priorOperationCount)
    || input.priorOperationCount < 0
    || !KAI_RE.test(input.migrationKaiUpulse)
    || !validDigest(input.authorityEvidenceRoot)
    || !validDigest(input.migrationCommitmentDigest)
  ) fail("PROFILE_SHOWCASE_MIGRATION_PROVENANCE_INVALID");
  const children = canonicalizeObservedChildren(input.migratedChildren);
  return Object.freeze(children.map((child, directDeltaPosition) => {
    const basis = {
      schema: "receiz.profile-showcase.operation.v1" as const,
      kind: "showcase.provenance.bind" as const,
      parentArtifactDigest: input.parentArtifactDigest,
      priorCommittedCount: input.priorOperationCount,
      directDeltaPosition,
      kai: { upulse: input.migrationKaiUpulse },
      authorityEvidenceRoot: input.authorityEvidenceRoot,
      child: {
        stableChildArtifactId: child.stableChildArtifactId,
        immutableVersion: child.immutableVersion,
        childArtifactDigest: child.childArtifactDigest,
      },
      provenanceEvidenceRoot: input.migrationCommitmentDigest,
    };
    return Object.freeze({
      ...basis,
      operationDigest:
        deriveReceizProfileShowcaseNativeOperationDigestV114(basis),
    });
  }));
}

export type ProfileShowcaseMigrationAcceptanceDecision = Readonly<{
  status:
    | "unmigrated"
    | "candidate-local"
    | "profile-accepted-economy-pending";
  candidateArtifactDigest: string;
  acceptedArtifactDigest: string | null;
  switchCanonicalPointer: boolean;
  enqueueEconomy: boolean;
}>;

export type ProfileShowcaseMigrationProjection = Readonly<{
  status:
    | "unmigrated"
    | "candidate-local"
    | "profile-accepted-economy-pending"
    | "complete";
  candidateArtifactDigest: string | null;
  acceptedArtifactDigest: string | null;
  economyAcceptedArtifactDigest: string | null;
}>;

function unmigratedProjection(): ProfileShowcaseMigrationProjection {
  return Object.freeze({
    status: "unmigrated",
    candidateArtifactDigest: null,
    acceptedArtifactDigest: null,
    economyAcceptedArtifactDigest: null,
  });
}

export function coerceProfileShowcaseMigrationProjection(
  value: unknown,
): ProfileShowcaseMigrationProjection {
  if (!isRecord(value) || !exactKeys(value, [
    "status",
    "candidateArtifactDigest",
    "acceptedArtifactDigest",
    "economyAcceptedArtifactDigest",
  ])) return unmigratedProjection();
  const candidate = value.candidateArtifactDigest;
  const accepted = value.acceptedArtifactDigest;
  const economy = value.economyAcceptedArtifactDigest;
  if (
    (candidate !== null && !validDigest(candidate))
    || (accepted !== null && !validDigest(accepted))
    || (economy !== null && !validDigest(economy))
  ) return unmigratedProjection();
  const valid =
    (value.status === "unmigrated"
      && accepted === null
      && economy === null)
    || (value.status === "candidate-local"
      && candidate !== null
      && accepted === null
      && economy === null)
    || (value.status === "profile-accepted-economy-pending"
      && candidate !== null
      && accepted === candidate
      && economy === null)
    || (value.status === "complete"
      && candidate !== null
      && accepted === candidate
      && economy !== null);
  if (!valid) return unmigratedProjection();
  return Object.freeze({
    status: value.status,
    candidateArtifactDigest: candidate,
    acceptedArtifactDigest: accepted,
    economyAcceptedArtifactDigest: economy,
  }) as ProfileShowcaseMigrationProjection;
}

export function decideProfileShowcaseMigrationAcceptance(
  input: Readonly<{
    candidateDigest: string;
    acceptance: Readonly<{
      status: "accepted" | "pending" | "rejected" | "diverged";
      acceptedArtifactDigest: string | null;
    }>;
  }>,
): ProfileShowcaseMigrationAcceptanceDecision {
  if (
    !validDigest(input.candidateDigest)
    || (input.acceptance.acceptedArtifactDigest !== null
      && !validDigest(input.acceptance.acceptedArtifactDigest))
  ) fail("PROFILE_SHOWCASE_MIGRATION_ACCEPTANCE_INVALID");
  if (
    input.acceptance.status === "accepted"
    && input.acceptance.acceptedArtifactDigest === input.candidateDigest
  ) {
    return Object.freeze({
      status: "profile-accepted-economy-pending",
      candidateArtifactDigest: input.candidateDigest,
      acceptedArtifactDigest: input.candidateDigest,
      switchCanonicalPointer: true,
      enqueueEconomy: true,
    });
  }
  const remainsPending = input.acceptance.status === "pending";
  return Object.freeze({
    status: remainsPending ? "candidate-local" : "unmigrated",
    candidateArtifactDigest: input.candidateDigest,
    acceptedArtifactDigest: null,
    switchCanonicalPointer: false,
    enqueueEconomy: false,
  });
}

export type ProfileShowcaseEconomyMigrationSettlement = Readonly<{
  status: "profile-accepted-economy-pending" | "complete";
  profileAcceptedArtifactDigest: string;
  economyAcceptedArtifactDigest: string | null;
}>;

export function settleProfileShowcaseEconomyMigration(
  input: Readonly<{
    profileAcceptedArtifactDigest: string;
    economy: Readonly<{
      status: "accepted" | "pending" | "rejected" | "diverged";
      acceptedArtifactDigest: string | null;
    }>;
  }>,
): ProfileShowcaseEconomyMigrationSettlement {
  if (
    !validDigest(input.profileAcceptedArtifactDigest)
    || (input.economy.acceptedArtifactDigest !== null
      && !validDigest(input.economy.acceptedArtifactDigest))
  ) fail("PROFILE_SHOWCASE_ECONOMY_MIGRATION_INVALID");
  if (
    input.economy.status === "accepted"
    && input.economy.acceptedArtifactDigest !== null
  ) {
    return Object.freeze({
      status: "complete",
      profileAcceptedArtifactDigest: input.profileAcceptedArtifactDigest,
      economyAcceptedArtifactDigest:
        input.economy.acceptedArtifactDigest,
    });
  }
  return Object.freeze({
    status: "profile-accepted-economy-pending",
    profileAcceptedArtifactDigest: input.profileAcceptedArtifactDigest,
    economyAcceptedArtifactDigest: null,
  });
}
