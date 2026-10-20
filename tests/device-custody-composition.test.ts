import { afterEach, expect, it, vi } from 'vitest';
import {
  createKairosNotePwaCustodyAdapter,
  type KairosNotePwaCustodyState,
  type KairosNotePwaCustodyStorage,
  type KairosNotePwaWebAuthnClient,
} from '../native/receiz/app/lib/wallet/kairosNotePwaCustodyAdapter';
import { runReceizOfflineNoteRollbackConformance } from '../native/receiz/packages/receiz-sdk/src/offlineNoteRollbackConformance';
import {
  verifyReceizOfflineNoteWebAuthnAssertion,
  verifyReceizOfflineNoteWebAuthnConsumptionReceipt,
} from '../native/receiz/packages/receiz-sdk/src/offlineNoteWebAuthnCustody';

// Feasibility tests, not hardware qualification. Only the authenticator and
// credential-blob boundary are synthetic. The v129 adapter, challenge builders,
// rollback checks, receipt verification, WebCrypto and Node Web Locks are real.
// This explicitly test-only legacy profile is never registered in production.
const profile = {
  profileId: 'receiz.test.composition-only.v1',
  profileEvidenceDigest: '11'.repeat(32),
  aaguid: '00112233-4455-6677-8899-aabbccddeeff',
  rpId: 'bankeiz.com',
  allowedOrigins: ['https://bankeiz.com'],
} as const;
const encoder = new TextEncoder();
const b64 = (value: ArrayBuffer | Uint8Array) => Buffer.from(value instanceof Uint8Array ? value : new Uint8Array(value)).toString('base64url');
const unb64 = (value: string) => new Uint8Array(Buffer.from(value, 'base64url'));
const buffer = (value: Uint8Array) => value.slice().buffer;

async function authenticator(options: { flags?: number; counterStep?: number } = {}) {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
  const credential = {
    credentialIdB64u: b64(encoder.encode('synthetic-composition-only')),
    custodyPublicKeyRawB64u: b64(await crypto.subtle.exportKey('raw', pair.publicKey)),
    aaguid: profile.aaguid,
    rpId: profile.rpId,
    origin: profile.allowedOrigins[0],
  };
  let count = 0;
  let flags = options.flags ?? 5;
  let nextCounter: number | undefined;
  const client: KairosNotePwaWebAuthnClient = {
    async enroll() { return credential; },
    async assert(input) {
      if (input.credentialIdB64u !== credential.credentialIdB64u) throw Error('WRONG_TEST_CREDENTIAL');
      count = nextCounter ?? count + (options.counterStep ?? 1);
      nextCounter = undefined;
      const auth = new Uint8Array(37);
      auth.set(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(profile.rpId))));
      auth[32] = flags;
      new DataView(auth.buffer).setUint32(33, count, false);
      const clientData = encoder.encode(JSON.stringify({ type: 'webauthn.get', challenge: input.challengeB64u, origin: credential.origin, crossOrigin: false }));
      const signed = new Uint8Array(69);
      signed.set(auth);
      signed.set(new Uint8Array(await crypto.subtle.digest('SHA-256', clientData)), 37);
      const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey, signed);
      return { authenticatorDataB64u: b64(auth), clientDataJSONB64u: b64(clientData), signatureB64u: b64(signature) };
    },
  };
  return {
    client, credential,
    get count() { return count; },
    setNextCounter(value: number) { nextCounter = value; },
    setFlags(value: number) { flags = value; },
  };
}

