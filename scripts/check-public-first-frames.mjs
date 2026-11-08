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
const cases=[
 {name:'asset',path:'/asset/'+encodeURIComponent(id)+'/',selector:'.asset-detail-heading',text:asset.item.title},
 {name:'receipt',path:firstFrameReceiptPath,selector:'.transaction-receipt',text:'$125.00'},
 {name:'verify',path:'/verify/',selector:'.verify-header',text:'See the proof.'},
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
   await page.screenshot({path:resolve(output,'first-frame-'+item.name+'.png')});
  }finally{await cold.close();}
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),interactive=await context.newPage(),pending=[],errors=[];let entryReady;const entryRequested=new Promise(resolve=>{entryReady=resolve;});
  try{
   interactive.on('pageerror',error=>errors.push(error.message));interactive.on('console',message=>{if(message.type()==='error'&&/hydrat|didn't match|server rendered|react.dev\/errors\/(?:418|423|425)/i.test(message.text()))errors.push(message.text());});
   await interactive.route('**/api/**',()=>new Promise(()=>{}));await interactive.route(/\/assets\/(?:explore|receipt|verify|booking)-[^/]+\.js(?:\?|$)/,route=>new Promise(resolve=>{pending.push({route,resolve});entryReady();}));
   await interactive.goto(origin+item.path,{waitUntil:'commit'});await interactive.locator(item.selector).waitFor();
   await interactive.evaluate(selector=>{window.firstFrameNode=document.querySelector(selector);},item.selector);
   let timer;try{await Promise.race([entryRequested,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(item.name+' entry was not intercepted')),15000);})]);}finally{clearTimeout(timer);}
   await interactive.unroute(/\/assets\/(?:explore|receipt|verify|booking)-[^/]+\.js(?:\?|$)/);for(const held of pending){await held.route.continue();held.resolve();}
   await interactive.waitForFunction(selector=>{const node=document.querySelector(selector);return !!node&&Object.keys(node).some(key=>key.startsWith('__reactFiber$'));},item.selector,{timeout:15000});
   assert.equal(await interactive.evaluate(selector=>window.firstFrameNode===document.querySelector(selector),item.selector),true,item.name+' must hydrate its existing DOM');assert.deepEqual(errors,[],item.name+' hydration errors');
   results.push({page:item.name,actualHTMLBeforeJavaScript:true,inlineStyles:true,APIsStalled:true,retainedDOM:true,errors});
  }finally{await context.close();}
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
