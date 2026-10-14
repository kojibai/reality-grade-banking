import { readFile } from 'node:fs/promises';
import { canonicalizeReceizV122, sha256ReceizBytes } from '@receiz/sdk';
import { prepareSignerBearerRepair } from './native-signer-bearer-plan.mjs';
const proposal = JSON.parse(await readFile(new URL('../docs/native-signer-bearer-plan.json', import.meta.url), 'utf8'));
const confirmationDigest = await sha256ReceizBytes(new TextEncoder().encode(canonicalizeReceizV122(proposal)));
if (!process.argv.includes('--apply')) console.log(JSON.stringify({ proposal, confirmationDigest, status: 'awaiting-bearer-configuration-approval' }, null, 2));
else {
  try {
    if (!process.argv.includes('--confirm') || process.argv[process.argv.indexOf('--confirm') + 1] !== confirmationDigest) throw new Error('EXACT_BEARER_REPAIR_CONFIRMATION_REQUIRED');
    const auth = JSON.parse(await readFile('/Users/bjklock/Library/Application Support/com.vercel.cli/auth.json', 'utf8'));
    async function request(method, path, body) {
      const response = await fetch(`https://api.vercel.com${path}`, { method, headers: { Authorization: `Bearer ${auth.token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: 'error', signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(method === 'GET' ? 'CONFIGURATION_READ_FAILED' : 'CONFIGURATION_WRITE_FAILED'); return response.json();
    }
    const metadata = project => request('GET', `/v10/projects/${project}/env?teamId=${proposal.teamId}&target=production&decrypt=false`);
    const find = (meta, key) => (meta.envs ?? []).find(item => item.key === key && item.target?.includes('production'));
    const source = find(await metadata(proposal.sourceProject), proposal.sourceEnvironmentKey);
    const target = find(await metadata(proposal.targetProject), proposal.targetEnvironmentKey);
    if (!source || !target || target.type !== 'encrypted') throw new Error('CONFIGURATION_REVIEW_REQUIRED');
    const value = async (project, item) => (await request('GET', `/v1/projects/${project}/env/${encodeURIComponent(item.id)}?teamId=${proposal.teamId}`)).value;
    const prepared = prepareSignerBearerRepair(await value(proposal.sourceProject, source), await value(proposal.targetProject, target));
    const latestSource = find(await metadata(proposal.sourceProject), proposal.sourceEnvironmentKey);
    const latestTarget = find(await metadata(proposal.targetProject), proposal.targetEnvironmentKey);
    if (source.id !== latestSource?.id || source.updatedAt !== latestSource?.updatedAt || target.id !== latestTarget?.id || target.updatedAt !== latestTarget?.updatedAt) throw new Error('CONFIGURATION_CHANGED');
    await request('PATCH', `/v9/projects/${proposal.targetProject}/env/${encodeURIComponent(target.id)}?teamId=${proposal.teamId}`, { value: prepared.value, type: 'encrypted' });
    console.log(JSON.stringify({ status: 'bearer-configuration-staged-awaiting-redeployment', confirmationDigest, preservedTargetEnvironments: target.target, sourceCommit: proposal.sourceCommit }));
  } catch (error) {
    const fixed = new Set(['EXACT_BEARER_REPAIR_CONFIRMATION_REQUIRED', 'SOURCE_BEARER_INVALID', 'TARGET_BEARER_REVIEW_REQUIRED', 'CONFIGURATION_READ_FAILED', 'CONFIGURATION_WRITE_FAILED', 'CONFIGURATION_REVIEW_REQUIRED', 'CONFIGURATION_CHANGED']);
    console.error(fixed.has(error?.message) ? error.message : 'BEARER_REPAIR_STOPPED_SAFELY'); process.exitCode = 1;
  }
}
