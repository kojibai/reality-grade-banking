import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';

// Exercise the actual retained-source projection and lazy disclosures with a
// synthetic account. This fixture has no financial or source-read capability.
const output=resolve('test-results/collectibles-browser'),directory=resolve(output,'fixture');
await rm(output,{recursive:true,force:true});await mkdir(directory,{recursive:true});
await build({entryPoints:['tests/browser/collectibles-held-ui.tsx'],bundle:true,format:'esm',splitting:true,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},outdir:directory,external:['/notes/*'],logLevel:'warning'});
await writeFile(resolve(directory,'index.html'),'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/collectibles-held-ui.css"><div id="root"></div><script type="module" src="/collectibles-held-ui.js"></script>');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const server=createServer(async(request,response)=>{
 try{const url=new URL(request.url,'http://127.0.0.1'),file=resolve(directory,url.pathname==='/'?'index.html':'.'+url.pathname);
  if(request.method!=='GET'||!file.startsWith(directory+'/')){response.writeHead(403).end();return;}
  response.setHeader('content-type',mime[extname(file)]??'application/octet-stream');response.end(await readFile(file));
 }catch{response.writeHead(404).end();}
});
await new Promise((done,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',done);});
const origin=`http://127.0.0.1:${server.address().port}`,results=[];
let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.BANK_BROWSER_EXECUTABLE?{executablePath:process.env.BANK_BROWSER_EXECUTABLE}:{})});
 for(const width of [320,390,900]){
  const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage(),errors=[],forbidden=[];
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==origin||url.pathname.startsWith('/api/')){forbidden.push(url.href);return route.abort();}return route.continue();});
  page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(origin+'/?large');await page.locator('[data-collection-catalog]').waitFor();
   assert.equal(await page.locator('.collection-tile').count(),40,'Only a bounded gallery mounts for 10,001 held cards');
   for(let pageIndex=0;pageIndex<5;pageIndex++){await page.getByRole('button',{name:'Next collection page',exact:true}).click();assert.equal(await page.locator('.collection-tile').count(),40,'Paging must replace the previous mounted page');}
   for(let pageIndex=0;pageIndex<5;pageIndex++)await page.getByRole('button',{name:'Previous collection page',exact:true}).click();
   assert.equal(await page.locator('[data-collectible-card]').count(),0,'The gallery must not mount 3D handlers');
   const before=await page.evaluate(()=>performance.now());await page.getByRole('button',{name:'Sports',exact:true}).click();await page.getByRole('button',{name:'Baseball',exact:true}).click();
   await page.getByRole('button',{name:'Open Collection specimen 1',exact:true}).click();await page.getByRole('button',{name:'View back',exact:true}).waitFor();
   const geometry=await page.locator('[data-collectible-card]').evaluate(element=>{const box=element.getBoundingClientRect();return {width:box.width,height:box.height,viewport:innerWidth,overflow:document.documentElement.scrollWidth};});
   assert.ok(Math.abs(geometry.width/geometry.height-5/7)<.005,'Selected card keeps its native portrait viewing slot');
   assert.ok(geometry.overflow<=geometry.viewport,'Selected card stays within the mobile viewport');
   assert.equal(await page.getByRole('button',{name:'Close',exact:true}).count(),0,'Back is the single navigation control');
   assert.equal(await page.locator('[data-ownership-history]').count(),0,'Deep history must stay unmounted until opened');
   await page.getByRole('button',{name:'View back',exact:true}).click();assert.equal(await page.locator('[data-collectible-card]').getAttribute('data-flipped'),'true');
   await page.locator('summary').filter({hasText:'Ownership & provenance'}).click();await page.locator('[data-ownership-history]').waitFor();
   await page.getByRole('button',{name:'Go back',exact:true}).click();await page.locator('[data-collection-catalog]').waitFor();
   assert.equal(await page.locator('.collection-trail').textContent(),'AllSportsBaseball','Back retains the selected category');
   await page.getByRole('button',{name:'Go back',exact:true}).click();await page.getByRole('button',{name:'Open retained collection',exact:true}).click();await page.locator('[data-collection-catalog]').waitFor();
   assert.deepEqual(errors,[]);assert.deepEqual(forbidden,[],'Browsing retained cards performs no service requests');
   await page.screenshot({path:resolve(output,`collection-${width}.png`)});results.push({width,heldCards:10001,mountedCards:40,geometry,categoryAndDetailExerciseMs:Math.round(await page.evaluate(()=>performance.now())-before),serviceRequests:forbidden.length,errors});
  }finally{await context.close();}
 }
 await writeFile(resolve(output,'results.json'),JSON.stringify(results,null,2));
 console.log('Retained collection: bounded catalog, single Back, selected card, lazy history and no service reads at 320, 390 and 900px.');
}finally{await browser?.close();await new Promise(done=>server.close(done));}
