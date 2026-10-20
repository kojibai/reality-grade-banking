import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const license = await readFile('LICENSE');
assert.equal(hash(license), 'fb981668c18a279e285fc4d83fba1e836cc84dd4daa73c9697d3cfd2d8aca6e0', 'The standard GPLv3 text must remain unmodified.');
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
assert.equal(pkg.license, 'GPL-3.0-only');
assert.equal(lock.packages[''].license, pkg.license);
assert.equal(pkg.author, 'Brian Joseph Klock (BJ Klock)');
assert.equal(hash(await readFile('dist/legal/LICENSE.txt')), hash(license));
for (const name of ['NOTICE', 'LICENSING.md', 'TRADEMARKS.md', 'CONFORMANCE.md', 'SOURCE.md', 'THIRD_PARTY_NOTICES.md']) {
  assert.equal(hash(await readFile(`dist/legal/${name === 'NOTICE' ? 'NOTICE.txt' : name}`)), hash(await readFile(name)), `Published ${name} differs from its source.`);
}
for (const [source, published] of [['src/vendor/jsqr/LICENSE', 'dist/legal/vendor/jsqr-Apache-2.0.txt'], ['public/notes/fonts/OFL.txt', 'dist/legal/vendor/Cinzel-OFL.txt'],['scripts/social/fonts/OFL.txt','dist/legal/vendor/Inter-OFL.txt']]) {
  assert.equal(hash(await readFile(published)), hash(await readFile(source)), `Bundled notice differs: ${source}`);
}
const metadata = JSON.parse(await readFile('dist/legal/release.json', 'utf8'));
assert.equal(metadata.license, pkg.license);
assert.equal(metadata.copyrightHolder, 'Brian Joseph Klock');
assert.equal(metadata.referenceImplementation, 'https://bankeiz.com/');
assert.equal(metadata.licenseSha256, hash(license));
assert.equal(metadata.institutionConformance, 'not-assessed');
assert.equal(metadata.nativeSourceMaterials, 'included-pinned-source');
assert.deepEqual(metadata.correspondingSource, JSON.parse(await readFile('dist/source/index.json', 'utf8')));
const inventory = JSON.parse(await readFile('dist/legal/dependencies.json', 'utf8'));
const production = Object.entries(lock.packages).filter(([path, value]) => path && !value.dev);
assert.equal(inventory.packages.length, production.length);
for (const [path, value] of production) {
  const entry = inventory.packages.find(item => item.path === path);
  assert.equal(entry?.version, value.version, `Missing locked dependency: ${path}`);
  assert.equal(entry.declaredLicense, value.license ?? null);
  assert.equal(entry.standaloneNoticeSupplied, entry.notices.length > 0);
  if (entry.installed === false) {
    assert.equal(value.optional, true, 'Only an optional platform variant may be absent.');
    assert.equal(entry.notices.length, 0);
    await assert.rejects(readFile(`${path}/package.json`), {code:'ENOENT'});
    continue;
  }
  for (const notice of entry.notices) {
    const source = await readFile(`${path}/${notice.name}`);
    assert.equal(hash(source), notice.sha256);
    assert.equal(hash(await readFile(`dist${notice.url}`)), hash(source));
  }
}
const html = await readFile('dist/legal/index.html', 'utf8');
assert.ok(html.includes('Brian Joseph Klock') && html.includes('/legal/LICENSE.txt') && html.includes('/legal/SOURCE.md'));
assert.ok(html.includes(metadata.correspondingSource.url) && html.includes('Download this build’s source'));
assert.ok(html.includes('Read the complete GNU GPL version 3') && html.includes('END OF TERMS AND CONDITIONS'), 'The complete license must be readable without a download or JavaScript.');
assert.ok(!html.includes('<script type="module"'), 'The legal page must not load the account runtime.');
console.log(`Verified unmodified GPLv3, ownership, public legal copies, matching source download and notices for ${production.length} locked production dependencies.`);
