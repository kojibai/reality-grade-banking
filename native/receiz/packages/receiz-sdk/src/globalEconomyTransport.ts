import {
  appendReceizCompositeMerkleLeaf,
  assertReceizCompositeHeadBasis,
  digestReceizCompositeCanonical,
  updateReceizCompositeFibonacciState,
  type ReceizCompositeFibonacciState,
  type ReceizCompositeMerkleState,
} from "./compositeProofKernel.js";
import {
  RECEIZ_ECONOMY_SHOWCASE_ARTIFACT_ID,
  type ReceizEconomyShowcaseHeadV114,
} from "./economyShowcaseTransport.js";

export const RECEIZ_GLOBAL_ECONOMY_V119_TRANSPORT_LIMITS = Object.freeze({
  directOperations: 1_024,
  parentDigests: 64,
  childParentDigests: 64,
  segmentCommitments: 2,
} as const);

export type ReceizGlobalProofChildReferenceV119 = Readonly<{
  schema: "receiz.global-proof-child-reference.v119";
  namespace: `receiz.${string}`;
  artifactId: string;
  artifactDigest: string;
  immutableVersion: string;
  parentArtifactDigests: readonly string[];
  historyHeadDigest: string;
  admissionEvidenceRoot: string;
  headKaiUpulse: string;
  verifierBinding: Readonly<{
    registryDigest: string;
    lawId: string;
    verifierVersion: string;
  }>;
}>;

export type ReceizGlobalEconomyOperationV119 = Readonly<{
  schema: "receiz.global-economy.operation.v119";
  kind: "global.proof-object.append";
  parentArtifactDigest: string;
  priorCommittedCount: number;
  directDeltaPosition: number;
  kai: Readonly<{ upulse: string }>;
  child: ReceizGlobalProofChildReferenceV119;
  operationDigest: string;
}>;

export type ReceizGlobalEconomyHeadV119 = Readonly<{
  schema: "receiz.global-economy-head.v119";
  artifactId: typeof RECEIZ_ECONOMY_SHOWCASE_ARTIFACT_ID;
  headKaiUpulse: string;
  parentArtifactDigests: readonly string[];
  priorOperationCount: number;
  resultingOperationCount: number;
  directOperations: readonly ReceizGlobalEconomyOperationV119[];
  currentStateRoot: string;
  merkle: ReceizEconomyShowcaseHeadV114["merkle"];
  fibonacci: ReceizEconomyShowcaseHeadV114["fibonacci"];
  segmentWindow: readonly Readonly<Record<string, unknown>>[];
  counts: Readonly<{
    operationCount: number;
    proofObjectHeadCount: number;
    inheritedProfileShowcaseCount: number;
  }>;
  versions: Readonly<{
    registryDigest: string;
    kernelVersion: "receiz.composite.kernel.v1";
    verifierVersion: "receiz.global-economy.verifier.v119";
  }>;
  authority: Readonly<{
    globalCompositeIsChildProofAuthority: false;
    projectionIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
    admissionStatus: "requires-verified-child-and-global-admission";
  }>;
}>;

const DIGEST_RE = /^[0-9a-f]{64}$/;
const KAI_RE = /^(0|[1-9][0-9]*)$/;
const NAMESPACE_RE = /^receiz\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

function fail(code: string): never {
  throw new TypeError(code);
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[], code: string): void {
  const actual = Object.keys(value);
  if (
    actual.length !== expected.length
    || actual.some((key) => !expected.includes(key))
    || expected.some((key) => !(key in value))
  ) fail(code);
}

function assertDigestList(value: unknown, limit: number, code: string): asserts value is string[] {
  if (
    !Array.isArray(value)
    || value.length > limit
    || value.some((digest) => typeof digest !== "string" || !DIGEST_RE.test(digest))
    || new Set(value).size !== value.length
  ) fail(code);
}

