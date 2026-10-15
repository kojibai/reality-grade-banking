import { canonicalizeReceizV122, digestReceizCanonicalV122 } from "./v122Canonical.js";
import { receizBase64UrlDecode, receizBase64UrlEncode } from "./identity.js";
import { openReceizSubjectAccessPrivateKeyV122, type ReceizSubjectAccessKitV122, type ReceizSubjectAccessPublicBindingV122 } from "./v122SubjectAccess.js";

const cryptoApi = globalThis.crypto;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const b64u = receizBase64UrlEncode;
const fromB64u = receizBase64UrlDecode;

export type ReceizPrivateVisibilityV122 = Readonly<{ mode: "private" | "invited"; recipientSubjectIds: readonly string[] }>;
export type ReceizPrivateRecipientWrapV122 = Readonly<{
  recipientSubjectId: string;
  recipientAccessKeyHead: string;
  ephemeralPublicKeyJwk: JsonWebKey;
  nonceB64u: string;
  wrappedContentKeyB64u: string;
  wrapDigest: string;
}>;
export type ReceizPrivateWorldEnvelopeV122 = Readonly<{
  schema: "receiz.world.private-envelope.v122";
  worldId: string;
  visibilityMode: "private" | "invited";
  ciphertextB64u: string;
  nonceB64u: string;
  aadDigest: string;
  payloadDigest: string;
  recipientWraps: readonly ReceizPrivateRecipientWrapV122[];
  envelopeDigest: string;
}>;

async function importAes(raw: Uint8Array, usages: KeyUsage[]) {
  return cryptoApi.subtle.importKey("raw", raw as BufferSource, "AES-GCM", false, usages);
}

async function deriveWrapKey(privateKey: CryptoKey, publicKeyJwk: JsonWebKey, aadDigest: string) {
  const publicKey = await cryptoApi.subtle.importKey("jwk", publicKeyJwk, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = await cryptoApi.subtle.deriveBits({ name: "ECDH", public: publicKey }, privateKey, 256);
  const material = await cryptoApi.subtle.importKey("raw", shared, "HKDF", false, ["deriveKey"]);
  return cryptoApi.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: encoder.encode("receiz.world.private-wrap.v122"), info: encoder.encode(aadDigest) }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function planReceizPrivateCommandV122(input: Readonly<{
  worldId: string;
  publicPayload: unknown;
  privatePayload: unknown;
  visibility: ReceizPrivateVisibilityV122;
  recipientBindings: readonly ReceizSubjectAccessPublicBindingV122[];
}>): Promise<Readonly<{ publicCommand: Readonly<Record<string, unknown>>; privateEnvelope: ReceizPrivateWorldEnvelopeV122 }>> {
  const ids = [...new Set(input.visibility.recipientSubjectIds)].sort();
  const bindings = new Map(input.recipientBindings.map((entry) => [entry.subjectId, entry]));
  if (ids.length === 0 || ids.some((id) => !bindings.has(id))) throw new TypeError("V122_PRIVATE_RECIPIENT_BINDING_REQUIRED");
  const publicPayloadDigest = await digestReceizCanonicalV122(input.publicPayload);
  const payloadDigest = await digestReceizCanonicalV122(input.privatePayload);
  const aadDigest = await digestReceizCanonicalV122({ schema: "receiz.world.private-aad.v122", worldId: input.worldId, publicPayloadDigest, visibilityMode: input.visibility.mode, recipientSubjectIds: ids });
  const contentKey = cryptoApi.getRandomValues(new Uint8Array(32));
  const nonce = cryptoApi.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await cryptoApi.subtle.encrypt({ name: "AES-GCM", iv: nonce, additionalData: encoder.encode(aadDigest) }, await importAes(contentKey, ["encrypt"]), encoder.encode(canonicalizeReceizV122(input.privatePayload))));
  const wraps: ReceizPrivateRecipientWrapV122[] = [];
  for (const recipientSubjectId of ids) {
    const binding = bindings.get(recipientSubjectId)!;
    const pair = await cryptoApi.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
    const wrapNonce = cryptoApi.getRandomValues(new Uint8Array(12));
    const wrapped = new Uint8Array(await cryptoApi.subtle.encrypt({ name: "AES-GCM", iv: wrapNonce, additionalData: encoder.encode(aadDigest) }, await deriveWrapKey(pair.privateKey, binding.publicKeyJwk, aadDigest), contentKey));
    const wrapBasis = { recipientSubjectId, recipientAccessKeyHead: binding.accessKeyHead, ephemeralPublicKeyJwk: await cryptoApi.subtle.exportKey("jwk", pair.publicKey), nonceB64u: b64u(wrapNonce), wrappedContentKeyB64u: b64u(wrapped) };
    wraps.push(Object.freeze({ ...wrapBasis, wrapDigest: await digestReceizCanonicalV122(wrapBasis) }));
  }
  contentKey.fill(0);
  const envelopeBasis = { schema: "receiz.world.private-envelope.v122" as const, worldId: input.worldId, visibilityMode: input.visibility.mode, ciphertextB64u: b64u(ciphertext), nonceB64u: b64u(nonce), aadDigest, payloadDigest, recipientWraps: Object.freeze(wraps) };
  const privateEnvelope = Object.freeze({ ...envelopeBasis, envelopeDigest: await digestReceizCanonicalV122(envelopeBasis) });
  return Object.freeze({
    publicCommand: Object.freeze({ schema: "receiz.world.private-command-public.v122", worldId: input.worldId, publicPayload: input.publicPayload, publicPayloadDigest, privateEnvelopeDigest: privateEnvelope.envelopeDigest }),
    privateEnvelope,
  });
}

