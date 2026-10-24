import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {expect,it,vi} from 'vitest';
// @ts-expect-error build script has no application runtime declaration
import {buildVaultInspector} from '../scripts/build-vault-inspector.mjs';
it('ships a complete offline reader with pinned native admission and refuses invented public evidence without network',async()=>{
 const directory=await mkdtemp(resolve(tmpdir(),'bank-vault-inspector-'));
 try{await buildVaultInspector(directory);const build=JSON.parse(await readFile(resolve(directory,'build.json'),'utf8')),bytes=await readFile(resolve(directory,'inspector.js'));
 expect(createHash('sha256').update(bytes).digest('hex')).toBe(build.files['inspector.js'].sha256);expect(build.inputs.length).toBeGreaterThan(0);
 expect((await readFile(resolve(directory,'verify.html'),'utf8'))).toContain('connect-src');expect((await readFile(resolve(directory,'verify.html'),'utf8'))).toContain('worker-src blob:');
 const sources=JSON.parse(await readFile(resolve(directory,'inspector.js.map'),'utf8'));expect(sources.sourcesContent.length).toBeGreaterThan(0);expect(sources.sources.every((path:string)=>!path.startsWith('/')&&!path.includes('/Users/'))).toBe(true);
 const fetch=vi.fn(()=>{throw Error('NETWORK_DISABLED');});vi.stubGlobal('fetch',fetch);await import(pathToFileURL(resolve(directory,'inspector.js')).href);const reader=(globalThis as any).VaultOfflineInspector;
 try{await expect(reader.inspect(new TextEncoder().encode(JSON.stringify({schema:'receiz.bank.vault-public-record.v1',verified:true,amount:'1000000'})))).rejects.toThrow();expect(fetch).not.toHaveBeenCalled();expect(reader.failureCode(Error('PRIVATE-CHILD-KEY: secret'))).toBe('VAULT_INSPECTION_FAILED');expect(reader.failureCode(Error('VAULT_IMAGE_SEAL_INVALID'))).toBe('VAULT_IMAGE_SEAL_INVALID');}
 finally{vi.unstubAllGlobals();delete(globalThis as any).VaultOfflineInspector;}
 }finally{await rm(directory,{recursive:true,force:true});}
},30000);
