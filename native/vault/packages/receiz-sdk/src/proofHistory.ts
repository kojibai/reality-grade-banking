import {
  canonicalizeReceizConstitution,
  type ReceizConstitutionJson,
} from "./constitution.js";
import { digestReceizAuthority } from "./authorityEncoding.js";
import {
  verifyReceizArtifactAdmission,
  verifyReceizArtifactAdmissionRegistryEvidence,
} from "./artifactAdmission.js";
import type {
  ReceizEventDigest,
  ReceizNamespaceDigest,
  ReceizNamespaceId,
} from "./artifactTransition.js";
import type { ReceizVerifiedActorReference } from "./artifactAdmissionTypes.js";
import {
  assertReceizProtocolMaximum,
  assertReceizRuntimeMaterializationAvailable,
} from "./verificationLimits.js";
import { assertReceizProfileShowcaseTransitionOperationsV114 } from "./profileShowcaseTransport.js";
import { RECEIZ_V114_REGISTRY_DIGEST } from "./releaseIdentity.js";
import {
  admitReceizKksV1ProofCoordinate,
  type ReceizKksV1ProofCoordinate,
} from "./v125KaiAuthority.js";

/** Exact coordinate carried beneath the enclosing sealed proof object. */
export const RECEIZ_EXACT_KKS_HISTORY_NAMESPACE = "receiz.kks-v1";

export async function readReceizProofHistoryExactKksCoordinate(
  node: ReceizProofHistoryNode,
): Promise<ReceizKksV1ProofCoordinate | null> {
  const carried = node.namespaceData[RECEIZ_EXACT_KKS_HISTORY_NAMESPACE];
  if (carried === undefined) return null;
  const coordinate = await admitReceizKksV1ProofCoordinate(carried);
  // The legacy field remains pulses; the carried proof supplies exact micro-pulses.
  if (node.kaiPulse !== coordinate.kaiPulse) {
    throw new TypeError("HISTORY_EXACT_KKS_PULSE_MISMATCH");
  }
  return coordinate;
}

export type ReceizProofHistoryEvent =
  | Readonly<{ type: "state.append"; state: ReceizConstitutionJson }>
  | Readonly<{
      type: "ownership.transition";
      fromOwnerReceizId: string | null;
      toOwnerReceizId: string;
    }>
  | Readonly<{
      type: "lifecycle.terminal";
      terminal: "retired" | "revoked" | "settled" | "transferred-out";
    }>
  | Readonly<{
      type: "profile-showcase.transition";
      actorEvidenceRoot?: string;
      parentShowcaseDigests: readonly string[];
      predecessorShowcaseDigest: string | null;
      showcaseBodyDigest: string;
      operationDigest: string;
      directOperations?: readonly ReceizConstitutionJson[];
      childAdmissionEvidenceRoots: readonly string[];
      registryDigest: string;
      kaiUpulse: string;
    }>;

export type ReceizProofHistoryNode = Readonly<{
  schema: "receiz.proof-history-node.v1";
  nodeDigest: string;
  artifactId: string;
  registryDigest: string;
  parentDigests: readonly string[];
  kaiPulse: string;
  receiptDigest: string;
  receipt: ReceizConstitutionJson;
  event: ReceizProofHistoryEvent;
  namespaceData: Readonly<Record<string, ReceizConstitutionJson>>;
  authority: Readonly<{
    historyNodeIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizProofHistory = Readonly<{
  schema: "receiz.proof-history.v1";
  artifactId: string;
  registryDigest: string;
  rootDigest: string;
  headDigests: readonly string[];
  nodes: readonly ReceizProofHistoryNode[];
  currentOwnerReceizId: string | null;
  terminal: null | Readonly<{
    type: "retired" | "revoked" | "settled" | "transferred-out";
    nodeDigest: string;
  }>;
  historyDigest: string;
}>;

export type ReceizVerifiedProofHistory = ReceizProofHistory & Readonly<{
  verification: Readonly<{
    schema: "receiz.verified-proof-history.v112";
    evidenceRoots: readonly ReceizProofHistoryEvidenceRoot[];
    verificationDigest: string;
    authority: Readonly<{
      historyVerificationIsProofAuthority: false;
      strongerTruth: "sealed-receiz-proof-object";
    }>;
  }>;
}>;

export type ReceizProofHistoryEvidenceRoot = Readonly<{
  kind: "verified-artifact-admission" | "sealed-history-artifact";
  evidenceDigest: string;
  artifactDigest: string;
  verifierContextDigest: string;
}>;

export type ReceizProofHistoryReceiptVerifier = (
  receipt: ReceizConstitutionJson,
  receiptDigest: string,
) => boolean | Promise<boolean>;

export type ReceizArtifactTransitionHistoryAppendBasis = Readonly<{
  artifactId: string;
  registryDigest: string;
  parentDigest: string;
  kaiPulse: string;
  namespace: ReceizNamespaceId;
  namespaceLawVersion: string;
  namespaceReducerVersion: string;
  eventDigest: ReceizEventDigest;
  proposedNamespaceBodyDigest: ReceizNamespaceDigest;
  actor: ReceizVerifiedActorReference;
}>;

const DIGEST_RE = /^[0-9a-f]{64}$/;
const KAI_RE = /^(0|[1-9][0-9]*)$/;
const runtimeVerifiedHistories = new WeakSet<object>();
let artifactTransitionHistoryIssuanceCount = 0;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  }
  return value;
}

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key)) && keys.every((key) => key in value);
}

