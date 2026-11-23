import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

test('the distributed Bank runtime exposes the verified Wallet custody handoff', async () => {
  const path = fileURLToPath(new URL('../public/native/offline-notes.v129.mjs', import.meta.url));
  const runtime = await import(/* @vite-ignore */ path);
  expect(runtime.readReceizAccountFinancialWalletProof).toBeTypeOf('function');
  expect(runtime.receiveReceizAccountFinancialWalletProof).toBeTypeOf('function');
  expect(runtime.exportReceizAccountFinancialWalletProof).toBeTypeOf('function');
  expect(runtime.exportReceizAccountFinancialRelease).toBeTypeOf('function');
  expect(runtime.ReceizFinancialWalletCustodyCancelledBeforeAssertion).toBeTypeOf('function');
  expect(() => runtime.readReceizAccountFinancialWalletProof(new Uint8Array())).toThrow();
});

test('an invalid optical Wallet proof cannot open an offline financial session', async () => {
  const path = fileURLToPath(new URL('../public/native/offline-notes.v129.mjs', import.meta.url));
  const runtime = await import(/* @vite-ignore */ path);
  const { createLocalFinancialSession } = await import('../src/receiz/local-financial');
  let retained = 0, published = 0;
  const unexpected = async (): Promise<never> => { throw Error('Unexpected signing'); };
  await expect(createLocalFinancialSession({
    receivedWallet: { proofBytes: new Uint8Array([0x78, 0x9c, 0x01]), ownerKeyId: 'aa'.repeat(32) },
    applicationId: 'rc_bankeiz_test',
    accountUid: '11111111-1111-4111-8111-111111111111',
    ownerReceizId: 'receiver.receiz.id',
    runtime,
    originals: { retain: async () => { retained++; }, read: async () => null },
    assertOpen() {}, online: () => false,
    signOwner: unexpected, signRecord: unexpected,
    publish: async () => { published++; },
  })).rejects.toThrow(/compression|inflate|wallet_proof|unexpected EOF|truncated/i);
  expect(retained).toBe(0);
  expect(published).toBe(0);
});
