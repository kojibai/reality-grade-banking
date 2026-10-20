import type { ReceizVaultMerkleSiblingV1 } from "./types";
import { canonicalSha256Hex } from "./crypto";

export function fibonacciDistancesUpTo(index: number): number[] {
  const limit = Math.max(0, Math.floor(index));
  if (limit < 1) return [];
  const distances: number[] = [];
  let a = 1;
  let b = 2;
  while (a <= limit) {
    distances.push(a);
    const next = a + b;
    a = b;
    b = next;
  }
  return distances;
}

export function fibonacciBacklinkIndexes(index: number): Array<{ distance: number; leafIndex: number }> {
  return fibonacciDistancesUpTo(index).map((distance) => ({
    distance,
    leafIndex: index - distance,
  }));
}

export async function buildVaultLeafHash(input: {
  fileId: string;
  path: string;
  chunkIndex: number;
  chunkSha256: string;
}): Promise<string> {
  return canonicalSha256Hex({
    kind: "receiz.vault.leaf.v1",
    fileId: input.fileId,
    path: input.path,
    chunkIndex: input.chunkIndex,
    chunkSha256: input.chunkSha256,
  });
}

export async function buildMerkleParentHash(left: string, right: string): Promise<string> {
  return canonicalSha256Hex({
    kind: "receiz.vault.merkle.parent.v1",
    left,
    right,
  });
}

export type ReceizVaultMerkleTree = {
  rootSha256: string;
  layers: string[][];
  proofs: ReceizVaultMerkleSiblingV1[][];
};

export async function buildMerkleTree(leaves: string[]): Promise<ReceizVaultMerkleTree> {
  if (leaves.length === 0) {
    const rootSha256 = await canonicalSha256Hex({ kind: "receiz.vault.merkle.empty.v1" });
    return { rootSha256, layers: [[rootSha256]], proofs: [] };
  }

  const layers: string[][] = [leaves.slice()];
  let current = leaves.slice();
  while (current.length > 1) {
    const next = await Promise.all(Array.from({ length: Math.ceil(current.length / 2) }, (_, pairIndex) => {
      const i = pairIndex * 2;
      const left = current[i];
      const right = current[i + 1] ?? left;
      return buildMerkleParentHash(left, right);
    }));
    layers.push(next);
    current = next;
  }

  const proofs = leaves.map((_, leafIndex) => buildMerkleProof(layers, leafIndex));
  return {
    rootSha256: current[0],
    layers,
    proofs,
  };
}

export function buildMerkleProof(layers: string[][], leafIndex: number): ReceizVaultMerkleSiblingV1[] {
  const proof: ReceizVaultMerkleSiblingV1[] = [];
  let index = leafIndex;

  for (let layerIndex = 0; layerIndex < layers.length - 1; layerIndex += 1) {
    const layer = layers[layerIndex];
    const isRightNode = index % 2 === 1;
    const siblingIndex = isRightNode ? index - 1 : index + 1;
    const sibling = layer[siblingIndex] ?? layer[index];
    proof.push({
      side: isRightNode ? "left" : "right",
      sha256: sibling,
    });
    index = Math.floor(index / 2);
  }

  return proof;
}

export async function merkleRootFromProof(
  leafSha256: string,
  proof: ReceizVaultMerkleSiblingV1[],
): Promise<string> {
  let current = leafSha256;
  for (const sibling of proof) {
    current =
      sibling.side === "left"
        ? await buildMerkleParentHash(sibling.sha256, current)
        : await buildMerkleParentHash(current, sibling.sha256);
  }
  return current;
}
