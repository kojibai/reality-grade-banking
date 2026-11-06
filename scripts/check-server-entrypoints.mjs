// Exercise emitted, unbundled ESM in plain Node. Vite must not mask import
// resolution errors in production function graphs. No upstream requests run.
import ts from 'typescript';
import {mkdtemp,readFile,writeFile,mkdir,symlink,rm,stat,cp,copyFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {resolve,dirname,relative,join,extname} from 'node:path';import {pathToFileURL} from 'node:url';import {spawnSync} from 'node:child_process';
const config=JSON.parse(await readFile('vercel.json','utf8'));
// Vercel validates these deployment-only glob strings before starting a build.
for(const [name,entry]of Object.entries(config.functions??{}))for(const key of ['includeFiles','excludeFiles'])if(entry[key]!==undefined&&(typeof entry[key]!=='string'||entry[key].length>256))throw Error('VERCEL_FUNCTION_GLOB_INVALID:'+name+':'+key);
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
 for(const name of ['index','profile','asset','receipt','book','cooperatives','read','explore'])await emit(resolve(root,'api/'+name+'.ts'));
 await emit(resolve(root,'tests/fixtures/public-profile.ts'));
 await cp(resolve(root,'server/profile-runtime'),resolve(stage,'server/profile-runtime'),{recursive:true});
 await mkdir(resolve(stage,'dist/explore'),{recursive:true});await copyFile(resolve(root,'dist/explore/index.html'),resolve(stage,'dist/explore/index.html'));
 const included=config.functions?.['api/index.ts']?.includeFiles??'';
 for(const name of ['market','sports'])if(!included.includes(`public/receiz-public-${name}.json`))throw Error('CERTIFICATE_DEPLOYED_PUBLIC_SOURCE_MISSING:'+name);
 await mkdir(resolve(stage,'public'),{recursive:true});for(const name of ['market','sports','share-chart-history'])await copyFile(resolve(root,`public/receiz-public-${name}.json`),resolve(stage,`public/receiz-public-${name}.json`));
 const program=`
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {gzipSync} from 'node:zlib';import {readFile} from 'node:fs/promises';
const {profileFixture}=await import('./tests/fixtures/public-profile.js');
const hasExploreRows=html=>/<[a-z][^>]*\\bclass="[^"]*\\basset-row\\b/i.test(html);
const noExploreCatalog=(html,label)=>{assert.ok(!hasExploreRows(html),label+' must replace Explore rows.');assert.ok(!html.includes('id="public-market-seed"'),label+' must not carry the Explore seed.');assert.ok(!html.includes('bank.public-market.document.v1'),label+' must not carry the Explore catalog packet.');};
const exploreTemplate=await readFile('dist/explore/index.html','utf8');
assert.ok(hasExploreRows(exploreTemplate),'Preview smoke must use actual compiled Explore rows.');
assert.ok(exploreTemplate.includes('id="public-market-seed"'),'Preview smoke must use the actual seeded Explore template.');
let calls=0,certificateCalls=0,materialCalls=0,profileStatus=200;
const membership={ok:true,transport:{publicMembership:{version:1,source:'canonical-complete',scope:'whole-market-visible-showcase',isComplete:true,itemCount:0,revision:'plain-node-display'},publicOriginals:[]}};
const ledgerHeads={actions:{count:'0',lastSeq:'0'},wallet:{count:'0',lastKaiUpulse:null}},heldMaterial=JSON.stringify({publicDisplayPolicy:'bank.public-market.curated-display.v3',membership,preparedLedger:{schema:'bank.public-ledger.preparation.v1',financialOnly:true,ledgerCacheGzipB64u:'unchanged-display-packet-not-decoded',heads:ledgerHeads}}),materialGeneration=createHash('sha256').update(heldMaterial).digest('hex');
globalThis.fetch=async(url,init)=>{
 if(String(url)==='https://receiz.com/api/market/prepared-material?generation='+materialGeneration){materialCalls++;return new Response(gzipSync(Buffer.from(heldMaterial)),{headers:{'content-type':'application/gzip'}});}
 if(String(url)==='https://receiz.com/api/market/share-certificates/share_deployed_certificate_test'){certificateCalls++;return Response.json({ok:true,state:{note:{noteToken:'share_deployed_certificate_test',remainingShareQuantityMicro:'2500000'},item:{id:'profile:bjklock:d1d5a3f4-5db9-444e-88f5-95443fb70598',assetId:'d1d5a3f4-5db9-444e-88f5-95443fb70598',livePulseSeed:null}}});}
 assert.equal(String(url),'https://receiz.com/api/profile/alexmorgan?surface=public-route&representation=collection-v2');
 assert.equal(init.credentials,'omit');calls++;return profileStatus===200?Response.json(profileFixture()):Response.json({error:'upstream private diagnostic'},{status:profileStatus});
};
for(const name of ['index','profile','asset','receipt','book','cooperatives','read','explore']){
 const {default:api}=await import('./api/'+name+'.js');
 assert.equal(typeof api.fetch,'function',name+' must boot in plain Node');console.log('BOOT',name);
}
assert.equal(calls,0,'Function imports must not request upstream data.');
const {default:explore}=await import('./api/explore.js');
assert.equal((await explore.fetch(new Request('https://bankeiz.com/api/explore?prepare=1',{method:'HEAD'}))).status,204);
const preparedResponse=await explore.fetch(new Request('https://bankeiz.com/api/explore?prepare=input',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({selectionKey:'a'.repeat(64),previousGeneration:materialGeneration,currentLedgerHeads:ledgerHeads})}));
assert.equal(preparedResponse.status,200,'Default dynamic preparation graph must run in plain Node.');const prepared=await preparedResponse.json();assert.equal(prepared.schema,'bank.public-market.render-material.v1');assert.equal(JSON.parse(prepared.material).preparedLedger.ledgerCacheGzipB64u,'unchanged-display-packet-not-decoded');assert.equal(materialCalls,1);assert.equal(calls,0);
const {preparePublicMarketState}=await import('./server/profile-runtime/public-page-preparation.mjs');const marketState=await preparePublicMarketState({membership,snapshot:{ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[]}}});assert.ok(Number.isSafeInteger(marketState.asOfPulse));assert.equal(calls,0);
const {default:profile}=await import('./api/profile.js');
assert.equal((await profile.fetch(new Request('https://bankeiz.com/api/profile?username=alexmorgan',{method:'HEAD'}))).status,200);
assert.equal(calls,0,'HEAD must not request a profile.');
const {default:reading}=await import('./api/read.js');
assert.equal((await reading.fetch(new Request('https://bankeiz.com/read/profiles/alexmorgan/',{method:'HEAD'}))).status,200);
assert.equal(calls,0,'Reading HEAD must not request any source.');
const readable=await reading.fetch(new Request('https://bankeiz.com/read/profiles/alexmorgan/',{headers:{accept:'text/plain',authorization:'Bearer unused',cookie:'unused'}}));
assert.equal(readable.status,200);assert.equal(readable.headers.get('content-type'),'text/plain; charset=utf-8');
const readableText=await readable.text();assert.ok(readableText.includes('Alex Morgan'));assert.ok(!readableText.includes('private@example.com'));assert.equal(calls,1);
calls=0;
const response=await profile.fetch(new Request('https://bankeiz.com/api/profile?username=alexmorgan',{headers:{accept:'text/html','user-agent':'Browser smoke check'}}));
assert.equal(response.status,200);const html=await response.text();
assert.ok(html.trimEnd().endsWith('</html>'),'Browser receives a complete static document without Source settlement.');
assert.ok(html.includes('id="public-explore-root"'));assert.ok(html.includes('id="receiz-navigation"'));
assert.ok(html.includes('<main class="public-entry-placeholder">'),'Browser profile entry must show its own placeholder.');assert.ok(html.includes('<h1>Profile</h1>'));assert.ok(html.includes('@alexmorgan'));noExploreCatalog(html,'Browser profile entry');
assert.ok(html.includes('href="https://bankeiz.com/alexmorgan/"'));
assert.ok(!html.includes('id="public-profile-seed"'));assert.ok(!html.includes('id="public-profile-error"'));
assert.ok(!html.includes('private@example.com'));assert.equal(calls,0,'Browser entry must not request a profile or start server rendering.');
const crawler=await profile.fetch(new Request('https://bankeiz.com/api/profile?username=alexmorgan',{headers:{accept:'text/html','user-agent':'Twitterbot'}}));
assert.equal(crawler.status,200);const crawlerHtml=await crawler.text();
assert.ok(crawlerHtml.includes('Alex Morgan | Bankeiz'));assert.ok(crawlerHtml.includes('id="public-profile-seed"'));assert.ok(crawlerHtml.includes('class="profile-hero"'));noExploreCatalog(crawlerHtml,'Crawler profile entry');
assert.ok(!crawlerHtml.includes('id="public-profile-error"'));assert.ok(!crawlerHtml.includes('private@example.com'));assert.equal(calls,1);
for(const status of [403,404]){profileStatus=status;const refusal=await profile.fetch(new Request('https://bankeiz.com/api/profile?username=alexmorgan',{headers:{accept:'text/html','user-agent':'Twitterbot'}}));assert.equal(refusal.status,status);const refusalHtml=await refusal.text();assert.ok(refusalHtml.includes(status===403?'PROFILE_PRIVATE':'PROFILE_NOT_FOUND'));assert.ok(!refusalHtml.includes('id="public-profile-seed"'));assert.ok(!refusalHtml.includes('upstream private diagnostic'));}
profileStatus=200;assert.equal(calls,3);
const {default:asset}=await import('./api/asset.js'),market=JSON.parse(await readFile('public/receiz-public-market.json','utf8')),assetId=market.transport.publicOriginals[0].id;
assert.equal(typeof assetId,'string');
const assetResponse=await asset.fetch(new Request('https://bankeiz.com/api/asset?asset='+encodeURIComponent(assetId),{headers:{accept:'text/html','user-agent':'Browser smoke check'}}));
assert.equal(assetResponse.status,200);const assetHtml=await assetResponse.text(),assetSeeds=[...assetHtml.matchAll(/<script id="public-asset-seed" type="application\\/json">([\\s\\S]*?)<\\/script>/g)];
assert.equal(assetSeeds.length,1,'Asset preview carries exactly its own selected asset seed.');const selectedAsset=JSON.parse(assetSeeds[0][1]);assert.equal(selectedAsset.id,assetId);
const escape=value=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
assert.ok(assetHtml.includes('<h1>'+escape(selectedAsset.title)+'</h1>'),'Asset preview renders its selected title.');assert.ok(assetHtml.includes('aria-label="Asset navigation"'));assert.ok(!assetHtml.includes('id="public-profile-seed"'));noExploreCatalog(assetHtml,'Asset preview');assert.equal(calls,3,'A shipped asset preview must not request a profile or catalog.');
const {default:bank}=await import('./api/index.js');
const certificateResponse=await bank.fetch(new Request('https://bankeiz.com/api/bank/native/api/market/share-certificates/share_deployed_certificate_test'));
assert.equal(certificateResponse.status,200);const certificate=await certificateResponse.json();
assert.equal(certificate.state.item.livePulseSeed?.kind,'sigil','The deployed public certificate reader reuses its shipped Original pricing source.');
assert.equal(certificate.state.note.remainingShareQuantityMicro,'2500000');assert.equal(certificateCalls,1);assert.equal(calls,3);
console.log('PASS deployed certificate source with one public read and no quote/session work.');
console.log('PASS plain Node API imports, actual compiled seeded-template profile/asset previews, profile HEAD, zero-read browser entry and exact crawler SSR/status refusals; no identity or financial operations.');`;

 const result=spawnSync(process.execPath,['--input-type=module','-e',program],{cwd:stage,encoding:'utf8',timeout:30000});process.stdout.write(result.stdout??'');process.stderr.write(result.stderr??'');if(result.error)throw result.error;process.exitCode=result.status??1;
}finally{await rm(stage,{recursive:true,force:true});}
