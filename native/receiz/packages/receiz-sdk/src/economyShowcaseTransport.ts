import {
  appendReceizCompositeMerkleLeaf,
  assertReceizCompositeHeadBasis,
  createEmptyReceizCompositeMerkleState,
  createReceizCompositeFibonacciState,
  digestReceizCompositeCanonical,
  updateReceizCompositeFibonacciState,
} from "./compositeProofKernel.js";
import {
  canonicalizeReceizConstitution,
  type ReceizConstitutionJson,
} from "./constitution.js";

export const RECEIZ_ECONOMY_SHOWCASE_ARTIFACT_ID =
  "economy-showcase:receiz.com" as const;

export const RECEIZ_ECONOMY_SHOWCASE_V114_TRANSPORT_LIMITS = Object.freeze({
  directOperations: 1_024,
  parentDigests: 64,
  segmentCommitments: 2,
} as const);

export type ReceizEconomyShowcaseHeadV114 = Readonly<{
  schema: "receiz.economy-showcase-head.v114";
  artifactId: typeof RECEIZ_ECONOMY_SHOWCASE_ARTIFACT_ID;
  headKaiUpulse: string;
  parentArtifactDigests: readonly string[];
  priorOperationCount: number;
  resultingOperationCount: number;
  directOperations: readonly ReceizEconomyShowcaseOperationV114[];
  currentStateRoot: string;
  merkle: Readonly<{
    algorithm: "sha256/binary-carry/v1";
    leafCount: number;
    root: string;
    frontier: readonly (string | null)[];
  }>;
  fibonacci: Readonly<{
    basis: "sparse-checkpoint/v1";
    operationCount: number;
    checkpoints: readonly Readonly<{
      distance: number;
      operationCount: number;
      artifactDigest: string;
    }>[];
  }>;
  segmentWindow: readonly Readonly<Record<string, unknown>>[];
  counts: Readonly<{
    operationCount: number;
    profileShowcaseCount: number;
  }>;
  versions: Readonly<{
    registryDigest: string;
    kernelVersion: "receiz.composite.kernel.v1";
    verifierVersion: "receiz.economy-showcase.verifier.v114";
  }>;
  authority: Readonly<{
    economyShowcaseIsProofAuthority: false;
    projectionIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
    admissionStatus: "requires-native-seal-and-economy-admission";
  }>;
}>;

export type ReceizEconomyProfileShowcaseReferenceV114 = Readonly<{
  artifactId: `profile-showcase:${string}`;
  artifactDigest: string;
  immutableVersion: string;
  historyHeadDigest: string;
  admissionEvidenceRoot: string;
  headKaiUpulse: string;
}>;

export type ReceizEconomyShowcaseOperationV114 = Readonly<{
  schema: "receiz.economy-showcase.operation.v1";
  kind: "economy.profile-showcase.append";
  parentArtifactDigest: string;
  priorCommittedCount: number;
  directDeltaPosition: number;
  kai: Readonly<{ upulse: string }>;
  profileShowcase: ReceizEconomyProfileShowcaseReferenceV114;
  operationDigest: string;
}>;

const DIGEST_RE = /^[0-9a-f]{64}$/;

function fail(code: string): never {
  throw new TypeError(code);
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  code: string,
): void {
  const actual = Object.keys(value);
  if (
    actual.length !== expected.length
    || actual.some((key) => !expected.includes(key))
    || expected.some((key) => !(key in value))
  ) fail(code);
}

