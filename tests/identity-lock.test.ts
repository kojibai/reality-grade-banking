import { expect, it } from 'vitest';
import { identityNeedsPhrase } from '../src/receiz/identity-lock';
it('requires a phrase only when the signing key is actually encrypted', () => {
  expect(identityNeedsPhrase({ crypto: { privateKeyPkcs8CiphertextB64u: 'encrypted', privateKeyPkcs8B64u: null } })).toBe(true);
  expect(identityNeedsPhrase({ crypto: { privateKeyPkcs8B64u: 'locally-held-key', privateKeyPkcs8CiphertextB64u: '' } })).toBe(false);
  expect(identityNeedsPhrase({ crypto: { privateKeyPkcs8B64u: 'locally-held-key', privateKeyPkcs8CiphertextB64u: 'legacy-extra' } })).toBe(false);
});
