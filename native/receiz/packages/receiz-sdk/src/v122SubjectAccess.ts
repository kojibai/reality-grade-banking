import { digestReceizCanonicalV122 } from "./v122Canonical.js";
import { receizBase64UrlDecode, receizBase64UrlEncode } from "./identity.js";

const cryptoApi = globalThis.crypto;
const encoder = new TextEncoder();

const b64u = receizBase64UrlEncode;
const fromB64u = receizBase64UrlDecode;

async function aesKey(raw: Uint8Array, usages: KeyUsage[]) {
  return cryptoApi.subtle.importKey("raw", raw as BufferSource, "AES-GCM", false, usages);
}

export type ReceizSubjectAccessPublicBindingV122 = Readonly<{
  schema: "receiz.subject.access-public-key.v122";
  subjectId: string;
  subjectHead: string;
  accessKeyHead: string;
  publicKeyJwk: JsonWebKey;
  bindingDigest: string;
}>;

export type ReceizSubjectAccessKitV122 = Readonly<{
  schema: "receiz.subject.edge-access-kit.v122";
  binding: ReceizSubjectAccessPublicBindingV122;
  nonceB64u: string;
  encryptedPrivateKeyB64u: string;
  kitDigest: string;
}>;

export async function createReceizSubjectAccessKeyV122(input: Readonly<{
  subjectId: string;
  subjectHead: string;
  accessKeyHead?: string;
  edgeWrappingKey: Uint8Array;
}>): Promise<Readonly<{ publicBinding: ReceizSubjectAccessPublicBindingV122; accessKit: ReceizSubjectAccessKitV122 }>> {
  if (input.edgeWrappingKey.byteLength !== 32) throw new TypeError("V122_EDGE_WRAPPING_KEY_LENGTH_INVALID");
  const pair = await cryptoApi.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const publicKeyJwk = await cryptoApi.subtle.exportKey("jwk", pair.publicKey);
  const accessKeyHead = input.accessKeyHead ?? await digestReceizCanonicalV122({
    schema: "receiz.subject.access-key-head.v122",
    subjectId: input.subjectId,
    subjectHead: input.subjectHead,
    nonceB64u: b64u(cryptoApi.getRandomValues(new Uint8Array(32))),
  });
  if (!/^[0-9a-f]{64}$/.test(accessKeyHead)) throw new TypeError("V122_ACCESS_KEY_HEAD_INVALID");
  const bindingBasis = { schema: "receiz.subject.access-public-key.v122" as const, subjectId: input.subjectId, subjectHead: input.subjectHead, accessKeyHead, publicKeyJwk };
  const publicBinding = Object.freeze({ ...bindingBasis, bindingDigest: await digestReceizCanonicalV122(bindingBasis) });
  const privateBytes = new Uint8Array(await cryptoApi.subtle.exportKey("pkcs8", pair.privateKey));
  const nonce = cryptoApi.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await cryptoApi.subtle.encrypt({ name: "AES-GCM", iv: nonce, additionalData: encoder.encode(publicBinding.bindingDigest) }, await aesKey(input.edgeWrappingKey, ["encrypt"]), privateBytes));
  privateBytes.fill(0);
  const kitBasis = { schema: "receiz.subject.edge-access-kit.v122" as const, binding: publicBinding, nonceB64u: b64u(nonce), encryptedPrivateKeyB64u: b64u(encrypted) };
  return Object.freeze({ publicBinding, accessKit: Object.freeze({ ...kitBasis, kitDigest: await digestReceizCanonicalV122(kitBasis) }) });
}

export async function validateReceizSubjectAccessPublicBindingV122(value: ReceizSubjectAccessPublicBindingV122): Promise<boolean> {
  if (value.schema !== "receiz.subject.access-public-key.v122"
    || !value.subjectId
    || !/^[0-9a-f]{64}$/.test(value.subjectHead)
    || !/^[0-9a-f]{64}$/.test(value.accessKeyHead)
    || !value.publicKeyJwk
    || value.publicKeyJwk.kty !== "EC"
    || value.publicKeyJwk.crv !== "P-256") return false;
  const { bindingDigest, ...basis } = value;
  return /^[0-9a-f]{64}$/.test(bindingDigest) && await digestReceizCanonicalV122(basis) === bindingDigest;
}

export async function openReceizSubjectAccessPrivateKeyV122(
  kit: ReceizSubjectAccessKitV122,
  edgeWrappingKey: Uint8Array,
): Promise<CryptoKey> {
  const { kitDigest, ...kitBasis } = kit;
  if (await digestReceizCanonicalV122(kitBasis) !== kitDigest || await digestReceizCanonicalV122({
    schema: kit.binding.schema,
    subjectId: kit.binding.subjectId,
    subjectHead: kit.binding.subjectHead,
    accessKeyHead: kit.binding.accessKeyHead,
    publicKeyJwk: kit.binding.publicKeyJwk,
  }) !== kit.binding.bindingDigest) throw new TypeError("V122_ACCESS_KIT_DIGEST_INVALID");
  const decrypted = await cryptoApi.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64u(kit.nonceB64u) as BufferSource, additionalData: encoder.encode(kit.binding.bindingDigest) },
    await aesKey(edgeWrappingKey, ["decrypt"]),
    fromB64u(kit.encryptedPrivateKeyB64u) as BufferSource,
  );
  return cryptoApi.subtle.importKey("pkcs8", decrypted, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
}
