import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, copyFile, symlink, rm, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { build, version } from 'esbuild';

const bank = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const refreshComposition = process.argv.includes('--refresh-composition');
assert.ok(!refreshComposition || process.argv.includes('--output'), 'Refreshing composition requires an explicit output directory.');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(await readFile(resolve(bank, 'native/manifest.json'), 'utf8'));
assert.equal(version, manifest.esbuildVersion, 'Use the pinned esbuild from npm ci.');
const workspace = await mkdtemp(resolve(tmpdir(), 'bankeiz-native-'));
const source = resolve(workspace, 'receiz');
async function link(target, path) { await mkdir(dirname(path), { recursive: true }); await symlink(target, path, 'dir'); }
async function materialize(prefix, destination) {
  for (const entry of manifest.files.filter(entry => entry.path.startsWith(prefix + '/'))) {
    assert.ok(!entry.path.split('/').includes('..') && !entry.path.startsWith('/'));
    const bytes = await readFile(resolve(bank, 'native', entry.path));
    assert.equal(hash(bytes), entry.sha256, `Source differs: ${entry.path}`);
    const path = resolve(destination, entry.path.slice(prefix.length + 1));
    await mkdir(dirname(path), { recursive: true }); await writeFile(path, bytes, { mode: entry.mode ?? 0o644 });
  }
}
try {
  await materialize('receiz', source);
  for (const [placement, slug] of Object.entries(manifest.placements)) {
    const target = resolve(source, placement);
    await materialize(`npm/${slug}`, target);
    const name = JSON.parse(await readFile(resolve(target, 'package.json'), 'utf8')).name;
    await link(target, resolve(source, 'node_modules', name));
  }
  // Build tools and declarations come from the public lockfile; runtime modules
  // above come only from the included source package, never a Receiz checkout.
  for (const name of ['typescript', '@types', 'react', '@receiz/ai-skills']) await link(resolve(bank, 'node_modules', name), resolve(source, 'node_modules', name));
  const common = { absWorkingDir: source, bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true, treeShaking: true, external: ['node:*'], write: false, metafile: true, legalComments: 'inline' };
  const notes = await build({ ...common, entryPoints: ['app/lib/wallet/bankNotes/browser.ts'], alias: { '@': source }, outfile: resolve(bank, 'public/native/offline-notes.v129.mjs'), banner: { js: '/*! Receiz Bank Offline Notes — composed from Receiz v129 native primitives. Generated; do not edit. */' } });
  const notesBytes = notes.outputFiles[0].contents;
  const notesManifestPath = resolve(bank, 'public/native/offline-notes.v129.manifest.json');
  const notesManifest = JSON.parse(await readFile(notesManifestPath, 'utf8'));
  if (!refreshComposition) assert.equal(hash(notesBytes), notesManifest.moduleSha256, 'Offline Note rebuild differs.');
  const inputList = await Promise.all(Object.keys(notes.metafile.inputs).sort().map(async path => ({ path: relative(source, resolve(source, path)), sha256: hash(await readFile(resolve(source, path))) })));
  if (refreshComposition) { manifest.notesInputs = inputList; await writeFile(resolve(bank, 'native/manifest.json'), JSON.stringify(manifest, null, 2) + '\n'); }
  else assert.deepEqual(inputList, manifest.notesInputs, 'Native input closure differs.');
  if (refreshComposition) await writeFile(notesManifestPath, JSON.stringify({ ...notesManifest, moduleSha256: hash(notesBytes), sourceTreeSha256: hash(JSON.stringify(inputList)), inputs: inputList.length, bytes: notesBytes.length, applicationPatches: manifest.applicationPatches ?? [] }, null, 2) + '\n');

  const receiver = await build({ ...common, entryPoints: [resolve(bank, 'institution/receiver-verifier.entry.mjs')], alias: { 'receiz-native-note-account-deposit': resolve(source, 'app/lib/wallet/bankNotes/accountDeposit.ts'), 'receiz-native-note-image': resolve(source, 'app/lib/wallet/bankNotes/noteImage.ts'), 'receiz-native-note-source': resolve(source, 'app/lib/wallet/bankNotes/fundedNote.ts'), 'receiz-native-note-credit': resolve(source, 'app/lib/wallet/bankNotes/credit.ts'), 'receiz-native-note-compression': resolve(source, 'app/lib/wallet/bankNotes/compression.ts'), '@': source }, outfile: resolve(bank, 'public/native/receiver-verifier.v129.mjs'), sourcemap: 'external', sourcesContent: true, banner: { js: '/*! Reality-Grade Banking — read-only v129 receiver verifier. No funding, signing, custody consumption or credit authority. Includes GPL-3.0 snarkjs/ffjavascript components: see /native/licenses/README.md and the adjacent complete source map. Distribution licensing review remains required. */' } });
  const receiverBytes = receiver.outputFiles.find(file => file.path.endsWith('.mjs')).contents;
  const receiverManifest = JSON.parse(await readFile(resolve(bank, 'public/native/receiver-verifier.v129.manifest.json'), 'utf8'));
  if (!refreshComposition) assert.equal(hash(receiverBytes), receiverManifest.moduleSha256, 'Receiver rebuild differs.');
  const map = JSON.parse(new TextDecoder().decode(receiver.outputFiles.find(file => file.path.endsWith('.map')).contents));
  if (refreshComposition) {
    const canonicalSource = await realpath(source), canonicalBank = await realpath(bank);
    receiverManifest.inputs = map.sources.map((name, i) => {
      const absolute = resolve(bank, 'public/native', name);
      const path = absolute.startsWith(canonicalSource + '/') ? 'receiz/' + relative(canonicalSource, absolute) : absolute.startsWith(canonicalBank + '/') ? 'bank/' + relative(canonicalBank, absolute) : null;
      assert.ok(path, `Source map escaped included source: ${name} (${absolute}; source ${source})`);
      return { path, sha256: hash(map.sourcesContent[i]) };
    });
    receiverManifest.moduleSha256 = hash(receiverBytes);
    receiverManifest.bytes = receiverBytes.length;
    receiverManifest.sourceTreeSha256 = hash(JSON.stringify(receiverManifest.inputs));
  } else assert.deepEqual(map.sourcesContent.map(hash), receiverManifest.inputs.map(entry => entry.sha256), 'Receiver source-map inputs differ.');
  map.sources = receiverManifest.inputs.map(entry => entry.path); map.file = 'receiver-verifier.v129.mjs';
  if (refreshComposition) { receiverManifest.sourceMapSha256 = hash(JSON.stringify(map)); await writeFile(resolve(bank, 'public/native/receiver-verifier.v129.manifest.json'), JSON.stringify(receiverManifest, null, 2) + '\n'); }
  else assert.equal(hash(JSON.stringify(map)), receiverManifest.sourceMapSha256, 'Normalized receiver source map differs.');

  const core = await build({ ...common, entryPoints: ['app/lib/documentSeal/offlineSdkSource.ts'], supported: { 'template-literal': false }, external: ['snarkjs', 'hash-wasm', 'fflate', '@noble/hashes/*'], legalComments: 'none' });
  assert.equal('// Generated from the canonical app seal core by scripts/build_offline_sdk_runtime.mjs.\n' + core.outputFiles[0].text, await readFile(resolve(source, 'packages/receiz-sdk/src/offlineSealImplementation.js'), 'utf8'), 'Preferred SDK sealing source differs.');
  const worker = await build({ ...common, entryPoints: ['packages/receiz-sdk/src/offlineKaiProofNodeWorker.ts'], platform: 'node', external: ['snarkjs', 'hash-wasm', '@noble/hashes/*'], legalComments: 'none' });
  assert.equal('// Generated from the SDK live KaiSigil proof composition by scripts/build_offline_sdk_runtime.mjs.\n' + worker.outputFiles[0].text, await readFile(resolve(source, 'packages/receiz-sdk/offline-resources/kai-proof-worker.mjs'), 'utf8'), 'Preferred Kai worker source differs.');
  for (const name of ['sync_canonical_anchor_parser.mjs', 'sync_sigil_valuation_core.mjs']) execFileSync(process.execPath, [resolve(source, 'scripts', name), '--check'], { cwd: source, stdio: 'pipe' });

  if (process.argv.includes('--sdk')) {
    const sdk = resolve(source, 'packages/receiz-sdk');
    execFileSync(process.execPath, [resolve(bank, 'node_modules/typescript/bin/tsc'), '-p', resolve(sdk, 'tsconfig.json')], { cwd: sdk, stdio: 'pipe' });
    execFileSync(process.execPath, [resolve(sdk, 'scripts/compact-registry-projections.mjs')], { cwd: sdk, stdio: 'pipe' });
    for (const entry of manifest.sdkOutputs) assert.equal(hash(await readFile(resolve(sdk, entry.path))), entry.sha256, `SDK output differs: ${entry.path}`);
    console.log(`SDK preferred source reproduces ${manifest.sdkOutputs.length} published JavaScript files.`);
  }
  if (process.argv.includes('--output')) {
    const output = resolve(process.argv[process.argv.indexOf('--output') + 1]); await mkdir(output, { recursive: true });
    await writeFile(resolve(output, 'offline-notes.v129.mjs'), notesBytes); await writeFile(resolve(output, 'receiver-verifier.v129.mjs'), receiverBytes); await writeFile(resolve(output, 'receiver-verifier.v129.mjs.map'), JSON.stringify(map));
  }
  console.log('Exact native modules, normalized source map, SDK sealing core, Kai worker and canonical generated seams rebuilt from included sources. No Receiz checkout or network used.');
} catch (error) {
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  throw error;
} finally { await rm(workspace, { recursive: true, force: true }); }
