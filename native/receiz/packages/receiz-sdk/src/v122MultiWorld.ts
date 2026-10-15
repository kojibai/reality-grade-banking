import { digestReceizCanonicalV122 } from "./v122Canonical.js";
import type { ReceizWorldTransactionV122 } from "./v122Transactions.js";

export type ReceizMultiWorldTransactionV122 = Readonly<{
  schema: "receiz.multi-world-transaction.v122";
  multiWorldTransactionId: string;
  worlds: readonly Readonly<{ worldId: string; expectedWorldHead: string; transaction: ReceizWorldTransactionV122 }>[];
  participantSubjectIds: readonly string[];
  idempotencyKey: string;
  multiWorldDigest: string;
}>;

export async function planReceizMultiWorldTransactionV122(input: Readonly<{
  worlds: readonly Readonly<{ worldId: string; expectedWorldHead: string; transaction: ReceizWorldTransactionV122 }>[];
  idempotencyKey: string;
}>): Promise<ReceizMultiWorldTransactionV122> {
  const worlds = [...input.worlds].sort((a, b) => a.worldId.localeCompare(b.worldId));
  if (!worlds.length || new Set(worlds.map((entry) => entry.worldId)).size !== worlds.length) throw new TypeError("V122_MULTI_WORLD_MEMBER_INVALID");
  if (worlds.some((entry) => entry.transaction.worldId !== entry.worldId || entry.transaction.expectedWorldHead !== entry.expectedWorldHead)) throw new TypeError("V122_MULTI_WORLD_HEAD_BINDING_INVALID");
  const participantSubjectIds = [...new Set(worlds.flatMap((entry) => Object.keys(entry.transaction.participantHeads)))].sort();
  const identity = await digestReceizCanonicalV122({ schema: "receiz.multi-world.identity.v122", idempotencyKey: input.idempotencyKey, worldIds: worlds.map((entry) => entry.worldId) });
  const basis = { schema: "receiz.multi-world-transaction.v122" as const, multiWorldTransactionId: `receiz:multi-world:${identity}`, worlds, participantSubjectIds, idempotencyKey: input.idempotencyKey };
  return Object.freeze({ ...basis, multiWorldDigest: await digestReceizCanonicalV122(basis) });
}
