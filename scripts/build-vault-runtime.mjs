import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,symlink,rm} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {build,version} from 'esbuild';

export const vaultBundleOptions=source=>({absWorkingDir:source,entryPoints:['app/lib/wallet/bankVault/browser.ts'],bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,treeShaking:true,define:{process:'undefined'},external:['node:*'],write:false,metafile:true,alias:{'@':source},legalComments:'inline',banner:{js:'/*! Vault source admission — composed from included Receiz primitives. Generated; do not edit. */'}});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function buildVaultRuntime({write=false}={}){
 const manifest=JSON.parse(await readFile('public/native/vault.v1.manifest.json','utf8'));
 assert.equal(version,manifest.esbuildVersion,'Use the pinned bundler.');
 const temporary=await mkdtemp(resolve(tmpdir(),'bank-vault-runtime-'));
 try{
  for(const file of manifest.files){
   assert.ok(!file.path.startsWith('/')&&!file.path.split('/').includes('..'));
   const bytes=await readFile(resolve('native/vault',file.path));assert.equal(hash(bytes),file.sha256,'Vault source differs: '+file.path);
   const target=resolve(temporary,file.path);await mkdir(dirname(target),{recursive:true});await writeFile(target,bytes);
  }
  for(const link of manifest.links){const target=resolve(temporary,link.path);assert.ok(!link.path.split('/').includes('..')&&!link.target.split('/').includes('..'));await mkdir(dirname(target),{recursive:true});await symlink(resolve(temporary,link.target),target,'dir');}
  const bundled=await build(vaultBundleOptions(temporary));
  assert.ok(Object.values(bundled.metafile.outputs).every(v=>v.imports.length===0),'Vault verifier must be self-contained.');
  const bytes=bundled.outputFiles[0].contents;
  if(write){await writeFile('public/native/vault.v1.mjs',bytes);manifest.moduleSha256=hash(bytes);manifest.bytes=bytes.length;await writeFile('public/native/vault.v1.manifest.json',JSON.stringify(manifest,null,2)+'\n');}
  else assert.equal(hash(bytes),manifest.moduleSha256,'Vault runtime rebuild differs.');
  return{bytes:bytes.length,inputs:Object.keys(bundled.metafile.inputs).length};
 }finally{await rm(temporary,{recursive:true,force:true});}
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename)){const result=await buildVaultRuntime({write:process.argv.includes('--write')});console.log(`Vault source runtime reproduced from ${result.inputs} included inputs (${result.bytes} bytes).`);}
