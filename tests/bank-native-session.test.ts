import { beforeEach, expect, it, vi } from 'vitest';
import { BANK_APPLICATION_ID } from '../src/receiz/config';
import { createBankNativeSession, type BankSessionIntent, type BankSessionStore } from '../src/receiz/bank-native-session';
import type { BankSubjectSource } from '../src/receiz/bank-native-source';

// Choreography fixtures only: these stub SDK boundaries to test retained
// requests. They establish no proof admission, session authority or live write.
const fixture = vi.hoisted(() => ({ now: 10, source: { artifactSha256: 'a'.repeat(64) }, publish: vi.fn(), open: vi.fn(), refresh: vi.fn(), sign: vi.fn() }));
vi.mock('../src/receiz/bank-native-source', () => ({ heldBankSubjectSource: () => fixture.source }));
vi.mock('../src/receiz/client', () => ({ loadReceiz: async () => ({ sha256ReceizBytes: async () => 'b'.repeat(64), receizKaiNow: () => ({ uPulse: fixture.now }), ReceizRuntimeZeroWriteErrorV124: class extends Error {} }) }));
const source = { subjectId: 'fixture-subject', artifactDigest: 'a'.repeat(64), namespaces: ['bank-account'] } as unknown as BankSubjectSource;
function store() {
  let held: BankSessionIntent | null = null;
  const value: BankSessionStore = { load: async () => structuredClone(held), save: async (next, expected) => {
    if (JSON.stringify(expected) !== JSON.stringify(held)) throw new Error('CONCURRENT_SESSION_CHANGE');
    held = structuredClone(next);
  } };
  return value;
}
function manager(custody = store(), signal = new AbortController().signal) {
  return { custody, value: createBankNativeSession({ client: { sources: { publishSealedSourceV124: fixture.publish }, runtime: { openAuthoritySessionV124: fixture.open, refreshAuthoritySessionV124: fixture.refresh } } as never, identityBytes: new Uint8Array([1]), store: custody, signFreshChallenge: fixture.sign, signal }) };
}
beforeEach(() => {
  fixture.now = 10;
  fixture.publish.mockReset().mockResolvedValue({ status: 'idempotent' });
  fixture.sign.mockReset().mockResolvedValue({ nonce: 'retained-fixture' });
  fixture.open.mockReset().mockResolvedValue({ applicationId: BANK_APPLICATION_ID, audience: BANK_APPLICATION_ID, actorSubjectId: source.subjectId, subjectSourceArtifactSha256: source.artifactDigest, identityArtifactSha256: 'b'.repeat(64), sessionBindingDigest: 'c'.repeat(64), authoritySessionHandle: 'fixture-handle', expiresAtKaiUPulse: 100 });
  fixture.refresh.mockReset().mockImplementation(() => fixture.open());
});

