import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium,webkit} from 'playwright';
const directory=resolve(process.env.BANK_REGRESSION_DIST??'dist'),output=resolve('test-results/compressed-feed');await mkdir(output,{recursive:true});
const {renderPreparedDependentDocument}=await import(pathToFileURL(resolve('server/profile-runtime/prepared-dependent-documents.mjs')).href),count=613;
const originals=Array.from({length:count},(_,n)=>({id:'profile:example:track-'+n,receizId:'track-'+n,canonicalHref:'/example/verified/track-'+n,title:'Opening track '+n,summary:'Exact carried music context. '.repeat(150),visibility:'public',ownerUsername:'example',profileOriginal:{mediaKind:'audio',media:{gateAudioPlayback:false},playback:{url:'https://receiz.com/compressed-feed-fixture.wav',mimeType:'audio/wav'}}}));
const material=JSON.stringify({membership:{ok:true,transport:{publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:count,revision:'compressed-feed'},publicOriginals:originals}},marketPrepared:{schema:'bank.public-market.prepared.v1',asOfPulse:14900000}});
const html=await renderPreparedDependentDocument({material,generation:createHash('sha256').update(material).digest('hex'),path:'feed',template:await readFile(resolve(directory,'feed/index.html'),'utf8')});
assert.ok(html.includes('catalogGzip'));assert.ok(html.includes('id="public-feed-seed"'));
const mime={'.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.wasm':'application/wasm'};
const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://fixture.invalid').pathname;if(path==='/feed/'){res.writeHead(200,{'content-type':'text/html'}).end(html);return;}if(path.startsWith('/api/')){res.writeHead(503).end();return;}const file=resolve(directory,'.'+path);if(!file.startsWith(directory+'/')){res.writeHead(404).end();return;}const bytes=await readFile(file);res.writeHead(200,{'content-type':mime[extname(file)]??'application/octet-stream'}).end(bytes);}catch{res.writeHead(404).end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin='http://127.0.0.1:'+server.address().port;
// Public media transport fixture only; the player and its explicit Play action
// are real. No account, proof admission or financial operation is stubbed.
const samples=44100,media=Buffer.alloc(44+samples*2);media.write('RIFF');media.writeUInt32LE(media.length-8,4);media.write('WAVEfmt ',8);media.writeUInt32LE(16,16);media.writeUInt16LE(1,20);media.writeUInt16LE(1,22);media.writeUInt32LE(22050,24);media.writeUInt32LE(44100,28);media.writeUInt16LE(2,32);media.writeUInt16LE(16,34);media.write('data',36);media.writeUInt32LE(samples*2,40);for(let i=0;i<samples;i++)media.writeInt16LE(Math.round(Math.sin(i*440*2*Math.PI/22050)*1500),44+i*2);
const results=[];
try{for(const [engine,type]of Object.entries(process.env.FEED_BROWSER_ENGINES==='all'?{chromium,webkit}:{chromium})){
 const browser=await type.launch({headless:true,...(engine==='chromium'&&process.env.BANK_BROWSER_EXECUTABLE?{executablePath:process.env.BANK_BROWSER_EXECUTABLE}:{})});
 try{for(const width of[390,1280]){
  const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[],requests=[],observations=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>{const url=new URL(r.request().url());if(url.href==='https://receiz.com/compressed-feed-fixture.wav')return r.fulfill({status:200,contentType:'audio/wav',body:media});if(url.origin!==origin)return r.abort();if(url.pathname.startsWith('/api/')){observations.push(url.pathname);return;}if(url.pathname==='/receiz-public-market.json')requests.push(url.pathname);return r.continue();});
  await page.addInitScript(()=>{const Native=DecompressionStream;let release;const gate=new Promise(resolve=>{release=resolve;});window.releaseCarriedFeed=release;window.DecompressionStream=class{constructor(format){const input=new TransformStream({async transform(bytes,controller){await gate;controller.enqueue(bytes);}});this.writable=input.writable;this.readable=input.readable.pipeThrough(new Native(format));}};});
  try{
   await page.goto(origin+'/feed/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>{const root=document.getElementById('public-feed-root');return Object.keys(root).some(k=>k.startsWith('__reactContainer'));});
   const first=page.locator('.feed-stage[aria-hidden=false]');await first.waitFor();await page.evaluate(()=>window.openingFeedScroll=document.querySelector('.feed-scroll'));
   await page.getByRole('button',{name:'Browse feed',exact:true}).click();await page.getByRole('button',{name:'Music',exact:true}).click();
   const start=Date.now();await page.getByRole('button',{name:'Play music',exact:true}).click();await page.waitForFunction(()=>[...document.querySelectorAll('[data-feed-music-owner] audio')].some(a=>!a.paused&&a.currentTime>0));
   const startedMs=Date.now()-start;await page.evaluate(()=>window.openingFeedAudio=[...document.querySelectorAll('[data-feed-music-owner] audio')].find(a=>!a.paused));
   assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);await page.screenshot({path:resolve(output,`playing-before-decode-${engine}-${width}.png`)});
   await page.evaluate(()=>window.releaseCarriedFeed());await page.waitForFunction(count=>document.getElementById('receiz-navigation')?.publicDiscoveryDocument?.()?.catalog.items.length===count,count);
   assert.ok(await page.evaluate(()=>window.openingFeedScroll===document.querySelector('.feed-scroll')));assert.ok(await page.evaluate(()=>window.openingFeedAudio.isConnected));assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);assert.ok(observations.every(path=>path==='/api/bank/public-market/membership'||path.startsWith('/api/bank/public-profile-directory')));
   results.push({engine,width,count,startedMs,playedBeforeDecode:true,sameScroll:true,sameAudio:true,carriedSourceReads:0,stalledBackgroundObservers:observations});
  }finally{await context.close();}
 }}finally{await browser.close();}
}
await writeFile(resolve(output,'results.json'),JSON.stringify({passed:true,results},null,2));console.log('PASS compressed Feed: immediate first Play, retained first frame/audio and complete local cohort while background discovery is stalled, without duplicate carried-source reads',JSON.stringify(results));
}finally{await new Promise(done=>server.close(done));}