export async function validateReceizPrivateWorldEnvelopeV122(value: ReceizPrivateWorldEnvelopeV122): Promise<boolean> {
  try {
    if (value.schema !== "receiz.world.private-envelope.v122"
      || (value.visibilityMode !== "private" && value.visibilityMode !== "invited")
      || !/^[0-9a-f]{64}$/.test(value.aadDigest)
      || !/^[0-9a-f]{64}$/.test(value.payloadDigest)
      || !/^[0-9a-f]{64}$/.test(value.envelopeDigest)
      || value.recipientWraps.length === 0) return false;
    fromB64u(value.ciphertextB64u);
    if (fromB64u(value.nonceB64u).byteLength !== 12) return false;
    const recipientIds = value.recipientWraps.map((entry) => entry.recipientSubjectId);
    if (new Set(recipientIds).size !== recipientIds.length || recipientIds.some((entry, index) => index > 0 && recipientIds[index - 1]! >= entry)) return false;
    for (const wrap of value.recipientWraps) {
      if (!/^[0-9a-f]{64}$/.test(wrap.recipientAccessKeyHead)
        || !/^[0-9a-f]{64}$/.test(wrap.wrapDigest)
        || fromB64u(wrap.nonceB64u).byteLength !== 12) return false;
      fromB64u(wrap.wrappedContentKeyB64u);
      const { wrapDigest, ...wrapBasis } = wrap;
      if (await digestReceizCanonicalV122(wrapBasis) !== wrapDigest) return false;
    }
    const { envelopeDigest, ...basis } = value;
    return await digestReceizCanonicalV122(basis) === envelopeDigest;
  } catch {
    return false;
  }
}

export async function decryptReceizPrivateWorldEnvelopeV122(input: Readonly<{
  envelope: ReceizPrivateWorldEnvelopeV122;
  accessKit: ReceizSubjectAccessKitV122;
  edgeWrappingKey: Uint8Array;
  currentSubjectHead: string;
  currentAccessKeyHead: string;
}>): Promise<unknown> {
  const { envelopeDigest, ...basis } = input.envelope;
  if (await digestReceizCanonicalV122(basis) !== envelopeDigest) throw new TypeError("V122_PRIVATE_ENVELOPE_DIGEST_INVALID");
  if (input.accessKit.binding.subjectHead !== input.currentSubjectHead || input.accessKit.binding.accessKeyHead !== input.currentAccessKeyHead) throw new TypeError("V122_PRIVATE_ACCESS_HEAD_MISMATCH");
  const wrap = input.envelope.recipientWraps.find((entry) => entry.recipientSubjectId === input.accessKit.binding.subjectId && entry.recipientAccessKeyHead === input.currentAccessKeyHead);
  if (!wrap) throw new TypeError("V122_PRIVATE_RECIPIENT_NOT_AUTHORIZED");
  const { wrapDigest, ...wrapBasis } = wrap;
  if (await digestReceizCanonicalV122(wrapBasis) !== wrapDigest) throw new TypeError("V122_PRIVATE_WRAP_DIGEST_INVALID");
  const privateKey = await openReceizSubjectAccessPrivateKeyV122(input.accessKit, input.edgeWrappingKey);
  const contentKey = new Uint8Array(await cryptoApi.subtle.decrypt({ name: "AES-GCM", iv: fromB64u(wrap.nonceB64u) as BufferSource, additionalData: encoder.encode(input.envelope.aadDigest) }, await deriveWrapKey(privateKey, wrap.ephemeralPublicKeyJwk, input.envelope.aadDigest), fromB64u(wrap.wrappedContentKeyB64u) as BufferSource));
  const clear = await cryptoApi.subtle.decrypt({ name: "AES-GCM", iv: fromB64u(input.envelope.nonceB64u) as BufferSource, additionalData: encoder.encode(input.envelope.aadDigest) }, await importAes(contentKey, ["decrypt"]), fromB64u(input.envelope.ciphertextB64u) as BufferSource);
  contentKey.fill(0);
  return JSON.parse(decoder.decode(clear));
}