function assertProfileReference(
  value: unknown,
): asserts value is ReceizEconomyProfileShowcaseReferenceV114 {
  if (!record(value)) fail("ECONOMY_SHOWCASE_PROFILE_REFERENCE_INVALID");
  exactKeys(value, [
    "artifactId",
    "artifactDigest",
    "immutableVersion",
    "historyHeadDigest",
    "admissionEvidenceRoot",
    "headKaiUpulse",
  ], "ECONOMY_SHOWCASE_PROFILE_REFERENCE_UNKNOWN_FIELD");
  if (
    typeof value.artifactId !== "string"
    || !/^profile-showcase:[^\u0000-\u001f\u007f]+$/u.test(value.artifactId)
    || typeof value.artifactDigest !== "string"
    || !DIGEST_RE.test(value.artifactDigest)
    || value.immutableVersion !== value.artifactDigest
    || typeof value.historyHeadDigest !== "string"
    || !DIGEST_RE.test(value.historyHeadDigest)
    || typeof value.admissionEvidenceRoot !== "string"
    || !DIGEST_RE.test(value.admissionEvidenceRoot)
    || typeof value.headKaiUpulse !== "string"
    || !/^(0|[1-9][0-9]*)$/.test(value.headKaiUpulse)
  ) fail("ECONOMY_SHOWCASE_PROFILE_REFERENCE_INVALID");
}

function assertOperation(
  value: unknown,
): asserts value is ReceizEconomyShowcaseOperationV114 {
  if (!record(value)) fail("ECONOMY_SHOWCASE_OPERATION_INVALID");
  exactKeys(value, [
    "schema",
    "kind",
    "parentArtifactDigest",
    "priorCommittedCount",
    "directDeltaPosition",
    "kai",
    "profileShowcase",
    "operationDigest",
  ], "ECONOMY_SHOWCASE_OPERATION_UNKNOWN_FIELD");
  if (
    value.schema !== "receiz.economy-showcase.operation.v1"
    || value.kind !== "economy.profile-showcase.append"
    || typeof value.parentArtifactDigest !== "string"
    || !DIGEST_RE.test(value.parentArtifactDigest)
    || !Number.isSafeInteger(value.priorCommittedCount)
    || (value.priorCommittedCount as number) < 0
    || !Number.isSafeInteger(value.directDeltaPosition)
    || (value.directDeltaPosition as number) < 0
    || !record(value.kai)
  ) fail("ECONOMY_SHOWCASE_OPERATION_INVALID");
  exactKeys(value.kai, ["upulse"], "ECONOMY_SHOWCASE_KAI_UNKNOWN_FIELD");
  assertProfileReference(value.profileShowcase);
  if (
    typeof value.kai.upulse !== "string"
    || !/^(0|[1-9][0-9]*)$/.test(value.kai.upulse)
    || value.kai.upulse !== value.profileShowcase.headKaiUpulse
    || typeof value.operationDigest !== "string"
    || !DIGEST_RE.test(value.operationDigest)
  ) fail("ECONOMY_SHOWCASE_OPERATION_INVALID");
  const basis = { ...value } as Record<string, unknown>;
  delete basis.operationDigest;
  if (value.operationDigest !== digestReceizCompositeCanonical({
    digestDomain: "receiz.economy-showcase.operation-digest.v114",
    ...basis,
  })) fail("ECONOMY_SHOWCASE_OPERATION_DIGEST_INVALID");
}

