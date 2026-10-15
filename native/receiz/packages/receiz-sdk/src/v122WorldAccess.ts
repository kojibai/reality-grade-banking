import { digestReceizCanonicalV122 } from "./v122Canonical.js";

export type ReceizWorldAccessActionV122 = "grant" | "revoke" | "open" | "close";

export type ReceizWorldAccessAppendV122 = Readonly<{
  schema: "receiz.world.access-append.v122";
  worldId: string;
  subjectId: string;
  action: ReceizWorldAccessActionV122;
  expectedAccessHead: string | null;
  acceptedAccessHead: string;
  authorityDigest: string;
  acceptedAtKai: number;
  appendDigest: string;
}>;

const HEX = /^[0-9a-f]{64}$/;

export async function planReceizWorldAccessAppendV122(input: Readonly<{
  worldId: string;
  subjectId: string;
  action: ReceizWorldAccessActionV122;
  expectedAccessHead: string | null;
  authorityDigest: string;
  acceptedAtKai: number;
}>): Promise<ReceizWorldAccessAppendV122> {
  if (!input.worldId || !input.subjectId || !["grant", "revoke", "open", "close"].includes(input.action)) throw new TypeError("V122_WORLD_ACCESS_INPUT_INVALID");
  if ((input.expectedAccessHead !== null && !HEX.test(input.expectedAccessHead)) || !HEX.test(input.authorityDigest) || !Number.isSafeInteger(input.acceptedAtKai) || input.acceptedAtKai < 0) throw new TypeError("V122_WORLD_ACCESS_BINDING_INVALID");
  const headBasis = { schema: "receiz.world.access-head.v122", worldId: input.worldId, subjectId: input.subjectId, action: input.action, expectedAccessHead: input.expectedAccessHead, authorityDigest: input.authorityDigest, acceptedAtKai: input.acceptedAtKai };
  const acceptedAccessHead = await digestReceizCanonicalV122(headBasis);
  const basis = { schema: "receiz.world.access-append.v122" as const, ...input, acceptedAccessHead };
  return Object.freeze({ ...basis, appendDigest: await digestReceizCanonicalV122(basis) });
}

export async function validateReceizWorldAccessAppendV122(value: ReceizWorldAccessAppendV122): Promise<boolean> {
  if (!value || value.schema !== "receiz.world.access-append.v122" || !["grant", "revoke", "open", "close"].includes(value.action)) return false;
  if ((value.expectedAccessHead !== null && !HEX.test(value.expectedAccessHead)) || !HEX.test(value.authorityDigest) || !HEX.test(value.acceptedAccessHead)) return false;
  const head = await digestReceizCanonicalV122({ schema: "receiz.world.access-head.v122", worldId: value.worldId, subjectId: value.subjectId, action: value.action, expectedAccessHead: value.expectedAccessHead, authorityDigest: value.authorityDigest, acceptedAtKai: value.acceptedAtKai });
  const { appendDigest, ...basis } = value;
  return head === value.acceptedAccessHead && appendDigest === await digestReceizCanonicalV122(basis);
}
