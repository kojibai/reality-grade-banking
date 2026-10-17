import { expect, it } from 'vitest';
import { createReceizClient, createReceizIdentityKeyFile, deriveReceizIdentityKeyIdFromPublicKeyRawB64u, receizBase64UrlEncode, receizBase64UrlDecode } from '@receiz/sdk';
import { accountProofConsentChallenge, verifyAccountProofConsent } from '../src/receiz/account-proof-consent';

const h = (c: string) => c.repeat(64);
it('binds disclosure to the exact application, identity, source, account and sharing head', async () => {
  const identity = await createReceizIdentityKeyFile({ owner: { uid: 'consent-only-test' } });
  const command = { applicationId: 'rc_consent_test', action: 'publish' as const, expectedSharingHead: h('a'), sourceDigest: h('b'), accountHead: h('c'), liveUpdates: true, idempotencyKey: h('d') };
  const binding = { keyId: identity.keyFile.keyId, alg: identity.keyFile.alg, publicKeyRawB64u: identity.keyFile.crypto.publicKeyRawB64u };
  const proof = await createReceizClient().identity.signLoginProof({ keyFile: identity.keyFile, challengeB64Url: await accountProofConsentChallenge(command, binding.keyId) });
  await expect(verifyAccountProofConsent(command, proof, binding)).resolves.toBeUndefined();
  const principal = { ...binding, receizId: 'test.receiz.id' };
  await expect(verifyAccountProofConsent(command, proof, principal)).resolves.toBeUndefined();
  for (const changed of [{ ...command, liveUpdates: false }, { ...command, accountHead: h('f') }, { ...command, sourceDigest: h('f') }, { ...command, expectedSharingHead: h('f') }, { ...command, applicationId: 'rc_other' }]) {
    await expect(verifyAccountProofConsent(changed, proof, binding)).rejects.toThrow('ACCOUNT_PROOF_CONSENT_INVALID');
  }
  await expect(verifyAccountProofConsent(command, structuredClone(proof), { ...binding, keyId: h('f') })).rejects.toThrow('ACCOUNT_PROOF_CONSENT_INVALID');
  expect(JSON.stringify(proof)).not.toMatch(/privateKey|passphrase|accessToken/);
});

it('verifies real P-256 disclosure signatures without importing a private key', async () => {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const publicKeyRawB64u = receizBase64UrlEncode(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)));
  const binding = { keyId: await deriveReceizIdentityKeyIdFromPublicKeyRawB64u(publicKeyRawB64u, 'P-256'), alg: 'P-256' as const, publicKeyRawB64u };
  const command = { applicationId: 'rc_consent_test', action: 'disable-live-updates' as const, expectedSharingHead: h('a'), idempotencyKey: h('b') };
  const challengeB64Url = await accountProofConsentChallenge(command, binding.keyId);
  const signatureB64Url = receizBase64UrlEncode(new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey, new Uint8Array(receizBase64UrlDecode(challengeB64Url)))));
  const proof = { schema: 'receiz.identity.login_proof.v1' as const, keyId: binding.keyId, alg: binding.alg, challengeB64Url, signatureB64Url };
  await expect(verifyAccountProofConsent(command, proof, binding)).resolves.toBeUndefined();
  await expect(verifyAccountProofConsent({ ...command, expectedSharingHead: h('c') }, proof, binding)).rejects.toThrow('ACCOUNT_PROOF_CONSENT_INVALID');
});

it('binds the off switch without requiring a fresh balance source and rejects extra fields', async () => {
  const identity = await createReceizIdentityKeyFile({ owner: { uid: 'consent-only-test' } });
  const binding = { keyId: identity.keyFile.keyId, alg: identity.keyFile.alg, publicKeyRawB64u: identity.keyFile.crypto.publicKeyRawB64u };
  const command = { applicationId: 'rc_consent_test', action: 'disable-live-updates' as const, expectedSharingHead: h('a'), idempotencyKey: h('b') };
  const proof = await createReceizClient().identity.signLoginProof({ keyFile: identity.keyFile, challengeB64Url: await accountProofConsentChallenge(command, binding.keyId) });
  await expect(verifyAccountProofConsent(command, proof, binding)).resolves.toBeUndefined();
  await expect(accountProofConsentChallenge({ ...command, sourceDigest: h('c') }, binding.keyId)).rejects.toThrow('ACCOUNT_PROOF_CONSENT_INVALID');
});