export function assertReceizGlobalProofChildReferenceV119(
  value: unknown,
): asserts value is ReceizGlobalProofChildReferenceV119 {
  if (!record(value)) fail("GLOBAL_ECONOMY_CHILD_INVALID");
  exactKeys(value, [
    "schema",
    "namespace",
    "artifactId",
    "artifactDigest",
    "immutableVersion",
    "parentArtifactDigests",
    "historyHeadDigest",
    "admissionEvidenceRoot",
    "headKaiUpulse",
    "verifierBinding",
  ], "GLOBAL_ECONOMY_CHILD_UNKNOWN_FIELD");
  assertDigestList(
    value.parentArtifactDigests,
    RECEIZ_GLOBAL_ECONOMY_V119_TRANSPORT_LIMITS.childParentDigests,
    "GLOBAL_ECONOMY_CHILD_PARENT_INVALID",
  );
  if (
    value.schema !== "receiz.global-proof-child-reference.v119"
    || typeof value.namespace !== "string"
    || !NAMESPACE_RE.test(value.namespace)
    || typeof value.artifactId !== "string"
    || !value.artifactId.trim()
    || /[\u0000-\u001f\u007f]/u.test(value.artifactId)
    || typeof value.artifactDigest !== "string"
    || !DIGEST_RE.test(value.artifactDigest)
    || value.immutableVersion !== value.artifactDigest
    || typeof value.historyHeadDigest !== "string"
    || !DIGEST_RE.test(value.historyHeadDigest)
    || typeof value.admissionEvidenceRoot !== "string"
    || !DIGEST_RE.test(value.admissionEvidenceRoot)
    || typeof value.headKaiUpulse !== "string"
    || !KAI_RE.test(value.headKaiUpulse)
    || !record(value.verifierBinding)
  ) fail("GLOBAL_ECONOMY_CHILD_INVALID");
  exactKeys(value.verifierBinding, [
    "registryDigest",
    "lawId",
    "verifierVersion",
  ], "GLOBAL_ECONOMY_CHILD_VERIFIER_UNKNOWN_FIELD");
  if (
    typeof value.verifierBinding.registryDigest !== "string"
    || !DIGEST_RE.test(value.verifierBinding.registryDigest)
    || typeof value.verifierBinding.lawId !== "string"
    || !value.verifierBinding.lawId.trim()
    || typeof value.verifierBinding.verifierVersion !== "string"
    || !value.verifierBinding.verifierVersion.trim()
  ) fail("GLOBAL_ECONOMY_CHILD_VERIFIER_INVALID");
}

function assertOperation(value: unknown): asserts value is ReceizGlobalEconomyOperationV119 {
  if (!record(value)) fail("GLOBAL_ECONOMY_OPERATION_INVALID");
  exactKeys(value, [
    "schema",
    "kind",
    "parentArtifactDigest",
    "priorCommittedCount",
    "directDeltaPosition",
    "kai",
    "child",
    "operationDigest",
  ], "GLOBAL_ECONOMY_OPERATION_UNKNOWN_FIELD");
  if (
    value.schema !== "receiz.global-economy.operation.v119"
    || value.kind !== "global.proof-object.append"
    || typeof value.parentArtifactDigest !== "string"
    || !DIGEST_RE.test(value.parentArtifactDigest)
    || !Number.isSafeInteger(value.priorCommittedCount)
    || (value.priorCommittedCount as number) < 0
    || !Number.isSafeInteger(value.directDeltaPosition)
    || (value.directDeltaPosition as number) < 0
    || !record(value.kai)
  ) fail("GLOBAL_ECONOMY_OPERATION_INVALID");
  exactKeys(value.kai, ["upulse"], "GLOBAL_ECONOMY_OPERATION_KAI_UNKNOWN_FIELD");
  assertReceizGlobalProofChildReferenceV119(value.child);
  if (
    typeof value.kai.upulse !== "string"
    || !KAI_RE.test(value.kai.upulse)
    || BigInt(value.kai.upulse) < BigInt(value.child.headKaiUpulse)
    || typeof value.operationDigest !== "string"
    || !DIGEST_RE.test(value.operationDigest)
  ) fail("GLOBAL_ECONOMY_OPERATION_INVALID");
  const basis = { ...value } as Record<string, unknown>;
  delete basis.operationDigest;
  if (value.operationDigest !== digestReceizCompositeCanonical({
    digestDomain: "receiz.global-economy.operation-digest.v119",
    ...basis,
  })) fail("GLOBAL_ECONOMY_OPERATION_DIGEST_INVALID");
}

