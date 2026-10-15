import {
  appendReceizCompositeMerkleLeaf,
  assertReceizCompositeHeadBasis,
  digestReceizCompositeCanonical,
  updateReceizCompositeFibonacciState,
  type ReceizCompositeFibonacciState,
  type ReceizCompositeMerkleState,
} from "./compositeProofKernel.js";

const DIGEST_RE = /^[0-9a-f]{64}$/;
const KAI_RE = /^(0|[1-9][0-9]*)$/;
const ID_RE = /^[a-z0-9][a-z0-9._:-]{0,255}$/;

export type ReceizSportsVaultSportV119 = "baseball" | "soccer" | "fight";

export type ReceizSportsVaultCardHeadReferenceV119 = Readonly<{
  schema: "receiz.sports-vault.card-head-reference.v119";
  collectibleId: string;
  claimHash: string;
  cardArtifactDigest: string;
  immutableVersion: string;
  historyHeadDigest: string;
  admissionEvidenceRoot: string;
  headKaiUpulse: string;
  verifierBinding: Readonly<{
    registryDigest: string;
    lawId: "receiz.sports-card-proof-object.admission.v119";
    verifierVersion: "receiz.sports-card-proof-object.verifier.v119";
  }>;
}>;

export type ReceizSportsVaultOperationV119 = Readonly<{
  schema: "receiz.sports-vault.operation.v119";
  kind: "sports-vault.card-head.append";
  parentArtifactDigest: string;
  priorCommittedCount: number;
  directDeltaPosition: number;
  kai: Readonly<{ upulse: string }>;
  card: ReceizSportsVaultCardHeadReferenceV119;
  operationDigest: string;
}>;

export type ReceizSportsVaultRecursiveHeadV119 = Readonly<{
  schema: "receiz.sports-vault.recursive-head.v119";
  artifactId: `sports-vault:${string}:${ReceizSportsVaultSportV119}`;
  ownerReceizIdentity: string;
  sport: ReceizSportsVaultSportV119;
  headKaiUpulse: string;
  parentArtifactDigests: readonly string[];
  priorOperationCount: number;
  resultingOperationCount: number;
  directOperations: readonly ReceizSportsVaultOperationV119[];
  currentStateRoot: string;
  merkle: ReceizCompositeMerkleState;
  fibonacci: ReceizCompositeFibonacciState;
  counts: Readonly<{ operationCount: number; cardHeadCount: number }>;
  versions: Readonly<{
    registryDigest: string;
    kernelVersion: "receiz.composite.kernel.v1";
    verifierVersion: "receiz.sports-vault.verifier.v119";
  }>;
  authority: Readonly<{
    vaultHeadIsCardProofAuthority: false;
    publicProjectionIsProofAuthority: false;
    strongerTruth: "sealed-sports-card-proof-object";
    admissionStatus: "requires-verified-card-and-sealed-vault-admission";
  }>;
}>;

function fail(code: string): never {
  throw new TypeError(code);
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[], code: string): void {
  const actual = Object.keys(value);
  if (actual.length !== expected.length || actual.some((key) => !expected.includes(key)) || expected.some((key) => !(key in value))) {
    fail(code);
  }
}

function validDigest(value: unknown): value is string {
  return typeof value === "string" && DIGEST_RE.test(value);
}

function assertDigestList(value: unknown, code: string): asserts value is string[] {
  if (!Array.isArray(value) || value.length > 64 || value.some((entry) => !validDigest(entry)) || new Set(value).size !== value.length) {
    fail(code);
  }
}

export function assertReceizSportsVaultCardHeadReferenceV119(
  value: unknown,
): asserts value is ReceizSportsVaultCardHeadReferenceV119 {
  if (!record(value)) fail("SPORTS_VAULT_CARD_HEAD_INVALID");
  exactKeys(value, [
    "schema", "collectibleId", "claimHash", "cardArtifactDigest", "immutableVersion",
    "historyHeadDigest", "admissionEvidenceRoot", "headKaiUpulse", "verifierBinding",
  ], "SPORTS_VAULT_CARD_HEAD_UNKNOWN_FIELD");
  if (
    value.schema !== "receiz.sports-vault.card-head-reference.v119"
    || typeof value.collectibleId !== "string"
    || !ID_RE.test(value.collectibleId)
    || !validDigest(value.claimHash)
    || !validDigest(value.cardArtifactDigest)
    || value.immutableVersion !== value.cardArtifactDigest
    || !validDigest(value.historyHeadDigest)
    || !validDigest(value.admissionEvidenceRoot)
    || typeof value.headKaiUpulse !== "string"
    || !KAI_RE.test(value.headKaiUpulse)
    || !record(value.verifierBinding)
  ) fail("SPORTS_VAULT_CARD_HEAD_INVALID");
  exactKeys(value.verifierBinding, ["registryDigest", "lawId", "verifierVersion"], "SPORTS_VAULT_CARD_VERIFIER_UNKNOWN_FIELD");
  if (
    !validDigest(value.verifierBinding.registryDigest)
    || value.verifierBinding.lawId !== "receiz.sports-card-proof-object.admission.v119"
    || value.verifierBinding.verifierVersion !== "receiz.sports-card-proof-object.verifier.v119"
  ) fail("SPORTS_VAULT_CARD_VERIFIER_INVALID");
}

