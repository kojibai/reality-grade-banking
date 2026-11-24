import { fileURLToPath } from 'node:url';
import { IDBDatabase, IDBFactory } from 'fake-indexeddb';
import { expect, test, vi } from 'vitest';
import { loadFundedWalletState, loadWalletFinancialOriginal, saveDeviceIdentity, saveFundedWalletState, saveWalletFinancialOriginal } from '../src/receiz/identity-vault';

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

test('Wallet writes its exact Original, private checkpoint, and accepted head with strict durability', async () => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  const transaction = vi.spyOn(IDBDatabase.prototype, 'transaction');
  try {
    const identity = new TextEncoder().encode('wallet-durability-fixture');
    await saveDeviceIdentity(identity, 'identity.receiz', '', true);
    const binding = { artifactSha256: Buffer.from(await crypto.subtle.digest('SHA-256', identity)).toString('hex') };
    const original = Uint8Array.of(1, 4, 9);
    const originalDigest = await saveWalletFinancialOriginal(binding, original);
    const checkpoint = { entries: [{ kind: 'source', allocationId: 'ab'.repeat(32), digest: originalDigest }], send: null };
    await saveFundedWalletState(binding, checkpoint, null);
    expect(await loadWalletFinancialOriginal(binding, originalDigest)).toEqual(original);
    expect(await loadFundedWalletState(binding)).toEqual(checkpoint);
    const path = fileURLToPath(new URL('../public/native/offline-notes.v129.mjs', import.meta.url));
    const runtime = await import(/* @vite-ignore */ path);
    const settings = { databaseName: 'bank-wallet-durability-fixture', namespace: 'wallet:protected' };
    const wallet = runtime.createWalletAdmissionStore(settings);
    await wallet.seedAggregate({ aggregateId: 'wallet-head', revision: 0, headDigest: originalDigest, state: { operationId: null } });
    const successor = 'ac'.repeat(32);
    const accepted = await wallet.commit({
      schema: 'receiz.admission.unit-of-work.v1', aggregateId: 'wallet-head', idempotencyKey: 'wallet-next',
      commandDigest: 'ad'.repeat(32), expectedRevision: 0, expectedHeadDigest: originalDigest,
      acceptedCommand: { successor }, nextHead: { revision: 1, digest: successor, state: { operationId: 'payment' } },
      events: [], resourceEffects: {}, receipt: { successor }, outboxIntents: [], auditReference: { originalDigest },
    });
    expect(accepted.status).toBe('committed');
    expect((await runtime.createWalletAdmissionStore(settings).readAggregate('wallet-head'))?.headDigest).toBe(successor);
    const writes = transaction.mock.calls.filter(([, mode]) => mode === 'readwrite').slice(-4);
    expect(writes.map(([, , options]) => options)).toEqual(Array.from({ length: 4 }, () => ({ durability: 'strict' })));
    await saveDeviceIdentity(identity, 'identity-backup.receiz', '', true);
    expect(await loadWalletFinancialOriginal(binding, originalDigest)).toEqual(original);
    expect(await loadFundedWalletState(binding)).toEqual(checkpoint);
    expect((await runtime.createWalletAdmissionStore(settings).readAggregate('wallet-head'))?.headDigest).toBe(successor);
  } finally {
    transaction.mockRestore();
    vi.unstubAllGlobals();
  }
});
