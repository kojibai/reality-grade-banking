import { exportAccountProof, isVerifiedAccountProof, type VerifiedAccountProof } from './account-proof';
import { confirmPublicAccountProof } from './account-proof-public';
import { BANK_APPLICATION_ID, isBankNativeApplicationId } from './config';
import { loadReceiz } from './client';
import { accountProofConsentChallenge } from './account-proof-consent';
import type { ReceizIdentityLoginProof } from '@receiz/sdk';
export interface AccountProofSharingStatus { schema: 'bankeiz.account-proof-sharing.v1'; sharingHead: string; liveUpdates: boolean; latestSourceDigest: string | null; otherLiveUpdates?: boolean; }
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
export function createAccountProofSharing(input: { applicationId?: string; previous?: AccountProofSharing; keyId: string; receizId: string; request(path: string, method: 'GET' | 'POST', body?: Record<string, unknown>): Promise<unknown>; signConsent(challengeB64Url: string): Promise<ReceizIdentityLoginProof>; assertOpen(): void }): AccountProofSharing {
  const applicationId = input.applicationId ?? BANK_APPLICATION_ID;
  if (!isBankNativeApplicationId(applicationId)) throw Error('ACCOUNT_PROOF_APPLICATION_MISMATCH');
  const path = `/api/connect/account-proof/sharing?applicationId=${encodeURIComponent(applicationId)}`;
  const readStatus = async () => { input.assertOpen(); const result = parse(await input.request(path, 'GET')); input.assertOpen(); return result; };
  const status = async () => {
    input.assertOpen();
    const currentRead = readStatus(), prior = input.previous;
    // The independent earlier registration cannot outrank a refused current
    // registration. Observe its failure now, consume it in the original order.
    const previousRead = prior ? (async () => { try { input.assertOpen(); return { value: await prior.status() }; } catch (error) { return { error }; } })() : null;
    const current = await currentRead; if (!previousRead) return current;
    const result = await previousRead; if ('error' in result) throw result.error;
    input.assertOpen(); return {...current, otherLiveUpdates: result.value.liveUpdates || !!result.value.otherLiveUpdates};
  };
  async function change(action: string, fields: Record<string, unknown>) {
    const prior = await readStatus(), sdk = await loadReceiz();
    const matches = (value: AccountProofSharingStatus) => action === 'disable-live-updates'
      ? !value.liveUpdates : value.latestSourceDigest === fields.sourceDigest && value.liveUpdates === fields.liveUpdates;
    // Recover already accepted disclosure instead of creating a second epoch.
    // Publishing still independently reopens the anonymous original below.
    if (matches(prior)) return prior;
    const command = { applicationId, action, expectedSharingHead: prior.sharingHead, ...fields };
    const idempotencyKey = await sdk.digestReceizCanonicalV122({ keyId: input.keyId, ...command });
    const exact = { ...command, idempotencyKey }, challengeB64Url = await accountProofConsentChallenge(exact, input.keyId);
    input.assertOpen(); const consentProof = await input.signConsent(challengeB64Url); input.assertOpen();
    if (consentProof.keyId !== input.keyId || consentProof.challengeB64Url !== challengeB64Url || consentProof.schema !== 'receiz.identity.login_proof.v1') throw Error('ACCOUNT_PROOF_CONSENT_INVALID');
    try {
      const next = parse(await input.request(path, 'POST', { ...exact, consentProof })); input.assertOpen(); return next;
    } catch (error) {
      // The server may have durably accepted before delivery was interrupted.
      // Observe only; never retry or replace the signed command automatically.
      const current = await readStatus().catch(() => null);
      if (current && matches(current)) return current;
      throw error;
    }
  }
  return {
    status,
    async publish(proof, approval) {
      input.assertOpen();
      if (applicationId !== BANK_APPLICATION_ID || proof.statement.applicationId !== applicationId) throw Error('ACCOUNT_PROOF_APPLICATION_MISMATCH');
      if (!approval.approved || !isVerifiedAccountProof(proof) || proof.statement.account.keyId !== input.keyId || proof.statement.account.receizId !== input.receizId) throw Error('ACCOUNT_PROOF_SHARING_CONSENT_REQUIRED');
      await exportAccountProof(proof);
      const next = await change('publish', { sourceDigest: proof.sourceDigest, accountHead: proof.statement.checkpoint.accountHead, liveUpdates: approval.liveUpdates });
      if (next.liveUpdates !== approval.liveUpdates || next.latestSourceDigest !== proof.sourceDigest) throw Error('ACCOUNT_PROOF_SHARING_UNCONFIRMED');
      const url = await confirmPublicAccountProof(proof); input.assertOpen(); return { url, status: input.previous ? {...next,otherLiveUpdates:(await input.previous.status()).liveUpdates} : next };
    },
    async disable() {
      input.assertOpen(); const next = await change('disable-live-updates', {});
      if (next.liveUpdates) throw Error('ACCOUNT_PROOF_SHARING_UNCONFIRMED');
      if (!input.previous) return next;
      const previous = await input.previous.disable(); input.assertOpen();
      if (previous.liveUpdates || previous.otherLiveUpdates) throw Error('ACCOUNT_PROOF_SHARING_UNCONFIRMED');
      return {...next,otherLiveUpdates:false};
    },
  };
}