function assertOperation(value: unknown): asserts value is ReceizSportsVaultOperationV119 {
  if (!record(value)) fail("SPORTS_VAULT_OPERATION_INVALID");
  exactKeys(value, [
    "schema", "kind", "parentArtifactDigest", "priorCommittedCount", "directDeltaPosition",
    "kai", "card", "operationDigest",
  ], "SPORTS_VAULT_OPERATION_UNKNOWN_FIELD");
  if (
    value.schema !== "receiz.sports-vault.operation.v119"
    || value.kind !== "sports-vault.card-head.append"
    || !validDigest(value.parentArtifactDigest)
    || !Number.isSafeInteger(value.priorCommittedCount)
    || (value.priorCommittedCount as number) < 0
    || !Number.isSafeInteger(value.directDeltaPosition)
    || (value.directDeltaPosition as number) < 0
    || !record(value.kai)
  ) fail("SPORTS_VAULT_OPERATION_INVALID");
  exactKeys(value.kai, ["upulse"], "SPORTS_VAULT_OPERATION_KAI_UNKNOWN_FIELD");
  assertReceizSportsVaultCardHeadReferenceV119(value.card);
  if (
    typeof value.kai.upulse !== "string"
    || !KAI_RE.test(value.kai.upulse)
    || BigInt(value.kai.upulse) < BigInt(value.card.headKaiUpulse)
    || !validDigest(value.operationDigest)
  ) fail("SPORTS_VAULT_OPERATION_INVALID");
  const basis = { ...value } as Record<string, unknown>;
  delete basis.operationDigest;
  if (value.operationDigest !== digestReceizCompositeCanonical({
    digestDomain: "receiz.sports-vault.operation-digest.v119",
    ...basis,
  })) fail("SPORTS_VAULT_OPERATION_DIGEST_INVALID");
}