export function assertReceizGlobalEconomyHeadV119TransportContract(
  input: unknown,
): asserts input is ReceizGlobalEconomyHeadV119 {
  if (!record(input)) fail("GLOBAL_ECONOMY_HEAD_INVALID");
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
  ], "GLOBAL_ECONOMY_HEAD_UNKNOWN_FIELD");
  assertDigestList(
    input.parentArtifactDigests,
    RECEIZ_GLOBAL_ECONOMY_V119_TRANSPORT_LIMITS.parentDigests,
    "GLOBAL_ECONOMY_PARENT_INVALID",
  );
  if (
    input.schema !== "receiz.global-economy-head.v119"
    || input.artifactId !== RECEIZ_ECONOMY_SHOWCASE_ARTIFACT_ID
    || typeof input.headKaiUpulse !== "string"
    || !KAI_RE.test(input.headKaiUpulse)
    || !Array.isArray(input.directOperations)
    || input.directOperations.length > RECEIZ_GLOBAL_ECONOMY_V119_TRANSPORT_LIMITS.directOperations
    || !Array.isArray(input.segmentWindow)
    || input.segmentWindow.length > RECEIZ_GLOBAL_ECONOMY_V119_TRANSPORT_LIMITS.segmentCommitments
    || !record(input.counts)
    || !record(input.versions)
    || !record(input.authority)
  ) fail("GLOBAL_ECONOMY_HEAD_INVALID");
  input.directOperations.forEach((operation, index) => {
    assertOperation(operation);
    if (
      !(input.parentArtifactDigests as string[]).includes(operation.parentArtifactDigest)
      || operation.priorCommittedCount !== input.priorOperationCount
      || operation.directDeltaPosition !== index
    ) fail("GLOBAL_ECONOMY_OPERATION_INVALID");
  });
  exactKeys(input.counts, [
    "operationCount",
    "proofObjectHeadCount",
    "inheritedProfileShowcaseCount",
  ], "GLOBAL_ECONOMY_COUNTS_UNKNOWN_FIELD");
  exactKeys(input.versions, [
    "registryDigest",
    "kernelVersion",
    "verifierVersion",
  ], "GLOBAL_ECONOMY_VERSIONS_UNKNOWN_FIELD");
  exactKeys(input.authority, [
    "globalCompositeIsChildProofAuthority",
    "projectionIsProofAuthority",
    "strongerTruth",
    "admissionStatus",
  ], "GLOBAL_ECONOMY_AUTHORITY_UNKNOWN_FIELD");
  if (
    !Number.isSafeInteger(input.counts.operationCount)
    || !Number.isSafeInteger(input.counts.proofObjectHeadCount)
    || !Number.isSafeInteger(input.counts.inheritedProfileShowcaseCount)
    || input.counts.operationCount !== input.resultingOperationCount
    || typeof input.versions.registryDigest !== "string"
    || !DIGEST_RE.test(input.versions.registryDigest)
    || input.versions.kernelVersion !== "receiz.composite.kernel.v1"
    || input.versions.verifierVersion !== "receiz.global-economy.verifier.v119"
    || input.authority.globalCompositeIsChildProofAuthority !== false
    || input.authority.projectionIsProofAuthority !== false
    || input.authority.strongerTruth !== "sealed-receiz-proof-object"
    || input.authority.admissionStatus !== "requires-verified-child-and-global-admission"
  ) fail("GLOBAL_ECONOMY_HEAD_INVALID");
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
      merkle: input.merkle as ReceizGlobalEconomyHeadV119["merkle"],
      fibonacci: input.fibonacci as ReceizGlobalEconomyHeadV119["fibonacci"],
    });
  } catch {
    fail("GLOBAL_ECONOMY_HEAD_INVALID");
  }
}