export function assertReceizEconomyShowcaseHeadV114TransportContract(
  input: unknown,
): asserts input is ReceizEconomyShowcaseHeadV114 {
  if (!record(input)) fail("ECONOMY_SHOWCASE_HEAD_INVALID");
  exactKeys(input, [
    "schema",
    "artifactId",
    "headKaiUpulse",
    "parentArtifactDigests",
    "priorOperationCount",
    "resultingOperationCount",
    "directOperations",
    "currentStateRoot",
    "merkle",
    "fibonacci",
    "segmentWindow",
    "counts",
    "versions",
    "authority",
  ], "ECONOMY_SHOWCASE_HEAD_UNKNOWN_FIELD");
  if (
    input.schema !== "receiz.economy-showcase-head.v114"
    || input.artifactId !== RECEIZ_ECONOMY_SHOWCASE_ARTIFACT_ID
    || !Array.isArray(input.parentArtifactDigests)
    || input.parentArtifactDigests.length
      > RECEIZ_ECONOMY_SHOWCASE_V114_TRANSPORT_LIMITS.parentDigests
    || input.parentArtifactDigests.some((digest) =>
      typeof digest !== "string" || !DIGEST_RE.test(digest))
    || new Set(input.parentArtifactDigests).size
      !== input.parentArtifactDigests.length
    || !Array.isArray(input.directOperations)
    || input.directOperations.length
      > RECEIZ_ECONOMY_SHOWCASE_V114_TRANSPORT_LIMITS.directOperations
    || !Array.isArray(input.segmentWindow)
    || input.segmentWindow.length
      > RECEIZ_ECONOMY_SHOWCASE_V114_TRANSPORT_LIMITS.segmentCommitments
    || !record(input.counts)
    || !record(input.versions)
    || !record(input.authority)
  ) fail("ECONOMY_SHOWCASE_HEAD_INVALID");
  input.directOperations.forEach((operation, index) => {
    assertOperation(operation);
    if (
      !(input.parentArtifactDigests as readonly string[]).includes(
        operation.parentArtifactDigest,
      )
      || operation.priorCommittedCount !== input.priorOperationCount
      || operation.directDeltaPosition !== index
    ) fail("ECONOMY_SHOWCASE_OPERATION_INVALID");
  });
  exactKeys(input.counts, [
    "operationCount",
    "profileShowcaseCount",
  ], "ECONOMY_SHOWCASE_COUNTS_UNKNOWN_FIELD");
  exactKeys(input.versions, [
    "registryDigest",
    "kernelVersion",
    "verifierVersion",
  ], "ECONOMY_SHOWCASE_VERSIONS_UNKNOWN_FIELD");
  exactKeys(input.authority, [
    "economyShowcaseIsProofAuthority",
    "projectionIsProofAuthority",
    "strongerTruth",
    "admissionStatus",
  ], "ECONOMY_SHOWCASE_AUTHORITY_UNKNOWN_FIELD");
  if (
    !Number.isSafeInteger(input.counts.operationCount)
    || !Number.isSafeInteger(input.counts.profileShowcaseCount)
    || (input.counts.operationCount as number) < 0
    || (input.counts.profileShowcaseCount as number) < 0
    || input.counts.operationCount !== input.resultingOperationCount
    || typeof input.versions.registryDigest !== "string"
    || !DIGEST_RE.test(input.versions.registryDigest)
    || input.versions.kernelVersion !== "receiz.composite.kernel.v1"
    || input.versions.verifierVersion
      !== "receiz.economy-showcase.verifier.v114"
    || input.authority.economyShowcaseIsProofAuthority !== false
    || input.authority.projectionIsProofAuthority !== false
    || input.authority.strongerTruth !== "sealed-receiz-proof-object"
    || input.authority.admissionStatus
      !== "requires-native-seal-and-economy-admission"
  ) fail("ECONOMY_SHOWCASE_HEAD_INVALID");
  try {
    assertReceizCompositeHeadBasis({
      stableArtifactId: input.artifactId,
      headKaiUpulse: input.headKaiUpulse as string,
      priorOperationCount: input.priorOperationCount as number,
      resultingOperationCount: input.resultingOperationCount as number,
      directDeltaLength: input.directOperations.length,
      parentCount: input.parentArtifactDigests.length,
      segmentCount: input.segmentWindow.length,
      currentStateRoot: input.currentStateRoot as string,
      merkle: input.merkle as ReceizEconomyShowcaseHeadV114["merkle"],
      fibonacci:
        input.fibonacci as ReceizEconomyShowcaseHeadV114["fibonacci"],
    });
  } catch {
    fail("ECONOMY_SHOWCASE_HEAD_INVALID");
  }
}

