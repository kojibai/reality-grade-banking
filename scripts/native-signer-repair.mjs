import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { canonicalizeReceizV122, sha256ReceizBytes, RECEIZ_CURRENT_REGISTRY_DIGEST } from '@receiz/sdk';
import { prepareNativeSignerRepair } from './native-signer-repair-plan.mjs';

const plan = JSON.parse(await readFile(new URL('../docs/native-signer-repair-plan.json', import.meta.url), 'utf8'));
const confirmationDigest = await sha256ReceizBytes(new TextEncoder().encode(canonicalizeReceizV122(plan)));
if (!process.argv.includes('--apply')) {
  // This branch reads no authentication credential or private environment.
  console.log(JSON.stringify({ proposal: plan, confirmationDigest, status: 'awaiting-explicit-root-custody-approval' }, null, 2));
} else {
  const approved = process.argv[process.argv.indexOf('--confirm') + 1];
  if (approved !== confirmationDigest || !process.argv.includes('--confirm')) {
    console.error('EXACT_ROOT_REPAIR_CONFIRMATION_REQUIRED'); process.exitCode = 1;
  } else {
    try { await stageApprovedRepair(); }
    catch (error) {
      const allowed = new Set(['SOURCE_ROOT_MISMATCH', 'SOURCE_ROOT_INVALID', 'TARGET_ROOT_CONFLICT', 'DUPLICATE_TARGET_ROOT', 'RETIRED_ROOT_REQUIRES_OPERATOR_REVIEW', 'SDK_PIN_DRIFT', 'SOURCE_CONFIG_MISSING', 'TARGET_CONFIG_CHANGED', 'CONFIGURATION_READ_FAILED', 'CONFIGURATION_WRITE_FAILED']);
      // Never print a raw exception: JSON parser errors can quote key material.
      console.error(allowed.has(error?.message) ? error.message : 'ROOT_REPAIR_STOPPED_SAFELY'); process.exitCode = 1;
    }
  }
}
async function stageApprovedRepair() {
  const pkg = JSON.parse(await readFile(new URL('../node_modules/@receiz/sdk/package.json', import.meta.url), 'utf8'));
  const rootModule = await readFile(new URL('./verifier/roots.js', import.meta.resolve('@receiz/sdk')));
  if (pkg.version !== plan.sdkVersion || RECEIZ_CURRENT_REGISTRY_DIGEST !== plan.registryDigest || createHash('sha256').update(rootModule).digest('hex') !== plan.sdkRootModuleSha256) throw new Error('SDK_PIN_DRIFT');
  const auth = JSON.parse(await readFile('/Users/bjklock/Library/Application Support/com.vercel.cli/auth.json', 'utf8'));
  if (typeof auth.token !== 'string' || !auth.token) throw new Error('CONFIGURATION_READ_FAILED');
  async function request(method, path, body) {
    const response = await fetch(`https://api.vercel.com${path}`, { method, headers: { Authorization: `Bearer ${auth.token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(method === 'GET' ? 'CONFIGURATION_READ_FAILED' : 'CONFIGURATION_WRITE_FAILED');
    return response.json();
  }
  const metadata = project => request('GET', `/v10/projects/${project}/env?teamId=${plan.teamId}&target=production&decrypt=false`);
  const find = (list, key) => (list.envs ?? []).find(item => item.key === key && item.target?.includes('production'));
  const sourceMetadata = await metadata(plan.sourceProject), targetMetadata = await metadata(plan.targetProject);
  const sourceEntry = find(sourceMetadata, plan.sourceEnvironmentKey), targetEntry = find(targetMetadata, plan.targetKeyringKey), contextEntry = find(targetMetadata, plan.targetContextKey);
  if (!sourceEntry || !targetEntry) throw new Error('SOURCE_CONFIG_MISSING');
  const sameTargets = (left, right) => JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
  if (!sameTargets(targetEntry.target, plan.targetKeyringEnvironments) || (contextEntry && !sameTargets(contextEntry.target, plan.targetContextEnvironments))) throw new Error('TARGET_CONFIG_CHANGED');
  const value = async (project, entry) => (await request('GET', `/v1/projects/${project}/env/${encodeURIComponent(entry.id)}?teamId=${plan.teamId}`)).value;
  // Secret values exist only in this short-lived process and the same provider's
  // protected API. They never enter files, command arguments, logs or chat.
  const sourceKey = await value(plan.sourceProject, sourceEntry), originalKeyring = await value(plan.targetProject, targetEntry);
  const parse = raw => { let result = JSON.parse(raw); if (typeof result === 'string') result = JSON.parse(result); return result; };
  let keyring;
  try { const parsed = parse(originalKeyring); keyring = Array.isArray(parsed) ? parsed : parsed && typeof parsed === 'object' ? [parsed] : null; } catch { keyring = null; }
  // Preserve an unusable old representation inside the same encrypted setting;
  // the deployed signer ignores entries without a kid/alg/private-key tuple.
  if (!keyring) keyring = [{ previousUnusableConfiguration: originalKeyring }];
  let contexts = [];
  if (contextEntry) { const parsed = parse(await value(plan.targetProject, contextEntry)); if (!Array.isArray(parsed)) throw new Error('TARGET_CONFIG_CHANGED'); contexts = parsed; }
  const prepared = prepareNativeSignerRepair({ sourcePrivateKey: sourceKey, expectedPublicKey: plan.rootPublicKeyRawB64u, rootKid: plan.rootKid, keyring, contexts });
  // Recheck provider metadata before staging, preserving every existing target.
  const current = await metadata(plan.targetProject);
  const latestKeyring = find(current, plan.targetKeyringKey), latestContext = find(current, plan.targetContextKey);
  if (latestKeyring?.id !== targetEntry.id || latestKeyring?.updatedAt !== targetEntry.updatedAt || latestContext?.id !== contextEntry?.id || latestContext?.updatedAt !== contextEntry?.updatedAt) throw new Error('TARGET_CONFIG_CHANGED');
  await request('PATCH', `/v9/projects/${plan.targetProject}/env/${encodeURIComponent(targetEntry.id)}?teamId=${plan.teamId}`, { value: JSON.stringify(prepared.keyring), type: 'encrypted' });
  if (contextEntry) await request('PATCH', `/v9/projects/${plan.targetProject}/env/${encodeURIComponent(contextEntry.id)}?teamId=${plan.teamId}`, { value: JSON.stringify(prepared.contexts), type: 'encrypted' });
  else await request('POST', `/v10/projects/${plan.targetProject}/env?teamId=${plan.teamId}`, { key: plan.targetContextKey, value: JSON.stringify(prepared.contexts), type: 'encrypted', target: plan.targetContextEnvironments });
  console.log(JSON.stringify({ status: 'configuration-staged-awaiting-approved-redeployment', rootKid: plan.rootKid, rootPublicKeyMatched: true, otherEntriesPreserved: true, confirmationDigest, deploymentId: plan.existingSignerDeploymentId, sourceCommit: plan.signerSourceCommit }));
}
