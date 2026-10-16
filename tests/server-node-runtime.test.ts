import { mkdtemp, mkdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { expect, it } from 'vitest';

it('boots the emitted API graph in plain Node and forwards enrollment and public-proof requests without Vite resolution', async () => {
  const root = resolve('.'), output = await mkdtemp(join(tmpdir(), 'bankeiz-node-api-')), visited = new Set<string>();
  async function emit(file: string) {
    if (visited.has(file)) return; visited.add(file);
    const name = relative(root, file); if (name.startsWith('..')) throw Error('Unexpected server dependency outside the repository');
    const javascript = ts.transpileModule(await readFile(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    const target = join(output, name.replace(/\.ts$/u, '.js')); await mkdir(dirname(target), { recursive: true }); await writeFile(target, javascript);
    // Emit dependencies, preserving every original runtime import specifier.
    // Node, rather than the bundler/test loader, must resolve the result.
    for (const item of ts.preProcessFile(javascript, true, true).importedFiles) {
      if (!item.fileName.startsWith('.')) continue;
      const base = resolve(dirname(file), item.fileName), candidates = item.fileName.endsWith('.js') ? [base.replace(/\.js$/u, '.ts')] : [base, base + '.ts'];
      let dependency: string | undefined;
      for (const candidate of candidates) if (await stat(candidate).then(s => s.isFile(), () => false)) { dependency = candidate; break; }
      if (!dependency) throw Error(`Missing server source: ${item.fileName}`);
      await emit(dependency);
    }
  }
  try {
    await writeFile(join(output, 'package.json'), '{"type":"module"}'); await emit(join(root, 'api/index.ts'));
    const entry = pathToFileURL(join(output, 'api/index.js')).href;
    const result = execFileSync(process.execPath, ['--input-type=module', '--eval', `
      import assert from 'node:assert/strict';
      const {default:api}=await import(${JSON.stringify(entry)});
      let calls=0;
      const body=' { "fixture": "no enrollment", "bytes": [1,  2] }\\n';
      globalThis.fetch=async(url,init)=>{
        calls++; assert.equal(init.credentials,'omit'); assert.equal(init.redirect,'error');
        assert.equal(init.headers.Cookie,undefined); assert.equal(init.headers.Authorization,undefined);
        if(calls===1){assert.equal(url,'https://receiz.com/api/signer/v4/receiz/enroll'); assert.equal(init.body,body); return Response.json({ok:false,error:'invalid_enrollment_request'},{status:400});}
        assert.equal(url,'https://receiz.com/api/account-proofs/'+ 'a'.repeat(64)); return new Response('fixture-public-bytes',{headers:{'Set-Cookie':'must-not-forward'}});
      };
      const enrollment=await api.fetch(new Request('https://bank.example/api/bank/native/api/signer/v4/receiz/enroll',{method:'POST',headers:{Origin:'https://bank.example','Content-Type':'application/json',Cookie:'not-forwarded'},body}));
      assert.equal(enrollment.status,400); assert.equal((await enrollment.json()).error,'invalid_enrollment_request');
      const proof=await api.fetch(new Request('https://bank.example/api/bank/account-proof?proof='+'a'.repeat(64),{headers:{Cookie:'not-forwarded',Authorization:'not-forwarded'}}));
      assert.equal(proof.status,200); assert.equal(await proof.text(),'fixture-public-bytes'); assert.equal(proof.headers.get('set-cookie'),null); assert.equal(proof.headers.get('cache-control'),'no-store');
      assert.equal((await api.fetch(new Request('https://bank.example/api/bank/unknown'))).status,404); assert.equal(calls,2);
      console.log('plain-node-api-ok');
    `], { encoding: 'utf8', stdio: 'pipe' });
    expect(result).toContain('plain-node-api-ok');
  } finally { await rm(output, { recursive: true, force: true }); }
});
