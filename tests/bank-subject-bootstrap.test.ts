import { beforeEach, expect, it, vi } from 'vitest';
import { createBankSubjectSource } from '../src/receiz/bank-native-source';
import { BANK_APPLICATION_ID } from '../src/receiz/config';

// Protocol-boundary fixtures only. No genuine subject is admitted in these
// tests; they check exact retention and refusal before source construction.
const fixture = vi.hoisted(() => ({ admit: vi.fn(), state: vi.fn(), retain: vi.fn(), seal: vi.fn(), candidate: vi.fn(), order: [] as string[] }));
vi.mock('../src/receiz/client', () => ({ loadReceiz: async () => ({
  RECEIZ_CURRENT_REGISTRY_DIGEST: 'c'.repeat(64), RECEIZ_LIVING_SUBJECT_REDUCER_DIGEST: 'd'.repeat(64),
  readReceizIdentityPublicBinding: async () => ({ artifactOwnerReceizId: 'fixture.receiz.id' }),
  createReceizClient: () => ({ artifacts: { verifyAndOpen: async () => ({ sealedArtifact: { artifactSha256: 'a'.repeat(64), continuity: { ownerReceizId: 'fixture.receiz.id' } } }) } }),
  prepareReceizInitialTemporalSubjectSourceV125: fixture.candidate,
}) }));
const seed = { bytes: new Uint8Array([1, 2, 3]), filename: 'original-fixture.receiz' };
const input = () => ({ ownerIdentityAdmission: {}, sealer: { seal: fixture.seal }, kaiFactory: vi.fn(), client: { subjects: { admit: fixture.admit, state: fixture.state } }, seed, retainSeed: fixture.retain }) as never;
beforeEach(() => {
  fixture.order = []; fixture.retain.mockReset().mockImplementation(async () => { fixture.order.push('retained'); });
  fixture.admit.mockReset().mockImplementation(async () => { fixture.order.push('admission'); throw new Error('Lost admission response'); });
  fixture.state.mockReset(); fixture.seal.mockReset(); fixture.candidate.mockReset();
});
it('retains the same original proof before admission and reuses its exact semantic key after a lost response', async () => {
  await expect(createBankSubjectSource(input())).rejects.toThrow('Lost admission response');
  await expect(createBankSubjectSource(input())).rejects.toThrow('Lost admission response');
  expect(fixture.order).toEqual(['retained', 'admission', 'retained', 'admission']);
  for (const [request] of fixture.admit.mock.calls) {
    expect(request.idempotencyKey).toBe(`bank-account:${BANK_APPLICATION_ID}:${'a'.repeat(64)}`);
    expect(request.expectedAbsent).toBe(true);
    expect(new Uint8Array(await request.proofObject.arrayBuffer())).toEqual(seed.bytes);
  }
  expect(fixture.seal).not.toHaveBeenCalled(); expect(fixture.candidate).not.toHaveBeenCalled();
});
it('rejects a foreign or advanced authenticated subject state before sealing a publication candidate', async () => {
  fixture.admit.mockResolvedValue({ ok: true, subjectId: 'fixture-subject' });
  fixture.state.mockResolvedValue({ subjectId: 'fixture-subject', admittedProofDigest: 'a'.repeat(64), ownerReceizId: 'foreign.receiz.id', registryDigest: 'c'.repeat(64), reducerDigest: 'd'.repeat(64), head: 'advanced', genesisHead: 'initial' });
  await expect(createBankSubjectSource(input())).rejects.toThrow('BANK_SUBJECT_ADMITTED_STATE_MISMATCH');
  expect(fixture.candidate).not.toHaveBeenCalled(); expect(fixture.seal).not.toHaveBeenCalled();
});
