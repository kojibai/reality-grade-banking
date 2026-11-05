import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync,gzipSync} from 'node:zlib';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function writeChanged(path,bytes){try{if((await readFile(path)).equals(Buffer.from(bytes)))return;}catch(error){if(error.code!=='ENOENT')throw error;}await writeFile(path,bytes);}
/** A standalone fixture policy; no production SDK alias or trust root changes. */
export async function buildBuildDemo(directory='public/build-demo/v129'){
 const root=resolve('.'),out=resolve(directory),sdk=resolve('institution/build-demo/fixed-fixture-sdk.ts');await mkdir(out,{recursive:true});
 const result=await build({absWorkingDir:root,entryPoints:['institution/build-demo/verifier.entry.ts'],bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,treeShaking:true,write:false,metafile:true,sourcemap:'external',sourcesContent:true,external:['node:*'],alias:{'@receiz/sdk':sdk},outfile:resolve(out,'verifier.mjs'),legalComments:'inline',banner:{js:'/*! Synthetic Receiz v129 fixture inspection only. No funds, signing, custody or credit authority. See adjacent licenses, source map and build.json. */'}});
 const files={};for(const file of result.outputFiles){
  const name=file.path.endsWith('.map')?'verifier.mjs.map':'verifier.mjs';let bytes=file.contents;
  if(name.endsWith('.map')){const map=JSON.parse(new TextDecoder().decode(bytes));map.sources=map.sources.map(path=>relative(root,resolve(out,path)));map.file='verifier.mjs';bytes=Buffer.from(JSON.stringify(map));}
  files[name]=bytes;
 }
 files['verifier.mjs.map.bin']=files['verifier.mjs.map'];
 for(const name of ['verify.mjs','worker.mjs','README.txt'])files[name]=await readFile('institution/build-demo/'+name);
 const metadata=JSON.parse(await readFile('tests/fixtures/connected-note-delivery/metadata.json','utf8'));
 if(metadata.synthetic!==true||metadata.authority!=='actual-native-writer-with-ephemeral-test-roots')throw Error('SYNTHETIC_DEMO_FIXTURE_POLICY_REQUIRED');
 for(const name of ['note.png','wrong-note-authority.png']){
  const bytes=await readFile('tests/fixtures/connected-note-delivery/'+name+'.gz');if(hash(gunzipSync(bytes))!==metadata.sha256[name])throw Error('SYNTHETIC_DEMO_FIXTURE_CHANGED');files[name+'.gz']=bytes;
 }
 for(const [name,path]of [['LICENSE.txt','LICENSE'],['NOTICE.txt','NOTICE'],['THIRD_PARTY_NOTICES.md','THIRD_PARTY_NOTICES.md'],['snarkjs-GPL-3.0.txt','public/native/licenses/snarkjs-0.7.6-GPL-3.0.txt'],['ffjavascript-GPL-3.0.txt','public/native/licenses/ffjavascript-0.3.1-GPL-3.0.txt'],['wasmcurves-GPL-3.0.txt','public/native/licenses/wasmcurves-0.2.2-GPL-3.0.txt'],['wasmbuilder-GPL-3.0.txt','public/native/licenses/wasmbuilder-0.0.16-GPL-3.0.txt'],['fflate-MIT.txt','public/native/licenses/fflate-0.8.3-MIT.txt'],['noble-hashes-MIT.txt','public/native/licenses/noble-hashes-2.3.0-MIT.txt'],['hash-wasm-MIT.txt','public/native/licenses/hash-wasm-4.12.0-MIT.txt']])files[name]=await readFile(path);
 const inputs=await Promise.all(Object.keys(result.metafile.inputs).sort().map(async path=>({path,sha256:hash(await readFile(path))})));
 files['build.json']=Buffer.from(JSON.stringify({schema:'bankeiz.synthetic-note-demo-build.v1',sdk:'129.0.0',synthetic:true,creditAuthorized:false,rebuild:'npm ci && node scripts/build-build-demo.mjs',entry:'institution/build-demo/verifier.entry.ts',rootPolicy:'fixed-ephemeral-fixture-roots-only',fixtures:['note.png','wrong-note-authority.png'].map(name=>({name,sha256:metadata.sha256[name]})),inputs,outputs:Object.fromEntries(Object.entries(result.metafile.outputs).map(([name,value])=>[relative(out,resolve(name)),{exports:value.exports,imports:value.imports}])),files:Object.fromEntries(Object.entries(files).map(([name,bytes])=>[name,{sha256:hash(bytes),bytes:bytes.length}]))},null,2)+'\n');
 for(const [name,bytes]of Object.entries(files))await writeChanged(resolve(out,name),bytes);
 console.log(`Built isolated synthetic verifier: ${files['verifier.mjs'].length} bytes (${gzipSync(files['verifier.mjs']).length} gzip), complete corresponding source and fixed fixtures. No production authority.`);
 return Object.keys(files);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildBuildDemo(process.argv[2]);
