import { beforeEach, expect, it, vi } from 'vitest';
import { openCanonicalIdentity } from '../src/receiz/native-identity';

// Isolated SDK/vault boundary fixture. It creates no identity, admission or
// financial material; the bank's owner selection and private holding are real.
const fixture = vi.hoisted(() => ({ owner: 'fixture.receiz.id', sources: [] as { bytes: Uint8Array; filename: string }[] }));
vi.mock('../src/receiz/client', () => ({ loadReceiz: async () => ({
  verifyReceizArtifact: async () => ({ status: 'verified-artifact' }),
  createReceizArtifactAdmissionEngine: () => async () => ({ verdict: 'canonical-identity' }),
  isSdkIssuedReceizArtifactAdmission: () => true,
  readReceizIdentityPublicBinding: async () => ({ identityOwnerReceizId: 'receiz_device_fixture', artifactOwnerReceizId: 'fixture.receiz.id', keyId: 'fixture', artifactSha256: 'a'.repeat(64) }),
  readReceizIdentityArtifact: async () => ({ owner: { uid: 'receiz_device_fixture', username: 'fixture' }, crypto: { privateKeyCiphertextB64u: 'fixture' } }),
  projectReceizIdentityAccount: async () => ({}),
  createReceizClient: () => ({ artifacts: { verifyAndOpen: async () => ({
    sealedArtifact: { continuity: { ownerReceizId: fixture.owner }, artifactSha256: 'b'.repeat(64) },
    verifiedPayload: { bytes: new TextEncoder().encode('fixture source'), filename: 'fixture.txt' }, verification: { bundle: {} },
  }) } }),
}) }));
vi.mock('../src/receiz/identity-vault', () => ({
  loadWalletObservation: async () => null,
  saveDepositSource: async (_binding: unknown, bytes: Uint8Array, filename: string) => { fixture.sources.push({ bytes, filename }); },
  loadDepositSources: async () => fixture.sources,
}));
beforeEach(() => { fixture.owner = 'fixture.receiz.id'; fixture.sources = []; });
it('holds and reopens the account’s own proof using its admitted artifact owner, distinct from device ownership', async () => {
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'fixture', 'identity.receiz');
  try {
    const file = new File(['fixture source'], 'fixture.receiz');
    const deposit = await identity.holdProof(file);
    expect(deposit.status).toBe('held-proof');
    expect((await identity.listDeposits()).map(value => value.digest)).toEqual(['b'.repeat(64)]);
  } finally { identity.dispose(); }
});
it('refuses a foreign owner before holding its proof', async () => {
  fixture.owner = 'foreign.receiz.id';
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'fixture', 'identity.receiz');
  try { await expect(identity.holdProof(new File(['fixture source'], 'foreign.receiz'))).rejects.toThrow('different Receiz identity'); expect(await identity.listDeposits()).toEqual([]); }
  finally { identity.dispose(); }
});
