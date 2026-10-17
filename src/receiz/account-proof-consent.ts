import { canonicalizeReceizConstitution, receizBase64UrlEncode, verifyReceizIdentityPublicKeyProjectionSignature, type ReceizIdentityLoginProof, type ReceizIdentityPublicKeyProjection } from '@receiz/sdk';

export type AccountProofSharingCommand = Readonly<{
  applicationId: string; expectedSharingHead: string; idempotencyKey: string;
} & ({ action: 'publish'; sourceDigest: string; accountHead: string; liveUpdates: boolean } | { action: 'disable-live-updates' })>;
const hex = (v: unknown) => typeof v === 'string' && /^[a-f0-9]{64}$/u.test(v);
const fail = (): never => { throw Error('ACCOUNT_PROOF_CONSENT_INVALID'); };
function commandValue(input: unknown): AccountProofSharingCommand {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return fail();
  const value = input as Record<string, unknown>;
  const fields = ['applicationId', 'action', 'expectedSharingHead', 'idempotencyKey'];
  if (value.action === 'publish') fields.push('sourceDigest', 'accountHead', 'liveUpdates');
  else if (value.action !== 'disable-live-updates') return fail();
  if (Object.keys(value).sort().join(',') !== fields.sort().join(',') || typeof value.applicationId !== 'string' || !/^rc_[A-Za-z0-9_-]{1,128}$/u.test(value.applicationId)
    || !hex(value.expectedSharingHead) || !hex(value.idempotencyKey)
    || value.action === 'publish' && (!hex(value.sourceDigest) || !hex(value.accountHead) || typeof value.liveUpdates !== 'boolean')) return fail();
  return structuredClone(value) as AccountProofSharingCommand;
}

/** Exact disclosure consent only. It grants no login or financial authority.
 * The receiving host must independently bind the key to its admitted caller
 * and atomically compare the signed sharing head before applying the choice. */
export async function accountProofConsentChallenge(input: unknown, keyId: string): Promise<string> {
  if (!hex(keyId)) return fail();
  const command = commandValue(input);
  return receizBase64UrlEncode(new TextEncoder().encode(canonicalizeReceizConstitution({ schema: 'bankeiz.account-proof-disclosure-consent.v1', keyId, command })));
}
export async function verifyAccountProofConsent(command: unknown, proof: ReceizIdentityLoginProof, identity: ReceizIdentityPublicKeyProjection): Promise<void> {
  const challenge = await accountProofConsentChallenge(command, identity.keyId);
  if (!proof || Object.keys(proof).sort().join(',') !== 'alg,challengeB64Url,keyId,schema,signatureB64Url' || proof.schema !== 'receiz.identity.login_proof.v1'
    || proof.keyId !== identity.keyId || proof.alg !== identity.alg || proof.challengeB64Url !== challenge
    || !await verifyReceizIdentityPublicKeyProjectionSignature({ keyId: identity.keyId, alg: identity.alg, publicKeyRawB64u: identity.publicKeyRawB64u, challengeB64Url: challenge, signatureB64Url: proof.signatureB64Url })) return fail();
}
