import { loadReceiz } from './client';
export function identityNeedsPhrase(key: { crypto?: { privateKeyPkcs8B64u?: string | null; privateKeyPkcs8CiphertextB64u?: string } }): boolean {
  return !key.crypto?.privateKeyPkcs8B64u && Boolean(key.crypto?.privateKeyPkcs8CiphertextB64u);
}
export async function inspectIdentityLock(file: File): Promise<{ needsPhrase: boolean }> {
  if (file.size > 32 * 1024 * 1024) throw new Error('Identity Record exceeds the supported device capacity.');
  const sdk = await loadReceiz(); const key = await sdk.readReceizIdentityArtifact(new Uint8Array(await file.arrayBuffer()));
  return { needsPhrase: identityNeedsPhrase(key) };
}
