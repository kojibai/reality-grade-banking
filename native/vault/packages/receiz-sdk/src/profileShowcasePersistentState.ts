import {
  canonicalizeReceizConstitution,
  type ReceizConstitutionJson,
} from "./constitution.js";
import { digestReceizCompositeCanonical } from "./compositeProofKernel.js";

const DIGEST_RE = /^[0-9a-f]{64}$/;
const KAI_RE = /^(0|[1-9][0-9]*)$/;

function fail(code: string): never {
  throw new TypeError(code);
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactChildKey(value: Record<string, unknown>): string {
  if (
    typeof value.stableChildArtifactId !== "string"
    || value.stableChildArtifactId.length === 0
    || typeof value.immutableVersion !== "string"
    || value.immutableVersion.length === 0
    || typeof value.childArtifactDigest !== "string"
    || !DIGEST_RE.test(value.childArtifactDigest)
  ) fail("PROFILE_SHOWCASE_PERSISTENT_CHILD_KEY_INVALID");
  return digestReceizCompositeCanonical({
    kind: "receiz.profile-showcase.persistent-child-key.v114",
    stableChildArtifactId: value.stableChildArtifactId,
    immutableVersion: value.immutableVersion,
    childArtifactDigest: value.childArtifactDigest,
  });
}

export type ReceizProfileShowcasePersistentPlacementV114 = Readonly<{
  reference: Readonly<Record<string, unknown>>;
  visibility: "visible" | "unlisted" | "hidden";
  pinned: boolean;
  sectionId: string | null;
  provenanceEvidenceRoots: readonly string[];
  orderKey: string;
  membershipOperationCount: number;
  membershipWitness: Readonly<Record<string, unknown>>;
}>;

type PlacementNodeValue = Readonly<{
  kind: "placement";
  placement: ReceizProfileShowcasePersistentPlacementV114;
}>;

type OrderNodeValue = Readonly<{
  kind: "order";
  placementKey: string;
  visible: boolean;
}>;

export type ReceizProfileShowcasePersistentNodeV114 = Readonly<{
  schema: "receiz.profile-showcase.persistent-node.v114";
  tree: "placement" | "order";
  key: string;
  priority: string;
  value: PlacementNodeValue | OrderNodeValue;
  left: string | null;
  right: string | null;
  size: number;
  visibleCount: number;
  digest: string;
}>;

export type ReceizProfileShowcasePersistentStateIOV114 = Readonly<{
  resolveNode(
    digest: string,
  ): ReceizProfileShowcasePersistentNodeV114 | null
    | Promise<ReceizProfileShowcasePersistentNodeV114 | null>;
  writeNode(
    node: ReceizProfileShowcasePersistentNodeV114,
  ): void | Promise<void>;
}>;

export type ReceizProfileShowcasePersistentCountsV114 = Readonly<{
  operationCount: number;
  membershipCount: number;
  visibleCount: number;
  hiddenCount: number;
  unlistedCount: number;
  pinnedCount: number;
}>;

export type ReceizProfileShowcasePersistentStateV114 = Readonly<{
  schema: "receiz.profile-showcase.persistent-state.v114";
  placementRoot: string;
  orderRoot: string;
  counts: ReceizProfileShowcasePersistentCountsV114;
  maximumKaiUpulse: string;
}>;

export type ReceizProfileShowcasePersistentWindowV114 = Readonly<{
  children: readonly Readonly<{
    reference: Readonly<Record<string, unknown>>;
    membershipWitness: Readonly<Record<string, unknown>>;
  }>[];
  continuation: Readonly<{
    nextVisibleIndex: number;
    placementRoot: string;
    orderRoot: string;
    lastOrderKey: string;
    witnessNodeDigests: readonly string[];
  }> | null;
  witnessNodes: readonly ReceizProfileShowcasePersistentNodeV114[];
}>;

export const RECEIZ_PROFILE_SHOWCASE_EMPTY_PLACEMENT_ROOT_V114 =
  digestReceizCompositeCanonical({
    kind: "receiz.profile-showcase.empty-placement-root.v114",
  });
export const RECEIZ_PROFILE_SHOWCASE_EMPTY_ORDER_ROOT_V114 =
  digestReceizCompositeCanonical({
    kind: "receiz.profile-showcase.empty-order-root.v114",
  });

function emptyRoot(tree: "placement" | "order"): string {
  return tree === "placement"
    ? RECEIZ_PROFILE_SHOWCASE_EMPTY_PLACEMENT_ROOT_V114
    : RECEIZ_PROFILE_SHOWCASE_EMPTY_ORDER_ROOT_V114;
}

function nodeBasis(node: Omit<ReceizProfileShowcasePersistentNodeV114, "digest">) {
  return {
    schema: node.schema,
    tree: node.tree,
    key: node.key,
    priority: node.priority,
    value: node.value as unknown as ReceizConstitutionJson,
    left: node.left,
    right: node.right,
    size: node.size,
    visibleCount: node.visibleCount,
  };
}

function nodeDigest(
  node: Omit<ReceizProfileShowcasePersistentNodeV114, "digest">,
): string {
  return digestReceizCompositeCanonical({
    kind: "receiz.profile-showcase.persistent-node.v114",
    node: nodeBasis(node),
  });
}

function assertNode(
  node: ReceizProfileShowcasePersistentNodeV114,
  expectedDigest: string,
  tree: "placement" | "order",
): void {
  if (
    node.schema !== "receiz.profile-showcase.persistent-node.v114"
    || node.tree !== tree
    || node.digest !== expectedDigest
    || nodeDigest(node) !== expectedDigest
    || !DIGEST_RE.test(node.priority)
    || !Number.isSafeInteger(node.size)
    || node.size < 1
    || !Number.isSafeInteger(node.visibleCount)
    || node.visibleCount < 0
    || node.visibleCount > node.size
    || (node.left !== null && !DIGEST_RE.test(node.left))
    || (node.right !== null && !DIGEST_RE.test(node.right))
  ) fail("PROFILE_SHOWCASE_PERSISTENT_NODE_INVALID");
}

async function loadNode(
  io: ReceizProfileShowcasePersistentStateIOV114,
  tree: "placement" | "order",
  digest: string | null,
): Promise<ReceizProfileShowcasePersistentNodeV114 | null> {
  if (digest === null || digest === emptyRoot(tree)) return null;
  if (!DIGEST_RE.test(digest)) fail("PROFILE_SHOWCASE_PERSISTENT_ROOT_INVALID");
  const node = await io.resolveNode(digest);
  if (!node) fail("PROFILE_SHOWCASE_PERSISTENT_NODE_MISSING");
  assertNode(node, digest, tree);
  return node;
}

async function persistNode(
  io: ReceizProfileShowcasePersistentStateIOV114,
  input: Readonly<{
    tree: "placement" | "order";
    key: string;
    priority: string;
    value: PlacementNodeValue | OrderNodeValue;
    left: string | null;
    right: string | null;
  }>,
): Promise<string> {
  const left = await loadNode(io, input.tree, input.left);
  const right = await loadNode(io, input.tree, input.right);
  const basis = {
    schema: "receiz.profile-showcase.persistent-node.v114" as const,
    ...input,
    size: 1 + (left?.size ?? 0) + (right?.size ?? 0),
    visibleCount: input.tree === "order"
      ? ((input.value as OrderNodeValue).visible ? 1 : 0)
        + (left?.visibleCount ?? 0)
        + (right?.visibleCount ?? 0)
      : 0,
  };
  const node = Object.freeze({
    ...basis,
    digest: nodeDigest(basis),
  });
  await io.writeNode(node);
  return node.digest;
}

function parseOrderKey(value: string): { numerator: bigint; exponent: bigint } {
  const match = /^(0|-?[1-9][0-9]*):(0|[1-9][0-9]*)$/.exec(value);
  if (!match) fail("PROFILE_SHOWCASE_PERSISTENT_ORDER_KEY_INVALID");
  return { numerator: BigInt(match[1]!), exponent: BigInt(match[2]!) };
}

function canonicalOrderKey(numerator: bigint, exponent: bigint): string {
  if (exponent < 0n) fail("PROFILE_SHOWCASE_PERSISTENT_ORDER_KEY_INVALID");
  while (exponent > 0n && numerator % 2n === 0n) {
    numerator /= 2n;
    exponent -= 1n;
  }
  return `${numerator}:${exponent}`;
}

function compareOrderKeys(leftValue: string, rightValue: string): number {
  const left = parseOrderKey(leftValue);
  const right = parseOrderKey(rightValue);
  const exponent = left.exponent > right.exponent ? left.exponent : right.exponent;
  const leftNumerator = left.numerator << (exponent - left.exponent);
  const rightNumerator = right.numerator << (exponent - right.exponent);
  return leftNumerator < rightNumerator ? -1 : leftNumerator > rightNumerator ? 1 : 0;
}

function orderKeyBefore(value: string): string {
  const parsed = parseOrderKey(value);
  return canonicalOrderKey(parsed.numerator - (1n << parsed.exponent), parsed.exponent);
}

function orderKeyAfter(value: string): string {
  const parsed = parseOrderKey(value);
  return canonicalOrderKey(parsed.numerator + (1n << parsed.exponent), parsed.exponent);
}

function orderKeyBetween(leftValue: string, rightValue: string): string {
  const left = parseOrderKey(leftValue);
  const right = parseOrderKey(rightValue);
  const exponent = (left.exponent > right.exponent ? left.exponent : right.exponent) + 1n;
  const leftNumerator = left.numerator << (exponent - left.exponent);
  const rightNumerator = right.numerator << (exponent - right.exponent);
  if (leftNumerator >= rightNumerator) {
    fail("PROFILE_SHOWCASE_PERSISTENT_ORDER_KEY_INVALID");
  }
  return canonicalOrderKey((leftNumerator + rightNumerator) / 2n, exponent);
}

function compareKeys(
  tree: "placement" | "order",
  left: string,
  right: string,
): number {
  if (tree === "order") return compareOrderKeys(left, right);
  return left < right ? -1 : left > right ? 1 : 0;
}

async function rotateRight(
  io: ReceizProfileShowcasePersistentStateIOV114,
  node: ReceizProfileShowcasePersistentNodeV114,
  left: ReceizProfileShowcasePersistentNodeV114,
): Promise<string> {
  const nextRight = await persistNode(io, {
    tree: node.tree,
    key: node.key,
    priority: node.priority,
    value: node.value,
    left: left.right,
    right: node.right,
  });
  return persistNode(io, {
    tree: left.tree,
    key: left.key,
    priority: left.priority,
    value: left.value,
    left: left.left,
    right: nextRight,
  });
}

async function rotateLeft(
  io: ReceizProfileShowcasePersistentStateIOV114,
  node: ReceizProfileShowcasePersistentNodeV114,
  right: ReceizProfileShowcasePersistentNodeV114,
): Promise<string> {
  const nextLeft = await persistNode(io, {
    tree: node.tree,
    key: node.key,
    priority: node.priority,
    value: node.value,
    left: node.left,
    right: right.left,
  });
  return persistNode(io, {
    tree: right.tree,
    key: right.key,
    priority: right.priority,
    value: right.value,
    left: nextLeft,
    right: right.right,
  });
}

async function upsert(
  io: ReceizProfileShowcasePersistentStateIOV114,
  tree: "placement" | "order",
  root: string,
  key: string,
  priority: string,
  value: PlacementNodeValue | OrderNodeValue,
): Promise<string> {
  const node = await loadNode(io, tree, root);
  if (!node) {
    return persistNode(io, {
      tree,
      key,
      priority,
      value,
      left: null,
      right: null,
    });
  }
  const comparison = compareKeys(tree, key, node.key);
  if (comparison === 0) {
    if (node.priority !== priority) fail("PROFILE_SHOWCASE_PERSISTENT_PRIORITY_INVALID");
    return persistNode(io, {
      tree,
      key,
      priority,
      value,
      left: node.left,
      right: node.right,
    });
  }
  if (comparison < 0) {
    const leftDigest = await upsert(
      io,
      tree,
      node.left ?? emptyRoot(tree),
      key,
      priority,
      value,
    );
    const left = await loadNode(io, tree, leftDigest);
    if (!left) fail("PROFILE_SHOWCASE_PERSISTENT_NODE_MISSING");
    const updatedDigest = await persistNode(io, {
      tree,
      key: node.key,
      priority: node.priority,
      value: node.value,
      left: leftDigest,
      right: node.right,
    });
    const updated = await loadNode(io, tree, updatedDigest);
    if (!updated) fail("PROFILE_SHOWCASE_PERSISTENT_NODE_MISSING");
    return left.priority < updated.priority
      ? rotateRight(io, updated, left)
      : updatedDigest;
  }
  const rightDigest = await upsert(
    io,
    tree,
    node.right ?? emptyRoot(tree),
    key,
    priority,
    value,
  );
  const right = await loadNode(io, tree, rightDigest);
  if (!right) fail("PROFILE_SHOWCASE_PERSISTENT_NODE_MISSING");
  const updatedDigest = await persistNode(io, {
    tree,
    key: node.key,
    priority: node.priority,
    value: node.value,
    left: node.left,
    right: rightDigest,
  });
  const updated = await loadNode(io, tree, updatedDigest);
  if (!updated) fail("PROFILE_SHOWCASE_PERSISTENT_NODE_MISSING");
  return right.priority < updated.priority
    ? rotateLeft(io, updated, right)
    : updatedDigest;
}

async function mergeTrees(
  io: ReceizProfileShowcasePersistentStateIOV114,
  tree: "placement" | "order",
  leftDigest: string | null,
  rightDigest: string | null,
): Promise<string> {
  const left = await loadNode(io, tree, leftDigest);
  const right = await loadNode(io, tree, rightDigest);
  if (!left) return right?.digest ?? emptyRoot(tree);
  if (!right) return left.digest;
  if (left.priority < right.priority) {
    const merged = await mergeTrees(io, tree, left.right, right.digest);
    return persistNode(io, {
      tree,
      key: left.key,
      priority: left.priority,
      value: left.value,
      left: left.left,
      right: merged === emptyRoot(tree) ? null : merged,
    });
  }
  const merged = await mergeTrees(io, tree, left.digest, right.left);
  return persistNode(io, {
    tree,
    key: right.key,
    priority: right.priority,
    value: right.value,
    left: merged === emptyRoot(tree) ? null : merged,
    right: right.right,
  });
}

async function remove(
  io: ReceizProfileShowcasePersistentStateIOV114,
  tree: "placement" | "order",
  root: string,
  key: string,
): Promise<string> {
  const node = await loadNode(io, tree, root);
  if (!node) fail("PROFILE_SHOWCASE_PERSISTENT_PLACEMENT_MISSING");
  const comparison = compareKeys(tree, key, node.key);
  if (comparison === 0) return mergeTrees(io, tree, node.left, node.right);
  if (comparison < 0) {
    const left = await remove(io, tree, node.left ?? emptyRoot(tree), key);
    return persistNode(io, {
      tree,
      key: node.key,
      priority: node.priority,
      value: node.value,
      left: left === emptyRoot(tree) ? null : left,
      right: node.right,
    });
  }
  const right = await remove(io, tree, node.right ?? emptyRoot(tree), key);
  return persistNode(io, {
    tree,
    key: node.key,
    priority: node.priority,
    value: node.value,
    left: node.left,
    right: right === emptyRoot(tree) ? null : right,
  });
}

async function find(
  io: ReceizProfileShowcasePersistentStateIOV114,
  tree: "placement" | "order",
  root: string,
  key: string,
): Promise<ReceizProfileShowcasePersistentNodeV114 | null> {
  let cursor = root;
  for (;;) {
    const node = await loadNode(io, tree, cursor);
    if (!node) return null;
    const comparison = compareKeys(tree, key, node.key);
    if (comparison === 0) return node;
    cursor = comparison < 0
      ? node.left ?? emptyRoot(tree)
      : node.right ?? emptyRoot(tree);
  }
}

async function edgeNode(
  io: ReceizProfileShowcasePersistentStateIOV114,
  tree: "placement" | "order",
  root: string,
  direction: "left" | "right",
): Promise<ReceizProfileShowcasePersistentNodeV114 | null> {
  let node = await loadNode(io, tree, root);
  while (node) {
    const nextDigest = direction === "left" ? node.left : node.right;
    if (!nextDigest) return node;
    node = await loadNode(io, tree, nextDigest);
  }
  return null;
}

async function successorOrderNode(
  io: ReceizProfileShowcasePersistentStateIOV114,
  root: string,
  key: string,
): Promise<ReceizProfileShowcasePersistentNodeV114 | null> {
  let cursor = root;
  let successor: ReceizProfileShowcasePersistentNodeV114 | null = null;
  for (;;) {
    const node = await loadNode(io, "order", cursor);
    if (!node) return successor;
    if (compareOrderKeys(key, node.key) < 0) {
      successor = node;
      cursor = node.left ?? RECEIZ_PROFILE_SHOWCASE_EMPTY_ORDER_ROOT_V114;
    } else {
      cursor = node.right ?? RECEIZ_PROFILE_SHOWCASE_EMPTY_ORDER_ROOT_V114;
    }
  }
}

function placementValue(
  node: ReceizProfileShowcasePersistentNodeV114 | null,
): ReceizProfileShowcasePersistentPlacementV114 {
  if (!node || node.value.kind !== "placement") {
    fail("PROFILE_SHOWCASE_PERSISTENT_PLACEMENT_MISSING");
  }
  return node.value.placement;
}

function priority(tree: "placement" | "order", placementKey: string): string {
  return digestReceizCompositeCanonical({
    kind: "receiz.profile-showcase.persistent-priority.v114",
    tree,
    placementKey,
  });
}

export function createEmptyReceizProfileShowcasePersistentStateV114(
  genesisKaiUpulse: string,
): ReceizProfileShowcasePersistentStateV114 {
  if (!KAI_RE.test(genesisKaiUpulse)) {
    fail("PROFILE_SHOWCASE_PERSISTENT_KAI_INVALID");
  }
  return Object.freeze({
    schema: "receiz.profile-showcase.persistent-state.v114",
    placementRoot: RECEIZ_PROFILE_SHOWCASE_EMPTY_PLACEMENT_ROOT_V114,
    orderRoot: RECEIZ_PROFILE_SHOWCASE_EMPTY_ORDER_ROOT_V114,
    counts: Object.freeze({
      operationCount: 0,
      membershipCount: 0,
      visibleCount: 0,
      hiddenCount: 0,
      unlistedCount: 0,
      pinnedCount: 0,
    }),
    maximumKaiUpulse: genesisKaiUpulse,
  });
}

export async function reduceReceizProfileShowcasePersistentStateV114(input: Readonly<{
  state: ReceizProfileShowcasePersistentStateV114;
  operation: ReceizConstitutionJson;
  membershipWitness: Readonly<Record<string, unknown>>;
  io: ReceizProfileShowcasePersistentStateIOV114;
  expectedPriorCommittedCount?: number;
  expectedDirectDeltaPosition?: number;
}>): Promise<ReceizProfileShowcasePersistentStateV114> {
  if (!record(input.operation)) fail("PROFILE_SHOWCASE_PERSISTENT_OPERATION_INVALID");
  const operation = input.operation;
  if (
    operation.priorCommittedCount !== (
      input.expectedPriorCommittedCount ?? input.state.counts.operationCount
    )
    || operation.directDeltaPosition !== (
      input.expectedDirectDeltaPosition ?? 0
    )
    || !record(operation.kai)
    || typeof operation.kai.upulse !== "string"
    || !KAI_RE.test(operation.kai.upulse)
  ) fail("PROFILE_SHOWCASE_PERSISTENT_OPERATION_INVALID");
  const operationUpulse = BigInt(operation.kai.upulse);
  const priorUpulse = BigInt(input.state.maximumKaiUpulse);
  if (operationUpulse < priorUpulse) fail("PROFILE_SHOWCASE_BOUNDED_KAI_REGRESSION");

  let placementRoot = input.state.placementRoot;
  let orderRoot = input.state.orderRoot;
  const counts = { ...input.state.counts, operationCount: input.state.counts.operationCount + 1 };

  if (operation.kind === "showcase.merge") {
    if (
      !Array.isArray(operation.mergedParentArtifactDigests)
      || operation.mergedParentArtifactDigests.length < 2
      || operation.mergedParentArtifactDigests.some(
        (digest) => typeof digest !== "string" || !DIGEST_RE.test(digest),
      )
      || !Array.isArray(operation.mergedChildren)
    ) fail("PROFILE_SHOWCASE_PERSISTENT_MERGE_INVALID");
    const seen = new Set<string>();
    for (const candidate of operation.mergedChildren) {
      if (!record(candidate)) fail("PROFILE_SHOWCASE_PERSISTENT_MERGE_INVALID");
      const placementKey = exactChildKey(candidate);
      if (seen.has(placementKey)) {
        fail("PROFILE_SHOWCASE_PERSISTENT_MERGE_CHILD_DUPLICATE");
      }
      seen.add(placementKey);
      const existingNode = await find(
        input.io,
        "placement",
        placementRoot,
        placementKey,
      );
      const existing = existingNode ? placementValue(existingNode) : null;
      if (existing) {
        if (
          canonicalizeReceizConstitution(
            existing.reference as unknown as ReceizConstitutionJson,
          ) !== canonicalizeReceizConstitution(
            candidate as unknown as ReceizConstitutionJson,
          )
        ) fail("PROFILE_SHOWCASE_PERSISTENT_MERGE_CHILD_CONFLICT");
        continue;
      }
      const lastOrder = await edgeNode(input.io, "order", orderRoot, "right");
      const orderKey = lastOrder ? orderKeyAfter(lastOrder.key) : "0:0";
      const placement: ReceizProfileShowcasePersistentPlacementV114 = {
        reference: structuredClone(candidate),
        visibility: "visible",
        pinned: false,
        sectionId: null,
        provenanceEvidenceRoots: [],
        orderKey,
        membershipOperationCount: counts.operationCount,
        membershipWitness: structuredClone(input.membershipWitness),
      };
      placementRoot = await upsert(
        input.io,
        "placement",
        placementRoot,
        placementKey,
        priority("placement", placementKey),
        { kind: "placement", placement },
      );
      orderRoot = await upsert(
        input.io,
        "order",
        orderRoot,
        orderKey,
        priority("order", placementKey),
        { kind: "order", placementKey, visible: true },
      );
      counts.membershipCount += 1;
      counts.visibleCount += 1;
    }
    return Object.freeze({
      schema: "receiz.profile-showcase.persistent-state.v114",
      placementRoot,
      orderRoot,
      counts: Object.freeze(counts),
      maximumKaiUpulse: operation.kai.upulse,
    });
  }

  const child = record(operation.child) ? operation.child : null;
  const placementKey = child ? exactChildKey(child) : null;
  const existingNode = placementKey
    ? await find(input.io, "placement", placementRoot, placementKey)
    : null;
  const existing = existingNode ? placementValue(existingNode) : null;

  if (operation.kind === "showcase.append") {
    if (!child || existing) fail("PROFILE_SHOWCASE_BOUNDED_CHILD_DUPLICATE");
    const lastOrder = await edgeNode(input.io, "order", orderRoot, "right");
    const orderKey = lastOrder ? orderKeyAfter(lastOrder.key) : "0:0";
    const placement: ReceizProfileShowcasePersistentPlacementV114 = {
      reference: structuredClone(child),
      visibility: "visible",
      pinned: false,
      sectionId: null,
      provenanceEvidenceRoots: [],
      orderKey,
      membershipOperationCount: counts.operationCount,
      membershipWitness: structuredClone(input.membershipWitness),
    };
    placementRoot = await upsert(
      input.io,
      "placement",
      placementRoot,
      placementKey!,
      priority("placement", placementKey!),
      { kind: "placement", placement },
    );
    orderRoot = await upsert(
      input.io,
      "order",
      orderRoot,
      orderKey,
      priority("order", placementKey!),
      { kind: "order", placementKey: placementKey!, visible: true },
    );
    counts.membershipCount += 1;
    counts.visibleCount += 1;
  } else {
    if (!child || !placementKey || !existing) {
      fail("PROFILE_SHOWCASE_PERSISTENT_PLACEMENT_MISSING");
    }
    let placement = existing;
    if (operation.kind === "showcase.visibility.set") {
      if (!["visible", "hidden", "unlisted"].includes(operation.visibility as string)) {
        fail("PROFILE_SHOWCASE_PERSISTENT_OPERATION_INVALID");
      }
      const visibility = operation.visibility as "visible" | "hidden" | "unlisted";
      if (visibility !== placement.visibility) {
        counts[`${placement.visibility}Count` as "visibleCount"] -= 1;
        counts[`${visibility}Count` as "visibleCount"] += 1;
        placement = { ...placement, visibility };
        orderRoot = await upsert(
          input.io,
          "order",
          orderRoot,
          placement.orderKey,
          priority("order", placementKey),
          { kind: "order", placementKey, visible: visibility === "visible" },
        );
      }
    } else if (
      operation.kind === "showcase.presentation.pin"
      || operation.kind === "showcase.presentation.unpin"
    ) {
      const pinned = operation.kind === "showcase.presentation.pin";
      if (pinned !== placement.pinned) {
        counts.pinnedCount += pinned ? 1 : -1;
        placement = { ...placement, pinned };
      }
    } else if (operation.kind === "showcase.section.assign") {
      if (operation.sectionId !== null && typeof operation.sectionId !== "string") {
        fail("PROFILE_SHOWCASE_PERSISTENT_OPERATION_INVALID");
      }
      placement = { ...placement, sectionId: operation.sectionId as string | null };
    } else if (operation.kind === "showcase.provenance.bind") {
      if (
        typeof operation.provenanceEvidenceRoot !== "string"
        || !DIGEST_RE.test(operation.provenanceEvidenceRoot)
      ) fail("PROFILE_SHOWCASE_PERSISTENT_OPERATION_INVALID");
      if (!placement.provenanceEvidenceRoots.includes(operation.provenanceEvidenceRoot)) {
        placement = {
          ...placement,
          provenanceEvidenceRoots: [
            ...placement.provenanceEvidenceRoots,
            operation.provenanceEvidenceRoot,
          ],
        };
      }
    } else if (operation.kind === "showcase.order.supersede") {
      const after = operation.afterChild;
      if (after !== null && !record(after)) {
        fail("PROFILE_SHOWCASE_PERSISTENT_OPERATION_INVALID");
      }
      const afterKey = after ? exactChildKey(after) : null;
      if (afterKey === placementKey) fail("PROFILE_SHOWCASE_ORDER_SELF_REFERENCE");
      const afterPlacement = afterKey
        ? placementValue(await find(input.io, "placement", placementRoot, afterKey))
        : null;
      orderRoot = await remove(input.io, "order", orderRoot, placement.orderKey);
      const successor = afterPlacement
        ? await successorOrderNode(input.io, orderRoot, afterPlacement.orderKey)
        : await edgeNode(input.io, "order", orderRoot, "left");
      const nextOrderKey = afterPlacement
        ? successor
          ? orderKeyBetween(afterPlacement.orderKey, successor.key)
          : orderKeyAfter(afterPlacement.orderKey)
        : successor
          ? orderKeyBefore(successor.key)
          : "0:0";
      placement = { ...placement, orderKey: nextOrderKey };
      orderRoot = await upsert(
        input.io,
        "order",
        orderRoot,
        nextOrderKey,
        priority("order", placementKey),
        {
          kind: "order",
          placementKey,
          visible: placement.visibility === "visible",
        },
      );
    } else {
      fail("PROFILE_SHOWCASE_PERSISTENT_OPERATION_INVALID");
    }
    placementRoot = await upsert(
      input.io,
      "placement",
      placementRoot,
      placementKey,
      priority("placement", placementKey),
      { kind: "placement", placement },
    );
  }

  return Object.freeze({
    schema: "receiz.profile-showcase.persistent-state.v114",
    placementRoot,
    orderRoot,
    counts: Object.freeze(counts),
    maximumKaiUpulse: operation.kai.upulse,
  });
}

/**
 * Resolve one child's placement beneath an accepted enclosing Showcase root.
 * The existing lookup verifies each node on that path; caller-supplied roots
 * do not become admission or authority through this mechanics-only read.
 */
export async function deriveReceizProfileShowcasePersistentPlacementV114(input: Readonly<{
  placementRoot: string;
  io: ReceizProfileShowcasePersistentStateIOV114;
  child: Readonly<Record<string, unknown>>;
}>): Promise<ReceizProfileShowcasePersistentPlacementV114 | null> {
  const key = exactChildKey(input.child);
  const node = await find(input.io, "placement", input.placementRoot, key);
  if (!node) return null;
  const placement = placementValue(node);
  if (exactChildKey(placement.reference) !== key
    || !["visible", "hidden", "unlisted"].includes(placement.visibility)) {
    fail("PROFILE_SHOWCASE_PERSISTENT_MEMBERSHIP_PLACEMENT_INVALID");
  }
  return Object.freeze(structuredClone(placement));
}

export async function deriveReceizProfileShowcasePersistentWindowV114(input: Readonly<{
  state: ReceizProfileShowcasePersistentStateV114;
  io: ReceizProfileShowcasePersistentStateIOV114;
  limit?: number;
}>): Promise<ReceizProfileShowcasePersistentWindowV114> {
  const limit = input.limit ?? 256;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 256) {
    fail("PROFILE_SHOWCASE_PERSISTENT_WINDOW_LIMIT_INVALID");
  }
  const witnessed = new Map<string, ReceizProfileShowcasePersistentNodeV114>();
  const resolvingIO: ReceizProfileShowcasePersistentStateIOV114 = {
    resolveNode: async (digest) => {
      const node = await input.io.resolveNode(digest);
      if (node) witnessed.set(digest, node);
      return node;
    },
    writeNode: input.io.writeNode,
  };
  const orderNodes: ReceizProfileShowcasePersistentNodeV114[] = [];
  const visit = async (digest: string | null): Promise<void> => {
    if (orderNodes.length >= limit) return;
    const node = await loadNode(resolvingIO, "order", digest);
    if (!node || node.visibleCount === 0) return;
    await visit(node.left);
    if (
      orderNodes.length < limit
      && node.value.kind === "order"
      && node.value.visible
    ) orderNodes.push(node);
    await visit(node.right);
  };
  await visit(input.state.orderRoot);
  const children = [];
  for (const orderNode of orderNodes) {
    if (orderNode.value.kind !== "order") {
      fail("PROFILE_SHOWCASE_PERSISTENT_ORDER_NODE_INVALID");
    }
    const placement = placementValue(await find(
      resolvingIO,
      "placement",
      input.state.placementRoot,
      orderNode.value.placementKey,
    ));
    children.push({
      reference: structuredClone(placement.reference),
      membershipWitness: structuredClone(placement.membershipWitness),
    });
  }
  const continuation = input.state.counts.visibleCount > children.length
    ? {
        nextVisibleIndex: children.length,
        placementRoot: input.state.placementRoot,
        orderRoot: input.state.orderRoot,
        lastOrderKey: orderNodes.at(-1)?.key ?? "0:0",
        witnessNodeDigests: [...witnessed.keys()].sort(),
      }
    : null;
  return Object.freeze({
    children: Object.freeze(children),
    continuation: continuation ? Object.freeze(continuation) : null,
    witnessNodes: Object.freeze([...witnessed.values()]),
  });
}