it('retains the exact original request before submission and resumes it after a lost response', async () => {
  const { value, custody } = manager();
  fixture.open.mockRejectedValueOnce(new Error('Lost response'));
  await expect(value.connect(source, ['reserve'])).rejects.toMatchObject({ stage: 'authority-session' });
  const retained = await custody.load(); expect(retained?.state).toBe('pending');
  const reloaded = manager(custody).value;
  await reloaded.connect(source, ['reserve']);
  expect(fixture.sign).toHaveBeenCalledTimes(1);
  expect(fixture.open.mock.calls[1][0]).toEqual(fixture.open.mock.calls[0][0]);
  expect((await custody.load())?.state).toBe('active');
});
it('refuses changing the source or rail while the original session attempt is unresolved', async () => {
  const { value } = manager(); fixture.open.mockRejectedValue(new Error('Lost response'));
  await expect(value.connect(source, ['reserve'])).rejects.toThrow();
  await expect(value.connect(source, ['settlement'])).rejects.toThrow('BANK_SESSION_PENDING_SOURCE_CHANGED');
  expect(fixture.open).toHaveBeenCalledTimes(1); expect(fixture.sign).toHaveBeenCalledTimes(1);
});
it('creates the session challenge only after source publication succeeds, including after an outage', async () => {
  const { value, custody } = manager();
  fixture.publish.mockRejectedValueOnce(new Error('Publication unavailable'));
  await expect(value.connect(source)).rejects.toMatchObject({ stage: 'source-publication' });
  const retained = await custody.load();
  expect(retained?.state).toBe('pending');
  expect(retained?.phase).toBe('publication-pending');
  expect(retained?.challenge).toBeUndefined();
  expect(fixture.sign).not.toHaveBeenCalled(); expect(fixture.open).not.toHaveBeenCalled();
  fixture.now = 200;
  fixture.sign.mockResolvedValue({ nonce: 'fresh-after-publication' });
  await manager(custody).value.connect(source);
  expect(fixture.sign).toHaveBeenCalledTimes(1);
  expect(fixture.open.mock.calls[0][0].signedChallenge).toEqual({ nonce: 'fresh-after-publication' });
  expect((await custody.load())?.phase).toBe('session-pending');
});
it('refreshes a stored session through the SDK rather than admitting its JSON after reload', async () => {
  const { value, custody } = manager(); await value.connect(source);
  fixture.refresh.mockRejectedValueOnce(new Error('Refresh refused'));
  await expect(manager(custody).value.connect(source)).rejects.toMatchObject({ stage: 'authority-session' });
  expect(fixture.refresh).toHaveBeenCalledTimes(1);
  expect((await custody.load())?.state).toBe('pending');
});
it('opens again after a known-successful session expires instead of queuing an invalid refresh', async () => {
  const { value, custody } = manager(); await value.connect(source);
  fixture.now = 100;
  await manager(custody).value.connect(source);
  expect(fixture.refresh).not.toHaveBeenCalled();
  expect(fixture.open).toHaveBeenCalledTimes(2);
  expect(fixture.sign).toHaveBeenCalledTimes(2);
  expect((await custody.load())?.operation).toBe('open');
});
it('opens instead of refreshing if the known session expires during a publication outage before submission', async () => {
  const { value, custody } = manager(); await value.connect(source);
  fixture.publish.mockRejectedValueOnce(new Error('Publication unavailable'));
  await expect(manager(custody).value.connect(source)).rejects.toMatchObject({ stage: 'source-publication' });
  expect((await custody.load())?.phase).toBe('publication-pending');
  fixture.now = 100;
  await manager(custody).value.connect(source);
  expect(fixture.refresh).not.toHaveBeenCalled();
  expect(fixture.open).toHaveBeenCalledTimes(2);
  expect((await custody.load())?.operation).toBe('open');
});
it('does not replace a pending unknown refresh with a new open when its previous session expires', async () => {
  const { value, custody } = manager(); await value.connect(source);
  fixture.refresh.mockRejectedValue(new Error('Lost refresh response'));
  await expect(manager(custody).value.connect(source)).rejects.toThrow();
  const original = structuredClone(fixture.refresh.mock.calls[0][0]);
  fixture.now = 100;
  await expect(manager(custody).value.connect(source)).rejects.toThrow();
  expect(fixture.refresh.mock.calls[1][0]).toEqual(original);
  expect(fixture.open).toHaveBeenCalledTimes(1);
  expect(fixture.sign).toHaveBeenCalledTimes(2);
  expect((await custody.load())?.state).toBe('pending');
});
it('never changes a response mismatch or closed identity into an active session', async () => {
  const { value, custody } = manager(); fixture.open.mockResolvedValue({ applicationId: 'foreign' });
  await expect(value.connect(source)).rejects.toMatchObject({ stage: 'authority-session' });
  expect((await custody.load())?.state).toBe('pending');
  const controller = new AbortController(); controller.abort();
  await expect(manager(store(), controller.signal).value.connect(source)).rejects.toThrow('BANK_SESSION_IDENTITY_CLOSED');
});

it('refuses a requested namespace absent from the verified subject', async () => {
  await expect(manager().value.connect(source, [], ['unheld'])).rejects.toThrow('BANK_SESSION_SCOPE_MISMATCH');
  expect(fixture.publish).not.toHaveBeenCalled();
});
it('never resubmits an unresolved prior-client session under the new client',async()=>{
 const {value,custody}=manager();fixture.open.mockRejectedValueOnce(Error('Lost response'));
 await expect(value.connect(source)).rejects.toThrow();
 const original=(await custody.load())!;
 const previous={...original,applicationId:'rc_uV6aT6wZJCQDspB0_SJ1DcEm',challenge:{...original.challenge,audience:'rc_uV6aT6wZJCQDspB0_SJ1DcEm'}} as BankSessionIntent;
 await custody.save(previous,original);fixture.publish.mockClear();fixture.open.mockClear();fixture.sign.mockClear();
 await expect(manager(custody).value.connect(source)).rejects.toThrow('BANK_SESSION_PENDING_APPLICATION_CHANGED');
 expect(await custody.load()).toEqual(previous);expect(fixture.publish).not.toHaveBeenCalled();expect(fixture.open).not.toHaveBeenCalled();expect(fixture.sign).not.toHaveBeenCalled();
});
