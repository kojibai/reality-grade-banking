import { expect, it } from 'vitest';
import { createReceizNodeOfflineKaiProofFactory } from '@receiz/sdk/offline/kai/node';
import { nextBankKaiCoordinate } from '../src/receiz/bank-kai';
it('uses the shipped KaiSigil proof and preserves the actual predecessor in a strictly later native coordinate', async () => {
  const prove = await createReceizNodeOfflineKaiProofFactory();
  const first = await nextBankKaiCoordinate(prove);
  const next = await nextBankKaiCoordinate(prove, first);
  expect(next.kaiSigil.payload.previousKaiSigilProofHead).toBe(first.kaiSigil.proofHead);
  expect(BigInt(next.kaiUpulse) > BigInt(first.kaiUpulse)).toBe(true);
  expect(next.authority.createdAtAuthority).toBe(false);
}, 60000);
it('rejects bare pulses and caller-shaped temporal flags through the actual SDK admission', async () => {
  await expect(nextBankKaiCoordinate(async () => ({ kaiPulse: '1', verified: true }) as never)).rejects.toThrow('V125_KKS_PROOF_COORDINATE_SHAPE_INVALID');
});
