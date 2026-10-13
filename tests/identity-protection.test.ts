import { expect, it } from 'vitest';
import { createReceizIdentityKeyFile, signReceizIdentityLoginProof, verifyReceizIdentityLoginProof } from '@receiz/sdk';
import { protectIdentityKeyFile } from '../src/receiz/identity-protection';
it('protects a no-phrase fixture without replacing its key, owner or carried history', async () => {
  const { keyFile } = await createReceizIdentityKeyFile({ owner: { uid: 'unit-test-owner', username: 'unit-test' } });
  const protectedKey = await protectIdentityKeyFile(keyFile, 'private-test-phrase-only');
  expect(protectedKey.keyId).toBe(keyFile.keyId); expect(protectedKey.owner).toEqual(keyFile.owner); expect(protectedKey.portableState).toEqual(keyFile.portableState);
  expect(protectedKey.crypto.privateKeyPkcs8B64u).toBeNull(); expect(protectedKey.crypto.privateKeyPkcs8CiphertextB64u).not.toBe('');
  const challengeB64Url = 'cHJpdmF0ZS10ZXN0LWNoYWxsZW5nZQ';
  const proof = await signReceizIdentityLoginProof({ keyFile: protectedKey, passphrase: 'private-test-phrase-only', challengeB64Url });
  expect(await verifyReceizIdentityLoginProof({ keyFile, challengeB64Url, signatureB64Url: proof.signatureB64Url })).toBe(true);
});
