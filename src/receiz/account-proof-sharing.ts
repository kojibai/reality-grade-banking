import { exportAccountProof, isVerifiedAccountProof, type VerifiedAccountProof } from './account-proof';
import { confirmPublicAccountProof } from './account-proof-public';
import { BANK_APPLICATION_ID } from './config';
import { loadReceiz } from './client';
export interface AccountProofSharingStatus { schema: 'bankeiz.account-proof-sharing.v1'; sharingHead: string; liveUpdates: boolean; latestSourceDigest: string | null; }
export interface AccountProofSharing {
  status(): Promise<AccountProofSharingStatus>;
  publish(proof: VerifiedAccountProof, input: { approved: boolean; liveUpdates: boolean }): Promise<{ url: string; status: AccountProofSharingStatus }>;
  disable(): Promise<AccountProofSharingStatus>;
}
function parse(v: unknown): AccountProofSharingStatus {
  const s = v as AccountProofSharingStatus;
  if (!s || Object.keys(s).sort().join(',') !== 'latestSourceDigest,liveUpdates,schema,sharingHead' || s.schema !== 'bankeiz.account-proof-sharing.v1' || !/^[a-f0-9]{64}$/u.test(s.sharingHead) || typeof s.liveUpdates !== 'boolean' || s.latestSourceDigest !== null && !/^[a-f0-9]{64}$/u.test(s.latestSourceDigest)) throw Error('ACCOUNT_PROOF_SHARING_UNCONFIRMED');
  return Object.freeze({ ...s });
}
export function createAccountProofSharing(input: { keyId: string; receizId: string; request(path: string, method: 'GET' | 'POST', body?: Record<string, unknown>): Promise<unknown>; assertOpen(): void }): AccountProofSharing {
  const path = `/api/connect/account-proof/sharing?applicationId=${encodeURIComponent(BANK_APPLICATION_ID)}`;
  const status = async () => { input.assertOpen(); const result = parse(await input.request(path, 'GET')); input.assertOpen(); return result; };
  async function change(action: string, fields: Record<string, unknown>) {
    const prior = await status(), sdk = await loadReceiz();
    const command = { applicationId: BANK_APPLICATION_ID, action, expectedSharingHead: prior.sharingHead, ...fields };
    const idempotencyKey = await sdk.digestReceizCanonicalV122({ keyId: input.keyId, ...command });
    const next = parse(await input.request(path, 'POST', { ...command, idempotencyKey })); input.assertOpen(); return next;
  }
  return {
    status,
    async publish(proof, approval) {
      input.assertOpen();
      if (!approval.approved || !isVerifiedAccountProof(proof) || proof.statement.account.keyId !== input.keyId || proof.statement.account.receizId !== input.receizId) throw Error('ACCOUNT_PROOF_SHARING_CONSENT_REQUIRED');
      await exportAccountProof(proof);
      const next = await change('publish', { sourceDigest: proof.sourceDigest, accountHead: proof.statement.checkpoint.accountHead, liveUpdates: approval.liveUpdates });
      if (next.liveUpdates !== approval.liveUpdates || next.latestSourceDigest !== proof.sourceDigest) throw Error('ACCOUNT_PROOF_SHARING_UNCONFIRMED');
      const url = await confirmPublicAccountProof(proof); input.assertOpen(); return { url, status: next };
    },
    async disable() {
      input.assertOpen(); const next = await change('disable-live-updates', {});
      if (next.liveUpdates) throw Error('ACCOUNT_PROOF_SHARING_UNCONFIRMED'); return next;
    },
  };
}
