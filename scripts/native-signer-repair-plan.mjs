import { createPrivateKey, createPublicKey } from 'node:crypto';

export const NATIVE_SIGNER_CONTEXTS = Object.freeze(['receiz.signatureV4.bundle', 'receiz.signatureV4.device_cert', 'receiz.v124.transport-binding.v1', 'receiz.v124.authority-session-recovery-custody.v1']);
function openRoot(value) {
  if (typeof value !== 'string') throw new Error('SOURCE_ROOT_INVALID');
  const normalized = value.trim().replace(/^["']|["']$/g, '');
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(normalized)) throw new Error('SOURCE_ROOT_INVALID');
  const bytes = Buffer.from(normalized, 'base64url');
  const canonical = bytes.toString('base64url');
  if (canonical !== normalized.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')) throw new Error('SOURCE_ROOT_INVALID');
  let key;
  try { key = createPrivateKey({ key: bytes, format: 'der', type: 'pkcs8' }); }
  catch { throw new Error('SOURCE_ROOT_INVALID'); }
  if (key.asymmetricKeyType !== 'ed25519') throw new Error('SOURCE_ROOT_INVALID');
  return { privateKey: canonical, publicKey: createPublicKey(key).export({ format: 'jwk' }).x };
}
// Administrative configuration preparation only. The caller must bind the
// expected public root to unchanged SDK/server pins before using this helper.
// This returns private configuration: never log, persist or send it to chat.
export function prepareNativeSignerRepair(input) {
  const source = openRoot(input.sourcePrivateKey);
  if (source.publicKey !== input.expectedPublicKey) throw new Error('SOURCE_ROOT_MISMATCH');
  if (typeof input.rootKid !== 'string' || !/^[a-zA-Z0-9._:-]{3,128}$/.test(input.rootKid)) throw new Error('ROOT_COORDINATE_INVALID');
  if (!Array.isArray(input.keyring) || input.keyring.length > 128 || input.keyring.some(item => !item || typeof item !== 'object' || Array.isArray(item))) throw new Error('KEYRING_REVIEW_REQUIRED');
  if (!Array.isArray(input.contexts) || input.contexts.some(context => typeof context !== 'string' || !context.trim())) throw new Error('CONTEXT_REVIEW_REQUIRED');
  const keyring = structuredClone(input.keyring), matches = keyring.map((item, index) => item.kid === input.rootKid ? index : -1).filter(index => index >= 0);
  if (matches.length > 1) throw new Error('DUPLICATE_TARGET_ROOT');
  let previous = {};
  if (matches.length) {
    previous = keyring[matches[0]];
    if (previous.status === 'retired') throw new Error('RETIRED_ROOT_REQUIRES_OPERATOR_REVIEW');
    let prior = null;
    try { prior = openRoot(previous.privateKeyPkcs8B64u); } catch { /* A malformed intended entry can be repaired from the matching existing root. */ }
    if (prior && prior.publicKey !== source.publicKey) throw new Error('TARGET_ROOT_CONFLICT');
  }
  const next = { ...previous, kid: input.rootKid, alg: 'Ed25519', privateKeyPkcs8B64u: source.privateKey, status: 'active' };
  if (matches.length) keyring[matches[0]] = next; else keyring.push(next);
  const contexts = [...new Set([...(input.contexts.length ? input.contexts.map(context => context.trim()) : ['receiz.governance.artifact-manifest']), ...NATIVE_SIGNER_CONTEXTS])];
  return { keyring, contexts };
}
