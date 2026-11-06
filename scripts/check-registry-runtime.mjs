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
 const types=await transform(await readFile(join(root,'src/registry/types.ts'),'utf8'),{loader:'ts',format:'esm',target:'node24'});
 await writeFile(join(stage,'registry-types.mjs'),types.code);
 const program=`
import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {REGISTRY_NATIVE_PART_BYTES,REGISTRY_NATIVE_PART_NAMESPACE,REGISTRY_NATIVE_INDEX_NAMESPACE,registryNativePartId,registryNativeIndexId,registryNativeSourceUrl} from './registry-types.mjs';
// This transport fixture exercises emitted native reads, not a production write.
const rows=new Map();let published=false,writes=0;
globalThis.fetch=async(input,init)=>{
 const target=new URL(String(input));assert.equal(target.origin,'https://receiz.com');
 if(init?.method==='POST'){writes++;throw Error('REGISTRY_SMOKE_MUST_NOT_PUBLISH');}
 if(target.pathname.startsWith('/api/public-proof/namespace/'))return Response.json({ok:true,records:published?[...rows.values()].filter(row=>row.namespace===REGISTRY_NATIVE_INDEX_NAMESPACE):[]});
 const id=decodeURIComponent(target.pathname.slice('/api/public-proof/'.length));return Response.json({ok:true,record:rows.get(id)??null});
};
const {default:api}=await import('./api/registry.mjs');
const url='https://bankeiz.com/api/bank/registry',bytes=new Uint8Array(await readFile('original.png'));
const before=await(await api.fetch(new Request(url))).json();assert.equal(before.publishingAvailable,true);assert.equal(before.records.length,0);
const upload=path=>new Request(url+'/bankeiz'+path,{method:'POST',headers:{'content-type':'image/png',origin:'https://bankeiz.com'},body:bytes});
const response=await api.fetch(upload('?prepare=1'));assert.equal(response.status,200);const prepared=await response.json();assert.equal(prepared.ok,true);assert.equal(prepared.plan.publication.cases,33);assert.equal(prepared.entry,undefined);
assert.equal((await api.fetch(upload(''))).status,428);
const publication=prepared.plan.publication;
const publisherReceizId='runtime-publication-fixture',publisherKeyId='runtime-key-fixture',partIds=[];
const nativeRow=(id,namespace,state)=>({id,namespace,sourceUrl:registryNativeSourceUrl(id),schema:state.schema,state:'published',externalCreatorId:publisherReceizId,data:{tenantHost:'bankeiz.com',merchantReceizId:publisherReceizId,storeStateRecord:state}});
for(let index=0;index<prepared.plan.partCount;index++){
 const transportNonce=crypto.randomUUID(),id=registryNativePartId('bankeiz',publication.artifactSha256,index,publisherKeyId,transportNonce),state={schema:'receiz.app.bank.registry.original-part.v1',institutionId:'bankeiz',artifactSha256:publication.artifactSha256,index,count:prepared.plan.partCount,originalBytes:bytes.length,publisherReceizId,publisherKeyId,transportNonce,bytesB64u:Buffer.from(bytes.subarray(index*REGISTRY_NATIVE_PART_BYTES,(index+1)*REGISTRY_NATIVE_PART_BYTES)).toString('base64url')};rows.set(id,nativeRow(id,REGISTRY_NATIVE_PART_NAMESPACE,state));partIds.push(id);
}
const transportNonce=crypto.randomUUID(),id=registryNativeIndexId('bankeiz',publication.artifactSha256,publisherKeyId,transportNonce),state={schema:'receiz.app.bank.registry.original-index.v1',publication,originalBytes:bytes.length,partCount:prepared.plan.partCount,publisherReceizId,publisherKeyId,transportNonce,partIds};rows.set(id,nativeRow(id,REGISTRY_NATIVE_INDEX_NAMESPACE,state));published=true;
const listed=await(await api.fetch(new Request(url))).json();assert.equal(listed.records.length,1);assert.equal(listed.records[0].revision,1);assert.deepEqual(listed.records[0].current,publication);
const document=await(await api.fetch(new Request('https://bankeiz.com/registry/'))).text();assert.ok(document.includes('data-registry-revision="1"'));assert.ok(document.includes('12 / 12 checks passed'));assert.ok(document.includes('data-registry-public-state'));assert.ok(document.includes('rel="canonical" href="https://bankeiz.com/registry/"'));
const original=await api.fetch(new Request('https://bankeiz.com'+publication.url));assert.equal(original.status,200);assert.deepEqual(new Uint8Array(await original.arrayBuffer()),bytes);assert.equal(writes,0);
console.log('PASS compiled Registry API: genuine Original preparation, required publish signature, native public lookup and exact Original recovery without a separate database.');
console.log('PASS canonical HTML carries the independently verified native publication and preserves the Original reference evidence.');
`;
 const env={...process.env,NODE_ENV:'test'};
delete env.VERCEL;
 const result=spawnSync(process.execPath,['--input-type=module','-e',program],{cwd:stage,env,encoding:'utf8',timeout:30000});
 process.stdout.write(result.stdout??'');process.stderr.write(result.stderr??'');if(result.error)throw result.error;if(result.status!==0)throw Error('REGISTRY_RUNTIME_SMOKE_FAILED');
 const production=spawnSync(process.execPath,['--input-type=module','-e',`
import assert from 'node:assert/strict';import {default as api} from './api/registry.mjs';
globalThis.fetch=async()=>Response.json({ok:true,records:[]});
const url='https://bankeiz.com/api/bank/registry';const response=await(await api.fetch(new Request(url))).json();assert.equal(response.publishingAvailable,true);assert.deepEqual(response.records,[]);
const refused=await api.fetch(new Request(url+'/bankeiz',{method:'POST',headers:{'content-type':'image/png'},body:new Uint8Array([1])}));assert.equal(refused.status,428);
console.log('PASS compiled production API uses the native Receiz publisher and requires an authorized signed request; no Redis or ephemeral production fallback.');
`],{cwd:stage,env:{...env,NODE_ENV:'production'},encoding:'utf8',timeout:30000});
 process.stdout.write(production.stdout??'');process.stderr.write(production.stderr??'');if(production.error)throw production.error;if(production.status!==0)throw Error('REGISTRY_PRODUCTION_SMOKE_FAILED');
}finally{await rm(stage,{recursive:true,force:true});}
