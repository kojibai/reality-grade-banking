import type { ReceizSignatureV4RootPublicKey } from "./signatureV4.js";

const PINNED_ROOTS: readonly ReceizSignatureV4RootPublicKey[] = [
  {
    kid: "receiz.v3.prod.2026-03-02",
    alg: "Ed25519",
    publicKeyRawB64u: "z2pQNWhfQIfrFlkdutiHYLXmgwlt90UX8iIc8HvKtI0",
    status: "active",
  },
  {
    kid: "receiz.v4.prod.2026-03-02",
    alg: "Ed25519",
    publicKeyRawB64u: "z2pQNWhfQIfrFlkdutiHYLXmgwlt90UX8iIc8HvKtI0",
    status: "active",
  },
];

export function receizCurrentPinnedSignatureV4Roots(): ReadonlyMap<string, ReceizSignatureV4RootPublicKey> {
  return new Map(PINNED_ROOTS.map((root) => [root.kid, root]));
}

/** @deprecated Historical alias. Use receizCurrentPinnedSignatureV4Roots. */
export const receizV109PinnedSignatureV4Roots = receizCurrentPinnedSignatureV4Roots;
