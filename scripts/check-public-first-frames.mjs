import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {chromium} from 'playwright';
import {handleAssetPreview} from '../server/asset-runtime/asset-preview.mjs';
import {handleReceiptPreview} from '../server/receipt-runtime/receipt-preview.mjs';
import {firstFrameReceiptPath} from '../tests/browser/first-frame-receipt.mjs';

// Actual compiled anonymous documents and modules. No identity, signature,
// publication, transaction or external Source operation belongs in this check.
const directory=resolve('dist'),output=resolve('test-results/public-first-frames');
await mkdir(output,{recursive:true});
const raw=JSON.parse(await readFile('public/receiz-public-market.json','utf8')),id=raw.transport.publicOriginals[0].id,key=createHash('sha256').update(id).digest('hex'),asset=JSON.parse(gunzipSync(await readFile('server/asset-runtime/pages/'+key+'.json.gz')).toString());
const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>{throw Error('FIRST_FRAME_REMOTE_SOURCE_FORBIDDEN');};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),headers=new Headers(Object.entries(req.headers).filter(([,value])=>typeof value==='string'));
  if(url.pathname.startsWith('/asset/')||url.pathname==='/receipt/'){
   const request=new Request('http://localhost'+url.pathname+url.search,{headers}),response=await(url.pathname.startsWith('/asset/')?handleAssetPreview(request):handleReceiptPreview(request));
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  const path=/^\/book\/[a-z0-9_]{3,24}\/?$/.test(url.pathname)?'/booking/index.html':url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
  const file=resolve(directory,'.'+path);if(!file.startsWith(directory+'/')){res.writeHead(403).end();return;}
  const bytes=await readFile(file),type={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.wasm':'application/wasm'}[extname(file)]??'application/octet-stream';res.writeHead(200,{'content-type':type});res.end(bytes);
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port,results=[];
const analyticsEntry='/'+JSON.parse(await readFile(resolve(directory,'.vite/manifest.json'),'utf8'))['ledger/index.html'].file;
const cases=[
 {name:'asset',path:'/asset/'+encodeURIComponent(id)+'/',selector:'.asset-detail-heading',text:asset.item.title},
 {name:'receipt',path:firstFrameReceiptPath,selector:'.transaction-receipt',text:'$125.00'},
 {name:'verify',path:'/verify/',selector:'.verify-header',text:'See the proof.'},
 {name:'analytics',path:'/analytics/',selector:'#obs-collectibles',text:'Collectible transfer volume'},
 {name:'booking',path:'/book/bjklock/',selector:'.booking-card',text:'Good things start'},
];
let browser,passed=false;
try{
 browser=await chromium.launch({headless:true,...(process.env.BANK_BROWSER_EXECUTABLE?{executablePath:process.env.BANK_BROWSER_EXECUTABLE}:{})});
 for(const item of cases){
  const cold=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),page=await cold.newPage();
  try{
   await page.route('**/api/**',()=>new Promise(()=>{}));await page.route('**/*.css',route=>route.abort());
   const response=await page.goto(origin+item.path,{waitUntil:'commit'});assert.equal(response.status(),200,item.name+' first HTML');await page.locator(item.selector).waitFor();assert.ok((await page.locator('body').textContent()).includes(item.text));assert.equal(await page.locator('.public-entry-placeholder,[data-profile-opening]').count(),0);
   assert.ok(await page.locator('style[data-public-page-style]').count()>0,item.name+' styles must already be inline');
   if(item.name==='analytics'){
    const volume=page.locator('#obs-collectibles .obs-audience-grid>div').filter({has:page.getByRole('heading',{name:'Collectible transfer volume'})}).locator('strong');
    for(const width of [320,768,390]){
     await page.setViewportSize({width,height:844});
     assert.ok(await volume.evaluate(el=>{
      const amount=document.createRange();amount.selectNodeContents(el);
      const text=amount.getBoundingClientRect(),card=el.parentElement.getBoundingClientRect();
      return amount.getClientRects().length===1&&text.left>=card.left-1&&text.right<=Math.min(card.right,innerWidth)+1;
     }),`Collectible transfer volume must fit its card at ${width}px`);
    }
    assert.match(await page.locator('.obs-source-note').filter({hasText:'Updated'}).first().textContent(),/Updated .+ · \d{2}:\d{2} UTC/);
   }
   await page.screenshot({path:resolve(output,'first-frame-'+item.name+'.png')});
  }finally{await cold.close();}
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),interactive=await context.newPage(),pending=[],errors=[];let entryReady;const entryRequested=new Promise(resolve=>{entryReady=resolve;});
  try{
   interactive.on('pageerror',error=>errors.push(error.message));interactive.on('console',message=>{if(message.type()==='error'&&/hydrat|didn't match|server rendered|react.dev\/errors\/(?:418|423|425)/i.test(message.text()))errors.push(message.text());});
   await interactive.route('**/api/**',()=>new Promise(()=>{}));await interactive.route(/\/assets\/(?:explore|receipt|verify|booking|ledger)-[^/]+\.js(?:\?|$)/,route=>new Promise(resolve=>{pending.push({route,resolve});entryReady();}));
   await interactive.goto(origin+item.path,{waitUntil:'commit'});await interactive.locator(item.selector).waitFor();
   await interactive.evaluate(selector=>{window.firstFrameNode=document.querySelector(selector);},item.selector);
   let timer;try{await Promise.race([entryRequested,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(item.name+' entry was not intercepted')),15000);})]);}finally{clearTimeout(timer);}
   await interactive.unroute(/\/assets\/(?:explore|receipt|verify|booking|ledger)-[^/]+\.js(?:\?|$)/);for(const held of pending){await held.route.continue();held.resolve();}
   await interactive.waitForFunction(selector=>{const node=document.querySelector(selector);return !!node&&Object.keys(node).some(key=>key.startsWith('__reactFiber$'));},item.selector,{timeout:15000});
   assert.equal(await interactive.evaluate(selector=>window.firstFrameNode===document.querySelector(selector),item.selector),true,item.name+' must hydrate its existing DOM');assert.deepEqual(errors,[],item.name+' hydration errors');
   results.push({page:item.name,actualHTMLBeforeJavaScript:true,inlineStyles:true,APIsStalled:true,retainedDOM:true,errors});
  }finally{await context.close();}
 }
 for (const from of ['/', '/explore/', '/discover/']) {
  const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await ctx.newPage(),errors=[],documents=[];
  let releaseEntry;
  const gate=new Promise(resolve=>{releaseEntry=resolve;});
  try {
   page.on('pageerror',e=>errors.push(e.message));
   page.on('request',req=>{if(req.resourceType()==='document')documents.push(new URL(req.url()).pathname);});
   await page.route('**/api/**',route=>route.abort());
   await page.route(url=>url.pathname===analyticsEntry,async route=>{await gate;await route.continue();});
   await page.goto(origin+from,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof document.querySelector('#receiz-navigation')?.navigate==='function');
   const link=page.locator('a[href="/analytics/"]').filter({visible:true}).first();
   await link.click();
   const scope=page.locator('.observatory');
   await scope.locator('#obs-assets tbody tr').first().waitFor();
   assert.equal(new URL(page.url()).pathname,'/analytics/');
   assert.deepEqual(documents,[from]);
   const header=scope.locator('.obs-header');
   assert.equal(await header.getByRole('link',{name:'Discover people and their work'}).count(),1);
   assert.equal(await header.locator('a[href="/analytics/"]').count(),0);
   assert.deepEqual(await header.locator('nav a').evaluateAll(links=>links.map(link=>link.pathname)),['/explore/','/market-cap/','/ledger/','/learn/','/discover/']);
   assert.deepEqual(await scope.locator('.profile-footer nav a').evaluateAll(links=>links.map(link=>link.pathname)),['/vote/','/conformance/','/standards/','/legal/']);
   assert.equal(await scope.locator('#obs-profiles tbody tr').count(),8);
   assert.equal(await scope.getByLabel('Profiles per page').inputValue(),'8');
   const trades=scope.locator('#obs-trading');assert.equal(await trades.locator('.obs-trading-plot svg').count(),2);
   assert.equal(await trades.locator('.obs-trading-totals strong').count(),2);
   await page.evaluate(()=>{window.analyticsNode=document.querySelector('#obs-assets');window.firstCap=document.querySelector('#obs-profiles tbody tr td:last-child')?.textContent;});
   releaseEntry();
   await page.waitForFunction(()=>Object.keys(document.querySelector('#obs-assets')??{}).some(k=>k.startsWith('__reactFiber$')),null,{timeout:30000});
   assert.ok(await page.evaluate(()=>window.analyticsNode===document.querySelector('#obs-assets')&&window.firstCap===document.querySelector('#obs-profiles tbody tr td:last-child')?.textContent),'Analytics must hydrate the complete existing directory from '+from);
   const row=scope.locator('#obs-assets tbody tr').first(),inspect=row.getByRole('button',{name:/^Inspect/});
   await inspect.click();
   assert.equal(await inspect.getAttribute('aria-expanded'),'true');
   await row.locator('xpath=following-sibling::tr[1]').locator('.asset-proof-back-body').waitFor();
   await inspect.click();assert.equal(await scope.locator('#obs-asset-details').count(),0);
   await trades.getByLabel('Trading asset').selectOption({index:1});
   await trades.getByRole('heading',{name:'Execution price'}).waitFor();
   assert.ok(await trades.locator('.obs-candle').evaluateAll(nodes=>nodes.some(node=>node.getAttribute('d'))));
   await trades.getByRole('slider',{name:'Inspect execution price'}).press('Home');
   assert.equal(await trades.locator('.obs-trading-cursor').count(),2);
   await trades.getByRole('button',{name:'Show full period'}).click();
   await trades.getByLabel('Trading asset').selectOption('');
   const tape=trades.locator('.obs-trade-tape');await tape.locator('summary').first().click();
   const tradeRows=tape.locator('tbody>tr'),inspectTrade=tape.getByRole('button',{name:/^Inspect/}).first();
   assert.equal(await tradeRows.count(),6);const latest=await tradeRows.first().innerText();
   await tape.getByRole('button',{name:'Next page'}).click();assert.equal(await tradeRows.count(),6);assert.notEqual(await tradeRows.first().innerText(),latest);
   await inspectTrade.click();assert.equal(await inspectTrade.getAttribute('aria-expanded'),'true');
   const drawer=tape.getByRole('region',{name:'Trade details'});await drawer.getByRole('link',{name:'Open in Ledger'}).waitFor();
   await drawer.locator('summary').click();const exact=JSON.parse(await drawer.locator('pre').innerText());
   assert.equal(await drawer.getByRole('link',{name:'Open in Ledger'}).getAttribute('href'),'/ledger/#record='+encodeURIComponent(exact.source+':'+exact.id));
   assert.ok(await tape.evaluate(el=>el.scrollWidth<=el.clientWidth+1));await inspectTrade.click();assert.equal(await drawer.count(),0);
   await tape.getByRole('button',{name:'Previous page'}).click();assert.equal(await tradeRows.first().innerText(),latest);
   assert.ok(await scope.locator('#obs-profiles table').evaluate(table=>getComputedStyle(table.tHead.rows[0].cells[1]).textAlign===getComputedStyle(table.tBodies[0].rows[0].cells[1]).textAlign));
   await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo({top:0,behavior:'instant'});return new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done())));});
   await page.waitForFunction(()=>scrollY===0&&!document.querySelector('.obs-topbar')?.hasAttribute('data-tucked'));
   await page.evaluate(()=>window.scrollTo(0,900));
   await page.waitForFunction(()=>document.querySelector('.obs-topbar')?.hasAttribute('data-tucked'));
   await page.evaluate(()=>window.scrollTo(0,800));
   await page.waitForFunction(()=>!document.querySelector('.obs-topbar')?.hasAttribute('data-tucked'));
   assert.deepEqual(errors,[]);results.push({page:from+' to Analytics',completeBeforeRuntime:true,retainedDOM:true,documentReads:documents.length-1,inlineAssetProof:true});
  }finally{releaseEntry();await ctx.close();}
 }
 for(const [landing,viaAnalytics] of [['/ledger/',false],['/ledger/',true],['/analytics/',false],['/discover/',false]]){
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage(),docs=[],errors=[],packets=[];
  const exploreEntry='/'+JSON.parse(await readFile(resolve(directory,'.vite/manifest.json'),'utf8'))['explore/index.html'].file;
  let release;const gate=new Promise(resolve=>{release=resolve;});
  try{
   page.on('pageerror',e=>errors.push(e.message));
   page.on('request',r=>{const path=new URL(r.url()).pathname;if(r.resourceType()==='document')docs.push(path);if(path.startsWith('/explore/data/'))packets.push(path);});
   await page.route('**/api/**',r=>r.abort());
   await page.route(url=>url.pathname===exploreEntry,async r=>{await gate;await r.continue();});
   await page.goto(origin+landing,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof document.querySelector('#receiz-navigation')?.navigate==='function');
   const ledgerHeader=page.locator('.public-ledger-header');
   if(landing==='/ledger/'){
    assert.ok((await page.locator('.public-ledger-row').first().boundingBox()).y<800,'First transaction should be in the initial Ledger viewport');
    assert.equal(await page.getByRole('navigation',{name:'Ledger footer'}).count(),1);
   }
   const installed=landing==='/analytics/';
   if(installed){
    // Same settled document the offline installer retains. Disable its separate
    // data URL to exercise a cold reader with only local installation bytes.
    await page.evaluate(async()=>{const cache=await caches.open('bank-test-installed');await cache.add('/explore/index.html');});
    await page.route('**/explore/data/**',r=>r.abort('internetdisconnected'));
   }
   assert.deepEqual(packets,[],'Landing does not acquire the unopened Explore collection');
   if(viaAnalytics)await ledgerHeader.getByRole('link',{name:'Analytics'}).click();
   const header=viaAnalytics||landing==='/analytics/'?page.locator('.obs-header'):landing==='/discover/'?page.locator('.discover-header'):ledgerHeader;
   await header.getByRole('link',{name:'Explore',exact:true}).click();
   const rows=page.locator('.market-rows .asset-row');
   await rows.first().waitFor();
   assert.equal(await rows.count(),50);
   await page.evaluate(()=>{window.exploreFirstRow=document.querySelector('.market-rows .asset-row');});
   release();await page.waitForFunction(()=>Object.keys(document.querySelector('.market-rows .asset-row')??{}).some(k=>k.startsWith('__reactFiber$')),null,{timeout:30000});
   assert.ok(await page.evaluate(()=>window.exploreFirstRow===document.querySelector('.market-rows .asset-row')));
   await page.goBack();
   await header.waitFor({state:'visible'});
   await page.goForward();
   await rows.first().waitFor();
   assert.ok(await page.evaluate(()=>window.exploreFirstRow===document.querySelector('.market-rows .asset-row')));
   assert.deepEqual(docs,[landing]);assert.equal(packets.length,installed?0:1,'Explore reuses installed bytes or reads missing data once across Back and Forward');assert.deepEqual(errors,[]);
   results.push({page:viaAnalytics?'Ledger to Analytics to Explore':landing+' to Explore',carriedRows:50,retainedDOM:true,documentReads:0,packetReads:packets.length});
  }finally{release();await context.close();}
 }
 const receiptContext=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),receiptPage=await receiptContext.newPage();
 try{
  await receiptPage.route('**/api/**',()=>new Promise(()=>{}));await receiptPage.goto(origin+firstFrameReceiptPath,{waitUntil:'domcontentloaded'});
  const target=new URL(await receiptPage.locator('.receipt-ledger-link').getAttribute('href'));
  assert.ok(new URLSearchParams(target.hash.slice(1)).get('receipt'),'Ledger link must carry its selected receipt');
  // A new document has no receipt handoff memo or hydrated Ledger row. Reuse
  // the existing portable receipt URL while all API responses remain stalled.
  await receiptPage.goto(origin+target.pathname+target.search+target.hash,{waitUntil:'domcontentloaded'});
  await receiptPage.getByText('Showing the transaction carried by your receipt.').waitFor();
  assert.ok((await receiptPage.locator('.public-ledger-row.is-open').textContent()).includes('$125.00'));
  results.push({page:'receipt-to-ledger',newDocument:true,APIsStalled:true,selectedCarriedTransactionVisible:true});
 }finally{await receiptContext.close();}
 passed=true;console.log(JSON.stringify({passed,results},null,2));
}finally{
 await writeFile(resolve(output,'first-frame-results.json'),JSON.stringify({passed,results},null,2));await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));globalThis.fetch=originalFetch;
}
