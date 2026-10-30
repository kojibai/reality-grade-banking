// Exercise emitted, unbundled ESM in plain Node. Vite must not mask import
// resolution errors in production function graphs. No upstream requests run.
import ts from 'typescript';
import {mkdtemp,readFile,writeFile,mkdir,symlink,rm,stat,cp,copyFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {resolve,dirname,relative,join,extname} from 'node:path';import {pathToFileURL} from 'node:url';import {spawnSync} from 'node:child_process';
const root=process.cwd(),stage=await mkdtemp(join(tmpdir(),'bank-node-entry-')),seen=new Set();
async function exists(p){try{return(await stat(p)).isFile()}catch{return false}}
async function emit(source){
 if(seen.has(source))return;seen.add(source);const rel=relative(root,source);if(rel.startsWith('..'))throw Error('SOURCE_OUTSIDE_REPO');
 const ext=extname(source),output=resolve(stage,rel.replace(/\.tsx?$/,'.js'));await mkdir(dirname(output),{recursive:true});
 const bytes=await readFile(source);if(!['.ts','.tsx','.js','.mjs'].includes(ext)){await writeFile(output,bytes);return;}
 const text=/\.tsx?$/.test(ext)?ts.transpileModule(bytes.toString(),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,verbatimModuleSyntax:true},fileName:source}).outputText:bytes.toString();await writeFile(output,text);
 const parsed=ts.createSourceFile(output,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),imports=[];
 for(const node of parsed.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier))imports.push(node.moduleSpecifier.text);
 for(const specifier of imports){if(!specifier.startsWith('.'))continue;const target=resolve(dirname(source),specifier),candidates=[target,...(target.endsWith('.js')?[target.slice(0,-3)+'.ts',target.slice(0,-3)+'.tsx']:[]),target+'.ts',target+'.tsx',target+'.js'];let found;for(const p of candidates)if(await exists(p)){found=p;break;}if(!found)throw Error('DEPENDENCY_MISSING:'+specifier+' from '+rel);await emit(found);}
}
try{
 await writeFile(join(stage,'package.json'),'{"type":"module"}');await symlink(resolve(root,'node_modules'),join(stage,'node_modules'),'dir');
 for(const name of ['index','profile','asset','receipt','book','cooperatives'])await emit(resolve(root,'api/'+name+'.ts'));
 await emit(resolve(root,'tests/fixtures/public-profile.ts'));
 await cp(resolve(root,'server/profile-runtime'),resolve(stage,'server/profile-runtime'),{recursive:true});
 await mkdir(resolve(stage,'dist/explore'),{recursive:true});await copyFile(resolve(root,'dist/explore/index.html'),resolve(stage,'dist/explore/index.html'));
 const included=JSON.parse(await readFile(resolve(root,'vercel.json'),'utf8')).functions?.['api/index.ts']?.includeFiles??'';
 for(const name of ['market','sports'])if(!included.includes(`public/receiz-public-${name}.json`))throw Error('CERTIFICATE_DEPLOYED_PUBLIC_SOURCE_MISSING:'+name);
 await mkdir(resolve(stage,'public'),{recursive:true});for(const name of ['market','sports'])await copyFile(resolve(root,`public/receiz-public-${name}.json`),resolve(stage,`public/receiz-public-${name}.json`));
 const program=`
import assert from 'node:assert/strict';
const {profileFixture}=await import('./tests/fixtures/public-profile.js');
let calls=0,certificateCalls=0;
globalThis.fetch=async(url,init)=>{
 if(String(url)==='https://receiz.com/api/market/share-certificates/share_deployed_certificate_test'){certificateCalls++;return Response.json({ok:true,state:{note:{noteToken:'share_deployed_certificate_test',remainingShareQuantityMicro:'2500000'},item:{id:'profile:bjklock:d1d5a3f4-5db9-444e-88f5-95443fb70598',assetId:'d1d5a3f4-5db9-444e-88f5-95443fb70598',livePulseSeed:null}}});}
 assert.equal(String(url),'https://receiz.com/api/profile/alexmorgan?surface=public-route&representation=collection-v2');
 assert.equal(init.credentials,'omit');calls++;return Response.json(profileFixture());
};
for(const name of ['index','profile','asset','receipt','book','cooperatives']){
 const {default:api}=await import('./api/'+name+'.js');
 assert.equal(typeof api.fetch,'function',name+' must boot in plain Node');console.log('BOOT',name);
}
assert.equal(calls,0,'Function imports must not request upstream data.');
const {default:profile}=await import('./api/profile.js');
assert.equal((await profile.fetch(new Request('https://bankeiz.com/api/profile?username=alexmorgan',{method:'HEAD'}))).status,200);
assert.equal(calls,0,'HEAD must not request a profile.');
const response=await profile.fetch(new Request('https://bankeiz.com/api/profile?username=alexmorgan',{headers:{accept:'text/html','user-agent':'Browser smoke check'}}));
assert.equal(response.status,200);const html=await response.text();
assert.ok(html.includes('Alex Morgan | Bankeiz'));
assert.ok(html.includes('id="public-profile-seed"'));
assert.ok(html.includes('class="profile-hero"'));
assert.ok(!html.includes('id="public-profile-error"'));
assert.ok(!html.includes('private@example.com'));assert.equal(calls,1);
const {default:bank}=await import('./api/index.js');
const certificateResponse=await bank.fetch(new Request('https://bankeiz.com/api/bank/native/api/market/share-certificates/share_deployed_certificate_test'));
assert.equal(certificateResponse.status,200);const certificate=await certificateResponse.json();
assert.equal(certificate.state.item.livePulseSeed?.kind,'sigil','The deployed public certificate reader reuses its shipped Original pricing source.');
assert.equal(certificate.state.note.remainingShareQuantityMicro,'2500000');assert.equal(certificateCalls,1);assert.equal(calls,1);
console.log('PASS deployed certificate source with one public read and no quote/session work.');
console.log('PASS plain Node API imports, profile HEAD and full source-bound streamed GET with production renderer; one fixture public read, no identity or financial operations.');`;

 const result=spawnSync(process.execPath,['--input-type=module','-e',program],{cwd:stage,encoding:'utf8',timeout:30000});process.stdout.write(result.stdout??'');process.stderr.write(result.stderr??'');if(result.error)throw result.error;process.exitCode=result.status??1;
}finally{await rm(stage,{recursive:true,force:true});}