export async function deriveReceizGlobalEconomyUpgradeHeadV119(input: Readonly<{
  predecessorHead: ReceizEconomyShowcaseHeadV114;
  predecessorArtifactDigest: string;
  registryDigest: string;
}>): Promise<ReceizGlobalEconomyHeadV119> {
  if (!DIGEST_RE.test(input.predecessorArtifactDigest) || !DIGEST_RE.test(input.registryDigest)) {
    fail("GLOBAL_ECONOMY_UPGRADE_INPUT_INVALID");
  }
  const head = Object.freeze({
    schema: "receiz.global-economy-head.v119" as const,
    artifactId: RECEIZ_ECONOMY_SHOWCASE_ARTIFACT_ID,
    headKaiUpulse: input.predecessorHead.headKaiUpulse,
    parentArtifactDigests: Object.freeze([input.predecessorArtifactDigest]),
    priorOperationCount: input.predecessorHead.resultingOperationCount,
    resultingOperationCount: input.predecessorHead.resultingOperationCount,
    directOperations: Object.freeze([]),
    currentStateRoot: input.predecessorHead.currentStateRoot,
    merkle: Object.freeze(structuredClone(input.predecessorHead.merkle)),
    fibonacci: Object.freeze(structuredClone(input.predecessorHead.fibonacci)),
    segmentWindow: Object.freeze([]),
    counts: Object.freeze({
      operationCount: input.predecessorHead.resultingOperationCount,
      proofObjectHeadCount: input.predecessorHead.counts.profileShowcaseCount,
      inheritedProfileShowcaseCount: input.predecessorHead.counts.profileShowcaseCount,
    }),
    versions: Object.freeze({
      registryDigest: input.registryDigest,
      kernelVersion: "receiz.composite.kernel.v1" as const,
      verifierVersion: "receiz.global-economy.verifier.v119" as const,
    }),
    authority: Object.freeze({
      globalCompositeIsChildProofAuthority: false as const,
      projectionIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
      admissionStatus: "requires-verified-child-and-global-admission" as const,
    }),
  });
  assertReceizGlobalEconomyHeadV119TransportContract(head);
  return head;
}

export function deriveReceizGlobalEconomyCheckpointHeadV119(input: Readonly<{
  predecessorArtifactDigest: string;
  headKaiUpulse: string;
  operationCount: number;
  proofObjectHeadCount: number;
  inheritedProfileShowcaseCount: number;
  merkle: ReceizCompositeMerkleState;
  fibonacci: ReceizCompositeFibonacciState;
  registryDigest: string;
}>): ReceizGlobalEconomyHeadV119 {
  const head = Object.freeze({
    schema: "receiz.global-economy-head.v119" as const,
    artifactId: RECEIZ_ECONOMY_SHOWCASE_ARTIFACT_ID,
    headKaiUpulse: input.headKaiUpulse,
    parentArtifactDigests: Object.freeze([input.predecessorArtifactDigest]),
    priorOperationCount: input.operationCount,
    resultingOperationCount: input.operationCount,
    directOperations: Object.freeze([]),
    currentStateRoot: input.merkle.root,
    merkle: Object.freeze(structuredClone(input.merkle)),
    fibonacci: Object.freeze(structuredClone(input.fibonacci)),
    segmentWindow: Object.freeze([]),
    counts: Object.freeze({
      operationCount: input.operationCount,
      proofObjectHeadCount: input.proofObjectHeadCount,
      inheritedProfileShowcaseCount: input.inheritedProfileShowcaseCount,
    }),
    versions: Object.freeze({
      registryDigest: input.registryDigest,
      kernelVersion: "receiz.composite.kernel.v1" as const,
      verifierVersion: "receiz.global-economy.verifier.v119" as const,
    }),
    authority: Object.freeze({
      globalCompositeIsChildProofAuthority: false as const,
      projectionIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
      admissionStatus: "requires-verified-child-and-global-admission" as const,
    }),
  });
  assertReceizGlobalEconomyHeadV119TransportContract(head);
  return head;
}

function orderedChildren(
  children: readonly ReceizGlobalProofChildReferenceV119[],
): readonly ReceizGlobalProofChildReferenceV119[] {
  const ordered = children.map((child) => {
    assertReceizGlobalProofChildReferenceV119(child);
    return structuredClone(child);
  }).sort((left, right) => {
    const kaiOrder = BigInt(left.headKaiUpulse) - BigInt(right.headKaiUpulse);
    if (kaiOrder !== 0n) return kaiOrder < 0n ? -1 : 1;
    const namespaceOrder = left.namespace.localeCompare(right.namespace);
    return namespaceOrder || left.artifactDigest.localeCompare(right.artifactDigest);
  });
  if (new Set(ordered.map((child) => child.artifactDigest)).size !== ordered.length) {
    fail("GLOBAL_ECONOMY_CHILD_DUPLICATE");
  }
  return ordered;
}