export function assertReceizSportsVaultRecursiveHeadV119(
  value: unknown,
): asserts value is ReceizSportsVaultRecursiveHeadV119 {
  if (!record(value)) fail("SPORTS_VAULT_HEAD_INVALID");
  exactKeys(value, [
    "schema", "artifactId", "ownerReceizIdentity", "sport", "headKaiUpulse", "parentArtifactDigests",
    "priorOperationCount", "resultingOperationCount", "directOperations", "currentStateRoot", "merkle",
    "fibonacci", "counts", "versions", "authority",
  ], "SPORTS_VAULT_HEAD_UNKNOWN_FIELD");
  assertDigestList(value.parentArtifactDigests, "SPORTS_VAULT_PARENT_INVALID");
  if (
    value.schema !== "receiz.sports-vault.recursive-head.v119"
    || typeof value.ownerReceizIdentity !== "string"
    || !ID_RE.test(value.ownerReceizIdentity)
    || (value.sport !== "baseball" && value.sport !== "soccer" && value.sport !== "fight")
    || value.artifactId !== `sports-vault:${value.ownerReceizIdentity}:${value.sport}`
    || typeof value.headKaiUpulse !== "string"
    || !KAI_RE.test(value.headKaiUpulse)
    || !Array.isArray(value.directOperations)
    || value.directOperations.length > 1024
    || !record(value.counts)
    || !record(value.versions)
    || !record(value.authority)
  ) fail("SPORTS_VAULT_HEAD_INVALID");
  value.directOperations.forEach((operation, index) => {
    assertOperation(operation);
    if (
      !(value.parentArtifactDigests as string[]).includes(operation.parentArtifactDigest)
      || operation.priorCommittedCount !== value.priorOperationCount
      || operation.directDeltaPosition !== index
    ) fail("SPORTS_VAULT_OPERATION_INVALID");
  });
  exactKeys(value.counts, ["operationCount", "cardHeadCount"], "SPORTS_VAULT_COUNTS_UNKNOWN_FIELD");
  exactKeys(value.versions, ["registryDigest", "kernelVersion", "verifierVersion"], "SPORTS_VAULT_VERSIONS_UNKNOWN_FIELD");
  exactKeys(value.authority, [
    "vaultHeadIsCardProofAuthority", "publicProjectionIsProofAuthority", "strongerTruth", "admissionStatus",
  ], "SPORTS_VAULT_AUTHORITY_UNKNOWN_FIELD");
  if (
    !Number.isSafeInteger(value.counts.operationCount)
    || !Number.isSafeInteger(value.counts.cardHeadCount)
    || value.counts.operationCount !== value.resultingOperationCount
    || !validDigest(value.versions.registryDigest)
    || value.versions.kernelVersion !== "receiz.composite.kernel.v1"
    || value.versions.verifierVersion !== "receiz.sports-vault.verifier.v119"
    || value.authority.vaultHeadIsCardProofAuthority !== false
    || value.authority.publicProjectionIsProofAuthority !== false
    || value.authority.strongerTruth !== "sealed-sports-card-proof-object"
    || value.authority.admissionStatus !== "requires-verified-card-and-sealed-vault-admission"
  ) fail("SPORTS_VAULT_HEAD_INVALID");
  try {
    assertReceizCompositeHeadBasis({
      stableArtifactId: value.artifactId as string,
      headKaiUpulse: value.headKaiUpulse as string,
      priorOperationCount: value.priorOperationCount as number,
      resultingOperationCount: value.resultingOperationCount as number,
      directDeltaLength: value.directOperations.length,
      parentCount: value.parentArtifactDigests.length,
      segmentCount: 0,
      currentStateRoot: value.currentStateRoot as string,
      merkle: value.merkle as ReceizCompositeMerkleState,
      fibonacci: value.fibonacci as ReceizCompositeFibonacciState,
    });
  } catch {
    fail("SPORTS_VAULT_HEAD_INVALID");
  }
}

export function deriveReceizSportsVaultCheckpointHeadV119(input: Readonly<{
  ownerReceizIdentity: string;
  sport: ReceizSportsVaultSportV119;
  predecessorArtifactDigest: string;
  headKaiUpulse: string;
  operationCount: number;
  cardHeadCount: number;
  merkle: ReceizCompositeMerkleState;
  fibonacci: ReceizCompositeFibonacciState;
  registryDigest: string;
}>): ReceizSportsVaultRecursiveHeadV119 {
  const head = Object.freeze({
    schema: "receiz.sports-vault.recursive-head.v119" as const,
    artifactId: `sports-vault:${input.ownerReceizIdentity}:${input.sport}` as const,
    ownerReceizIdentity: input.ownerReceizIdentity,
    sport: input.sport,
    headKaiUpulse: input.headKaiUpulse,
    parentArtifactDigests: Object.freeze([input.predecessorArtifactDigest]),
    priorOperationCount: input.operationCount,
    resultingOperationCount: input.operationCount,
    directOperations: Object.freeze([]),
    currentStateRoot: input.merkle.root,
    merkle: Object.freeze(structuredClone(input.merkle)),
    fibonacci: Object.freeze(structuredClone(input.fibonacci)),
    counts: Object.freeze({ operationCount: input.operationCount, cardHeadCount: input.cardHeadCount }),
    versions: Object.freeze({
      registryDigest: input.registryDigest,
      kernelVersion: "receiz.composite.kernel.v1" as const,
      verifierVersion: "receiz.sports-vault.verifier.v119" as const,
    }),
    authority: Object.freeze({
      vaultHeadIsCardProofAuthority: false as const,
      publicProjectionIsProofAuthority: false as const,
      strongerTruth: "sealed-sports-card-proof-object" as const,
      admissionStatus: "requires-verified-card-and-sealed-vault-admission" as const,
    }),
  });
  assertReceizSportsVaultRecursiveHeadV119(head);
  return head;
}

function orderedCards(cards: readonly ReceizSportsVaultCardHeadReferenceV119[]): readonly ReceizSportsVaultCardHeadReferenceV119[] {
  const result = cards.map((card) => {
    assertReceizSportsVaultCardHeadReferenceV119(card);
    return structuredClone(card);
  }).sort((left, right) => {
    const kai = BigInt(left.headKaiUpulse) - BigInt(right.headKaiUpulse);
    if (kai !== 0n) return kai < 0n ? -1 : 1;
    return left.collectibleId.localeCompare(right.collectibleId) || left.cardArtifactDigest.localeCompare(right.cardArtifactDigest);
  });
  if (new Set(result.map((card) => card.cardArtifactDigest)).size !== result.length) fail("SPORTS_VAULT_CARD_DUPLICATE");
  return result;
}

