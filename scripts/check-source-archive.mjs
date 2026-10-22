import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { sourceFiles, hash } from './source-files.mjs';

const index = JSON.parse(await readFile('dist/source/index.json', 'utf8'));
assert.match(index.url, /^\/source\/reality-grade-banking-[a-f0-9]{20}\.tgz$/);
const compressed = await readFile(`dist${index.url}`); assert.equal(hash(compressed), index.sha256); assert.equal(compressed.length, index.bytes);
const tar = gunzipSync(compressed), entries = new Map(), modes = new Map();
const text = bytes => bytes.toString('utf8').replace(/\0.*$/s, '');
for (let offset = 0; offset < tar.length && tar[offset];) {
  const header = tar.subarray(offset, offset + 512), checksum = parseInt(text(header.subarray(148, 156)).trim(), 8);
  const checked = Buffer.from(header); checked.fill(32, 148, 156);
  assert.equal([...checked].reduce((sum, byte) => sum + byte, 0), checksum, 'Invalid archive header');
  const prefix = text(header.subarray(345, 500));
  const path = (prefix ? prefix + '/' : '') + text(header.subarray(0, 100));
  assert.ok(path.startsWith('reality-grade-banking/') && !path.split('/').includes('..') && !path.includes('\\'), 'Unsafe archive path');
  assert.equal(header[156], 48, 'Archive contains only regular files');
  const size = parseInt(text(header.subarray(124, 136)), 8), name = path.slice('reality-grade-banking/'.length);
  assert.ok(!entries.has(name), `Duplicate archive file: ${name}`);
  entries.set(name, tar.subarray(offset + 512, offset + 512 + size)); modes.set(name, parseInt(text(header.subarray(100, 108)), 8)); offset += 512 + Math.ceil(size / 512) * 512;
}
for (const entry of ['index.html','conformance/index.html','verify/index.html','receipt/index.html','ledger/index.html','pay/index.html','README.md','CHANGELOG.md','docs/releases/README.md']) assert.ok(entries.has(entry), `Missing release source: ${entry}`);
const inventory = JSON.parse(entries.get('SOURCE-ARCHIVE.json').toString('utf8'));
assert.equal(hash(JSON.stringify(inventory.files)), index.sourceTreeSha256);
assert.equal(inventory.sourceTreeSha256, index.sourceTreeSha256);
assert.equal(entries.size, inventory.files.length + 1); assert.equal(inventory.files.length, index.files);
for (const entry of inventory.files) { assert.equal(hash(entries.get(entry.path)), entry.sha256, entry.path); assert.equal(entries.get(entry.path).length, entry.bytes); assert.equal(modes.get(entry.path), entry.mode, `Executable mode differs: ${entry.path}`); }
const current = (await sourceFiles()).map(({ path, bytes, sha256, mode }) => ({ path, sha256, bytes: bytes.length, mode }));
assert.deepEqual(inventory.files, current, 'Archive differs from preferred release sources. Rebuild it.');
console.log(`Verified source archive and exact inventory: ${inventory.files.length} files.`);
if (process.argv.includes('--rebuild')) {
  const directory = await mkdtemp(resolve(tmpdir(), 'bankeiz-source-recipient-'));
  try {
    for (const [path, bytes] of entries) { const destination = resolve(directory, path); await mkdir(dirname(destination), { recursive: true }); await writeFile(destination, bytes, { mode: modes.get(path) }); }
    // Reuse only publicly locked npm tools; source reads happen in the archive.
    await symlink(resolve('node_modules'), resolve(directory, 'node_modules'), 'dir');
    for (const args of [['scripts/check-native-source.mjs'], ['scripts/rebuild-native.mjs', '--sdk'], ['scripts/check-native-resources.mjs']]) execFileSync(process.execPath, args, { cwd: directory, stdio: 'inherit' });
    execFileSync('npm', ['run', 'build'], { cwd: directory, stdio: 'inherit' });
    console.log('A clean archive extraction builds the full application and reproduces both native modules and all 211 SDK JavaScript outputs without the private checkout.');
  } finally { await rm(directory, { recursive: true, force: true }); }
}
