import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const root = resolve('native/receiz');
const resources = [
  ['document-seal.wasm', 'sigil_proof.wasm', 'fc72dd17e30f7e9b178eeac08f1deceec8fff5b757481455e465234fbc35e696'],
  ['document-seal.zkey', 'document_seal_proof_final.zkey', 'fc5bc8cce4c43dc163e44bc8a1e52c165b72813a0ccbde7fb1735f3cb01debd4'],
  ['kai-sigil.wasm', 'kai_sigil_proof.wasm', 'fc72dd17e30f7e9b178eeac08f1deceec8fff5b757481455e465234fbc35e696'],
  ['kai-sigil.zkey', 'kai_sigil_proof_final.zkey', '838d15799730189054f811e172176df804137374fa8bb6ab7bfd50630cc8986a'],
];
for (const [bank, sdk, digest] of resources) {
  assert.equal(hash(await readFile(`public/zk/${bank}`)), digest, bank);
  assert.equal(hash(await readFile(`${root}/packages/receiz-sdk/offline-resources/${sdk}`)), digest, sdk);
}
console.log('Public Bank/SDK proving resources match their pinned hashes.');
if (process.argv.includes('--circuit')) {
  const compiler = process.env.CIRCOM_BIN || 'circom';
  assert.match(execFileSync(compiler, ['--version'], { encoding: 'utf8' }), /\b2\.1\.6\b/, 'Use Circom 2.1.6 for the exact witness WASM.');
  const directory = await mkdtemp(resolve(tmpdir(), 'bankeiz-circuit-'));
  try {
    execFileSync(compiler, [resolve(root, 'zk/sigil_proof.circom'), '--wasm', '--r1cs', '-o', directory, '-l', root], { stdio: 'pipe' });
    assert.equal(hash(await readFile(resolve(directory, 'sigil_proof_js/sigil_proof.wasm'))), resources[0][2], 'Compiled witness WASM differs.');
    for (const name of ['document-seal.zkey', 'kai-sigil.zkey']) {
      await new Promise((accept, reject) => {
        const child = spawn(process.execPath, ['node_modules/snarkjs/cli.js', 'zkey', 'verify', resolve(directory, 'sigil_proof.r1cs'), resolve(root, 'zk/pot12_final.ptau'), resolve('public/zk', name)], { stdio: ['ignore', 'pipe', 'pipe'] });
        let output = '';
        child.stdout.on('data', data => { output += data; }); child.stderr.on('data', data => { output += data; });
        child.on('error', reject);
        child.on('close', code => code === 0 && /ZKey Ok!/i.test(output) ? accept() : reject(Error(`Public proving-key verification failed for ${name}: ${output.slice(-2000)}`)));
      });
      console.log(`${name}: verified against the rebuilt circuit and included public setup parameters.`);
    }
    console.log('Circom 2.1.6 reproduces the exact witness WASM. Existing public proving keys are verified, not regenerated.');
  } finally { await rm(directory, { recursive: true, force: true }); }
}