function assertEvent(value: unknown): asserts value is ReceizProofHistoryEvent {
  if (!record(value) || !nonempty(value.type)) throw new Error("HISTORY_EVENT_INVALID");
  if (value.type === "state.append") {
    if (!exactKeys(value, ["type", "state"])) throw new Error("HISTORY_EVENT_INVALID");
    canonicalizeReceizConstitution(value.state as ReceizConstitutionJson);
    return;
  }
  if (value.type === "ownership.transition") {
    if (!exactKeys(value, ["type", "fromOwnerReceizId", "toOwnerReceizId"])
      || (value.fromOwnerReceizId !== null && !nonempty(value.fromOwnerReceizId))
      || !nonempty(value.toOwnerReceizId)) throw new Error("HISTORY_EVENT_INVALID");
    return;
  }
  if (value.type === "lifecycle.terminal") {
    if (!exactKeys(value, ["type", "terminal"])
      || !["retired", "revoked", "settled", "transferred-out"].includes(String(value.terminal))) {
      throw new Error("HISTORY_EVENT_INVALID");
    }
    return;
  }
  if (value.type === "profile-showcase.transition") {
    const requiredKeys = [
      "type",
      "parentShowcaseDigests",
      "predecessorShowcaseDigest",
      "showcaseBodyDigest",
      "operationDigest",
      "childAdmissionEvidenceRoots",
      "registryDigest",
      "kaiUpulse",
    ];
    if (!exactKeys(value, [...requiredKeys,
      ...("directOperations" in value ? ["directOperations"] : []),
      ...("actorEvidenceRoot" in value ? ["actorEvidenceRoot"] : [])])
      || ("actorEvidenceRoot" in value && (
        typeof value.actorEvidenceRoot !== "string" || !DIGEST_RE.test(value.actorEvidenceRoot)
        || !Array.isArray(value.directOperations) || value.directOperations.length !== 0
        || !Array.isArray(value.parentShowcaseDigests) || value.parentShowcaseDigests.length !== 0
        || value.predecessorShowcaseDigest !== null))
      || !Array.isArray(value.parentShowcaseDigests)
      || value.parentShowcaseDigests.some((digest) =>
        typeof digest !== "string" || !DIGEST_RE.test(digest))
      || new Set(value.parentShowcaseDigests).size !== value.parentShowcaseDigests.length
      || (value.predecessorShowcaseDigest !== null
        && (typeof value.predecessorShowcaseDigest !== "string"
          || !DIGEST_RE.test(value.predecessorShowcaseDigest)))
      || typeof value.showcaseBodyDigest !== "string"
      || !DIGEST_RE.test(value.showcaseBodyDigest)
      || typeof value.operationDigest !== "string"
      || !DIGEST_RE.test(value.operationDigest)
      || !Array.isArray(value.childAdmissionEvidenceRoots)
      || value.childAdmissionEvidenceRoots.some((digest) =>
        typeof digest !== "string" || !DIGEST_RE.test(digest))
      || new Set(value.childAdmissionEvidenceRoots).size !== value.childAdmissionEvidenceRoots.length
      || typeof value.registryDigest !== "string"
      || !DIGEST_RE.test(value.registryDigest)
      || typeof value.kaiUpulse !== "string"
      || !KAI_RE.test(value.kaiUpulse)) {
      throw new Error("HISTORY_EVENT_INVALID");
    }
    if (value.directOperations !== undefined) {
      if (!Array.isArray(value.directOperations)) throw new Error("HISTORY_EVENT_INVALID");
      canonicalizeReceizConstitution(value.directOperations as ReceizConstitutionJson);
    }
    return;
  }
  throw new Error("HISTORY_EVENT_INVALID");
}

function nodeBasis(node: Omit<ReceizProofHistoryNode, "nodeDigest">): ReceizConstitutionJson {
  return node as unknown as ReceizConstitutionJson;
}

function compareNodes(left: ReceizProofHistoryNode, right: ReceizProofHistoryNode): number {
  const leftExact = left.namespaceData[RECEIZ_EXACT_KKS_HISTORY_NAMESPACE];
  const rightExact = right.namespaceData[RECEIZ_EXACT_KKS_HISTORY_NAMESPACE];
  if (record(leftExact) && record(rightExact)) {
    const leftUpulse = BigInt(leftExact.kaiUpulse as string);
    const rightUpulse = BigInt(rightExact.kaiUpulse as string);
    if (leftUpulse < rightUpulse) return -1;
    if (leftUpulse > rightUpulse) return 1;
    return left.nodeDigest.localeCompare(right.nodeDigest);
  }
  const leftKai = BigInt(left.event.type === "profile-showcase.transition"
    ? left.event.kaiUpulse : left.kaiPulse);
  const rightKai = BigInt(right.event.type === "profile-showcase.transition"
    ? right.event.kaiUpulse : right.kaiPulse);
  if (leftKai < rightKai) return -1;
  if (leftKai > rightKai) return 1;
  return left.nodeDigest.localeCompare(right.nodeDigest);
}

function assertNodeShape(node: ReceizProofHistoryNode): void {
  if (!record(node)
    || node.schema !== "receiz.proof-history-node.v1"
    || !DIGEST_RE.test(node.nodeDigest)
    || !nonempty(node.artifactId)
    || !DIGEST_RE.test(node.registryDigest)
    || !Array.isArray(node.parentDigests)
    || node.parentDigests.some((digest) => !DIGEST_RE.test(digest))
    || new Set(node.parentDigests).size !== node.parentDigests.length
    || !KAI_RE.test(node.kaiPulse)
    || !DIGEST_RE.test(node.receiptDigest)
    || !record(node.namespaceData)
    || !record(node.authority)
    || node.authority.historyNodeIsProofAuthority !== false
    || node.authority.strongerTruth !== "sealed-receiz-proof-object") throw new Error("HISTORY_NODE_INVALID");
  assertReceizProtocolMaximum("artifactNamespaces", Object.keys(node.namespaceData).length);
  canonicalizeReceizConstitution(node.receipt);
  canonicalizeReceizConstitution(node.namespaceData as ReceizConstitutionJson);
  assertEvent(node.event);
}

