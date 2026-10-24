import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build,version} from 'esbuild';
import {vaultBundleOptions,buildVaultRuntime} from './build-vault-runtime.mjs';

// Maintenance-only import. Normal builds reproduce the included closure and
// never require another checkout, network, credentials or service access.
const index=process.argv.indexOf('--source');assert.ok(index>=0,'Give an explicit source checkout.');
const source=resolve(process.argv[index+1]),compiled=await build(vaultBundleOptions(source));
assert.ok(Object.values(compiled.metafile.outputs).every(v=>v.imports.length===0));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),files=new Map(),links=new Map();
async function include(path){assert.ok(!path.startsWith('/')&&!path.split('/').includes('..'));if(files.has(path))return;const bytes=await readFile(resolve(source,path)),target=resolve('native/vault',path);await mkdir(dirname(target),{recursive:true});await writeFile(target,bytes);files.set(path,{path,sha256:hash(bytes),mode:0o644});}
for(const path of Object.keys(compiled.metafile.inputs)){
 await include(path);
 if(path.startsWith('node_modules/.pnpm/')){
  const match=path.match(/^(node_modules\/.pnpm\/[^/]+\/node_modules\/((?:@[^/]+\/)?[^/]+))\//);assert.ok(match,'Unexpected package input.');
  const [,root,name]=match;links.set('node_modules/'+name,{path:'node_modules/'+name,target:root});
  await include(root+'/package.json');for(const name of ['LICENSE','LICENSE.md','LICENSE.txt'])if(await stat(resolve(source,root,name)).catch(()=>null))await include(root+'/'+name);
 }
}
const manifest={schema:'bank.vault.native-runtime.v1',entry:'app/lib/wallet/bankVault/browser.ts',sourceRevision:execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim(),esbuildVersion:version,files:[...files.values()].sort((a,b)=>a.path.localeCompare(b.path)),links:[...links.values()],inputs:Object.keys(compiled.metafile.inputs).sort(),moduleSha256:hash(compiled.outputFiles[0].contents),bytes:compiled.outputFiles[0].contents.length};
await mkdir('public/native',{recursive:true});await writeFile('public/native/vault.v1.manifest.json',JSON.stringify(manifest,null,2)+'\n');
const native=JSON.parse(await readFile('native/manifest.json','utf8'));const retained=new Map(native.files.map(v=>[v.path,v]));for(const v of manifest.files)retained.set('vault/'+v.path,{...v,path:'vault/'+v.path});native.files=[...retained.values()];native.files.sort((a,b)=>a.path.localeCompare(b.path));await writeFile('native/manifest.json',JSON.stringify(native,null,2)+'\n');
await buildVaultRuntime({write:true});console.log(`Imported ${manifest.files.length} exact public Vault runtime source files; no server routes or credentials.`);
