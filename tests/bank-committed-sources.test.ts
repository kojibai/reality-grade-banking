import { expect, it, vi } from 'vitest';
import type { BankExecutionCheckpoint } from '../src/receiz/bank-execution';
import { BANK_APPLICATION_ID } from '../src/receiz/config';
import { createBankCommittedSourceRestoration } from '../src/receiz/bank-committed-sources';
const fixture = vi.hoisted(() => ({ expired: false }));
// Custody choreography fixtures only; no financial admission is simulated.
vi.mock('../src/receiz/client', () => ({ loadReceiz: async () => ({
  recoverReceizPortableExecutionTransitionSetV124: async () => {
    if (fixture.expired) throw Error('EXPIRED_CAPABILITY');
    return { transitions: ['account-subject', 'owned-asset-subject', 'foreign-subject'].map(name => ({ artifact: { name, continuity: { ownerReceizId: name === 'foreign-subject' ? 'other' : 'owner' } } })) };
  },
  transportReceizSealedArtifactV124: async (artifact: { name: string }) => ({ filename: artifact.name, exactBytesB64u: artifact.name, artifactSha256: artifact.name }),
  receizBase64UrlDecode: (name: string) => new TextEncoder().encode(name), canonicalizeReceizConstitution: JSON.stringify,
}) }));
function setup() {
  fixture.expired = false;
  let current = { schema: 'bank.execution-checkpoint.v1', operationId: 'fixture', plan: { applicationId: BANK_APPLICATION_ID }, state: 'committed', accountSubjectId: 'account-subject', recovery: { fixture: true } } as unknown as BankExecutionCheckpoint;
  const saveSource = vi.fn(async (_bytes: Uint8Array, _filename: string, _digest: string, _role?: 'account-coordination') => {}), store = { load: async () => structuredClone(current), saveNew: vi.fn(), replace: async (next: BankExecutionCheckpoint) => { current = structuredClone(next); } };
  const restore = createBankCommittedSourceRestoration({ store, ownerReceizId: 'owner', assertOpen() {}, openSubject: async file => ({ subjectId: file.name }), saveSource });
  return { restore, store, saveSource };
}
it('restores only the established account successor as coordination and preserves other owned subjects as assets', async () => {
  const x = setup(); await x.restore();
  expect(x.saveSource.mock.calls.map(call => [call[1], call[3]])).toEqual([['account-subject', 'account-coordination'], ['owned-asset-subject', undefined]]);
  expect((await x.store.load()).sourcesRestored).toBe(true);
  expect((await x.store.load()).recovery).toEqual({ fixture: true });
});
it('durably completed restoration skips expired old capabilities on a later preparation', async () => {
  const x = setup(); await x.restore(); fixture.expired = true;
  await expect(x.restore()).resolves.toBeUndefined(); expect(x.saveSource).toHaveBeenCalledTimes(2);
});
it('keeps partial restoration pending and safely retries its original recovery', async () => {
  const x = setup(); x.saveSource.mockRejectedValueOnce(Error('storage full'));
  await expect(x.restore()).rejects.toThrow('storage full'); expect((await x.store.load()).sourcesRestored).toBeUndefined();
  await x.restore(); expect((await x.store.load()).sourcesRestored).toBe(true);
});
