import { createHash, generateKeyPairSync, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';
import { prepareNativeSignerRepair } from '../scripts/native-signer-repair-plan.mjs';
import { prepareSignerBearerRepair } from '../scripts/native-signer-bearer-plan.mjs';
const source = readFileSync(new URL('./fixtures/native-signer-0912baa.cjs', import.meta.url), 'utf8');
const require = createRequire(import.meta.url);
async function call(env: Record<string, string>, context: string) {
  const module = { exports: undefined as unknown };
  runInNewContext(source, { module, require, process: { env }, Buffer, Set, Date });
  const payload = Buffer.from('non-authoritative signer configuration fixture');
  let status = 0, result: Record<string, unknown> = {};
  await (module.exports as (req: unknown, res: unknown) => Promise<void>)({ method: 'POST', headers: { authorization: 'Bearer controlled-fixture' }, body: { kid: 'receiz.v4.test.native-config', alg: 'Ed25519', context, payloadB64u: payload.toString('base64url'), payloadHashSha256: createHash('sha256').update(payload).digest('hex') } }, { setHeader() {}, set statusCode(value: number) { status = value; }, end(value: string) { result = JSON.parse(value); } });
  return { status, result, payload };
}
it('reproduces the deployed handler’s missing-context refusal, and proves a prepared matching configuration can sign the exact bytes', async () => {
  const pair = generateKeyPairSync('ed25519'), privateBytes = pair.privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64url');
  const original = { RECEIZ_SIGNER_SERVICE_BEARER_TOKEN: 'controlled-fixture', RECEIZ_SIGNER_SERVICE_KEYS_JSON: '[]' };
  const before = await call(original, 'receiz.v124.transport-binding.v1');
  expect(before.status).toBe(403); expect(before.result.error).toBe('context_not_allowed');
  const prepared = prepareNativeSignerRepair({ sourcePrivateKey: privateBytes, expectedPublicKey: pair.publicKey.export({ format: 'jwk' }).x!, rootKid: 'receiz.v4.test.native-config', keyring: [], contexts: [] });
  const after = await call({ ...original, RECEIZ_SIGNER_SERVICE_KEYS_JSON: JSON.stringify(prepared.keyring), RECEIZ_SIGNER_SERVICE_ALLOWED_CONTEXTS_JSON: JSON.stringify(prepared.contexts) }, 'receiz.v124.transport-binding.v1');
  expect(after.status).toBe(200);
  expect(verify(null, after.payload, pair.publicKey, Buffer.from(after.result.sig as string, 'base64url'))).toBe(true);
  const rejected = await call({ ...original, RECEIZ_SIGNER_SERVICE_KEYS_JSON: JSON.stringify(prepared.keyring), RECEIZ_SIGNER_SERVICE_ALLOWED_CONTEXTS_JSON: JSON.stringify(prepared.contexts) }, 'unapproved.arbitrary-context');
  expect(rejected.status).toBe(403);
});
it('reproduces zero usable bearer configuration and verifies the same existing caller after repair', async () => {
  const pair = generateKeyPairSync('ed25519');
  const preparedRoot = prepareNativeSignerRepair({ sourcePrivateKey: pair.privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64url'), expectedPublicKey: pair.publicKey.export({ format: 'jwk' }).x!, rootKid: 'receiz.v4.test.native-config', keyring: [], contexts: [] });
  const original = { RECEIZ_SIGNER_SERVICE_BEARER_TOKENS_JSON: 'malformed-fixture', RECEIZ_SIGNER_SERVICE_KEYS_JSON: JSON.stringify(preparedRoot.keyring), RECEIZ_SIGNER_SERVICE_ALLOWED_CONTEXTS_JSON: JSON.stringify(preparedRoot.contexts) };
  const before = await call(original, 'receiz.v124.transport-binding.v1');
  expect(before.status).toBe(503); expect(before.result.error).toBe('signer_unavailable');
  const preparedBearer = prepareSignerBearerRepair('controlled-fixture', original.RECEIZ_SIGNER_SERVICE_BEARER_TOKENS_JSON);
  const after = await call({ ...original, RECEIZ_SIGNER_SERVICE_BEARER_TOKENS_JSON: preparedBearer.value }, 'receiz.v124.transport-binding.v1');
  expect(after.status).toBe(200);
  expect(verify(null, after.payload, pair.publicKey, Buffer.from(after.result.sig as string, 'base64url'))).toBe(true);
});
