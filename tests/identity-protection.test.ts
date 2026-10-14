import { expect, it } from 'vitest';
import { createReceizIdentityKeyFile, signReceizIdentityLoginProof, verifyReceizIdentityLoginProof } from '@receiz/sdk';
import { protectIdentityKeyFile, unprotectIdentityKeyFile } from '../src/receiz/identity-protection';
it('protects a no-phrase fixture without replacing its key, owner or carried history', async () => {
  const { keyFile } = await createReceizIdentityKeyFile({ owner: { uid: 'unit-test-owner', username: 'unit-test' } });
  const protectedKey = await protectIdentityKeyFile(keyFile, 'private-test-phrase-only');
  expect(protectedKey.keyId).toBe(keyFile.keyId); expect(protectedKey.owner).toEqual(keyFile.owner); expect(protectedKey.portableState).toEqual(keyFile.portableState);
  expect(protectedKey.crypto.privateKeyPkcs8B64u).toBeNull(); expect(protectedKey.crypto.privateKeyPkcs8CiphertextB64u).not.toBe('');
  const challengeB64Url = 'cHJpdmF0ZS10ZXN0LWNoYWxsZW5nZQ';
  const proof = await signReceizIdentityLoginProof({ keyFile: protectedKey, passphrase: 'private-test-phrase-only', challengeB64Url });
  expect(await verifyReceizIdentityLoginProof({ keyFile, challengeB64Url, signatureB64Url: proof.signatureB64Url })).toBe(true);
});
it('makes the newly sealed download self-contained while preserving its real SDK signing identity', async () => {
  const { keyFile } = await createReceizIdentityKeyFile({ owner: { uid: 'fixture-owner', username: 'fixture' }, passphrase: 'temporary-test-custody-secret' });
  const opened = await unprotectIdentityKeyFile(keyFile, 'temporary-test-custody-secret');
  expect(opened.keyId).toBe(keyFile.keyId); expect(opened.owner).toEqual(keyFile.owner);
  expect(opened.crypto.privateKeyPkcs8CiphertextB64u).toBe('');
  const challengeB64Url = 'bm8tcGhyYXNlLXRlc3Q';
  const proof = await signReceizIdentityLoginProof({ keyFile: opened, challengeB64Url });
  expect(await verifyReceizIdentityLoginProof({ keyFile, challengeB64Url, signatureB64Url: proof.signatureB64Url })).toBe(true);
  await expect(unprotectIdentityKeyFile(keyFile, 'wrong-test-secret')).rejects.toThrow();
});
