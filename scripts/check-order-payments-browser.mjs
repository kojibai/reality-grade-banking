import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,extname} from 'node:path';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
import {createServer as createViteServer} from 'vite';
import {startExample} from '../integrations/payments/example/server.mjs';

// Browser plugin unavailable; use the repository's existing Playwright runtime.
// All payment sources below are explicit synthetic fixtures; no enrollment,
// production payment API or live card provider is contacted.
const work=await mkdtemp(resolve(tmpdir(),'bankeiz-orders-browser-')),output=process.env.BANKEIZ_PAYMENTS_SCREENSHOTS??resolve(tmpdir(),'bankeiz-payments-preview');await mkdir(output,{recursive:true});
let app,vite,browser,docs,compiled;
try{
 app=await startExample({databasePath:resolve(work,'orders.sqlite')});
 vite=await createViteServer({configFile:resolve('vite.config.ts'),server:{host:'127.0.0.1',port:0,strictPort:false}});await vite.listen();
 const dev=`http://127.0.0.1:${vite.httpServer.address().port}`;
 docs=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),file=resolve('docs-dist','.'+url.pathname+(url.pathname.endsWith('/')?'index.html':''));if(!file.startsWith(resolve('docs-dist')+'/'))throw Error();const body=await readFile(file),mime={'.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png'};res.writeHead(200,{'content-type':mime[extname(file)]??'text/html'}).end(body);}catch{res.writeHead(404).end();}});await new Promise(done=>docs.listen(0,'127.0.0.1',done));const docsOrigin=`http://127.0.0.1:${docs.address().port}`;
 browser=await chromium.launch({headless:true,...(process.env.BANK_BROWSER_EXECUTABLE?{executablePath:process.env.BANK_BROWSER_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport:{width:1100,height:900},reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 async function action(name){await page.getByRole('button',{name,exact:true}).click();await page.waitForFunction(label=>[...document.querySelectorAll('button')].some(button=>button.textContent===label&&!button.disabled),name);}
 await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await page.goto(app.origin);await action('Create checkout');await page.locator('#checkout').waitFor({state:'visible'});
 const link=await page.locator('#link').inputValue();assert.equal(new URL(link).origin,'https://bankeiz.com');assert.equal(new URL(link).searchParams.get('amount'),'10.00');
 await action('Fulfill order');assert.equal(await page.locator('#effects').textContent(),'0');
 await action('Record synthetic payment');assert.equal(await page.locator('#payment').textContent(),'Pending');
 await action('Check payment');await page.waitForFunction(()=>document.querySelector('#payment').textContent==='Paid');
 await action('Fulfill order');await page.waitForFunction(()=>document.querySelector('#fulfillment').textContent==='Complete');
 assert.equal(await page.locator('#effects').textContent(),'1');await action('Fulfill order');assert.equal(await page.locator('#effects').textContent(),'1');
 // Reopen a different process-lifetime store while keeping the exact database.
 await app.close();app=await startExample({databasePath:resolve(work,'orders.sqlite')});await page.goto(app.origin);await page.waitForFunction(()=>document.querySelector('#fulfillment').textContent==='Complete');assert.equal(await page.locator('#link').inputValue(),link);
 await action('Record synthetic payment');await action('Check payment');await page.waitForFunction(()=>document.querySelector('#payments').textContent==='2');await action('Fulfill order');assert.equal(await page.locator('#effects').textContent(),'1');
 await page.screenshot({path:resolve(output,'store-completed.png'),fullPage:true});
 // The exact saved URL opens the actual emitted checkout with every API
 // stalled. Defer only native identity-module entry to avoid enrollment.
 const manifest=JSON.parse(await readFile('dist/.vite/manifest.json','utf8')),identityChunks=Object.values(manifest).filter(row=>/^assets\/native-identity-[^/]+\.js$/.test(row.file));assert.equal(identityChunks.length,1,'Identify the exact compiled native-entry module');const identityChunk=identityChunks[0].file,identityCode=await readFile('dist/'+identityChunk,'utf8');
 const namespace=/([\w$]+)=Object\.freeze\(Object\.defineProperty\(\{__proto__:null,createNativeIdentity:/.exec(identityCode)?.[1],exportList=/export\{([^}]+)\}/.exec(identityCode.slice(identityCode.lastIndexOf('export{')))?.[1];assert.ok(namespace&&exportList,'Locate the actual compiled namespace/export bindings');
 const exports=exportList.split(',').map(field=>field.trim().split(/\s+as\s+/)),pausedIdentity='const held=()=>new Promise(()=>{});const namespace={restoreNativeIdentity:held,createNativeIdentity:held,importNativeIdentity:held};export{'+exports.map(([local,alias])=>(local===namespace?'namespace':'held')+' as '+(alias??local)).join(',')+'};';
 compiled=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),path=/^\/pay\/[a-z0-9_]{3,24}\/?$/.test(url.pathname)?'/pay/checkout.html':url.pathname,file=resolve('dist','.'+path);if(!file.startsWith(resolve('dist')+'/'))throw Error();const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.wasm':'application/wasm'};res.writeHead(200,{'content-type':mime[extname(file)]??'application/octet-stream'}).end(await readFile(file));}catch{res.writeHead(404).end();}});await new Promise(done=>compiled.listen(0,'127.0.0.1',done));
 const saved=new URL(link),compiledUrl=`http://127.0.0.1:${compiled.address().port}${saved.pathname}${saved.search}`;
 const offlineEntry=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:850}}),entry=await offlineEntry.newPage();await entry.route('**/api/**',()=>new Promise(()=>{}));await entry.goto(compiledUrl,{waitUntil:'commit'});await entry.getByRole('heading',{name:'Pay directly.'}).waitFor();await offlineEntry.close();
 const stalled=await browser.newContext({viewport:{width:390,height:850},serviceWorkers:'block'}),paymentPage=await stalled.newPage();let postRequests=0;
 paymentPage.on('request',request=>{if(request.method()==='POST')postRequests++;});
 await stalled.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await stalled.route('**/api/**',()=>new Promise(()=>{}));await stalled.route('**/'+identityChunk,route=>route.fulfill({contentType:'text/javascript',body:pausedIdentity}));
 await paymentPage.goto(compiledUrl,{waitUntil:'domcontentloaded'});await paymentPage.getByRole('heading',{name:'@merchant'}).waitFor();assert.equal(await paymentPage.getByLabel('Payment amount',{exact:true}).inputValue(),'10.00');assert.equal(await paymentPage.getByRole('button',{name:'Card or balance',exact:true}).count(),1);assert.equal(await paymentPage.getByRole('button',{name:'Note',exact:true}).count(),1);assert.equal(postRequests,0);assert.ok(await paymentPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await stalled.close();
 for(const width of [390,1100]){
  await page.setViewportSize({width,height:900});await page.goto(dev+'/tests/browser/order-payments-ui.html');
  const disclosure=page.locator('.payment-tools');assert.equal(await disclosure.getAttribute('open'),null);await page.getByText('Accept payments anywhere',{exact:true}).click();
  const guide=page.getByRole('link',{name:'Connect a store or app'});await guide.waitFor({state:'visible'});assert.equal(await guide.getAttribute('href'),'/docs/order-payments/');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:resolve(output,`receive-${width}.png`),fullPage:true});
 }
 await page.setViewportSize({width:1200,height:950});await page.goto(docsOrigin+'/order-payments/');await page.getByRole('heading',{name:'Connect a store or app',exact:true}).waitFor();assert.ok(await page.locator('.docs-mark img').evaluate(img=>img.complete&&img.naturalWidth>0));await page.screenshot({path:resolve(output,'guide-desktop.png'),fullPage:false});
 // Static guide paints with JavaScript unavailable and every API blocked.
 const plain=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:850}}),staticPage=await plain.newPage();await staticPage.route('**/api/**',route=>route.abort());await staticPage.goto(docsOrigin+'/order-payments/');assert.equal(await staticPage.getByRole('heading',{name:'Connect a store or app',exact:true}).count(),1);assert.ok(await staticPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await plain.close();
 assert.deepEqual(errors,[]);await context.close();console.log(`Browser passed: saved checkout → synthetic payment → exact receiving → one fulfillment → cold reopen → second payment/one delivery; compiled exact checkout URL with APIs stalled and native entry deferred (zero POST); Receive 390/1100px; static guide. Screenshots: ${output}`);
}finally{await browser?.close();await vite?.close();for(const server of [docs,compiled])if(server){server.closeAllConnections();await new Promise(done=>server.close(done));}await app?.close();await rm(work,{recursive:true,force:true});}