/**
 * Complete state projection beneath an accepted enclosing Showcase's roots.
 * This function validates reachable state mechanics; it does not admit a
 * Showcase or confer authority on caller-supplied roots.
 */
export async function deriveReceizProfileShowcasePersistentMembershipV114(input: Readonly<{
  state: ReceizProfileShowcasePersistentStateV114;
  io: ReceizProfileShowcasePersistentStateIOV114;
}>): Promise<Readonly<{
  placements: readonly ReceizProfileShowcasePersistentPlacementV114[];
  witnessNodes: readonly ReceizProfileShowcasePersistentNodeV114[];
}>> {
  const witnessed = new Map<string, ReceizProfileShowcasePersistentNodeV114>();
  const trees = { placement: new Map<string, ReceizProfileShowcasePersistentNodeV114>(),
    order: new Map<string, ReceizProfileShowcasePersistentNodeV114>() };
  const visit = async (
    tree: "placement" | "order", digest: string | null,
    lower: string | null, upper: string | null,
  ): Promise<{ size: number; visibleCount: number }> => {
    const node = await loadNode(input.io, tree, digest);
    if (!node) return { size: 0, visibleCount: 0 };
    if (witnessed.has(node.digest)
      || (lower !== null && compareKeys(tree, node.key, lower) <= 0)
      || (upper !== null && compareKeys(tree, node.key, upper) >= 0)
      || node.value.kind !== tree) fail("PROFILE_SHOWCASE_PERSISTENT_MEMBERSHIP_TREE_INVALID");
    witnessed.set(node.digest, node);
    const left = await visit(tree, node.left, lower, node.key);
    trees[tree].set(node.key, node);
    const right = await visit(tree, node.right, node.key, upper);
    const size = 1 + left.size + right.size;
    const visibleCount = left.visibleCount + right.visibleCount
      + (node.value.kind === "order" && node.value.visible ? 1 : 0);
    if (node.size !== size || node.visibleCount !== visibleCount) {
      fail("PROFILE_SHOWCASE_PERSISTENT_MEMBERSHIP_TREE_INVALID");
    }
    return { size, visibleCount };
  };
  await visit("placement", input.state.placementRoot, null, null);
  await visit("order", input.state.orderRoot, null, null);
  const placements: ReceizProfileShowcasePersistentPlacementV114[] = [];
  const remaining = new Map(trees.placement);
  const counts = { membershipCount: 0, visibleCount: 0, hiddenCount: 0, unlistedCount: 0, pinnedCount: 0 };
  for (const node of trees.order.values()) {
    if (node.value.kind !== "order") fail("PROFILE_SHOWCASE_PERSISTENT_ORDER_NODE_INVALID");
    const placement = placementValue(remaining.get(node.value.placementKey) ?? null);
    if (exactChildKey(placement.reference as Record<string, unknown>) !== node.value.placementKey
      || placement.orderKey !== node.key
      || !["visible", "hidden", "unlisted"].includes(placement.visibility)
      || node.value.visible !== (placement.visibility === "visible")) {
      fail("PROFILE_SHOWCASE_PERSISTENT_MEMBERSHIP_PLACEMENT_INVALID");
    }
    remaining.delete(node.value.placementKey);
    counts.membershipCount += 1;
    counts[`${placement.visibility}Count`] += 1;
    if (placement.pinned) counts.pinnedCount += 1;
    placements.push(Object.freeze(structuredClone(placement)));
  }
  if (remaining.size || Object.entries(counts).some(([key, value]) =>
    input.state.counts[key as keyof typeof counts] !== value)) {
    fail("PROFILE_SHOWCASE_PERSISTENT_MEMBERSHIP_COUNTS_INVALID");
  }
  return Object.freeze({ placements: Object.freeze(placements),
    witnessNodes: Object.freeze([...witnessed.values()].map((node) => Object.freeze(structuredClone(node)))) });
}