function isSealedProfileShowcasePredecessorCheckpoint(
  node: ReceizProofHistoryNode,
  event: Extract<ReceizProofHistoryEvent, { type: "profile-showcase.transition" }>,
  byDigest: ReadonlyMap<string, ReceizProofHistoryNode>,
): boolean {
  if (
    event.directOperations?.length !== 0
    || event.predecessorShowcaseDigest === null
    || event.parentShowcaseDigests.length !== 1
    || event.parentShowcaseDigests[0] !== event.predecessorShowcaseDigest
    || event.childAdmissionEvidenceRoots.length !== 0
    || event.registryDigest !== node.registryDigest
    || node.registryDigest !== RECEIZ_V114_REGISTRY_DIGEST
    || node.parentDigests.length !== 1
  ) return false;
  const parent = byDigest.get(node.parentDigests[0]!);
  return parent?.event.type === "profile-showcase.transition"
    && parent.event.directOperations !== undefined
    && parent.event.directOperations.length > 0
    && parent.event.registryDigest === event.registryDigest
    && parent.event.kaiUpulse === event.kaiUpulse;
}

async function assertProfileShowcaseOperationProjection(
  node: ReceizProofHistoryNode,
  byDigest: ReadonlyMap<string, ReceizProofHistoryNode>,
): Promise<void> {
  if (node.event.type !== "profile-showcase.transition") return;
  if (node.event.directOperations === undefined) {
    if (node.registryDigest === RECEIZ_V114_REGISTRY_DIGEST) {
      throw new Error("PROFILE_SHOWCASE_HISTORY_OPERATION_PROJECTION_MISSING");
    }
    return;
  }
  const event = node.event;
  assertReceizProfileShowcaseTransitionOperationsV114(event.directOperations);
  if (node.kaiPulse !== event.kaiUpulse) throw new Error("PROFILE_SHOWCASE_HISTORY_KAI_MISMATCH");
  const operationDigest = await digestReceizAuthority(
    "operation",
    "receiz.profile-showcase.transition-operations.v114",
    event.directOperations as ReceizConstitutionJson[],
  );
  if (operationDigest !== event.operationDigest) {
    throw new Error("PROFILE_SHOWCASE_HISTORY_OPERATION_DIGEST_MISMATCH");
  }
  const maximumOperationKai = event.directOperations.reduce<bigint>((maximum, operation) => {
    const kai = BigInt((operation as unknown as { kai: { upulse: string } }).kai.upulse);
    return kai > maximum ? kai : maximum;
  }, 0n);
  if (event.directOperations.length > 0 && maximumOperationKai !== BigInt(event.kaiUpulse)) {
    throw new Error("PROFILE_SHOWCASE_HISTORY_OPERATION_KAI_MISMATCH");
  }
  const operationParents = new Set(event.directOperations.map((operation) =>
    (operation as unknown as { parentArtifactDigest: string | null }).parentArtifactDigest));
  if ((event.directOperations.length === 0
      && event.predecessorShowcaseDigest !== null
      && !isSealedProfileShowcasePredecessorCheckpoint(node, event, byDigest))
    || (event.directOperations.length > 0 && (operationParents.size !== 1
      || operationParents.values().next().value !== event.predecessorShowcaseDigest))) {
    throw new Error("PROFILE_SHOWCASE_HISTORY_OPERATION_PARENT_MISMATCH");
  }
  let parentHeadKai = 0n;
  for (const parentDigest of node.parentDigests) {
    const parent = byDigest.get(parentDigest);
    if (parent?.event.type === "profile-showcase.transition") {
      const parentKai = BigInt(parent.event.kaiUpulse);
      if (parentKai > BigInt(event.kaiUpulse)) {
        throw new Error("PROFILE_SHOWCASE_HISTORY_PARENT_KAI_REGRESSION");
      }
      if (parentKai > parentHeadKai) parentHeadKai = parentKai;
    }
  }
  if (event.directOperations.some((operation) =>
    BigInt((operation as unknown as { kai: { upulse: string } }).kai.upulse) < parentHeadKai)) {
    throw new Error("PROFILE_SHOWCASE_HISTORY_OPERATION_KAI_REGRESSION");
  }
  const binding = node.namespaceData["profile-showcase"];
  const expectedBinding = {
    schema: "receiz.profile-showcase-history-binding.v114",
    parentShowcaseDigests: event.parentShowcaseDigests,
    predecessorShowcaseDigest: event.predecessorShowcaseDigest,
    showcaseBodyDigest: event.showcaseBodyDigest,
    operationDigest: event.operationDigest,
    directOperations: event.directOperations,
    childAdmissionEvidenceRoots: event.childAdmissionEvidenceRoots,
    registryDigest: event.registryDigest,
    kaiUpulse: event.kaiUpulse,
  };
  if (!binding || canonicalizeReceizConstitution(binding) !== canonicalizeReceizConstitution(expectedBinding)) {
    throw new Error("PROFILE_SHOWCASE_HISTORY_NAMESPACE_PROJECTION_MISMATCH");
  }
}

function orderedNodes(byDigest: ReadonlyMap<string, ReceizProofHistoryNode>): ReceizProofHistoryNode[] {
  const indegree = new Map<string, number>();
  const children = new Map<string, string[]>();
  for (const node of byDigest.values()) {
    for (const parent of node.parentDigests) if (!byDigest.has(parent)) throw new Error("HISTORY_PARENT_MISSING");
    indegree.set(node.nodeDigest, node.parentDigests.length);
    for (const parent of node.parentDigests) children.set(parent, [...(children.get(parent) ?? []), node.nodeDigest]);
  }
  const eligible = [...byDigest.values()].filter((node) => node.parentDigests.length === 0).sort(compareNodes);
  const ordered: ReceizProofHistoryNode[] = [];
  while (eligible.length > 0) {
    const next = eligible.shift()!;
    ordered.push(next);
    for (const childDigest of children.get(next.nodeDigest) ?? []) {
      const remaining = (indegree.get(childDigest) ?? 0) - 1;
      indegree.set(childDigest, remaining);
      if (remaining === 0) {
        eligible.push(byDigest.get(childDigest)!);
        eligible.sort(compareNodes);
      }
    }
  }
  if (ordered.length !== byDigest.size) throw new Error("HISTORY_CYCLE");
  return ordered;
}