export async function deriveReceizEconomyShowcaseGenesisHeadV114(
  input: Readonly<{
    genesisKaiUpulse: string;
    registryDigest: string;
  }>,
): Promise<ReceizEconomyShowcaseHeadV114> {
  const merkle = createEmptyReceizCompositeMerkleState();
  const head = Object.freeze({
    schema: "receiz.economy-showcase-head.v114" as const,
    artifactId: RECEIZ_ECONOMY_SHOWCASE_ARTIFACT_ID,
    headKaiUpulse: input.genesisKaiUpulse,
    parentArtifactDigests: Object.freeze([]),
    priorOperationCount: 0,
    resultingOperationCount: 0,
    directOperations: Object.freeze([]),
    currentStateRoot: merkle.root,
    merkle: Object.freeze(merkle),
    fibonacci: Object.freeze(createReceizCompositeFibonacciState({
      operationCount: 0,
      resolveArtifactDigest: () => fail(
        "ECONOMY_SHOWCASE_FIBONACCI_REFERENCE_INVALID",
      ),
    })),
    segmentWindow: Object.freeze([]),
    counts: Object.freeze({
      operationCount: 0,
      profileShowcaseCount: 0,
    }),
    versions: Object.freeze({
      registryDigest: input.registryDigest,
      kernelVersion: "receiz.composite.kernel.v1" as const,
      verifierVersion: "receiz.economy-showcase.verifier.v114" as const,
    }),
    authority: Object.freeze({
      economyShowcaseIsProofAuthority: false as const,
      projectionIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
      admissionStatus:
        "requires-native-seal-and-economy-admission" as const,
    }),
  });
  assertReceizEconomyShowcaseHeadV114TransportContract(head);
  return head;
}

function orderedProfiles(
  profiles: readonly ReceizEconomyProfileShowcaseReferenceV114[],
): readonly ReceizEconomyProfileShowcaseReferenceV114[] {
  const ordered = profiles.map((profile) => {
    assertProfileReference(profile);
    return structuredClone(profile);
  }).sort((left, right) => {
    const leftKai = BigInt(left.headKaiUpulse);
    const rightKai = BigInt(right.headKaiUpulse);
    if (leftKai !== rightKai) return leftKai < rightKai ? -1 : 1;
    return left.artifactDigest.localeCompare(right.artifactDigest);
  });
  if (new Set(ordered.map((profile) => profile.artifactDigest)).size
    !== ordered.length) fail("ECONOMY_SHOWCASE_PROFILE_REFERENCE_INVALID");
  return ordered;
}