export function createReceizProfileShowcasePersistentMemoryStoreV114(
  seed: readonly ReceizProfileShowcasePersistentNodeV114[] = [],
): ReceizProfileShowcasePersistentStateIOV114 & Readonly<{
  nodes(): readonly ReceizProfileShowcasePersistentNodeV114[];
}> {
  for (const node of seed) assertNode(node, node.digest, node.tree);
  const nodes = new Map(seed.map((node) => [node.digest, structuredClone(node)]));
  return Object.freeze({
    async resolveNode(digest: string) {
      const node = nodes.get(digest);
      return node ? Object.freeze(structuredClone(node)) : null;
    },
    async writeNode(node: ReceizProfileShowcasePersistentNodeV114) {
      assertNode(node, node.digest, node.tree);
      const existing = nodes.get(node.digest);
      if (
        existing
        && canonicalizeReceizConstitution(existing as unknown as ReceizConstitutionJson)
          !== canonicalizeReceizConstitution(node as unknown as ReceizConstitutionJson)
      ) {
        fail("PROFILE_SHOWCASE_PERSISTENT_NODE_COLLISION");
      }
      nodes.set(node.digest, structuredClone(node));
    },
    nodes() {
      return Object.freeze([...nodes.values()].map((node) => Object.freeze(
        structuredClone(node),
      )));
    },
  });
}