function isAncestor(
  ancestorDigest: string,
  descendantDigest: string,
  byDigest: ReadonlyMap<string, ReceizProofHistoryNode>,
): boolean {
  const pending = [...(byDigest.get(descendantDigest)?.parentDigests ?? [])];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const next = pending.pop()!;
    if (next === ancestorDigest) return true;
    if (visited.has(next)) continue;
    visited.add(next);
    pending.push(...(byDigest.get(next)?.parentDigests ?? []));
  }
  return false;
}

export async function createReceizProofHistoryNode(input: {
  artifactId: string;
  registryDigest: string;
  parentDigests: readonly string[];
  kaiPulse: string;
  receipt: ReceizConstitutionJson;
  event: ReceizProofHistoryEvent;
  namespaceData: Readonly<Record<string, ReceizConstitutionJson>>;
}): Promise<ReceizProofHistoryNode> {
  if (!nonempty(input.artifactId)
    || !DIGEST_RE.test(input.registryDigest)
    || input.parentDigests.some((digest) => !DIGEST_RE.test(digest))
    || new Set(input.parentDigests).size !== input.parentDigests.length
    || !KAI_RE.test(input.kaiPulse)) throw new Error("HISTORY_NODE_INVALID");
  assertReceizProtocolMaximum("artifactNamespaces", Object.keys(input.namespaceData).length);
  assertEvent(input.event);
  canonicalizeReceizConstitution(input.receipt);
  canonicalizeReceizConstitution(input.namespaceData as ReceizConstitutionJson);
  const receiptDigest = await digestReceizAuthority("receipt", "receiz.proof-history-receipt.v111", input.receipt);
  const basis: Omit<ReceizProofHistoryNode, "nodeDigest"> = {
    schema: "receiz.proof-history-node.v1",
    artifactId: input.artifactId,
    registryDigest: input.registryDigest,
    parentDigests: [...input.parentDigests].sort(),
    kaiPulse: input.kaiPulse,
    receiptDigest,
    receipt: structuredClone(input.receipt),
    event: structuredClone(input.event),
    namespaceData: structuredClone(input.namespaceData),
    authority: {
      historyNodeIsProofAuthority: false,
      strongerTruth: "sealed-receiz-proof-object",
    },
  };
  return deepFreeze({ ...basis, nodeDigest: await digestReceizAuthority("history", "receiz.proof-history-node.v111", nodeBasis(basis)) });
}

export async function createReceizProfileShowcaseProofHistoryNode(input: Readonly<{
  artifactId: `profile-showcase:${string}`;
  registryDigest: string;
  parentDigest: string | null;
  parentDigests?: readonly string[];
  parentShowcaseDigests: readonly string[];
  predecessorShowcaseDigest: string | null;
  showcaseBodyDigest: string;
  operationDigest: string;
  directOperations: readonly ReceizConstitutionJson[];
  childAdmissionEvidenceRoots: readonly string[];
  kaiUpulse: string;
}>): Promise<ReceizProofHistoryNode> {
  if (!/^profile-showcase:[^\u0000-\u001f\u007f]+$/u.test(input.artifactId)
    || !DIGEST_RE.test(input.registryDigest)
    || (input.parentDigest !== null && !DIGEST_RE.test(input.parentDigest))
    || (input.parentDigests !== undefined && (input.parentDigests.length === 0
      || input.parentDigests.some((digest) => !DIGEST_RE.test(digest))
      || new Set(input.parentDigests).size !== input.parentDigests.length
      || (input.parentDigest !== null && !input.parentDigests.includes(input.parentDigest))))
    || (input.predecessorShowcaseDigest !== null
      && !DIGEST_RE.test(input.predecessorShowcaseDigest))
    || input.parentShowcaseDigests.some((digest) => !DIGEST_RE.test(digest))
    || new Set(input.parentShowcaseDigests).size !== input.parentShowcaseDigests.length
    || !DIGEST_RE.test(input.showcaseBodyDigest)
    || !DIGEST_RE.test(input.operationDigest)
    || !Array.isArray(input.directOperations)
    || input.childAdmissionEvidenceRoots.some((root) => !DIGEST_RE.test(root))
    || new Set(input.childAdmissionEvidenceRoots).size !== input.childAdmissionEvidenceRoots.length
    || !KAI_RE.test(input.kaiUpulse)) {
    throw new Error("HISTORY_EVENT_INVALID");
  }
  const childAdmissionEvidenceRoots = [...input.childAdmissionEvidenceRoots].sort();
  const event: Extract<ReceizProofHistoryEvent, { type: "profile-showcase.transition" }> = {
    type: "profile-showcase.transition",
    parentShowcaseDigests: [...input.parentShowcaseDigests].sort(),
    predecessorShowcaseDigest: input.predecessorShowcaseDigest,
    showcaseBodyDigest: input.showcaseBodyDigest,
    operationDigest: input.operationDigest,
    directOperations: structuredClone(input.directOperations),
    childAdmissionEvidenceRoots,
    registryDigest: input.registryDigest,
    kaiUpulse: input.kaiUpulse,
  };
  return createReceizProofHistoryNode({
    artifactId: input.artifactId,
    registryDigest: input.registryDigest,
    parentDigests: input.parentDigests ?? (input.parentDigest === null ? [] : [input.parentDigest]),
    kaiPulse: input.kaiUpulse,
    receipt: {
      schema: "receiz.profile-showcase-transition-receipt.v114",
      artifactId: input.artifactId,
      event: structuredClone(event) as unknown as ReceizConstitutionJson,
      authority: {
        receiptIsProofAuthority: false,
        strongerTruth: "sealed-receiz-proof-object",
      },
    },
    event,
    namespaceData: {
      "profile-showcase": {
        schema: "receiz.profile-showcase-history-binding.v114",
        parentShowcaseDigests: [...event.parentShowcaseDigests],
        predecessorShowcaseDigest: input.predecessorShowcaseDigest,
        showcaseBodyDigest: input.showcaseBodyDigest,
        operationDigest: input.operationDigest,
        directOperations: structuredClone(input.directOperations),
        childAdmissionEvidenceRoots,
        registryDigest: input.registryDigest,
        kaiUpulse: event.kaiUpulse,
      },
    },
  });
}

