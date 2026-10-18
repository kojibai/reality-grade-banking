import { mkdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { readReceizRelease } from './receiz-release.mjs';
import { sourceFiles, hash } from './source-files.mjs';

execFileSync(process.execPath, ['scripts/check-native-source.mjs'], { stdio: 'inherit' });
const release = await readReceizRelease();
const entries = await sourceFiles();
const files = entries.map(({ path, bytes, sha256, mode }) => ({ path, sha256, bytes: bytes.length, mode }));
const sourceTreeSha256 = hash(JSON.stringify(files));
const inventory = { schema: 'bankeiz.source-archive.v1', sourceTreeSha256, files };
entries.push({ path: 'SOURCE-ARCHIVE.json', bytes: Buffer.from(JSON.stringify(inventory, null, 2) + '\n') });
const blocks = [];
for (const entry of entries) {
  const path = `reality-grade-banking/${entry.path}`;
  const header = Buffer.alloc(512);
  let name = path, prefix = '';
  if (Buffer.byteLength(name) > 100) {
    const split = [...path.matchAll(/\//g)].map(match => match.index).reverse().find(position => Buffer.byteLength(path.slice(0, position)) <= 155 && Buffer.byteLength(path.slice(position + 1)) <= 100);
    if (split === undefined) throw Error(`USTAR path too long: ${path}`);
    prefix = path.slice(0, split); name = path.slice(split + 1);
  }
  if (Buffer.byteLength(name) > 100 || Buffer.byteLength(prefix) > 155) throw Error(`USTAR path too long: ${path}`);
  const number = (value, offset, length) => header.write(value.toString(8).padStart(length - 1, '0') + '\0', offset, length, 'ascii');
  header.write(name, 0, 100, 'utf8'); number(entry.mode ?? 0o644, 100, 8); number(0, 108, 8); number(0, 116, 8);
  number(entry.bytes.length, 124, 12); number(0, 136, 12); header.fill(32, 148, 156); header[156] = 48;
  header.write('ustar\0', 257, 6, 'ascii'); header.write('00', 263, 2, 'ascii'); header.write(prefix, 345, 155, 'utf8');
  header.write([...header].reduce((sum, byte) => sum + byte, 0).toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');
  blocks.push(header, entry.bytes, Buffer.alloc((512 - entry.bytes.length % 512) % 512));
}
blocks.push(Buffer.alloc(1024));
const bytes = gzipSync(Buffer.concat(blocks), { level: 9 });
const url = `/source/reality-grade-banking-${sourceTreeSha256.slice(0, 20)}.tgz`;
await mkdir('dist/source', { recursive: true });
await writeFile(`dist${url}`, bytes);
await writeFile('dist/source/index.json', JSON.stringify({ schema: inventory.schema, url, sha256: hash(bytes), sourceTreeSha256, bytes: bytes.length, files: files.length, nativeVersion: release.version }, null, 2) + '\n');
console.log(`Published content-addressed source archive: ${files.length} files, ${(bytes.length / 1024 / 1024).toFixed(1)} MiB compressed. Loaded only on download.`);
