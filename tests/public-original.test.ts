import { expect, it, vi } from 'vitest';
import { verifyPublicOriginalBytes } from '../src/receiz/public-original';
const verify = vi.hoisted(() => vi.fn());
vi.mock('../src/receiz/client', () => ({ loadReceiz: async () => ({ verifyReceizArtifact: verify }) }));
it('does not report a matching original for a different enclosing digest', async () => {
  verify.mockResolvedValue({ status: 'verified-artifact', artifactDigest: { value: 'a'.repeat(64) } });
  await expect(verifyPublicOriginalBytes(new Uint8Array([1, 2]), 'b'.repeat(64))).rejects.toThrow('does not match');
});
it('rejects unsupported proof bytes without granting value or ownership', async () => {
  verify.mockResolvedValue({ status: 'unsupported' });
  await expect(verifyPublicOriginalBytes(new Uint8Array([1]), 'a'.repeat(64))).rejects.toThrow('No verified original');
});
it('passes the exact original bytes to the canonical SDK verifier', async () => {
  const bytes = new Uint8Array([1, 2, 3]);
  verify.mockResolvedValue({ status: 'verified-artifact', artifactDigest: { value: 'a'.repeat(64) } });
  await expect(verifyPublicOriginalBytes(bytes, 'a'.repeat(64))).resolves.toEqual({ digest: 'a'.repeat(64), canClaimOwnership: false, canCreditValue: false });
  expect(verify).toHaveBeenLastCalledWith(bytes);
});
