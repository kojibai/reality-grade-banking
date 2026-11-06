// Verify the actual compiled function from a cold root with only traced proof
// resources. No account creation, private identity or upstream writes occur.
import {transform} from 'esbuild';
import {mkdtemp,mkdir,cp,writeFile,readFile,symlink,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import './build-registry-runtime.mjs';
const root=process.cwd(),stage=await mkdtemp(join(tmpdir(),'bank-registry-node-'));
try{
 await mkdir(join(stage,'api'),{recursive:true});await mkdir(join(stage,'server'),{recursive:true});
 await mkdir(join(stage,'public/conformance/fonts'),{recursive:true});
 await symlink(join(root,'node_modules'),join(stage,'node_modules'),'dir');
 await cp(join(root,'server/registry-runtime'),join(stage,'server/registry-runtime'),{recursive:true});
 for(const path of ['renderer.wasm','fonts/NotoSerif-Regular.ttf','fonts/Inter-Regular.ttf'])await cp(join(root,'public/conformance',path),join(stage,'public/conformance',path));
 const api=await transform(await readFile(join(root,'api/registry.ts'),'utf8'),{loader:'ts',format:'esm',target:'node24'});
 await writeFile(join(stage,'api/registry.mjs'),api.code);await writeFile(join(stage,'package.json'),'{"type":"module"}');
 await cp(join(root,'public/conformance/bankeiz-public-conformance.png'),join(stage,'original.png'));
 const program=`
import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
globalThis.fetch=async()=>{throw Error('REGISTRY_SMOKE_MUST_NOT_CONTACT_UPSTREAM');};
const {default:api}=await import('./api/registry.mjs');
const url='https://bankeiz.com/api/bank/registry',bytes=new Uint8Array(await readFile('original.png'));
const before=await(await api.fetch(new Request(url))).json();assert.equal(before.publishingAvailable,true);assert.equal(before.records.length,0);
const upload=()=>new Request(url+'/bankeiz',{method:'POST',headers:{'content-type':'image/png',origin:'https://bankeiz.com'},body:bytes});
const response=await api.fetch(upload());assert.equal(response.status,200);const result=await response.json();assert.equal(result.ok,true);assert.equal(result.entry.current.cases,33);assert.equal(result.entry.revision,1);
const repeat=await(await api.fetch(upload())).json();assert.deepEqual(repeat.entry,result.entry);
const listed=await(await api.fetch(new Request(url))).json();assert.deepEqual(listed.records,[result.entry]);
const document=await(await api.fetch(new Request('https://bankeiz.com/registry/'))).text();assert.ok(document.includes('data-registry-revision="1"'));assert.ok(document.includes('12 / 12 checks passed'));assert.ok(document.includes('data-registry-public-state'));assert.ok(document.includes('rel="canonical" href="https://bankeiz.com/registry/"'));
const original=await api.fetch(new Request('https://bankeiz.com'+result.entry.current.url));assert.equal(original.status,200);assert.deepEqual(new Uint8Array(await original.arrayBuffer()),bytes);
console.log('PASS compiled Registry API: genuine canonical Original, scope, durable local append, idempotent retry, separate public read and exact Original retrieval.');
console.log('PASS canonical Registry HTML carries the accepted revision and preserves the Original reference evidence without Source reads.');
`;
 const env={...process.env,NODE_ENV:'test'};
 for(const name of ['VERCEL','REGISTRY_REDIS_REST_URL','REGISTRY_REDIS_REST_TOKEN'])delete env[name];
 const result=spawnSync(process.execPath,['--input-type=module','-e',program],{cwd:stage,env,encoding:'utf8',timeout:30000});
 process.stdout.write(result.stdout??'');process.stderr.write(result.stderr??'');if(result.error)throw result.error;if(result.status!==0)throw Error('REGISTRY_RUNTIME_SMOKE_FAILED');
 const production=spawnSync(process.execPath,['--input-type=module','-e',`
import assert from 'node:assert/strict';import {default as api} from './api/registry.mjs';
const url='https://bankeiz.com/api/bank/registry';const response=await(await api.fetch(new Request(url))).json();assert.equal(response.publishingAvailable,false);assert.deepEqual(response.records,[]);
const refused=await api.fetch(new Request(url+'/bankeiz',{method:'POST',headers:{'content-type':'image/png'},body:new Uint8Array([1])}));assert.equal(refused.status,503);
console.log('PASS compiled production API refuses ephemeral publication without a configured durable store.');
`],{cwd:stage,env:{...env,NODE_ENV:'production'},encoding:'utf8',timeout:30000});
 process.stdout.write(production.stdout??'');process.stderr.write(production.stderr??'');if(production.error)throw production.error;if(production.status!==0)throw Error('REGISTRY_PRODUCTION_SMOKE_FAILED');
}finally{await rm(stage,{recursive:true,force:true});}
