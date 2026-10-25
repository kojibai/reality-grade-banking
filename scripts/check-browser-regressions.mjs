import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile,rm} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {Resvg} from '@resvg/resvg-js';
import {togetherPages} from '../src/content/together.mjs';
import {selected,market,profile} from '../tests/browser/regression-fixtures.mjs';

// Exercise delivered production files with synthetic public responses only.
// This gate adds no code, requests, timers or instrumentation to the app.
const directory=resolve(process.env.BANK_REGRESSION_DIST??'dist'),output=resolve('test-results/browser-regressions');
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
const {assetPreviewHtml}=await import(pathToFileURL(resolve('server/asset-runtime/asset-preview.mjs')).href);
const mime={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.wasm':'application/wasm','.ttf':'font/ttf'};
const pixels=Buffer.from(new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="#244DCB"/><path d="m32 80 32 32 64-64" fill="none" stroke="white" stroke-width="8"/></svg>').render().asPng());
let servingOfflineBuild=false;
const server=createServer(async(request,response)=>{
 try{
  if(request.method!=='GET'){response.writeHead(405).end();return;}
  const url=new URL(request.url,'http://127.0.0.1');
  const json=value=>{response.setHeader('Content-Type','application/json');response.end(JSON.stringify(value));};
  if((!servingOfflineBuild&&url.pathname==='/receiz-public-market.json')||url.pathname==='/api/bank/public-market/membership'){json(market);return;}
  if(url.pathname==='/api/bank/public-market/quotes'){json({ok:true,data:{schema:'receiz.market.public-snapshot.v1',generatedAt:new Date().toISOString(),liveMarkets:[]}});return;}
  if(url.pathname==='/api/bank/public-profile/fixtureowner'){json(profile);return;}
  if(url.pathname.startsWith('/api/')||!servingOfflineBuild&&['/receiz-public-sports.json','/receiz-public-capitalization.json'].includes(url.pathname)){response.writeHead(503).end();return;}
  const asset=url.pathname.startsWith('/asset/'),file=resolve(directory,asset?'explore/index.html':'.'+decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(directory+'/')){response.writeHead(403).end();return;}
  let bytes=await readFile(file);if(asset)bytes=Buffer.from(assetPreviewHtml(bytes.toString(),selected.id,selected));
  response.setHeader('Content-Type',mime[extname(file)]??'application/octet-stream');response.end(bytes);
 }catch{response.writeHead(404).end();}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>{server.off('error',reject);resolve();});});
const origin=`http://127.0.0.1:${server.address().port}`,results=[];
let browser,passed=false;
try{
 browser=await chromium.launch({headless:true,...(process.env.BANK_BROWSER_EXECUTABLE?{executablePath:process.env.BANK_BROWSER_EXECUTABLE}:{})});
 // A complete Together story and its Twin must fit without lateral scroll.
 for(const width of [320,390,768,900,1200]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage();
  try{for(const entry of togetherPages){
   await page.goto(origin+entry.path);
   assert.equal(await page.locator('[data-coop-twin]').count(),1,entry.path+' retains its inline Twin');
   assert.equal(await page.locator('[data-process-step]').count(),4,entry.path+' carries its complete story');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),entry.path+' must fit at '+width);
   await page.locator('.together-hero .button-cobalt').click();
   const bounds=await page.evaluate(()=>({top:document.querySelector('#conversation').getBoundingClientRect().top,header:document.querySelector('.learn-header').getBoundingClientRect().bottom}));
   assert.ok(bounds.top>=bounds.header-1&&bounds.top<=bounds.header+35,entry.path+' lands directly at the Twin below the header at '+width);
   results.push({gate:'together-story-and-twin',path:entry.path,width,...bounds});
  }}finally{await context.close();}
 }
 // The full final sprite must remain above the next section at every phone
 // width. A fixed stage height used to crop the book on /fit/ at 440px.
 for(const width of [320,390,440,480]){
  const context=await browser.newContext({viewport:{width,height:956},reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage();
  try{
   for(const path of ['/fit/','/business/']){
    await page.goto(origin+path);
    await page.locator('.business-scene-layer-2 img').waitFor();
    const geometry=await page.evaluate(()=>{
     const stage=document.querySelector('.business-scene-stage').getBoundingClientRect(),image=document.querySelector('.business-scene-layer-2 img').getBoundingClientRect();
     const heading=document.querySelector('#fit-directory-title,#how-it-works h2').getBoundingClientRect();
     return {stageBottom:stage.bottom,imageBottom:image.bottom,headingTop:heading.top};
    });
    assert.ok(geometry.imageBottom<=geometry.stageBottom+1,`${path} at ${width}px clips the final artwork: ${JSON.stringify(geometry)}`);
    assert.ok(geometry.headingTop>=geometry.imageBottom+16,`${path} at ${width}px puts the next heading inside the artwork: ${JSON.stringify(geometry)}`);
    results.push({businessArtworkComplete:true,path,width,...geometry});
   }
  }finally{await context.close();}
 }
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block',permissions:['clipboard-read','clipboard-write']}),page=await context.newPage();
  const images=[],errors=[],documents=[],profiles=[],forbidden=[];
  await context.addInitScript(input=>{localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify(input));window.__regressionProfiles=0;addEventListener('bankeiz:profile-metadata',event=>{if(event.detail?.username==='fixtureowner')window.__regressionProfiles++;});},market);
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.origin===origin)return route.continue();
   if(url.origin==='https://receiz.com'&&/^\/artwork\/regression-(?:cover-\d+|avatar)\.png$/.test(url.pathname)){
    images.push(url.href);return route.fulfill({contentType:'image/png',body:pixels});
   }
   forbidden.push(url.href);return route.abort();
  });
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(request.isNavigationRequest())documents.push(request.url());if(request.url().includes('/api/bank/public-profile/'))profiles.push(request.url());});
  try{
   await page.goto(origin+`/asset/${encodeURIComponent(selected.id)}/`,{waitUntil:'commit'});
   await page.locator('.public-asset-top').waitFor({timeout:2500});
   await page.waitForFunction(()=>{const cover=document.querySelector('.proof-image-view img'),owner=document.querySelector('.asset-profile-byline img');return cover?.complete&&cover.naturalWidth>0&&owner?.complete&&owner.naturalWidth>0;});
   await page.waitForLoadState('load');
   // Wait for the actual deferred JSON adoption, not just document load. This
   // also observes unused-image work mistakenly added after frame/idle preparation.
   await page.waitForFunction(()=>window.__regressionProfiles===1,{},{timeout:5000});
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert.equal(profiles.length,1,'Profile preparation was omitted or fetched more than once');
   const profileTiming=await page.evaluate(url=>({start:performance.getEntriesByName(url)[0]?.startTime,loaded:performance.getEntriesByType('navigation')[0]?.loadEventEnd}),profiles[0]);
   assert.ok(profileTiming.loaded>0&&profileTiming.start>=profileTiming.loaded,'Profile preparation started before document load');
   assert.equal(await page.locator('.proof-image-view img').getAttribute('loading'),'eager','Carried artwork lost eager loading');
   assert.equal(await page.locator('.proof-image-view img').getAttribute('fetchpriority'),'high','Carried artwork lost its loading priority');
   assert.equal(await page.locator('.asset-profile-byline img').getAttribute('loading'),'eager','Carried portrait lost eager loading');
   const checkColdImages=()=>{assert.deepEqual(new Set(images),new Set([selected.artworkUrl,selected.ownerAvatarUrl]),'Cold asset requested an unused image');assert.equal(images.length,2,'Carried images were fetched more than once');};
   checkColdImages();const imageRequests=[...images];
   assert.equal(await page.locator('.market-rows').count(),0,'Cold asset mounted an unseen collection');
   assert.equal(await page.locator('link[data-profile-preload]').count(),0,'Asset preloaded linked profile images');
   await page.screenshot({path:resolve(output,`asset-${width}.png`)});
   const copy=page.getByRole('button',{name:'Copy asset link',exact:true}),box=await copy.boundingBox();await copy.click();const copied=page.getByRole('button',{name:'Asset link copied',exact:true});await copied.waitFor();
   assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),`${origin}/asset/${encodeURIComponent(selected.id)}/`);
   assert.deepEqual(await copied.boundingBox(),box,'Copy confirmation shifted its button');await copy.waitFor({timeout:2500});
   checkColdImages();assert.equal(await page.locator('link[data-profile-preload]').count(),0,'Deferred profile preparation preloaded unused images');
   await page.getByRole('link',{name:'Explore',exact:true}).first().click();const search=page.getByRole('textbox',{name:'Search proof objects'});await search.waitFor({timeout:2500});await search.fill('Selected regression specimen');
   await page.evaluate(()=>{window.__retainedSearch=document.querySelector('input[aria-label="Search proof objects"]');});
   await page.locator('.market-rows .asset-row').first().scrollIntoViewIfNeeded();const savedScroll=await page.evaluate(()=>scrollY);
   await page.locator('.market-rows .asset-row').first().click();await page.getByRole('link',{name:'Asset page',exact:true}).click();await page.locator('.public-asset-top').waitFor();await page.locator('.public-asset-top a').first().click();
   await search.waitFor({timeout:2500});assert.equal(await search.inputValue(),'Selected regression specimen');assert.equal(await page.evaluate(()=>window.__retainedSearch===document.querySelector('input[aria-label="Search proof objects"]')),true,'Return replaced the retained search');
   await page.waitForFunction(expected=>Math.abs(scrollY-expected)<=1,savedScroll,{timeout:2500});
   await page.getByRole('link',{name:'Learn',exact:true}).first().click();await page.waitForFunction(()=>location.pathname==='/learn/');
   await page.evaluate(()=>{window.__returnFrames=[];window.__recordReturn=true;const sample=()=>{if(location.pathname==='/explore/'){const main=document.querySelector('#explorer-main');window.__returnFrames.push(main?{opacity:getComputedStyle(main).opacity,transform:getComputedStyle(main).transform}:null);}if(window.__recordReturn)requestAnimationFrame(sample);};requestAnimationFrame(sample);const link=document.createElement('a');link.href='/explore/';link.id='regression-return';link.textContent='Return to retained collection';document.querySelector('#public-learn-root main').append(link);});
   await page.locator('#regression-return').click();await search.waitFor({timeout:2500});await page.waitForTimeout(300);
   const frames=await page.evaluate(()=>{window.__recordReturn=false;return window.__returnFrames;});assert.ok(frames.length>0,'No return frames sampled');assert.ok(frames.every(frame=>frame?.opacity==='1'&&frame.transform==='none'),'Retained page replayed its entrance animation');
   assert.equal(await search.inputValue(),'Selected regression specimen');assert.equal(documents.length,1,'Navigation loaded a replacement document');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Page overflowed horizontally');assert.deepEqual(errors,[]);assert.deepEqual(forbidden,[],'The test attempted a live service call');
   await page.screenshot({path:resolve(output,`retained-return-${width}.png`)});results.push({width,coldAssetImageRequests:imageRequests.length,unusedImageRequests:0,retainedReturnFrames:frames.length,documentLoads:documents.length,copyFeedback:true,errors});
  }catch(error){await page.screenshot({path:resolve(output,`failure-${width}.png`)}).catch(()=>{});throw error;}
  finally{await context.close();}
 }
 // A separate clean browser installs the actual complete PWA distribution.
 // This proves shell availability, not offline spending authority.
 servingOfflineBuild=true;
 const context=await browser.newContext({serviceWorkers:'allow'}),page=await context.newPage();
 await context.route('https://**/*',route=>route.abort());await page.goto(origin+'/');
 await page.locator('.identity-entrance').waitFor({timeout:5000});
 await page.evaluate(async()=>{const ready=(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;})();let timer;try{await Promise.race([ready,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Complete offline shell did not install within 60 seconds')),60000);})]);}finally{clearTimeout(timer);}});
 await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});await page.locator('.identity-entrance').waitFor({timeout:5000});
 results.push({installedOfflineShell:true});await context.close();
 passed=true;console.log(JSON.stringify({passed,syntheticPublicFixtures:true,results},null,2));
}finally{
 await writeFile(resolve(output,'results.json'),JSON.stringify({passed,syntheticPublicFixtures:true,results},null,2));await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
}