export async function deriveReceizEconomyShowcaseSuccessorHeadV114(
  input: Readonly<{
    predecessorHead: ReceizEconomyShowcaseHeadV114;
    predecessorArtifactDigest: string;
    profileShowcases: readonly ReceizEconomyProfileShowcaseReferenceV114[];
    resolveCheckpoint: (operationCount: number) => string | null;
  }>,
): Promise<ReceizEconomyShowcaseHeadV114> {
  assertReceizEconomyShowcaseHeadV114TransportContract(input.predecessorHead);
  if (
    !DIGEST_RE.test(input.predecessorArtifactDigest)
    || !Array.isArray(input.profileShowcases)
    || input.profileShowcases.length === 0
    || input.profileShowcases.length
      > RECEIZ_ECONOMY_SHOWCASE_V114_TRANSPORT_LIMITS.directOperations
    || typeof input.resolveCheckpoint !== "function"
  ) fail("ECONOMY_SHOWCASE_SUCCESSOR_INPUT_INVALID");
  const ordered = orderedProfiles(input.profileShowcases);
  const predecessorKai = BigInt(input.predecessorHead.headKaiUpulse);
  if (ordered.some((profile) =>
    BigInt(profile.headKaiUpulse) < predecessorKai)) {
    fail("ECONOMY_SHOWCASE_KAI_INVALID");
  }
  const directOperations = ordered.map((profileShowcase, index) => {
    const basis = {
      schema: "receiz.economy-showcase.operation.v1" as const,
      kind: "economy.profile-showcase.append" as const,
      parentArtifactDigest: input.predecessorArtifactDigest,
      priorCommittedCount: input.predecessorHead.resultingOperationCount,
      directDeltaPosition: index,
      kai: { upulse: profileShowcase.headKaiUpulse },
      profileShowcase,
    };
    return Object.freeze({
      ...basis,
      operationDigest: digestReceizCompositeCanonical({
        digestDomain: "receiz.economy-showcase.operation-digest.v114",
        ...basis,
      }),
    });
  });
  let merkle = input.predecessorHead.merkle;
  let fibonacci = input.predecessorHead.fibonacci;
  for (const operation of directOperations) {
    merkle = appendReceizCompositeMerkleLeaf(
      merkle,
      digestReceizCompositeCanonical({
        kind: "receiz.recursive-composite.child-leaf.v1",
        stableArtifactId: RECEIZ_ECONOMY_SHOWCASE_ARTIFACT_ID,
        childArtifactDigest: operation.profileShowcase.artifactDigest,
        operationDigest: operation.operationDigest,
        kaiUpulse: operation.kai.upulse,
      }),
    );
    fibonacci = updateReceizCompositeFibonacciState({
      prior: fibonacci,
      nextOperationCount: fibonacci.operationCount + 1,
      resolveArtifactDigest: input.resolveCheckpoint,
    });
  }
  const resultingOperationCount =
    input.predecessorHead.resultingOperationCount + directOperations.length;
  const headKaiUpulse = ordered.reduce(
    (maximum, profile) =>
      BigInt(profile.headKaiUpulse) > BigInt(maximum)
        ? profile.headKaiUpulse
        : maximum,
    input.predecessorHead.headKaiUpulse,
  );
  const head = Object.freeze({
    schema: "receiz.economy-showcase-head.v114" as const,
    artifactId: RECEIZ_ECONOMY_SHOWCASE_ARTIFACT_ID,
    headKaiUpulse,
    parentArtifactDigests: Object.freeze([input.predecessorArtifactDigest]),
    priorOperationCount: input.predecessorHead.resultingOperationCount,
    resultingOperationCount,
    directOperations: Object.freeze(directOperations),
    currentStateRoot: merkle.root,
    merkle: Object.freeze(merkle),
    fibonacci: Object.freeze(fibonacci),
    segmentWindow: Object.freeze([]),
    counts: Object.freeze({
      operationCount: resultingOperationCount,
      profileShowcaseCount:
        input.predecessorHead.counts.profileShowcaseCount + ordered.length,
    }),
    versions: Object.freeze({ ...input.predecessorHead.versions }),
    authority: Object.freeze({ ...input.predecessorHead.authority }),
  });
  assertReceizEconomyShowcaseHeadV114TransportContract(head);
  return head;
}

export async function verifyReceizEconomyShowcaseSuccessorV114(
  input: Readonly<{
    predecessorHead: ReceizEconomyShowcaseHeadV114;
    predecessorArtifactDigest: string;
    candidateHead: unknown;
  }>,
): Promise<ReceizEconomyShowcaseHeadV114> {
  assertReceizEconomyShowcaseHeadV114TransportContract(input.candidateHead);
  const candidate = input.candidateHead;
  const candidateCheckpoints = new Map(
    candidate.fibonacci.checkpoints.map((checkpoint) => [
      checkpoint.operationCount,
      checkpoint.artifactDigest,
    ]),
  );
  const expected = await deriveReceizEconomyShowcaseSuccessorHeadV114({
    predecessorHead: input.predecessorHead,
    predecessorArtifactDigest: input.predecessorArtifactDigest,
    profileShowcases: candidate.directOperations.map(
      (operation) => operation.profileShowcase,
    ),
    resolveCheckpoint: (operationCount) =>
      candidateCheckpoints.get(operationCount) ?? null,
  });
  if (
    canonicalizeReceizConstitution(
      expected as unknown as ReceizConstitutionJson,
    )
      !== canonicalizeReceizConstitution(
        candidate as unknown as ReceizConstitutionJson,
      )
  ) {
    fail("ECONOMY_SHOWCASE_SUCCESSOR_INVALID");
  }
  return candidate;
}

export type ReceizEconomyShowcaseMergeParentV114 = Readonly<{
  artifactDigest: string;
  head: ReceizEconomyShowcaseHeadV114;
}>;