type Checkpoint = { salt: string; iv: string; ciphertext: string };
async function composedVault() {
  // A credential PRF is modeled as a repeatable HMAC with an inaccessible key.
  // Fresh salt on every write models PRF-based wrapping-key rotation.
  const prfSecret = await crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  let checkpoint: Checkpoint | null = null;
  // Give this model an independent credential blob even though the real phone
  // reported largeBlob support as "not reported". It survives checkpoint restore.
  let credentialBlob: string | null = null;
  const lockName = `receiz-custody-test-${crypto.randomUUID()}`;
  async function key(salt: string) {
    const output = await crypto.subtle.sign('HMAC', prfSecret, buffer(unb64(salt)));
    return crypto.subtle.importKey('raw', output, 'AES-GCM', false, ['encrypt', 'decrypt']);
  }
  async function digest(value: Checkpoint) {
    return b64(await crypto.subtle.digest('SHA-256', encoder.encode(JSON.stringify(value))));
  }
  const storage: KairosNotePwaCustodyStorage = {
    async read() {
      if (!checkpoint) return null;
      if (credentialBlob !== await digest(checkpoint)) throw Error('CREDENTIAL_BLOB_CHECKPOINT_MISMATCH');
      const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buffer(unb64(checkpoint.iv)) }, await key(checkpoint.salt), buffer(unb64(checkpoint.ciphertext)));
      return JSON.parse(new TextDecoder().decode(clear)) as KairosNotePwaCustodyState;
    },
    async write(value) {
      const salt = b64(crypto.getRandomValues(new Uint8Array(32)));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(salt), encoder.encode(JSON.stringify(value)));
      checkpoint = { salt, iv: b64(iv), ciphertext: b64(ciphertext) };
      credentialBlob = await digest(checkpoint);
    },
  };
  return {
    storage,
    snapshot() { return structuredClone(checkpoint); },
    restoreCheckpoint(value: Checkpoint | null) { checkpoint = structuredClone(value); },
    // Models largeBlob's public overwrite operation, not a protected monotonic
    // register. No assertion is made that this is a real iPhone write.
    async overwriteCredentialBlobFor(value: Checkpoint) { credentialBlob = await digest(value); },
    locked<T>(operation: () => Promise<T>) { return navigator.locks.request(lockName, operation); },
  };
}

function adapterFor(device: Awaited<ReturnType<typeof authenticator>>, vault: Awaited<ReturnType<typeof composedVault>>) {
  return createKairosNotePwaCustodyAdapter({ webAuthn: device.client, storage: vault.storage, profiles: [profile] });
}