export async function deriveReceizSportsVaultSuccessorHeadV119(input: Readonly<{
  predecessorHead: ReceizSportsVaultRecursiveHeadV119;
  predecessorArtifactDigest: string;
  cards: readonly ReceizSportsVaultCardHeadReferenceV119[];
  resolveCheckpoint: (operationCount: number) => string | null;
}>): Promise<ReceizSportsVaultRecursiveHeadV119> {
  assertReceizSportsVaultRecursiveHeadV119(input.predecessorHead);
  if (!validDigest(input.predecessorArtifactDigest) || !Array.isArray(input.cards) || input.cards.length === 0 || input.cards.length > 1024 || typeof input.resolveCheckpoint !== "function") {
    fail("SPORTS_VAULT_SUCCESSOR_INPUT_INVALID");
  }
  const cards = orderedCards(input.cards);
  const predecessorKai = BigInt(input.predecessorHead.headKaiUpulse);
  const directOperations = cards.map((card, index) => {
    const upulse = BigInt(card.headKaiUpulse) > predecessorKai ? card.headKaiUpulse : input.predecessorHead.headKaiUpulse;
    const basis = {
      schema: "receiz.sports-vault.operation.v119" as const,
      kind: "sports-vault.card-head.append" as const,
      parentArtifactDigest: input.predecessorArtifactDigest,
      priorCommittedCount: input.predecessorHead.resultingOperationCount,
      directDeltaPosition: index,
      kai: { upulse },
      card,
    };
    return Object.freeze({
      ...basis,
      operationDigest: digestReceizCompositeCanonical({ digestDomain: "receiz.sports-vault.operation-digest.v119", ...basis }),
    });
  });
  let merkle = input.predecessorHead.merkle;
  let fibonacci = input.predecessorHead.fibonacci;
  for (const operation of directOperations) {
    merkle = appendReceizCompositeMerkleLeaf(merkle, digestReceizCompositeCanonical({
      kind: "receiz.sports-vault.card-head-leaf.v119",
      artifactId: input.predecessorHead.artifactId,
      collectibleId: operation.card.collectibleId,
      claimHash: operation.card.claimHash,
      cardArtifactDigest: operation.card.cardArtifactDigest,
      historyHeadDigest: operation.card.historyHeadDigest,
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
    ...input.predecessorHead,
    headKaiUpulse,
    parentArtifactDigests: Object.freeze([input.predecessorArtifactDigest]),
    priorOperationCount: input.predecessorHead.resultingOperationCount,
    resultingOperationCount,
    directOperations: Object.freeze(directOperations),
    currentStateRoot: merkle.root,
    merkle: Object.freeze(merkle),
    fibonacci: Object.freeze(fibonacci),
    counts: Object.freeze({
      operationCount: resultingOperationCount,
      cardHeadCount: input.predecessorHead.counts.cardHeadCount + directOperations.length,
    }),
  });
  assertReceizSportsVaultRecursiveHeadV119(head);
  return head;
}

export async function verifyReceizSportsVaultSuccessorV119(input: Readonly<{
  predecessorHead: ReceizSportsVaultRecursiveHeadV119;
  predecessorArtifactDigest: string;
  candidateHead: unknown;
  resolveCheckpoint: (operationCount: number) => string | null;
}>): Promise<ReceizSportsVaultRecursiveHeadV119> {
  assertReceizSportsVaultRecursiveHeadV119(input.candidateHead);
  if (typeof input.resolveCheckpoint !== "function") fail("SPORTS_VAULT_SUCCESSOR_INPUT_INVALID");
  const expected = await deriveReceizSportsVaultSuccessorHeadV119({
    predecessorHead: input.predecessorHead,
    predecessorArtifactDigest: input.predecessorArtifactDigest,
    cards: input.candidateHead.directOperations.map((operation) => operation.card),
    resolveCheckpoint: input.resolveCheckpoint,
  });
  if (digestReceizCompositeCanonical(expected) !== digestReceizCompositeCanonical(input.candidateHead)) {
    fail("SPORTS_VAULT_SUCCESSOR_INVALID");
  }
  return input.candidateHead;
}