export async function deriveReceizEconomyShowcaseMergeHeadV114(
  input: Readonly<{
    commonPredecessorHead: ReceizEconomyShowcaseHeadV114;
    commonPredecessorArtifactDigest: string;
    parents: readonly [
      ReceizEconomyShowcaseMergeParentV114,
      ReceizEconomyShowcaseMergeParentV114,
    ];
  }>,
): Promise<ReceizEconomyShowcaseHeadV114> {
  assertReceizEconomyShowcaseHeadV114TransportContract(
    input.commonPredecessorHead,
  );
  if (
    !DIGEST_RE.test(input.commonPredecessorArtifactDigest)
    || !Array.isArray(input.parents)
    || input.parents.length !== 2
    || input.parents.some((parent) =>
      !parent
      || typeof parent !== "object"
      || !DIGEST_RE.test(parent.artifactDigest)
    )
    || new Set(input.parents.map((parent) => parent.artifactDigest)).size !== 2
  ) fail("ECONOMY_SHOWCASE_MERGE_INPUT_INVALID");
  for (const parent of input.parents) {
    await verifyReceizEconomyShowcaseSuccessorV114({
      predecessorHead: input.commonPredecessorHead,
      predecessorArtifactDigest: input.commonPredecessorArtifactDigest,
      candidateHead: parent.head,
    });
    if (parent.head.directOperations.length !== 1) {
      fail("ECONOMY_SHOWCASE_MERGE_PARENT_DELTA_INVALID");
    }
  }
  const orderedParents = [...input.parents].sort((left, right) => {
    const leftOperation = left.head.directOperations[0]!;
    const rightOperation = right.head.directOperations[0]!;
    const leftKai = BigInt(leftOperation.kai.upulse);
    const rightKai = BigInt(rightOperation.kai.upulse);
    if (leftKai !== rightKai) return leftKai < rightKai ? -1 : 1;
    const byProfile = leftOperation.profileShowcase.artifactDigest.localeCompare(
      rightOperation.profileShowcase.artifactDigest,
    );
    return byProfile || left.artifactDigest.localeCompare(right.artifactDigest);
  });
  const parentArtifactDigests = Object.freeze(
    orderedParents.map((parent) => parent.artifactDigest),
  );
  const merged = await deriveReceizEconomyShowcaseSuccessorHeadV114({
    predecessorHead: input.commonPredecessorHead,
    predecessorArtifactDigest: parentArtifactDigests[0]!,
    profileShowcases: orderedParents.map(
      (parent) => parent.head.directOperations[0]!.profileShowcase,
    ),
    resolveCheckpoint: (operationCount) => {
      const baseCount = input.commonPredecessorHead.resultingOperationCount;
      if (operationCount === baseCount) {
        return input.commonPredecessorArtifactDigest;
      }
      if (operationCount === baseCount + 1) {
        return parentArtifactDigests[0]!;
      }
      return null;
    },
  });
  const head = Object.freeze({
    ...merged,
    parentArtifactDigests,
  });
  assertReceizEconomyShowcaseHeadV114TransportContract(head);
  return head;
}

export async function verifyReceizEconomyShowcaseMergeV114(
  input: Readonly<{
    commonPredecessorHead: ReceizEconomyShowcaseHeadV114;
    commonPredecessorArtifactDigest: string;
    parents: readonly [
      ReceizEconomyShowcaseMergeParentV114,
      ReceizEconomyShowcaseMergeParentV114,
    ];
    candidateHead: unknown;
  }>,
): Promise<ReceizEconomyShowcaseHeadV114> {
  assertReceizEconomyShowcaseHeadV114TransportContract(input.candidateHead);
  const expected = await deriveReceizEconomyShowcaseMergeHeadV114({
    commonPredecessorHead: input.commonPredecessorHead,
    commonPredecessorArtifactDigest:
      input.commonPredecessorArtifactDigest,
    parents: input.parents,
  });
  if (
    canonicalizeReceizConstitution(
      expected as unknown as ReceizConstitutionJson,
    ) !== canonicalizeReceizConstitution(
      input.candidateHead as unknown as ReceizConstitutionJson,
    )
  ) fail("ECONOMY_SHOWCASE_MERGE_INVALID");
  return input.candidateHead;
}
