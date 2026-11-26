import { expect, test, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { createDeviceWalletRecovery, sealDeviceWalletArchive } from '../src/receiz/device-wallet-recovery';
import { loadReceiz } from '../src/receiz/client';
import { forgetDeviceIdentity, openDeviceWalletArchive, saveDeviceIdentity } from '../src/receiz/identity-vault';

test('Wallet recovery reopens exact Originals and the accepted admission journal after a browser restore', async () => {
  const { sha256ReceizBytes } = await loadReceiz();
  const files = new Map<string, Uint8Array>();
  const archive = {
    async read(key: string) { return files.get(key)?.slice() ?? null; },
    async write(key: string, previous: string | null, exact: Uint8Array) {
      const held = files.get(key);
      if ((held ? await sha256ReceizBytes(held) : null) !== previous) return false;
      files.set(key, exact.slice());
      return true;
    },
  };
  const wrappingKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const owner = {
    accountUid: 'wallet-account', keyId: 'a'.repeat(64), recordSignerPublicKey: 'wallet-record-signing-key',
  };
  const open = () => createDeviceWalletRecovery(sealDeviceWalletArchive(archive, wrappingKey, () => {}), owner);
  const funding = Uint8Array.of(1, 2, 3), debit = Uint8Array.of(4, 5, 6);
  const fundingRef = await sha256ReceizBytes(funding), debitRef = await sha256ReceizBytes(debit);
  const first = open();
  await first.originals.retain(fundingRef, funding);
  await first.writeState('funded-wallet', { fundingRef }, null);
  await first.originals.retain(debitRef, debit);
  await first.admission.seedAggregate({ aggregateId: 'held-wallet', revision: 0, headDigest: fundingRef, state: { balance: '100' } });
  const payment = {
    schema: 'receiz.admission.unit-of-work.v1' as const, aggregateId: 'held-wallet', commandDigest: 'debit', idempotencyKey: 'payment',
    expectedRevision: 0, expectedHeadDigest: fundingRef, acceptedCommand: { debitRef }, events: [],
    nextHead: { revision: 1, digest: debitRef, state: { balance: '40' } }, receipt: { debitRef },
    resourceEffects: {}, auditReference: { debitRef }, outboxIntents: [{ debitRef }],
  };
  expect((await first.admission.commit(payment)).status).toBe('committed');

  const restored = open();
  expect(await restored.readState('funded-wallet')).toEqual({ fundingRef });
  expect(await restored.originals.read(fundingRef)).toEqual(funding);
  expect(await restored.originals.read(debitRef)).toEqual(debit);
  expect(await restored.admission.readAggregate('held-wallet')).toEqual({
    revision: 1, headDigest: debitRef, state: { balance: '40' },
  });
  expect((await restored.admission.commit(payment)).status).toBe('idempotent');
  expect((await restored.admission.inspect()).outboxIntents).toEqual([{ debitRef }]);
  await expect(restored.writeState('funded-wallet', {}, null)).rejects.toThrow('BANK_WALLET_DEVICE_ARCHIVE_CONFLICT');
  const otherKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const other = createDeviceWalletRecovery(sealDeviceWalletArchive(archive, otherKey, () => {}), owner);
  await expect(other.originals.read(debitRef)).rejects.toThrow();
});


test('reopening the same retained Identity Record can decrypt its local archive after removing the active ID', async () => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  try {
    const { sha256ReceizBytes } = await loadReceiz();
    const proof = Uint8Array.of(22, 33, 44);
    const binding = { artifactSha256: await sha256ReceizBytes(proof) };
    const key = 'a'.repeat(64);
    const held = new Map<string, Uint8Array>();
    const device = {
      async read(ref: string) { return held.get(ref)?.slice() ?? null; },
      async write(ref: string, previous: string | null, next: Uint8Array) {
        const bytes = held.get(ref);
        if ((bytes ? await sha256ReceizBytes(bytes) : null) !== previous) return false;
        held.set(ref, next.slice());
        return true;
      },
    };
    await saveDeviceIdentity(proof, 'synthetic-identity.png', 'synthetic', false);
    const initial = await openDeviceWalletArchive(binding, device, () => {});
    expect(await initial.write(key, null, proof)).toBe(true);
    await forgetDeviceIdentity();
    await expect(openDeviceWalletArchive(binding, device, () => {})).rejects.toThrow('BANK_NOTE_IDENTITY_UNAVAILABLE');

    await saveDeviceIdentity(Uint8Array.of(55, 66), 'different-synthetic-identity.png', 'synthetic', false);
    await expect(openDeviceWalletArchive(binding, device, () => {})).rejects.toThrow();
    await forgetDeviceIdentity();
    await saveDeviceIdentity(proof, 'synthetic-identity.png', 'synthetic', false);
    const restored = await openDeviceWalletArchive(binding, device, () => {});
    expect(await restored.read(key)).toEqual(proof);
  } finally {
    vi.unstubAllGlobals();
  }
});
