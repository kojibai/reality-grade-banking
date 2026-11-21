export const proofBrowserUpdateNotice = 'Update your browser to create proofs. Install the latest version from your app store or open Bankeiz in an updated browser.';

export async function isUnsupportedProofBrowser(cause: unknown): Promise<boolean> {
  // A platform capability error is the only reason to probe. Keep the
  // successful path and other failure messages as they are.
  if (!(cause instanceof Error) || cause.name !== 'NotSupportedError') return false;
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return true;
  try {
    const keys = await subtle.generateKey('Ed25519', false, ['sign', 'verify']);
    const publicBytes = await subtle.exportKey('raw', keys.publicKey);
    const publicKey = await subtle.importKey('raw', publicBytes, 'Ed25519', false, ['verify']);
    const challenge = new Uint8Array([1]);
    const signature = await subtle.sign('Ed25519', keys.privateKey, challenge);
    await subtle.verify('Ed25519', publicKey, signature, challenge);
    return false;
  } catch (error) {
    return error instanceof Error && error.name === 'NotSupportedError';
  }
}
