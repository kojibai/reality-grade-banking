import type { ReceizKeyFile } from '@receiz/sdk';
import { loadReceiz } from './client';
// Protects existing private custody only. It issues no identity or authority.
// The caller must canonically seal and re-admit the result before transport.
export async function protectIdentityKeyFile(keyFile: ReceizKeyFile, phrase: string): Promise<ReceizKeyFile> {
  const { receizBase64UrlDecode, receizBase64UrlEncode } = await loadReceiz();
  if (!keyFile.crypto.privateKeyPkcs8B64u || phrase.length < 12) throw new Error('An existing no-phrase ID and local protection phrase are required.');
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(phrase.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  const iterations = Math.max(210_000, keyFile.crypto.kdf.iterations);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const raw = receizBase64UrlDecode(keyFile.crypto.privateKeyPkcs8B64u);
  try {
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(keyFile.crypto.cipher.aad) }, key, new Uint8Array(raw));
    return { ...keyFile, crypto: { ...keyFile.crypto, privateKeyPkcs8B64u: null, privateKeyPkcs8CiphertextB64u: receizBase64UrlEncode(new Uint8Array(encrypted)), kdf: { name: 'PBKDF2-SHA256', iterations, saltB64u: receizBase64UrlEncode(salt) }, cipher: { ...keyFile.crypto.cipher, ivB64u: receizBase64UrlEncode(iv) } } };
  } finally { raw.fill(0); }
}
/** Local custody conversion only; callers must reseal and canonically admit the exact new bytes. */
export async function unprotectIdentityKeyFile(keyFile: ReceizKeyFile, phrase: string): Promise<ReceizKeyFile> {
  const sdk = await loadReceiz();
  if (keyFile.crypto.privateKeyPkcs8B64u) return keyFile;
  // Validate the genuine SDK key/passphrase before unwrapping the same key locally.
  await sdk.decryptReceizIdentityPrivateSigningKey({ keyFile, passphrase: phrase });
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(phrase.normalize('NFKC').trim()), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array(sdk.receizBase64UrlDecode(keyFile.crypto.kdf.saltB64u)), iterations: keyFile.crypto.kdf.iterations }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const raw = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(sdk.receizBase64UrlDecode(keyFile.crypto.cipher.ivB64u)), additionalData: new TextEncoder().encode(keyFile.crypto.cipher.aad) }, key, new Uint8Array(sdk.receizBase64UrlDecode(keyFile.crypto.privateKeyPkcs8CiphertextB64u))));
  try { return { ...keyFile, crypto: { ...keyFile.crypto, privateKeyPkcs8B64u: sdk.receizBase64UrlEncode(raw), privateKeyPkcs8CiphertextB64u: '' } }; }
  finally { raw.fill(0); }
}
