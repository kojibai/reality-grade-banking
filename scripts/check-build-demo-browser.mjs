import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,basename} from 'node:path';
import {chromium} from 'playwright';
import {buildBuildDemo} from './build-build-demo.mjs';
await buildBuildDemo();
const directory=resolve('public/build-demo/v129'),requests=[],errors=[];
const server=createServer(async(request,response)=>{
 const path=new URL(request.url,'http://localhost').pathname;
 if(path==='/fixture-check'){
  response.writeHead(200,{'Content-Type':'text/html','Content-Security-Policy':"default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; connect-src 'self'"});response.end('<!doctype html><html><head><title>Synthetic verification test</title></head><body>Fixture verification</body></html>');return;
 }
 if(!/^\/build-demo\/v129\/(?:verify\.mjs|worker\.mjs|verifier\.mjs|note\.png\.gz|wrong-note-authority\.png\.gz)$/.test(path)){response.writeHead(404);response.end();return;}
 requests.push({path,cookie:request.headers.cookie??null});
 try{response.writeHead(200,{'Content-Type':path.endsWith('.mjs')?'text/javascript':'application/gzip',...(/\.png\.gz$/.test(path)&&requests.filter(request=>request.path===path).length>1?{'Content-Encoding':'gzip'}:{})});response.end(await readFile(resolve(directory,basename(path))));}
 catch{response.writeHead(404);response.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext();await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{const NativeWorker=Worker;window.demoWorkers=0;window.demoStorage=0;window.Worker=class extends NativeWorker{constructor(...args){super(...args);window.demoWorkers++;}};const write=Storage.prototype.setItem;Storage.prototype.setItem=function(...args){window.demoStorage++;return write.apply(this,args);};});
 await page.goto(origin+'/fixture-check');
 const before=await page.evaluate(async()=>{window.demo=await import('/build-demo/v129/verify.mjs');return{workers:window.demoWorkers,storage:window.demoStorage};});
 assert.deepEqual(before,{workers:0,storage:0});assert.deepEqual(requests.map(request=>request.path),['/build-demo/v129/verify.mjs']);
 const observation=await page.evaluate(async()=>{const first=window.demo.runIndependentVerification(),second=window.demo.runIndependentVerification();return{samePending:first===second,result:await first,workers:window.demoWorkers,storage:window.demoStorage};});
 assert.equal(observation.samePending,true);assert.equal(observation.workers,1);assert.equal(observation.storage,0);
 const results=observation.result.results;assert.equal(results.length,2);assert.equal(results[0].fixture,'authentic');assert.equal(results[0].verified,true);assert.equal(results[0].amountUsdCents,'200');assert.equal(results[1].fixture,'wrong-delivery-authority');assert.equal(results[1].verified,false);assert.equal(results[1].error,'BANK_NOTE_DELIVERY_AUTHORITY_MISMATCH');
 assert.ok(results.every(result=>result.synthetic===true&&result.currentSpendabilityChecked===false&&result.creditAuthorized===false));
 assert.equal(requests.filter(request=>/\.png\.gz$/.test(request.path)).length,2);assert.ok(requests.every(request=>request.cookie===null));assert.deepEqual(errors,[]);
 const repeat=await page.evaluate(async()=>({result:await window.demo.runIndependentVerification(),workers:window.demoWorkers,storage:window.demoStorage}));assert.equal(repeat.workers,2);assert.equal(repeat.storage,0);assert.deepEqual(repeat.result.results,results);
 const report={scope:'Actual generated browser module and worker; fixed synthetic fixtures only',lazyBeforeVerify:before,pendingCoalesced:observation.samePending,results,workersAfterExplicitRepeat:repeat.workers,staticGzipAndHttpDecodedTransport:true,storageWrites:repeat.storage,requests:requests.map(request=>request.path),errors,financialApiRequests:0};
 const output=process.env.BANK_BUILD_DEMO_BROWSER_OUTPUT??'output/build-demo-browser.json';await mkdir(resolve(output,'..'),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));await context.close();
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
