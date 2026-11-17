import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
import {chromium} from 'playwright';

// The SDK fixture retains the complete sealed 615-member Source. This consumer
// receives its existing bounded public window; HTTP delivery of the next window
// cannot revoke the already-carried same-owner display. No verifier is replaced.
const fixture=process.env.BANK_PROFILE_HELD_SOURCE_FIXTURE;
assert.ok(fixture,'Set BANK_PROFILE_HELD_SOURCE_FIXTURE to the genuine SDK phase-615-view.json.');
const out=resolve(process.env.BANK_PROFILE_HTTP_EVIDENCE??'test-results/profile-held-http-errors');await mkdir(out,{recursive:true});
const {handleProfilePreview,renderProfileDocument,parsePublicProfile}=await import(pathToFileURL(resolve('test-results/profile-first-response/entrance.mjs')).href);
const carried=JSON.parse(await readFile(fixture,'utf8')),view=carried.profile;assert.equal(view.originals.length,615);
const input={ok:true,profile:{...view,originals:view.originals.slice(0,24),originalsPage:{hasMore:true,nextCursor:'next-viewport-window'}}};
const profile=parsePublicProfile(input,view.profile.username),username=profile.username,template=await readFile('dist/explore/index.html','utf8'),directory=resolve('dist'),results=[];
let selectedStatus=403,releaseNextRequest,requestedNext,pending=[];
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/bank/public-profile/')){pending.push(res);releaseNextRequest();return;}
 if(url.pathname.startsWith('/api/'))return;
 if(url.pathname==='/'+username+'/'){
  const response=await handleProfilePreview(new Request(url,{headers:{accept:'text/html'}}),{page:async()=>template,profile:async()=>profile,profileContent:async()=>null,missingDocument:async()=>new Response(null,{status:503}),render:renderProfileDocument});
  res.writeHead(response.status,Object.fromEntries(response.headers)).end(Buffer.from(await response.arrayBuffer()));return;
 }
 const file=resolve(directory,'.'+url.pathname);if(!file.startsWith(directory+'/'))throw Error('path');
 res.writeHead(200,{'content-type':{'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.wasm':'application/wasm'}[extname(file)]??'application/octet-stream'}).end(await readFile(file));
}catch(error){res.writeHead(error.code==='ENOENT'?404:500).end();}});
let browser;
try{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,...(process.env.BANK_BROWSER_EXECUTABLE?{executablePath:process.env.BANK_BROWSER_EXECUTABLE}:{})});
 for(selectedStatus of [403,404,409]){
  pending=[];requestedNext=new Promise(done=>{releaseNextRequest=done;});const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():new Promise(()=>{}));
  try{
   assert.equal((await page.goto(origin+'/'+username+'/',{waitUntil:'commit'})).status(),200);await page.locator('.profile-hero').waitFor();
   await page.waitForFunction(()=>{const node=document.querySelector('.profile-hero');return node&&Object.keys(node).some(key=>key.startsWith('__reactFiber$'));});
   await page.evaluate(()=>{window.heldHero=document.querySelector('.profile-hero');window.heldOriginal=document.querySelector('.profile-asset');});const before=await page.locator('.profile-asset').count();assert.equal(before,24);
   await page.evaluate(()=>document.querySelector('button.profile-load-more')?.click());
   let timer;try{await Promise.race([requestedNext,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Existing next-window reader was not invoked')),30000);})]);}finally{clearTimeout(timer);}
   const responses=[...pending];for(const response of responses)response.writeHead(selectedStatus,{'content-type':'application/json'}).end('{}');
   await page.waitForFunction(()=>document.querySelector('.profile-unavailable')||document.querySelector('.public-profile-page>.profile-empty[role=status]'));
   const sameHero=await page.evaluate(()=>window.heldHero===document.querySelector('.profile-hero')),sameOriginal=await page.evaluate(()=>window.heldOriginal===document.querySelector('.profile-asset')),after=await page.locator('.profile-asset').count();
   const statusCopy=await page.locator('.profile-empty[role=status]').allTextContents();
   await page.screenshot({path:resolve(out,selectedStatus+'.png'),fullPage:true});
   const unprovenChangeClaim=statusCopy.some(text=>/profile has changed|reopen it to view its current collection/i.test(text));
   results.push({httpStatus:selectedStatus,sameHero,sameOriginal,before,after,sourceHead:carried.head,nextWindowRequests:responses.length,statusCopy,unprovenChangeClaim,errors});
  }finally{await context.close();}
 }
 const passed=results.every(row=>row.sameHero&&row.sameOriginal&&row.after===row.before&&!row.unprovenChangeClaim&&row.errors.length===0);
 await writeFile(resolve(out,'results.json'),JSON.stringify({passed,realCompiledDistribution:directory,genuineSdkSourceFixture:fixture,boundedWindowOnly:true,results},null,2));console.log(JSON.stringify({passed,results},null,2));assert.equal(passed,true,'A bare HTTP status cannot erase the carried same-owner Source frame.');
}finally{await browser?.close();await new Promise(done=>server.close(done));}
