import { beforeEach, expect, it, vi } from 'vitest';
import * as sdk from '@receiz/sdk';
import { openCanonicalIdentity } from '../src/receiz/native-identity';
import { BANK_APPLICATION_ID, BANK_NATIVE_SCOPES } from '../src/receiz/config';
import { parseSharedWallet } from '../src/receiz/shared-wallet';

// Boundary choreography only. Native funding/hardware are not qualified by
// this fixture. Portable-state signatures use the unmodified local v129 SDK.
const fixture = vi.hoisted(() => ({ keyFile: null as unknown, initial: null as unknown, wallet: vi.fn(), create: vi.fn(), save: vi.fn(), pending: vi.fn() }));
vi.mock('../src/receiz/identity-vault', () => ({
  loadWalletObservation: async () => fixture.initial,
  saveWalletObservation: fixture.save,
  loadOfflineNoteState: vi.fn(), saveOfflineNoteState: vi.fn(), saveOfflineNoteBlob: vi.fn(), loadOfflineNoteBlob: vi.fn(),
}));
vi.mock('@receiz/sdk/offline', () => ({ createReceizOfflineSealer: () => ({ enroll: async () => {} }), createReceizIndexedDbSealStore: () => ({ load: async () => ({ privateKey: {} }) }) }));
vi.mock('../src/receiz/offline-notes', () => ({
  bankNoteArtwork: vi.fn(), loadBankNoteRuntime: async () => ({ createBankNativeNoteSealer: async () => vi.fn(), createBankOfflineNotesRuntime: () => ({ pending: fixture.pending, createNote: fixture.create }) }),
}));
vi.mock('../src/receiz/client', async () => {
  const actual = await vi.importActual<typeof import('@receiz/sdk')>('@receiz/sdk');
  return { loadReceiz: async () => ({ ...actual,
    verifyReceizArtifact: async () => ({ status: 'verified-artifact' }), createReceizArtifactAdmissionEngine: () => async () => ({ verdict: 'canonical-identity' }), isSdkIssuedReceizArtifactAdmission: () => true,
    readReceizIdentityPublicBinding: async () => ({ keyId: (fixture.keyFile as sdk.ReceizKeyFile).keyId, artifactSha256: 'a'.repeat(64) }),
    readReceizIdentityArtifact: async () => fixture.keyFile,
    projectReceizIdentityAccount: actual.projectReceizIdentityAccount,
    createReceizClient: (options: { accessToken?: string }) => options.accessToken ? { auth: { grantedScopes: async () => [...BANK_NATIVE_SCOPES] }, connect: { wallet: fixture.wallet } } : { identity: {
      continueReceizId: async () => ({ ok: true, session: { uid: 'connected-account' } }),
      signLoginProof: async () => ({}), exchangeProofAuthority: async () => ({ applicationId: BANK_APPLICATION_ID, keyId: (fixture.keyFile as sdk.ReceizKeyFile).keyId, artifactDigest: 'a'.repeat(64), grantedScopes: [...BANK_NATIVE_SCOPES], accessToken: 'local-fixture', expiresAtKai: Number.MAX_SAFE_INTEGER }),
    } },
  }) };
});
function wallet(cents: string) { return { userId: 'connected-account', balanceUsd: `${BigInt(cents) / 100n}.${(BigInt(cents) % 100n).toString().padStart(2, '0')}`, balancePhiMicro: cents, valueStates: { settledBalanceUsdCents: cents, ecosystemBalanceUsdCents: '0' }, sync: {}, rollup: {} }; }
beforeEach(async () => {
  vi.restoreAllMocks(); fixture.wallet.mockReset(); fixture.create.mockReset(); fixture.save.mockReset().mockResolvedValue(undefined); fixture.pending.mockReset().mockResolvedValue(null);
  fixture.keyFile = (await sdk.createReceizIdIdentity({ passphrase: 'local-test-passphrase' })).keyFile;
  fixture.initial = { wallet: parseSharedWallet({ ok: true, wallet: wallet('600') }, 'connected-account'), observedAt: '2026-10-17T11:00:00.000Z' };
  fixture.wallet.mockResolvedValue({ ok: true, wallet: wallet('600') });
  const proof = await sdk.appendReceizIdentityPortableState({ keyFile: fixture.keyFile as sdk.ReceizKeyFile, passphrase: 'local-test-passphrase', snapshot: { account: { userId: 'connected-account' }, wallet: { routeSummary: wallet('500') } }, exportedAt: '2026-10-17T12:00:00.000Z' });
  fixture.create.mockResolvedValue({ noteId: 'fixture-note', rail: 'reserve', amountUsdCents: '100', image: new Uint8Array([1]), successorAccountProof: proof });
  vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([1]))));
  vi.stubGlobal('navigator', { locks: { request: async (_name: string, _options: unknown, action: () => Promise<unknown>) => action() } });
  vi.stubGlobal('location', { origin: 'https://bankeiz.com' });
});
it('hands off the completed successor to the balance/chart without a second wallet request', async () => {
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'local-test-passphrase', 'fixture.receiz', true);
  try {
    const notes = await identity.offlineNotes!();
    const result = await notes.create('100');
    expect(result.accountUpdateWarning).toBeUndefined();
    expect(identity.knownWallet()?.wallet.totalUsdCents).toBe('500');
    expect(identity.knownWallet()?.history?.at(-1)?.reserveUsdCents).toBe('500');
    expect(fixture.wallet).toHaveBeenCalledTimes(1);
    expect(fixture.save).toHaveBeenCalledOnce();
  } finally { identity.dispose(); vi.unstubAllGlobals(); }
});
it('does not let an earlier delayed wallet read replace the completed note result', async () => {
  let finish!: (value: unknown) => void;
  fixture.wallet.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'local-test-passphrase', 'fixture.receiz', true);
  try {
    const notes = await identity.offlineNotes!();
    const earlier = identity.readWallet();
    await vi.waitFor(() => expect(fixture.wallet).toHaveBeenCalledOnce());
    await notes.create('100');
    finish({ ok: true, wallet: wallet('600') });
    expect((await earlier).totalUsdCents).toBe('500');
    expect(identity.knownWallet()?.wallet.totalUsdCents).toBe('500');
    expect(fixture.save).toHaveBeenCalledOnce();
  } finally { identity.dispose(); vi.unstubAllGlobals(); }
});
it('keeps the completed note savable if only the display-cache write fails', async () => {
  fixture.save.mockRejectedValue(new Error('fixture cache failure'));
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'local-test-passphrase', 'fixture.receiz', true);
  try {
    const result = await (await identity.offlineNotes!()).create('100');
    expect(result.image).toEqual(new Uint8Array([1]));
    expect(result.accountUpdateWarning).toContain('note is saved');
    expect(fixture.create).toHaveBeenCalledOnce();
    expect(identity.knownWallet()?.wallet.totalUsdCents).toBe('500');
  } finally { identity.dispose(); vi.unstubAllGlobals(); }
});
it('preserves a newer wallet when an old retained note attempt completes', async () => {
  fixture.pending.mockResolvedValue({ noteId: 'fixture-note', amountUsdCents: '100', rail: 'reserve' });
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'local-test-passphrase', 'fixture.receiz', true);
  try {
    const result = await (await identity.offlineNotes!()).create('100');
    expect(result.image).toEqual(new Uint8Array([1]));
    expect(result.accountUpdateWarning).toContain('note is saved');
    expect(identity.knownWallet()?.wallet.totalUsdCents).toBe('600');
    expect(fixture.save).not.toHaveBeenCalled(); expect(fixture.wallet).not.toHaveBeenCalled();
  } finally { identity.dispose(); vi.unstubAllGlobals(); }
});
it('preserves an account observation that changed while issuance was running', async () => {
  const completed = await fixture.create(); fixture.create.mockReset();
  let finish!: (value: unknown) => void; fixture.create.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'local-test-passphrase', 'fixture.receiz', true);
  try {
    const notes = await identity.offlineNotes!(), creating = notes.create('100');
    await vi.waitFor(() => expect(fixture.create).toHaveBeenCalledOnce());
    fixture.wallet.mockResolvedValue({ ok: true, wallet: wallet('650') });
    await identity.readWallet(); finish(completed);
    const result = await creating;
    expect(result.accountUpdateWarning).toContain('note is saved');
    expect(identity.knownWallet()?.wallet.totalUsdCents).toBe('650');
    expect(fixture.save).toHaveBeenCalledTimes(1);
  } finally { identity.dispose(); vi.unstubAllGlobals(); }
});
