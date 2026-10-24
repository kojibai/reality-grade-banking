import {build} from 'esbuild';
import {mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,relative,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function writeChanged(path,bytes){try{if((await readFile(path)).equals(Buffer.from(bytes)))return;}catch(error){if(error.code!=='ENOENT')throw error;}await writeFile(path,bytes);}
export async function buildVaultInspector(directory='public/vault-verifier/v1'){
 const out=resolve(directory);await mkdir(out,{recursive:true});
 const built=await build({entryPoints:['institution/vault-inspector/entry.ts'],bundle:true,platform:'browser',format:'iife',globalName:'VaultOfflineInspector',target:'es2022',minify:true,treeShaking:true,write:false,metafile:true,sourcemap:'external',sourcesContent:true,outfile:resolve(out,'inspector.js'),legalComments:'inline',define:{'process.env.NODE_ENV':'"production"',process:'undefined','import.meta.env':'{}'},external:['node:*'],footer:{js:'globalThis.VaultOfflineInspector=VaultOfflineInspector;'}});
 if(Object.values(built.metafile.outputs).some(v=>v.imports.length))throw Error('VAULT_INSPECTOR_EXTERNAL_IMPORT');
 const bytes=built.outputFiles.find(file=>file.path.endsWith('.js')).contents,map=JSON.parse(new TextDecoder().decode(built.outputFiles.find(file=>file.path.endsWith('.map')).contents));map.sources=map.sources.map(path=>relative(resolve('.'),resolve(out,path)));const files={'inspector.js':bytes,'inspector.js.map':Buffer.from(JSON.stringify(map))};
 for(const name of ['verify.mjs','verify.html','README.txt','vault-private.schema.json','vault-public.schema.json'])files[name]=await readFile('institution/vault-inspector/'+name);
 files['verify.html']=Buffer.from(new TextDecoder().decode(files['verify.html']).replace('<script src="inspector.js"></script>',()=>'<script>'+new TextDecoder().decode(bytes).replaceAll('</script','<\\/script')+'</script>'));
 for(const name of await readdir('public/native/licenses'))files['licenses/'+name]=await readFile('public/native/licenses/'+name);
 for(const name of ['LICENSE','NOTICE','THIRD_PARTY_NOTICES.md'])files[name]=await readFile(name);
 const inputs=await Promise.all(Object.keys(built.metafile.inputs).filter(path=>!path.startsWith('<')).sort().map(async path=>({path,sha256:hash(await readFile(path))})));
 files['build.json']=Buffer.from(JSON.stringify({schema:'bank.vault.offline-reader-build.v1',rebuild:'npm ci && node scripts/build-vault-inspector.mjs',defines:{process:'undefined','import.meta.env':'{}'},inputs,files:Object.fromEntries(Object.entries(files).map(([path,data])=>[path,{sha256:hash(data),bytes:data.length}]))},null,2)+'\n');
 for(const [name,data]of Object.entries(files)){await mkdir(dirname(resolve(out,name)),{recursive:true});await writeChanged(resolve(out,name),data);}
 return{bytes:bytes.length,inputs:inputs.length};
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename)){const result=await buildVaultInspector(process.argv[2]);console.log(`Built read-only offline Vault inspector (${result.bytes} bytes; ${result.inputs} included inputs).`);}