export async function deriveReceizGlobalEconomySuccessorHeadV119(input: Readonly<{
  predecessorHead: ReceizGlobalEconomyHeadV119;
  predecessorArtifactDigest: string;
  children: readonly ReceizGlobalProofChildReferenceV119[];
  resolveCheckpoint: (operationCount: number) => string | null;
}>): Promise<ReceizGlobalEconomyHeadV119> {
  assertReceizGlobalEconomyHeadV119TransportContract(input.predecessorHead);
  if (
    !DIGEST_RE.test(input.predecessorArtifactDigest)
    || !Array.isArray(input.children)
    || input.children.length === 0
    || input.children.length > RECEIZ_GLOBAL_ECONOMY_V119_TRANSPORT_LIMITS.directOperations
    || typeof input.resolveCheckpoint !== "function"
  ) fail("GLOBAL_ECONOMY_SUCCESSOR_INPUT_INVALID");
  const children = orderedChildren(input.children);
  const predecessorKai = BigInt(input.predecessorHead.headKaiUpulse);
  const directOperations = children.map((child, index) => {
    const operationKai = BigInt(child.headKaiUpulse) > predecessorKai
      ? child.headKaiUpulse
      : input.predecessorHead.headKaiUpulse;
    const basis = {
      schema: "receiz.global-economy.operation.v119" as const,
      kind: "global.proof-object.append" as const,
      parentArtifactDigest: input.predecessorArtifactDigest,
      priorCommittedCount: input.predecessorHead.resultingOperationCount,
      directDeltaPosition: index,
      kai: { upulse: operationKai },
      child,
    };
    return Object.freeze({
      ...basis,
      operationDigest: digestReceizCompositeCanonical({
        digestDomain: "receiz.global-economy.operation-digest.v119",
        ...basis,
      }),
    });
  });
  let merkle = input.predecessorHead.merkle;
  let fibonacci = input.predecessorHead.fibonacci;
  for (const operation of directOperations) {
    merkle = appendReceizCompositeMerkleLeaf(merkle, digestReceizCompositeCanonical({
      kind: "receiz.recursive-composite.child-leaf.v1",
      stableArtifactId: RECEIZ_ECONOMY_SHOWCASE_ARTIFACT_ID,
      childNamespace: operation.child.namespace,
      childArtifactId: operation.child.artifactId,
      childArtifactDigest: operation.child.artifactDigest,
      childHistoryHeadDigest: operation.child.historyHeadDigest,
      operationDigest: operation.operationDigest,
      kaiUpulse: operation.kai.upulse,
    }));
    fibonacci = updateReceizCompositeFibonacciState({
      prior: fibonacci,
      nextOperationCount: fibonacci.operationCount + 1,
      resolveArtifactDigest: input.resolveCheckpoint,
    });
  }
  const resultingOperationCount = input.predecessorHead.resultingOperationCount + directOperations.length;
  const headKaiUpulse = directOperations.reduce(
    (maximum, operation) => BigInt(operation.kai.upulse) > BigInt(maximum) ? operation.kai.upulse : maximum,
    input.predecessorHead.headKaiUpulse,
  );
  const head = Object.freeze({
    schema: "receiz.global-economy-head.v119" as const,
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
      proofObjectHeadCount: input.predecessorHead.counts.proofObjectHeadCount + directOperations.length,
      inheritedProfileShowcaseCount: input.predecessorHead.counts.inheritedProfileShowcaseCount,
    }),
    versions: Object.freeze({ ...input.predecessorHead.versions }),
    authority: Object.freeze({ ...input.predecessorHead.authority }),
  });
  assertReceizGlobalEconomyHeadV119TransportContract(head);
  return head;
}

export async function verifyReceizGlobalEconomySuccessorV119(input: Readonly<{
  predecessorHead: ReceizGlobalEconomyHeadV119;
  predecessorArtifactDigest: string;
  candidateHead: unknown;
  resolveCheckpoint: (operationCount: number) => string | null;
}>): Promise<ReceizGlobalEconomyHeadV119> {
  assertReceizGlobalEconomyHeadV119TransportContract(input.candidateHead);
  if (typeof input.resolveCheckpoint !== "function") {
    fail("GLOBAL_ECONOMY_SUCCESSOR_INPUT_INVALID");
  }
  const expected = await deriveReceizGlobalEconomySuccessorHeadV119({
    predecessorHead: input.predecessorHead,
    predecessorArtifactDigest: input.predecessorArtifactDigest,
    children: input.candidateHead.directOperations.map((operation) => operation.child),
    resolveCheckpoint: input.resolveCheckpoint,
  });
  if (digestReceizCompositeCanonical(expected) !== digestReceizCompositeCanonical(input.candidateHead)) {
    fail("GLOBAL_ECONOMY_SUCCESSOR_INVALID");
  }
  return input.candidateHead;
}
