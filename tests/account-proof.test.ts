import { describe, expect, it, vi } from 'vitest';
import { exportAccountProof, inspectAccountStatement, verifyAccountProof, type VerifiedAccountProof } from '../src/receiz/account-proof';
import { BANK_APPLICATION_ID } from '../src/receiz/config';
import { permittedNativePath } from '../src/receiz/native-transport';
import { accountProofSourceConfigured } from '../src/receiz/account-proof';
const hash = (v: string) => v.repeat(64);
function statement() { return {
  schema: 'bankeiz.public-account-statement.v1', applicationId: BANK_APPLICATION_ID,
  account: { receizId: 'example.receiz.id', keyId: hash('a'), alg: 'Ed25519', publicKeyRawB64u: 'test-only-public-coordinate' },
  checkpoint: { accountHead: hash('b'), identityBindingDigest: hash('c'), genesisHead: hash('d'), historyHead: hash('e'), transactionCount: 1, kaiUPulse: '123456789', reserveUsdCents: '500', settlementPhiMicro: '1000000', historyDigest: hash('f') },
  transactions: [{ sequence: 1, transactionId: 'first', eventDigest: hash('e'), previousEventDigest: hash('d'), kaiUPulse: '123456700', kind: 'credit', description: 'Example accepted credit', reserveDeltaUsdCents: '500', settlementDeltaPhiMicro: '1000000' }],
}; }
describe('statement shape and reconciliation, not canonical verification', () => {
  it('inspects a complete statement without issuing export custody', async () => {
    const inspected = inspectAccountStatement(statement());
    expect(inspected.checkpoint.reserveUsdCents).toBe('500');
    expect(Object.isFrozen(inspected.transactions[0])).toBe(true);
    await expect(exportAccountProof({ statement: inspected, sourceDigest: hash('a'), writer: 'test.receiz.id' } as VerifiedAccountProof)).rejects.toThrow('VERIFIED_SOURCE_REQUIRED');
  });
  it.each(['IdentitySeal', 'privateKeyPkcs8B64u', 'privateKeyPkcs8CiphertextB64u', 'accessToken', 'recovery', 'unknownNamespace'])('rejects %s rather than copying private or unknown fields into a public export', key => {
    expect(() => inspectAccountStatement({ ...statement(), [key]: 'private-test-fixture' })).toThrow('PRIVATE_OR_UNSUPPORTED_FIELDS');
  });
  it('rejects omitted, reordered, duplicated and cross-linked history', () => {
    const truncated = statement(); truncated.transactions = []; expect(() => inspectAccountStatement(truncated)).toThrow('HISTORY_INCOMPLETE');
    const reordered = statement(); reordered.transactions[0].sequence = 2; expect(() => inspectAccountStatement(reordered)).toThrow('HISTORY_INVALID');
    const cross = statement(); cross.transactions[0].previousEventDigest = hash('a'); expect(() => inspectAccountStatement(cross)).toThrow('HISTORY_INVALID');
    const duplicate = statement(); duplicate.transactions.push({ ...duplicate.transactions[0], sequence: 2, previousEventDigest: hash('e') }); duplicate.checkpoint.transactionCount = 2; expect(() => inspectAccountStatement(duplicate)).toThrow('HISTORY_INVALID');
  });
  it('rejects claimed balances inconsistent with the disclosed accepted movements', () => {
    const bad = statement(); bad.checkpoint.reserveUsdCents = '100000000'; expect(() => inspectAccountStatement(bad)).toThrow('BALANCE_MISMATCH');
    const negative = statement(); negative.transactions[0].reserveDeltaUsdCents = '-1'; expect(() => inspectAccountStatement(negative)).toThrow('BALANCE_MISMATCH');
    const future = statement(); future.transactions[0].kaiUPulse = '123456790'; expect(() => inspectAccountStatement(future)).toThrow('HISTORY_INVALID');
  });
});
describe('actual installed v129 refusal boundary', () => {
  it('refuses plain balance JSON and forged sealed bytes without network or login', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockRejectedValue(Error('NETWORK_FORBIDDEN'));
    try {
      await expect(verifyAccountProof(new File([JSON.stringify(statement())], 'account.json'))).rejects.toThrow();
      const source = { schema: 'receiz.sealed-artifact-bytes.v124', exactBytesB64u: 'e30', filename: 'forged.receiz', mimeType: 'application/json', artifactSha256: hash('a'), payloadSha256: hash('b') };
      await expect(verifyAccountProof(new File([JSON.stringify({ schema: 'bankeiz.account-proof.v1', sdkVersion: '129.0.0', source })], 'forged.json'))).rejects.toThrow();
      expect(fetch).not.toHaveBeenCalled();
    } finally { fetch.mockRestore(); }
  });
  it('does not infer a trusted writer from an API, filename, source owner, or SDK roots alone', () => { expect(accountProofSourceConfigured()).toBe(false); });
  it('allows only the scoped GET, never writes, account selectors or duplicate scope parameters', () => {
    const path = `/api/connect/account-proof?applicationId=${BANK_APPLICATION_ID}`;
    expect(permittedNativePath(path, 'GET')).toBe(true);
    expect(permittedNativePath(path, 'POST')).toBe(false);
    expect(permittedNativePath(path + '&accountUid=someone-else', 'GET')).toBe(false);
    expect(permittedNativePath(path + `&applicationId=${BANK_APPLICATION_ID}`, 'GET')).toBe(false);
    expect(permittedNativePath('/api/connect/account-proof', 'GET')).toBe(false);
  });
});
