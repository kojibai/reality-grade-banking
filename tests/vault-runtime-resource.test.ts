import {expect,it} from 'vitest';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
it('ships the lazy Vault verifier with exact included corresponding source and reproducible output',async()=>{
 const manifest=JSON.parse(await readFile('public/native/vault.v1.manifest.json','utf8'));
 const runtime=await readFile('public/native/vault.v1.mjs');
 expect(createHash('sha256').update(runtime).digest('hex')).toBe(manifest.moduleSha256);
 expect(runtime.toString()).not.toMatch(/\/Users\/|process\.env|from\s*["'](?:node:|https?:)/);
 expect(manifest.inputs.length).toBeGreaterThan(0);
 execFileSync(process.execPath,['scripts/build-vault-runtime.mjs','--check'],{stdio:'pipe'});
},15000);