export type ReceizProfileShowcaseHistoryBinding = Readonly<{
  artifactId: `profile-showcase:${string}`;
  registryDigest: string;
  parentShowcaseDigests: readonly string[];
  predecessorShowcaseDigest: string | null;
  showcaseBodyDigest: string;
  operationDigest: string;
  directOperations: readonly ReceizConstitutionJson[];
  childAdmissionEvidenceRoots: readonly string[];
  kaiUpulse: string;
}>;

export async function deriveReceizProfileShowcaseHistoryBinding(input: Readonly<{
  artifactId: `profile-showcase:${string}`;
  ownerReceizIdentity: string;
  showcase: Readonly<Record<string, unknown>>;
  registryDigest: string;
}>): Promise<ReceizProfileShowcaseHistoryBinding> {
  const showcase = structuredClone(input.showcase) as Record<string, unknown>;
  const parentValues = showcase.parentArtifactDigests ?? [];
  const operationValues = showcase.directOperations ?? [];
  const evidenceValues = showcase.proofHistoryEvidenceRoots ?? [];
  if (input.artifactId !== `profile-showcase:${input.ownerReceizIdentity}`
    || showcase.schema !== "receiz.profile-showcase.v1"
    || showcase.artifactId !== input.artifactId
    || showcase.ownerReceizIdentity !== input.ownerReceizIdentity
    || !DIGEST_RE.test(input.registryDigest)
    || !Array.isArray(parentValues)
    || parentValues.some((value) =>
      typeof value !== "string" || !DIGEST_RE.test(value))
    || new Set(parentValues).size !== parentValues.length
    || !Array.isArray(operationValues)
    || !Array.isArray(evidenceValues)
    || evidenceValues.some((value) =>
      typeof value !== "string" || !DIGEST_RE.test(value))) {
    throw new Error("PROFILE_SHOWCASE_HISTORY_BINDING_INVALID");
  }
  const parentShowcaseDigests = [...parentValues as string[]].sort();
  const directOperations = operationValues as unknown[];
  const operationParents = new Set<string>();
  for (const operation of directOperations) {
    if (!record(operation)
      || (operation.parentArtifactDigest !== null
        && (typeof operation.parentArtifactDigest !== "string"
          || !DIGEST_RE.test(operation.parentArtifactDigest)))
      || (operation.parentArtifactDigest !== null
        && !parentShowcaseDigests.includes(operation.parentArtifactDigest))) {
      throw new Error("PROFILE_SHOWCASE_HISTORY_BINDING_INVALID");
    }
    if (operation.parentArtifactDigest !== null) {
      operationParents.add(operation.parentArtifactDigest);
    }
  }
  if ((parentShowcaseDigests.length === 0 && operationParents.size !== 0)
    || (parentShowcaseDigests.length > 0 && operationParents.size !== 1)) {
    throw new Error("PROFILE_SHOWCASE_HISTORY_BINDING_INVALID");
  }
  const kaiUpulse = showcase.headKaiUpulse;
  if (typeof kaiUpulse !== "string" || !KAI_RE.test(kaiUpulse)) {
    throw new Error("PROFILE_SHOWCASE_HISTORY_BINDING_INVALID");
  }
  const childAdmissionEvidenceRoots = [
    ...new Set(evidenceValues as string[]),
  ].sort();
  if (childAdmissionEvidenceRoots.length !== evidenceValues.length) {
    throw new Error("PROFILE_SHOWCASE_HISTORY_BINDING_INVALID");
  }
  const versions = showcase.versions;
  if (record(versions) && versions.registryDigest !== input.registryDigest) {
    throw new Error("PROFILE_SHOWCASE_HISTORY_BINDING_INVALID");
  }
  return deepFreeze({
    artifactId: input.artifactId,
    registryDigest: input.registryDigest,
    parentShowcaseDigests,
    predecessorShowcaseDigest: operationParents.values().next().value ?? null,
    showcaseBodyDigest: await digestReceizAuthority(
      "namespace",
      "receiz.namespace-body.v112",
      new TextEncoder().encode(
        canonicalizeReceizConstitution(showcase as ReceizConstitutionJson),
      ),
    ),
    operationDigest: await digestReceizAuthority(
      "operation",
      "receiz.profile-showcase.transition-operations.v114",
      directOperations as ReceizConstitutionJson[],
    ),
    directOperations: structuredClone(directOperations) as ReceizConstitutionJson[],
    childAdmissionEvidenceRoots,
    kaiUpulse,
  });
}

export async function createReceizArtifactTransitionProofHistoryAppendNode(input: Readonly<{
  basis: ReceizArtifactTransitionHistoryAppendBasis;
  event: ReceizConstitutionJson;
  kksCoordinate?: ReceizKksV1ProofCoordinate;
  predecessorArtifactDigest?: string;
}>): Promise<ReceizProofHistoryNode> {
  const basis = structuredClone(input.basis);
  if (input.kksCoordinate && !DIGEST_RE.test(input.predecessorArtifactDigest ?? "")) {
    throw new TypeError("HISTORY_EXACT_KKS_PREDECESSOR_ARTIFACT_REQUIRED");
  }
  const event = structuredClone(input.event);
  canonicalizeReceizConstitution(event);
  const receipt: ReceizConstitutionJson = {
    schema: "receiz.artifact-transition-history-receipt.v112",
    artifactId: basis.artifactId,
    registryDigest: basis.registryDigest,
    parentDigest: basis.parentDigest,
    kaiPulse: basis.kaiPulse,
    namespace: basis.namespace,
    namespaceLawVersion: basis.namespaceLawVersion,
    namespaceReducerVersion: basis.namespaceReducerVersion,
    eventDigest: basis.eventDigest,
    proposedNamespaceBodyDigest: basis.proposedNamespaceBodyDigest,
    actor: basis.actor,
  };
  return createReceizProofHistoryNode({
    artifactId: basis.artifactId,
    registryDigest: basis.registryDigest,
    parentDigests: [basis.parentDigest],
    kaiPulse: basis.kaiPulse,
    receipt,
    event: {
      type: "state.append",
      state: { namespace: basis.namespace.value, event },
    },
    namespaceData: {
      ...(input.kksCoordinate ? {
        [RECEIZ_EXACT_KKS_HISTORY_NAMESPACE]: input.kksCoordinate as unknown as ReceizConstitutionJson,
      } : {}),
      [basis.namespace.value]: {
        schema: "receiz.artifact-transition-namespace.v112",
        namespace: basis.namespace.value,
        namespaceLawVersion: basis.namespaceLawVersion,
        namespaceReducerVersion: basis.namespaceReducerVersion,
        eventDigest: basis.eventDigest,
        proposedNamespaceBodyDigest: basis.proposedNamespaceBodyDigest,
        ...(input.kksCoordinate ? { predecessorArtifactDigest: input.predecessorArtifactDigest! } : {}),
      },
    },
  });
}

