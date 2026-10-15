import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { RECEIZ_SDK_VERSION, RECEIZ_GENERATED_CURRENT_REGISTRY_DIGEST, runReceizV125TemporalAuthorityConformance } from '@receiz/sdk';
import { createReceizMcpRuntime, callReceizTool, parseReceizMcpToolResult } from '@receiz/mcp-server';
import { openReserveNoteImage, inspectReserveNote, exportReserveNoteSource } from '../public/native/receiver-verifier.v129.mjs';

const root = new URL('../', import.meta.url);
const json = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

/** Local reference checks, not an institution certificate or authority to credit. */
export async function checkReceiverReference() {
  const checks = [];
  const check = async (id, run) => {
    try { await run(); checks.push({ id, passed: true }); }
    catch (error) { checks.push({ id, passed: false, error: error instanceof Error ? error.message : 'CHECK_FAILED' }); }
  };
  const assert = (condition, reason) => { if (!condition) throw Error(reason); };
  const reject = async (run, code) => {
    try { await run(); } catch (error) {
      if (code && !(error instanceof Error && error.message.includes(code))) throw error;
      return;
    }
    throw Error('UNVERIFIED_INPUT_ACCEPTED');
  };
  const profile = await json('institution/receiver-profile.json');
  await check('coordinated-v129-packages-and-registry', async () => {
    assert(RECEIZ_SDK_VERSION === profile.receizVersion, 'SDK_RELEASE_MISMATCH');
    assert(RECEIZ_GENERATED_CURRENT_REGISTRY_DIGEST === profile.registryDigest, 'REGISTRY_MISMATCH');
    for (const name of ['sdk', 'mcp-server', 'ai-skills']) {
      assert((await json(`node_modules/@receiz/${name}/package.json`)).version === profile.receizVersion, `${name}:RELEASE_MISMATCH`);
    }
    for (const name of ['receiz-value-execution', 'receiz-offline-first', 'receiz-portable-continuity']) {
      const manifest = await json(`node_modules/@receiz/ai-skills/${name}/manifest.json`);
      assert(manifest.requires.registryDigest === profile.registryDigest && manifest.requires.operationMatrixDigest === profile.operationMatrixDigest && manifest.requires.ruleset === profile.ruleset, `${name}:CONTRACT_MISMATCH`);
    }
  });
  await check('native-module-provenance-and-auditable-source', async () => {
    for (const name of ['offline-notes', 'receiver-verifier']) {
      const manifest = await json(`public/native/${name}.v129.manifest.json`);
      const bytes = await readFile(new URL(`public/native/${name}.v129.mjs`, root));
      assert(manifest.version === profile.receizVersion && manifest.moduleSha256 === sha(bytes) && manifest.bytes === bytes.length, `${name}:BUILD_MISMATCH`);
      if (name === 'receiver-verifier') {
        const sourceBytes = await readFile(new URL('public/native/receiver-verifier.v129.mjs.map', root));
        assert(sha(sourceBytes) === manifest.sourceMapSha256, 'SOURCE_MAP_MISMATCH');
        const map = JSON.parse(sourceBytes);
        assert(map.sources.length === map.sourcesContent.length && map.sourcesContent.every(source => typeof source === 'string'), 'SOURCE_CONTENT_MISSING');
        assert(manifest.inputs.length === map.sources.length && manifest.inputs.every((input, index) => input.sha256 === sha(map.sourcesContent[index])), 'SOURCE_INPUT_MISMATCH');
        assert(manifest.sourceTreeSha256 === sha(JSON.stringify(manifest.inputs)), 'SOURCE_TREE_MISMATCH');
      }
    }
  });
  const mcpEvidence = [];
  await check('installed-v129-mcp-conformance-and-release-context', async () => {
    const runtime = createReceizMcpRuntime();
    for (const name of ['receiz_conformance_run', 'receiz_release_verify']) {
      const result = parseReceizMcpToolResult(await callReceizTool(runtime, name, {}));
      assert(result.report?.ok === true && result.report.sdkVersion === profile.receizVersion && result.writesPerformed === 0, 'MCP_REFERENCE_CHECK_FAILED');
      if (name === 'receiz_release_verify') assert(result.coordinatedIdentity?.operationMatrixDigest === profile.operationMatrixDigest && result.registryDigest === profile.registryDigest, 'MCP_RELEASE_CONTEXT_MISMATCH');
      mcpEvidence.push({ name, sdkVersion: result.report.sdkVersion, summary: result.report.summary, evidenceDigest: result.report.evidenceDigest, writesPerformed: result.writesPerformed });
    }
  });
  let temporal;
  await check('canonical-kaisigil-temporal-authority-vectors', async () => {
    temporal = await runReceizV125TemporalAuthorityConformance();
    assert(temporal.releaseVersion === profile.receizVersion && temporal.qualified && temporal.failedChecks.length === 0 && temporal.checks.length === 11, 'TEMPORAL_CONFORMANCE_FAILED');
  });
  await check('ordinary-paper-image-has-no-note-authority', () => reject(() => openReserveNoteImage(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]))));
  await check('unsigned-payment-json-has-no-note-authority', () => reject(() => openReserveNoteImage(new TextEncoder().encode(JSON.stringify({ rail: 'reserve', paid: true, amountUsdCents: '10000', verified: true })))));
  await check('oversize-image-refused-before-verification', () => reject(() => openReserveNoteImage(new Uint8Array(8 * 1024 * 1024 + 1)), 'BANK_NOTE_TRANSPORT_CAPACITY'));
  await check('forged-handle-cannot-expose-verified-head', () => reject(() => inspectReserveNote({ verified: true, rail: 'reserve', amountUsdCents: '10000' }), 'BANK_NOTE_SOURCE_CUSTODY_REQUIRED'));
  await check('transported-property-bag-cannot-export-source', () => reject(() => exportReserveNoteSource(Object.freeze({ status: 'verified', noteId: 'fixture' })), 'BANK_NOTE_SOURCE_CUSTODY_REQUIRED'));
  return {
    schema: 'receiz.bank.receiver-reference-checks.v1', localChecksPassed: checks.every(check => check.passed),
    receizVersion: profile.receizVersion, registryDigest: profile.registryDigest,
    checks, mcpEvidence, temporalEvidence: temporal ? { reportDigest: temporal.reportDigest, checks: temporal.checks } : null,
    institutionConformance: 'not-assessed', grantsProductionAccess: false, creditAuthorized: false,
    remainingEvidence: ['qualified-real-device', 'admitted-funded-positive-note', 'receiver-bound-handoff', 'atomic-once-only-credit', 'lost-response-recovery', 'receiver-specific-independent-assessment'],
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = await checkReceiverReference(); console.log(JSON.stringify(report, null, 2));
    // The canonical Groth16 verifier owns worker threads. This read-only CLI
    // exits only after every awaited check and its report have completed.
    process.stdout.write('', () => process.exit(report.localChecksPassed ? 0 : 1));
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'REFERENCE_CHECK_FAILED'); process.exit(1);
  }
}