async function heldFixture() {
  const device = await authenticator();
  const vault = await composedVault();
  const adapter = adapterFor(device, vault);
  const qualification = await vault.locked(() => adapter.qualifyInstallation());
  if (qualification.status !== 'qualified') throw Error('SYNTHETIC_CONTROL_DID_NOT_QUALIFY');
  const receiving = await adapter.createReceivingCommitment(qualification);
  await vault.locked(() => adapter.activateExactSuccessor({
    qualificationDigest: qualification.qualificationDigest,
    noteId: 'synthetic-note-no-funding',
    verifiedSuccessorArtifactSha256: '22'.repeat(32),
    receivingCustodyCommitmentDigest: receiving.receivingCustodyCommitmentDigest,
    wholeValuePhiMicro: '1000000',
    acceptedAtKai: '7000',
  }));
  return {
    device, vault, adapter,
    input: {
      qualificationDigest: receiving.qualificationDigest,
      currentCustodyCommitmentDigest: receiving.receivingCustodyCommitmentDigest,
      noteId: 'synthetic-note-no-funding',
      predecessorArtifactSha256: '22'.repeat(32),
      receiverCustodyCommitmentDigest: '33'.repeat(32),
      wholeValuePhiMicro: '1000000',
      acceptedAtKai: '7001',
      successorBasisDigest: '44'.repeat(32),
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

it('rejects the observed iPhone counter and backup tuple before the composed vault acquires custody', async () => {
  const device = await authenticator({ flags: 0x1d, counterStep: 0 });
  const vault = await composedVault();
  expect(await vault.locked(() => adapterFor(device, vault).qualifyInstallation())).toEqual({ status: 'unsupported', code: 'OFFLINE_NOTE_CUSTODY_BACKUP_ELIGIBLE' });
  expect(vault.snapshot()).toBeNull();
  await expect(runReceizOfflineNoteRollbackConformance({ credential: device.credential, webAuthn: device.client, registrationCounter: '0' })).rejects.toThrow('OFFLINE_NOTE_CUSTODY_ROLLBACK_CONFORMANCE_FAILED');
});

it('rejects zero advancement independently of backup status in the unchanged v129 rollback verifier', async () => {
  const device = await authenticator({ flags: 5, counterStep: 0 });
  const vault = await composedVault();
  expect(await adapterFor(device, vault).qualifyInstallation()).toEqual({ status: 'unsupported', code: 'OFFLINE_NOTE_CUSTODY_COUNTER_UNAVAILABLE' });
  await expect(runReceizOfflineNoteRollbackConformance({ credential: device.credential, webAuthn: device.client, registrationCounter: '0' })).rejects.toThrow('OFFLINE_NOTE_CUSTODY_ROLLBACK_CONFORMANCE_FAILED');
  expect(vault.snapshot()).toBeNull();
});

it('does not promote a client-side sequence into a signed authenticator counter', async () => {
  const device = await authenticator({ flags: 5, counterStep: 0 });
  const challengeB64u = b64(crypto.getRandomValues(new Uint8Array(32)));
  const assertion = await device.client.assert({ credentialIdB64u: device.credential.credentialIdB64u, challengeB64u });
  const input = { ...device.credential, ...assertion, challengeB64u, expectedSignCount: '0' };
  const publicKey = await crypto.subtle.importKey('raw', buffer(unb64(device.credential.custodyPublicKeyRawB64u)), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  const signed = new Uint8Array(69);
  signed.set(unb64(assertion.authenticatorDataB64u));
  signed.set(new Uint8Array(await crypto.subtle.digest('SHA-256', buffer(unb64(assertion.clientDataJSONB64u)))), 37);
  expect(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, buffer(unb64(assertion.signatureB64u)), signed)).toBe(true);
  // Cryptographic validity is insufficient: v129 requires a positive exact
  // sequence even before considering this assertion as consumption evidence.
  await expect(verifyReceizOfflineNoteWebAuthnAssertion(input)).rejects.toThrow();
  await expect(verifyReceizOfflineNoteWebAuthnAssertion({ ...input, expectedSignCount: '1' })).rejects.toThrow();
  const rewritten = unb64(assertion.authenticatorDataB64u);
  new DataView(rewritten.buffer).setUint32(33, 1, false);
  await expect(verifyReceizOfflineNoteWebAuthnAssertion({ ...input, expectedSignCount: '1', authenticatorDataB64u: b64(rewritten) })).rejects.toThrow();
});

it('passes the real sequential check only with an advancing synthetic authenticator control', async () => {
  const device = await authenticator();
  const evidence = await runReceizOfflineNoteRollbackConformance({ credential: device.credential, webAuthn: device.client, registrationCounter: '0' });
  expect(evidence.initialStateSequence).toBe('1');
  expect(evidence.conformedStateSequence).toBe('2');
  // The control has no platform certificate and qualifies no actual hardware.
  expect(device.credential).not.toHaveProperty('platformAttestationCertificate');
});

it('consumes once, recovers only the identical receipt, and rejects a different successor under the composed vault', async () => {
  const { device, vault, adapter, input } = await heldFixture();
  const receipt = await vault.locked(() => adapter.consumeExactHead(input));
  await expect(verifyReceizOfflineNoteWebAuthnConsumptionReceipt(receipt)).resolves.toEqual(receipt);
  expect(receipt.consumedStateSequence).toBe('3');
  await expect(vault.locked(() => adapter.consumeExactHead(input))).resolves.toEqual(receipt);
  expect(device.count).toBe(3);
  await expect(vault.locked(() => adapter.consumeExactHead({ ...input, successorBasisDigest: '55'.repeat(32) }))).rejects.toThrow('OFFLINE_NOTE_CUSTODY_IRREVERSIBLY_CONSUMED');
});

it('still rejects restored pre-send state after the independent credential blob is also rewritten', async () => {
  const { device, vault, adapter, input } = await heldFixture();
  const before = vault.snapshot()!;
  await vault.locked(() => adapter.consumeExactHead(input));
  vault.restoreCheckpoint(before);
  await expect(vault.storage.read()).rejects.toThrow('CREDENTIAL_BLOB_CHECKPOINT_MISMATCH');
  await vault.overwriteCredentialBlobFor(before);
  expect((await vault.storage.read())?.status).toBe('held');
  const reopened = adapterFor(device, vault);
  await expect(vault.locked(() => reopened.consumeExactHead({ ...input, receiverCustodyCommitmentDigest: '66'.repeat(32), successorBasisDigest: '77'.repeat(32) }))).rejects.toThrow('OFFLINE_NOTE_CUSTODY_ROLLBACK_DETECTED');
  expect(await reopened.qualifyInstallation()).toEqual({ status: 'retired', code: 'OFFLINE_NOTE_CUSTODY_ROLLBACK_DETECTED' });
  expect(device.count).toBe(4);
});

it.each([0, 1, 2, 4])('rejects unavailable, decreased, repeated or unexpectedly advanced consumption sequence %s', async counter => {
  const { device, vault, adapter, input } = await heldFixture();
  device.setNextCounter(counter);
  await expect(vault.locked(() => adapter.consumeExactHead(input))).rejects.toThrow('OFFLINE_NOTE_CUSTODY_ROLLBACK_DETECTED');
  expect((await adapter.qualifyInstallation()).status).toBe('retired');
});

it('does not reactivate a held Note when the composed checkpoint is missing', async () => {
  const { device, vault, input } = await heldFixture();
  vault.restoreCheckpoint(null);
  const reopened = adapterFor(device, vault);
  await expect(vault.locked(() => reopened.consumeExactHead(input))).rejects.toThrow('OFFLINE_NOTE_CUSTODY_IRREVERSIBLY_CONSUMED');
  expect(device.count).toBe(2);
  expect(vault.snapshot()).toBeNull();
});

it('cannot reactivate pre-consumption state after a crash prevents saving the consumed receipt', async () => {
  const { device, vault, input } = await heldFixture();
  const interrupted = createKairosNotePwaCustodyAdapter({
    webAuthn: device.client,
    profiles: [profile],
    storage: { read: vault.storage.read, async write() { throw Error('SYNTHETIC_PROCESS_LOSS'); } },
  });
  await expect(vault.locked(() => interrupted.consumeExactHead(input))).rejects.toThrow('SYNTHETIC_PROCESS_LOSS');
  expect(device.count).toBe(3);
  expect((await vault.storage.read())?.status).toBe('held');
  const reopened = adapterFor(device, vault);
  await expect(vault.locked(() => reopened.consumeExactHead(input))).rejects.toThrow('OFFLINE_NOTE_CUSTODY_ROLLBACK_DETECTED');
  expect((await reopened.qualifyInstallation()).status).toBe('retired');
});

it('rejects backup eligibility even when consumption advances by the expected amount', async () => {
  const { device, vault, adapter, input } = await heldFixture();
  device.setFlags(0x1d);
  await expect(vault.locked(() => adapter.consumeExactHead(input))).rejects.toThrow('OFFLINE_NOTE_CUSTODY_ROLLBACK_DETECTED');
});

it('preserves receiver and whole-value bindings in the real consumption verifier', async () => {
  const { vault, adapter, input } = await heldFixture();
  const receipt = await vault.locked(() => adapter.consumeExactHead(input));
  await expect(verifyReceizOfflineNoteWebAuthnConsumptionReceipt({ ...receipt, receiverCustodyCommitmentDigest: '88'.repeat(32) })).rejects.toThrow();
  await expect(verifyReceizOfflineNoteWebAuthnConsumptionReceipt({ ...receipt, wholeValuePhiMicro: '2000000' })).rejects.toThrow();
});