export async function normalizeReceizProofHistory(input: {
  artifactId: string;
  registryDigest: string;
  nodes: readonly ReceizProofHistoryNode[];
  verifyReceipt: ReceizProofHistoryReceiptVerifier;
}): Promise<ReceizProofHistory> {
  assertReceizRuntimeMaterializationAvailable("transportedHistoryNodes", input.nodes.length);
  const artifactNamespaces = new Set<string>();
  for (const node of input.nodes) {
    if (!record(node) || !record(node.namespaceData)) continue;
    for (const namespace of Object.keys(node.namespaceData)) artifactNamespaces.add(namespace);
  }
  assertReceizProtocolMaximum("artifactNamespaces", artifactNamespaces.size);
  if (!nonempty(input.artifactId) || !DIGEST_RE.test(input.registryDigest) || input.nodes.length === 0) {
    throw new Error("HISTORY_INVALID");
  }
  const byDigest = new Map<string, ReceizProofHistoryNode>();
  for (const transported of input.nodes) {
    const node = structuredClone(transported);
    const existing = byDigest.get(node.nodeDigest);
    if (existing) {
      if (canonicalizeReceizConstitution(existing as unknown as ReceizConstitutionJson)
        !== canonicalizeReceizConstitution(node as unknown as ReceizConstitutionJson)) throw new Error("HISTORY_CONFLICT");
      continue;
    }
    assertNodeShape(node);
    if (node.artifactId !== input.artifactId || node.registryDigest !== input.registryDigest) {
      throw new Error("HISTORY_IDENTITY_MISMATCH");
    }
    const { nodeDigest, ...basis } = node;
    if (await digestReceizAuthority("history", "receiz.proof-history-node.v111", nodeBasis(basis)) !== nodeDigest) throw new Error("HISTORY_NODE_DIGEST_MISMATCH");
    if (await digestReceizAuthority("receipt", "receiz.proof-history-receipt.v111", node.receipt) !== node.receiptDigest) throw new Error("HISTORY_RECEIPT_DIGEST_MISMATCH");
    assertReceizProtocolMaximum("verifiedHistoryNodes", byDigest.size + 1);
    if (!await input.verifyReceipt(node.receipt, node.receiptDigest)) throw new Error("HISTORY_RECEIPT_INVALID");
    byDigest.set(node.nodeDigest, node);
  }

  // Only explicitly carried exact-KKS histories enter this path. Historical
  // untagged nodes retain their frozen receipt and pulse semantics.
  const exactCoordinates = new Map<string, ReceizKksV1ProofCoordinate>();
  for (const node of byDigest.values()) {
    const coordinate = await readReceizProofHistoryExactKksCoordinate(node);
    if (coordinate) exactCoordinates.set(node.nodeDigest, coordinate);
  }
  for (const node of byDigest.values()) {
    const coordinate = exactCoordinates.get(node.nodeDigest);
    const temporalParents = node.parentDigests.filter((parent) => exactCoordinates.has(parent));
    if (!coordinate) {
      if (temporalParents.length > 0) throw new TypeError("HISTORY_EXACT_KKS_REQUIRED");
      continue;
    }
    if (node.parentDigests.length === 0) {
      await admitReceizKksV1ProofCoordinate(coordinate, { expectedPreviousKaiSigilProofHead: null });
    } else {
      if (node.parentDigests.length !== 1 || temporalParents.length !== 1) {
        throw new TypeError("HISTORY_EXACT_KKS_PREDECESSOR_REQUIRED");
      }
      const predecessor = exactCoordinates.get(temporalParents[0]!)!;
      await admitReceizKksV1ProofCoordinate(coordinate, {
        expectedPreviousKaiSigilProofHead: predecessor.kaiSigil.proofHead,
        minimumExclusiveKaiUpulse: predecessor.kaiUpulse,
      });
    }
  }
  const ordered = orderedNodes(byDigest);
  for (const node of ordered) await assertProfileShowcaseOperationProjection(node, byDigest);
  const roots = ordered.filter((node) => node.parentDigests.length === 0);
  if (roots.length !== 1) throw new Error("HISTORY_CONFLICT");
  const parentSet = new Set(ordered.flatMap((node) => node.parentDigests));
  const heads = ordered.filter((node) => !parentSet.has(node.nodeDigest)).map((node) => node.nodeDigest).sort();

  let currentOwnerReceizId: string | null = null;
  let terminal: ReceizProofHistory["terminal"] = null;
  for (const node of ordered) {
    if (terminal && isAncestor(terminal.nodeDigest, node.nodeDigest, byDigest)) throw new Error("HISTORY_TERMINAL_REVERSAL");
    if (node.event.type === "ownership.transition") {
      if (currentOwnerReceizId === null) currentOwnerReceizId = node.event.fromOwnerReceizId;
      if (node.event.fromOwnerReceizId !== currentOwnerReceizId) throw new Error("HISTORY_CONFLICT");
      currentOwnerReceizId = node.event.toOwnerReceizId;
    }
    if (node.event.type === "lifecycle.terminal") {
      if (terminal) throw new Error("HISTORY_CONFLICT");
      terminal = { type: node.event.terminal, nodeDigest: node.nodeDigest };
    }
  }

  const historyBasis = {
    schema: "receiz.proof-history.v1",
    artifactId: input.artifactId,
    registryDigest: input.registryDigest,
    rootDigest: roots[0]!.nodeDigest,
    headDigests: heads,
    nodes: ordered,
    currentOwnerReceizId,
    terminal,
  } as const;
  return deepFreeze({
    ...historyBasis,
    historyDigest: await digestReceizAuthority("history", "receiz.proof-history.v111", historyBasis),
  });
}

