import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const source = resolve(process.argv[2] ?? '../receiz/.worktrees/receiz-v129-main');
const packageJson = JSON.parse(await readFile(resolve(source, 'package.json'), 'utf8'));
if (packageJson.version !== '129.0.0') throw Error('Pinned Receiz v129 source required.');
const hostRequire = createRequire(resolve(source, 'package.json'));
const { build } = createRequire(hostRequire.resolve('tsx/package.json'))('esbuild');
const output = resolve('public/native/receiver-verifier.v129.mjs'); await mkdir(resolve('public/native'), { recursive: true });
const result = await build({ absWorkingDir: source, entryPoints: [resolve('institution/receiver-verifier.entry.mjs')], alias: { 'receiz-native-note-image': resolve(source, 'app/lib/wallet/bankNotes/noteImage.ts'), 'receiz-native-note-source': resolve(source, 'app/lib/wallet/bankNotes/fundedNote.ts'), '@': source }, bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true, treeShaking: true, external: ['node:*'], outfile: output, sourcemap: 'external', sourcesContent: true, metafile: true, legalComments: 'inline', banner: { js: '/*! Reality-Grade Banking — read-only v129 receiver verifier. No funding, signing, custody consumption or credit authority. Includes GPL-3.0 snarkjs/ffjavascript components: see /native/licenses/README.md and the adjacent complete source map. Distribution licensing review remains required. */' } });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
// Order provenance exactly as the embedded source map, so clones can check all
// source bytes without access to the maintainer's original host checkout.
const map = JSON.parse(await readFile(output + '.map', 'utf8'));
const entry = resolve('institution/receiver-verifier.entry.mjs');
const files = map.sources.map((path, index) => {
  const absolute = resolve('public/native', path);
  return { path: absolute === entry ? 'bank/institution/receiver-verifier.entry.mjs' : `receiz/${relative(source, absolute)}`, sha256: hash(map.sourcesContent[index]) };
});
map.sources = files.map(file => file.path);
map.file = 'receiver-verifier.v129.mjs';
await writeFile(output + '.map', JSON.stringify(map));
const moduleBytes = await readFile(output), sourceMapBytes = await readFile(output + '.map');
await writeFile(output.replace('.mjs', '.manifest.json'), JSON.stringify({ schema: 'receiz.bank.receiver-verifier-build.v1', version: '129.0.0', sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8' }).trim(), moduleSha256: hash(moduleBytes), sourceMapSha256: hash(sourceMapBytes), sourceTreeSha256: hash(JSON.stringify(files)), bytes: moduleBytes.length, inputs: files, verificationIsFinancialAdmission: false }, null, 2) + '\n');
console.log(`Built read-only receiver verifier: ${moduleBytes.length} bytes; ${files.length} auditable inputs.`);
