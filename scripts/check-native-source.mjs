import { readReceizRelease } from './receiz-release.mjs';
import assert from 'node:assert/strict';
import { readFile, lstat, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(await readFile('native/manifest.json', 'utf8'));
assert.equal(manifest.receizVersion, (await readReceizRelease()).version);
assert.ok(manifest.files.length > 0);
const paths = new Set();
for (const entry of manifest.files) {
  assert.ok(!entry.path.startsWith('/') && !entry.path.split('/').includes('..') && !entry.path.includes('\\'));
  assert.ok(!paths.has(entry.path), `Duplicate source: ${entry.path}`); paths.add(entry.path);
  const path = `native/${entry.path}`;
  assert.ok((await lstat(path)).isFile(), `Regular source required: ${path}`);
  assert.equal((await lstat(path)).mode & 0o111 ? 0o755 : 0o644, entry.mode, `Executable mode differs: ${path}`);
  assert.equal(hash(await readFile(path)), entry.sha256, `Source differs: ${path}`);
}
const sidecars = new Set(['manifest.json', 'README.md', 'NOTICE', 'DISCLOSURE.md']);
async function inspect(directory = 'native', prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = prefix + entry.name;
    assert.ok(!entry.isSymbolicLink(), `Symlink not allowed in source distribution: ${path}`);
    assert.ok(!/^(?:\.env(?:\..*)?|\.git|\.aws|\.npmrc|id_rsa|id_ed25519)$/i.test(entry.name), `Private/config path rejected: ${path}`);
    assert.ok(!/\.(?:pem|p12|pfx|key)$/i.test(entry.name), `Private-key container rejected: ${path}`);
    if (entry.isDirectory()) await inspect(`${directory}/${entry.name}`, `${path}/`);
    else {
      assert.ok(paths.has(path) || sidecars.has(path), `Unindexed file: ${path}`);
      if (path.startsWith('receiz/')) assert.ok(!/(?:^|\/)(?:api|migrations|signer-service|\.vercel)(?:\/|$)/.test(path), `Server-only source rejected: ${path}`);
      const bytes = await readFile(`${directory}/${entry.name}`);
      if (!bytes.includes(0)) {
        const text = bytes.toString('utf8');
        assert.ok(!/-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/.test(text), `Private key block rejected: ${path}`);
        assert.ok(!/\b(?:sk_live_[A-Za-z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[A-Z0-9]{16})\b/.test(text), `Credential pattern rejected: ${path}`);
        assert.ok(!/\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/.test(text), `JWT rejected: ${path}`);
      }
    }
  }
}
await inspect();
if (process.argv.includes('--staged')) {
  const staged = new Map(execFileSync('git', ['ls-files', '--stage', '-z', 'native'], { encoding: 'utf8' }).split('\0').filter(Boolean).map(line => {
    const [record, path] = line.split('\t'); const [mode, object, stage] = record.split(' ');
    assert.equal(stage, '0', `Unmerged source: ${path}`); return [path.slice('native/'.length), { mode, object }];
  }));
  for (const path of [...paths, ...sidecars]) {
    const entry = staged.get(path); assert.ok(entry, `Matching source missing from Git index: native/${path}`);
    const bytes = await readFile(`native/${path}`);
    assert.equal(entry.object, createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), `Staged bytes differ: ${path}`);
    assert.equal(entry.mode, ((await lstat(`native/${path}`)).mode & 0o111) ? '100755' : '100644', `Staged mode differs: ${path}`);
  }
  assert.equal(staged.size, paths.size + sidecars.size, 'Unexpected staged native files');
  console.log('Every manifest file and source sidecar is staged with its exact bytes and executable mode.');
}
for (const input of manifest.nativeInputs.filter(input => !input.path.startsWith('node_modules/'))) {
  assert.equal(hash(await readFile(`native/receiz/${input.path}`)), input.sha256, `Native original differs: ${input.path}`);
}
for (const entry of manifest.upstream) {
  assert.ok((await lstat(`native/${entry.preferredSourceDirectory}/package.json`)).isFile(), `Preferred upstream source missing: ${entry.name}`);
}
console.log(`Verified ${manifest.files.length} native source/package files, ${manifest.nativeInputs.length} original inputs and ${manifest.upstream.length} preferred upstream trees.`);
