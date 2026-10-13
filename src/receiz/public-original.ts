import { loadReceiz } from './client';

export async function verifyPublicOriginalBytes(bytes: Uint8Array, expectedDigest: string): Promise<{ digest: string; canClaimOwnership: false; canCreditValue: false }> {
  if (!/^[a-f0-9]{64}$/i.test(expectedDigest) || bytes.length > 64 * 1024 * 1024) throw new Error('Original verification exceeds the supported source boundary.');
  const { verifyReceizArtifact } = await loadReceiz(); const result = await verifyReceizArtifact(bytes);
  if (result.status !== 'verified-artifact') throw new Error('No verified original was obtained. Inspect the source for the canonical result.');
  if (result.artifactDigest.value.toLowerCase() !== expectedDigest.toLowerCase()) throw new Error('This original does not match the public source’s artifact digest.');
  return { digest: result.artifactDigest.value.toLowerCase(), canClaimOwnership: false, canCreditValue: false };
}
