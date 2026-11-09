import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';

// Post-admission public display inputs exercise the actual compiled entrance
// and production browser module. Identity admission is qualified separately
// by check-fresh-owner-profile; no proof or custody guard is replaced here.
const output=resolve('test-results/profile-first-response');await mkdir(output,{recursive:true});
await build({stdin:{contents:"export{handleProfilePreview,renderProfileDocument}from'./server/profile-preview';export{parsePublicProfile}from'./src/receiz/public-profile';export{profileFixture}from'./tests/fixtures/public-profile';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',outfile:resolve(output,'entrance.mjs'),logLevel:'warning'});
const {handleProfilePreview,renderProfileDocument,parsePublicProfile,profileFixture}=await import(pathToFileURL(resolve(output,'entrance.mjs')).href);
const input=profileFixture();input.profile.profile.avatarUrl=null;input.profile.profile.bannerUrl=null;
const profile=parsePublicProfile(input,'alexmorgan'),fullName='pbahqdfouqyxgsifcy',template=await readFile('dist/explore/index.html','utf8'),directory=resolve('dist'),reads=[];
const remote=globalThis.fetch;globalThis.fetch=async()=>{throw Error('PROFILE_FIRST_RESPONSE_REMOTE_READ_FORBIDDEN');};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  // Stall API responses even when the browser sends the request to this server.
  if(url.pathname.startsWith('/api/'))return;
  const name=url.pathname.replaceAll('/','');
  if(['alexmorgan',fullName,'bjklock'].includes(name)){
   const response=await handleProfilePreview(new Request(url,{headers:{accept:'text/html','user-agent':'Browser qualification'}}),{
    page:async()=>template,
    profile:async requested=>{assert.notEqual(requested,'bjklock','A complete held profile must never open the Source reader');reads.push(requested);return requested===fullName?{...profile,resolvedReceivingUsername:fullName}:profile;},
    profileContent:async requested=>{try{return await readFile('server/profile-runtime/profile-pages/'+requested+'.html','utf8');}catch{return null;}},
    missingDocument:async()=>new Response(null,{status:503}),render:renderProfileDocument,
   });
   const bytes=Buffer.from(await response.arrayBuffer());
   res.writeHead(response.status,Object.fromEntries(response.headers)).end(bytes);return;
  }
  const file=resolve(directory,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));if(!file.startsWith(directory+'/'))throw Error('path');
  const bytes=await readFile(file);
  res.writeHead(200,{'content-type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.wasm':'application/wasm'}[extname(file)]??'application/octet-stream'}).end(bytes);
 }catch(error){
  if(error.code==='ENOENT'){res.writeHead(404).end();return;}
  console.error(error);
  res.writeHead(500).end();
 }
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin='http://127.0.0.1:'+server.address().port,results=[];let browser,passed=false;
try{
 browser=await chromium.launch({headless:true,...(process.env.BANK_BROWSER_EXECUTABLE?{executablePath:process.env.BANK_BROWSER_EXECUTABLE}:{})});
 for(const name of ['alexmorgan',fullName,'bjklock']){
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[],pending=[];let entryReady;const entryRequested=new Promise(done=>{entryReady=done;});
  try{
   page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/hydrat|didn't match|server rendered|react.dev\/errors\/(?:418|423|425)/i.test(message.text()))errors.push(message.text());});
   await page.route('**/api/**',route=>{
    if(new URL(route.request().url()).origin===origin)return route.continue();
    return new Promise(()=>{});
   });
   await page.route(/\/assets\/explore-[^/]+\.js(?:\?|$)/,route=>new Promise(done=>{pending.push({route,done});entryReady();}));
   const response=await page.goto(origin+'/'+name+'/',{waitUntil:'commit'});assert.equal(response.status(),200);await page.locator('.profile-hero h1').waitFor();
   assert.equal(await page.locator('.profile-unavailable,[data-profile-opening],.public-entry-placeholder').count(),0);
   assert.equal(await page.locator('#public-market-seed').count(),1,'Retain the exact complete held family');
   if(name!=='bjklock')assert.equal(await page.locator('.profile-hero h1').textContent(),'Alex Morgan');
   await page.evaluate(()=>{window.firstProfileNode=document.querySelector('.profile-hero');});
   let timer;try{await Promise.race([entryRequested,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Profile browser entry not requested')),15000);})]);}finally{clearTimeout(timer);}
   await page.screenshot({path:resolve(output,name+'-first-response.png')});
   await page.unroute(/\/assets\/explore-[^/]+\.js(?:\?|$)/);for(const held of pending){await held.route.continue();held.done();}
   await page.waitForFunction(()=>{const node=document.querySelector('.profile-hero');return !!node&&Object.keys(node).some(key=>key.startsWith('__reactFiber$'));},{timeout:20000});
   assert.equal(await page.evaluate(()=>window.firstProfileNode===document.querySelector('.profile-hero')),true,'Hydrate the existing real profile DOM');
   assert.equal(await page.locator('.profile-unavailable,[data-profile-opening],.public-entry-placeholder').count(),0);assert.deepEqual(errors,[],name+' hydration');
   results.push({name,realFirstHTML:true,APIResponsesStalled:true,sameDOM:true,sourceReads:reads.filter(value=>value===name).length});
  }catch(error){await writeFile(resolve(output,name+'-failed.html'),await page.content());console.error(JSON.stringify({name,heroes:await page.locator('.profile-hero').count(),url:page.url(),body:(await page.locator('body').innerText()).slice(0,1000)}));throw error;}finally{await context.close();}
 }
 assert.deepEqual(reads,['alexmorgan',fullName]);passed=true;console.log('PASS real first profile HTML and same-DOM hydration for held, missing and renamed-default entrances; one exact missing-profile read, zero held-profile reads, APIs stalled.');
}finally{await writeFile(resolve(output,'results.json'),JSON.stringify({passed,results},null,2));await browser?.close();server.closeAllConnections();await new Promise(done=>server.close(done));globalThis.fetch=remote;}
