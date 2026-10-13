import { beforeEach, expect, it, vi } from 'vitest';
import { BANK_APPLICATION_ID, BANK_READ_SCOPES } from '../src/receiz/config';
import { openCanonicalIdentity } from '../src/receiz/native-identity';
// Protocol-mechanics fixtures only. They are not canonical SDK admission/live-user evidence.
const protocol = vi.hoisted(() => ({ grant: vi.fn(), scopes: vi.fn(), wallet: vi.fn(), continueId: vi.fn(), client: vi.fn(), qualify: vi.fn() }));
vi.mock('../src/receiz/client', () => ({ loadReceiz: async () => ({
  verifyReceizArtifact: async () => ({ status: 'verified-artifact' }), createReceizArtifactAdmissionEngine: () => async () => ({ verdict: 'canonical-identity' }), isSdkIssuedReceizArtifactAdmission: () => true,
  readReceizIdentityPublicBinding: async () => ({ keyId: 'fixture-key', artifactSha256: 'a'.repeat(64) }),
  readReceizIdentityArtifact: async () => ({ owner: { uid: 'fixture-owner', username: 'fixture' }, issuedAt: '2026-10-13T00:00:00Z', keyId: 'fixture-key', crypto: {} }), projectReceizIdentityAccount: async () => ({ authority: 'identity-only' }),
  createReceizClient: protocol.client, receizKaiNow: () => ({ pulse: 100 }), sha256ReceizBytes: async () => 'a'.repeat(64),
  createReceizProofAuthorityChallenge: () => ({ challenge: { audience: 'fixture' }, challengeB64Url: 'fixture' }),
}) }));
beforeEach(() => {
  protocol.continueId.mockReset().mockResolvedValue({ ok: true, session: { uid: 'fixture-owner' } });
  protocol.grant.mockReset().mockResolvedValue({ applicationId: BANK_APPLICATION_ID, keyId: 'fixture-key', artifactDigest: 'a'.repeat(64), grantedScopes: [...BANK_READ_SCOPES], accessToken: 'local-fixture', expiresAtKai: 200 });
  protocol.scopes.mockReset().mockResolvedValue([...BANK_READ_SCOPES]); protocol.wallet.mockReset().mockResolvedValue({ ok: true, wallet: { userId: 'fixture-owner', balanceUsd: '3.00', balancePhiMicro: '2', valueStates: { settledBalanceUsdCents: '100', ecosystemBalanceUsdCents: '200' }, sync: {}, rollup: {} } });
  protocol.qualify.mockReset().mockRejectedValue(new Error('Native scope missing'));
  protocol.client.mockReset().mockImplementation((options: { accessToken?: string }) => options.accessToken ? { auth: { grantedScopes: protocol.scopes }, connect: { wallet: protocol.wallet }, runtime: { qualifyV124: protocol.qualify } } : { identity: { continueReceizId: protocol.continueId, signLoginProof: async () => ({}), exchangeProofAuthority: protocol.grant } });
});
it('a read-only connection check reports missing native access without requesting expanded permissions or qualifying unavailable operations', async () => {
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'fixture-phrase', 'fixture.receiz', true);
  try {
    const report = await identity.nativeReadiness();
    expect(report.status).toBe('permissions-needed'); expect(report.missingScopes).toContain('receiz:reserve.write'); expect(report.readyToTransact).toBe(false);
    expect(protocol.grant.mock.calls[0][0].scopes).toEqual(BANK_READ_SCOPES); expect(protocol.qualify).not.toHaveBeenCalled();
  } finally { identity.dispose(); }
});
it('does not start account transport without actual UI consent', async () => {
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'fixture-phrase', 'fixture.receiz');
  await expect(identity.readWallet()).rejects.toThrow('consent'); expect(protocol.continueId).not.toHaveBeenCalled();
});
it.each(['application', 'key', 'artifact', 'scope'])('refuses a foreign or insufficient %s grant before any wallet read', async mismatch => {
  const grant = { applicationId: BANK_APPLICATION_ID, keyId: 'fixture-key', artifactDigest: 'a'.repeat(64), grantedScopes: [...BANK_READ_SCOPES], accessToken: 'local-fixture', expiresAtKai: 200 };
  if (mismatch === 'application') grant.applicationId = 'foreign'; if (mismatch === 'key') grant.keyId = 'foreign'; if (mismatch === 'artifact') grant.artifactDigest = 'b'.repeat(64); if (mismatch === 'scope') grant.grantedScopes = [];
  protocol.grant.mockResolvedValue(grant);
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'fixture-phrase', 'fixture.receiz', true);
  await expect(identity.readWallet()).rejects.toThrow('same identity'); expect(protocol.wallet).not.toHaveBeenCalled();
});
it('introspects real granted scopes and rejects a revoked read before wallet transport', async () => {
  protocol.scopes.mockResolvedValue([]); const identity = await openCanonicalIdentity(new Uint8Array([1]), 'fixture-phrase', 'fixture.receiz', true);
  await expect(identity.readWallet()).rejects.toThrow('permission'); expect(protocol.wallet).not.toHaveBeenCalled();
});
it('reads the bound shared wallet and disposes its held bearer/signing transport', async () => {
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'fixture-phrase', 'fixture.receiz', true);
  expect((await identity.readWallet()).totalUsdCents).toBe('300'); expect(protocol.client.mock.calls.every(([options]) => options.applicationId === BANK_APPLICATION_ID)).toBe(true);
  identity.dispose(); await expect(identity.readWallet()).rejects.toThrow('consent'); expect(protocol.wallet).toHaveBeenCalledTimes(1);
});