export async function mergeReceizProofHistoryPrefix(
  prefix: ReceizProofHistory,
  additions: readonly ReceizProofHistoryNode[],
  verifyReceipt: ReceizProofHistoryReceiptVerifier,
): Promise<ReceizProofHistory> {
  const existingDigests = new Set(prefix.nodes.map((node) => node.nodeDigest));
  const novel = additions.filter((node) => !existingDigests.has(node.nodeDigest));
  const merged = await normalizeReceizProofHistory({
    artifactId: prefix.artifactId,
    registryDigest: prefix.registryDigest,
    nodes: [...prefix.nodes, ...additions],
    verifyReceipt,
  });
  if (novel.length === 0) {
    if (merged.historyDigest !== prefix.historyDigest) throw new Error("HISTORY_CONFLICT");
    return merged;
  }
  const mergedByDigest = new Map(merged.nodes.map((node) => [node.nodeDigest, node] as const));
  const novelDigests = novel.map((node) => node.nodeDigest);
  for (const priorHead of prefix.headDigests) {
    if (!novelDigests.some((digest) => isAncestor(priorHead, digest, mergedByDigest))) throw new Error("STALE_HISTORY");
  }
  return merged;
}

function assertEvidenceRoots(roots: readonly ReceizProofHistoryEvidenceRoot[]): void {
  if (roots.length === 0 || roots.some((root) =>
    !["verified-artifact-admission", "sealed-history-artifact"].includes(root.kind)
    || !DIGEST_RE.test(root.evidenceDigest)
    || !DIGEST_RE.test(root.artifactDigest)
    || !DIGEST_RE.test(root.verifierContextDigest))) {
    throw new Error("HISTORY_NOT_VERIFIED");
  }
}

async function issueRuntimeVerifiedHistory(
  history: ReceizProofHistory,
  roots: readonly ReceizProofHistoryEvidenceRoot[],
): Promise<ReceizVerifiedProofHistory> {
  if (history.headDigests.length !== 1) throw new Error("HISTORY_CONFLICT");
  assertEvidenceRoots(roots);
  const evidenceRoots = [...roots].map((root) => structuredClone(root))
    .sort((left, right) => left.evidenceDigest.localeCompare(right.evidenceDigest));
  const verificationBasis = {
    schema: "receiz.verified-proof-history.v112" as const,
    historyDigest: history.historyDigest,
    artifactId: history.artifactId,
    registryDigest: history.registryDigest,
    evidenceRoots,
  };
  const verified = deepFreeze({
    ...history,
    verification: {
      schema: "receiz.verified-proof-history.v112" as const,
      evidenceRoots,
      verificationDigest: await digestReceizAuthority(
        "history",
        "receiz.verified-proof-history.v112",
        verificationBasis,
      ),
      authority: {
        historyVerificationIsProofAuthority: false as const,
        strongerTruth: "sealed-receiz-proof-object" as const,
      },
    },
  });
  runtimeVerifiedHistories.add(verified);
  return verified;
}

/** Package-internal Task 7 authority path; intentionally omitted from index.ts. */
export async function issueReceizVerifiedArtifactTransitionHistory(input: Readonly<{
  predecessor: unknown;
  appendNode: ReceizProofHistoryNode;
  artifactDigest: string;
  verifierContextDigest: string;
}>): Promise<ReceizVerifiedProofHistory> {
  const predecessor = await verifyReceizProofHistory(input.predecessor);
  const history = await normalizeReceizProofHistory({
    artifactId: predecessor.artifactId,
    registryDigest: predecessor.registryDigest,
    nodes: [...predecessor.nodes, input.appendNode],
    verifyReceipt: async (receipt, receiptDigest) =>
      await digestReceizAuthority("receipt", "receiz.proof-history-receipt.v111", receipt) === receiptDigest,
  });
  const evidenceDigest = await digestReceizAuthority(
    "history",
    "receiz.sealed-history-artifact-evidence.v112",
    {
      artifactDigest: input.artifactDigest,
      verifierContextDigest: input.verifierContextDigest,
      historyDigest: history.historyDigest,
      headDigest: input.appendNode.nodeDigest,
    },
  );
  const issued = await issueRuntimeVerifiedHistory(history, [
    ...predecessor.verification.evidenceRoots,
    {
      kind: "sealed-history-artifact",
      evidenceDigest,
      artifactDigest: input.artifactDigest,
      verifierContextDigest: input.verifierContextDigest,
    },
  ]);
  artifactTransitionHistoryIssuanceCount += 1;
  return issued;
}

/** Testing observability only; omitted from the universal SDK entry point. */
export function readReceizArtifactTransitionHistoryIssuanceCount(): number {
  return artifactTransitionHistoryIssuanceCount;
}

export function isRuntimeVerifiedReceizProofHistory(
  value: unknown,
): value is ReceizVerifiedProofHistory {
  return value !== null && typeof value === "object" && runtimeVerifiedHistories.has(value);
}

