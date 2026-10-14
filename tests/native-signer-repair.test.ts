import { createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto';
import { expect, it } from 'vitest';
import { prepareNativeSignerRepair } from '../scripts/native-signer-repair-plan.mjs';
// Administrative configuration fixtures only. These do not issue Receiz
// authority, replace production pins, or qualify a live native service.
function fixture() {
  const pair = generateKeyPairSync('ed25519');
  return { privateBytes: pair.privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64url'), publicBytes: pair.publicKey.export({ format: 'jwk' }).x!, pair };
}
it('reuses only the matching existing root and preserves other keyring entries and contexts', () => {
  const held = fixture(), other = fixture();
  const retained = { kid: 'other.retained.root', alg: 'Ed25519', privateKeyPkcs8B64u: other.privateBytes, status: 'active' };
  const result = prepareNativeSignerRepair({ sourcePrivateKey: held.privateBytes, expectedPublicKey: held.publicBytes, rootKid: 'receiz.v4.prod.2026-03-02', keyring: [retained], contexts: ['receiz.governance.artifact-manifest', 'receiz.future.retained-context'] });
  expect(result.keyring[0]).toEqual(retained); expect(result.keyring[1]).toMatchObject({ kid: 'receiz.v4.prod.2026-03-02', privateKeyPkcs8B64u: held.privateBytes, status: 'active' });
  expect(result.contexts).toEqual(['receiz.governance.artifact-manifest', 'receiz.future.retained-context', 'receiz.signatureV4.bundle', 'receiz.signatureV4.device_cert', 'receiz.v124.transport-binding.v1', 'receiz.v124.authority-session-recovery-custody.v1']);
  const signature = sign(null, Buffer.from('controlled native transport fixture'), held.pair.privateKey);
  expect(verify(null, Buffer.from('controlled native transport fixture'), createPublicKey(held.pair.privateKey), signature)).toBe(true);
});
it('refuses a foreign source key, conflicting same-name root and retired root', () => {
  const held = fixture(), foreign = fixture(), basis = { sourcePrivateKey: held.privateBytes, expectedPublicKey: held.publicBytes, rootKid: 'receiz.v4.prod.2026-03-02', contexts: [] };
  expect(() => prepareNativeSignerRepair({ ...basis, sourcePrivateKey: foreign.privateBytes, keyring: [] })).toThrow('SOURCE_ROOT_MISMATCH');
  expect(() => prepareNativeSignerRepair({ ...basis, keyring: [{ kid: basis.rootKid, alg: 'Ed25519', privateKeyPkcs8B64u: foreign.privateBytes, status: 'active' }] })).toThrow('TARGET_ROOT_CONFLICT');
  expect(() => prepareNativeSignerRepair({ ...basis, keyring: [{ kid: basis.rootKid, alg: 'Ed25519', privateKeyPkcs8B64u: held.privateBytes, status: 'retired' }] })).toThrow('RETIRED_ROOT_REQUIRES_OPERATOR_REVIEW');
});
it('restores a malformed intended root without discarding its metadata or creating duplicates', () => {
  const held = fixture(), basis = { sourcePrivateKey: held.privateBytes, expectedPublicKey: held.publicBytes, rootKid: 'receiz.v4.prod.2026-03-02', contexts: [] };
  const result = prepareNativeSignerRepair({ ...basis, keyring: [{ kid: basis.rootKid, alg: 'Ed25519', privateKeyPkcs8B64u: 'not-a-key', status: 'active', label: 'Retained operator label' }] });
  expect(result.keyring).toHaveLength(1); expect(result.keyring[0]).toMatchObject({ label: 'Retained operator label', privateKeyPkcs8B64u: held.privateBytes });
  expect(() => prepareNativeSignerRepair({ ...basis, keyring: [result.keyring[0], result.keyring[0]] })).toThrow('DUPLICATE_TARGET_ROOT');
});
it('normalizes the same legacy base64 key, while refusing malformed configuration', () => {
  const held = fixture(), basis = { sourcePrivateKey: Buffer.from(held.privateBytes, 'base64url').toString('base64'), expectedPublicKey: held.publicBytes, rootKid: 'receiz.v4.prod.2026-03-02', keyring: [], contexts: [] };
  expect(prepareNativeSignerRepair(basis).keyring[0].privateKeyPkcs8B64u).toBe(held.privateBytes);
  expect(() => prepareNativeSignerRepair({ ...basis, sourcePrivateKey: 'not a key' })).toThrow('SOURCE_ROOT_INVALID');
  expect(() => prepareNativeSignerRepair({ ...basis, keyring: {} as never })).toThrow('KEYRING_REVIEW_REQUIRED');
});