export async function verifyReceizProofHistory(
  value: unknown,
): Promise<ReceizVerifiedProofHistory> {
  if (!isRuntimeVerifiedReceizProofHistory(value)) throw new Error("HISTORY_NOT_VERIFIED");
  const history = value;
  assertEvidenceRoots(history.verification.evidenceRoots);
  const normalized = await normalizeReceizProofHistory({
    artifactId: history.artifactId,
    registryDigest: history.registryDigest,
    nodes: history.nodes,
    verifyReceipt: async (receipt, receiptDigest) =>
      await digestReceizAuthority("receipt", "receiz.proof-history-receipt.v111", receipt) === receiptDigest,
  });
  const basis = {
    schema: "receiz.verified-proof-history.v112" as const,
    historyDigest: history.historyDigest,
    artifactId: history.artifactId,
    registryDigest: history.registryDigest,
    evidenceRoots: history.verification.evidenceRoots,
  };
  if (normalized.historyDigest !== history.historyDigest
    || await digestReceizAuthority("history", "receiz.verified-proof-history.v112", basis)
      !== history.verification.verificationDigest) throw new Error("HISTORY_NOT_VERIFIED");
  return history;
}

export function transportReceizProofHistory(
  history: ReceizVerifiedProofHistory,
): ReceizProofHistory {
  const { verification: _verification, ...transport } = history;
  return structuredClone(transport);
}

/**
 * Reconstructs runtime verified history only from history carried inside the
 * exact sealed artifact currently being admitted. The new evidence root binds
 * the transported nodes to those exact enclosing bytes.
 */
export async function verifyReceizCarriedProofHistory(input: Readonly<{
  history: unknown;
  artifactId: string;
  registryDigest: string;
  artifactDigest: string;
  verifierContextDigest: string;
}>): Promise<ReceizVerifiedProofHistory> {
  if (!record(input.history)) throw new Error("HISTORY_NOT_VERIFIED");
  const candidate = input.history as unknown as ReceizProofHistory;
  const normalized = await normalizeReceizProofHistory({
    artifactId: input.artifactId,
    registryDigest: input.registryDigest,
    nodes: candidate.nodes,
    verifyReceipt: async (receipt, receiptDigest) =>
      await digestReceizAuthority("receipt", "receiz.proof-history-receipt.v111", receipt) === receiptDigest,
  });
  if (candidate.schema !== "receiz.proof-history.v1"
    || candidate.artifactId !== input.artifactId
    || candidate.registryDigest !== input.registryDigest
    || candidate.historyDigest !== normalized.historyDigest
    || canonicalizeReceizConstitution(candidate as unknown as ReceizConstitutionJson)
      !== canonicalizeReceizConstitution(normalized as unknown as ReceizConstitutionJson)) {
    throw new Error("HISTORY_NOT_VERIFIED");
  }
  const evidenceDigest = await digestReceizAuthority(
    "history",
    "receiz.carried-proof-history-evidence.v113",
    {
      artifactDigest: input.artifactDigest,
      verifierContextDigest: input.verifierContextDigest,
      historyDigest: normalized.historyDigest,
    },
  );
  return issueRuntimeVerifiedHistory(normalized, [{
    kind: "sealed-history-artifact",
    evidenceDigest,
    artifactDigest: input.artifactDigest,
    verifierContextDigest: input.verifierContextDigest,
  }]);
}

/**
 * Derives and issues the genesis verified history directly from one
 * runtime-verified artifact admission; no caller-supplied history is trusted.
 */
export async function deriveReceizVerifiedProofHistoryFromAdmission(
  admissionInput: unknown,
): Promise<ReceizVerifiedProofHistory> {
  const admission = await verifyReceizArtifactAdmission(admissionInput);
  if ("code" in admission) {
    throw new Error("HISTORY_NOT_VERIFIED");
  }
  const registryEvidence = await verifyReceizArtifactAdmissionRegistryEvidence(admission);
  const registryDigest = registryEvidence.registryDigest;
  const receipt: ReceizConstitutionJson = {
    schema: "receiz.artifact-admission-evidence.v1",
    artifactSha256: admission.artifactSha256,
    payloadSha256: admission.payloadSha256,
    verdict: admission.verdict,
  };
  const node = await createReceizProofHistoryNode({
    artifactId: admission.artifactId,
    registryDigest,
    parentDigests: [],
    kaiPulse: registryEvidence.registryEffectiveKai,
    receipt,
    event: {
      type: "state.append",
      state: structuredClone(admission.recoveredState) as ReceizConstitutionJson,
    },
    namespaceData: {
      "receiz.artifact-admission": {
        artifactSha256: admission.artifactSha256,
        payloadSha256: admission.payloadSha256,
      },
    },
  });
  const history = await normalizeReceizProofHistory({
    artifactId: admission.artifactId,
    registryDigest,
    nodes: [node],
    verifyReceipt: async (_receipt, digest) => digest === node.receiptDigest,
  });
  return issueRuntimeVerifiedHistory(history, [{
    kind: "verified-artifact-admission",
    evidenceDigest: admission.admissionProof.admissionProofDigest,
    artifactDigest: admission.artifactSha256,
    verifierContextDigest: admission.admissionProof.verifierContextDigest,
  }]);
}

export async function mergeReceizVerifiedProofHistories(
  prefix: ReceizVerifiedProofHistory,
  known: ReceizVerifiedProofHistory,
  verifyReceipt: ReceizProofHistoryReceiptVerifier,
): Promise<ReceizVerifiedProofHistory> {
  const verifiedPrefix = await verifyReceizProofHistory(prefix);
  const verifiedKnown = await verifyReceizProofHistory(known);
  if (verifiedPrefix.artifactId !== verifiedKnown.artifactId
    || verifiedPrefix.registryDigest !== verifiedKnown.registryDigest) throw new Error("HISTORY_IDENTITY_MISMATCH");
  const merged = await mergeReceizProofHistoryPrefix(verifiedPrefix, verifiedKnown.nodes, verifyReceipt);
  return issueRuntimeVerifiedHistory(merged, [
    ...verifiedPrefix.verification.evidenceRoots,
    ...verifiedKnown.verification.evidenceRoots,
  ]);
}
