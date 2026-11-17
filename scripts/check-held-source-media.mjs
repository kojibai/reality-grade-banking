import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium,webkit} from 'playwright';

// The owning genuine-SDK contract exports synthetic public custody bytes.
// This fixture changes transport/trust roots only; the actual SDK opener,
// mounted material plane, shared artwork component and reader all execute.
const evidence=process.env.BANK_SOURCE_CUSTODY_BROWSER_EVIDENCE;
assert.ok(evidence,'Run the actual 33-Source custody contract with BANK_SOURCE_CUSTODY_BROWSER_EVIDENCE first.');
const fixture=JSON.parse(await readFile(join(evidence,'public-source-fixture.json'),'utf8'));
const root=process.cwd(),native=resolve('native/receiz'),work=join(evidence,'compiled-browser');await mkdir(work,{recursive:true});
const manifest=JSON.parse(await readFile('native/manifest.json','utf8')),aliases={};
for(const slug of Object.values(manifest.placements)){const directory=resolve('native/npm',slug);aliases[JSON.parse(await readFile(join(directory,'package.json'),'utf8')).name]=directory;}
const shared=`import React from 'react';import{PublicObjectArtwork}from'${root}/src/features/market/PublicObjectRow';import{ProfileCollection}from'${root}/src/public-explorer/ProfileCollection';import{parsePublicMarket}from'${root}/src/receiz/public-market';
const f=${JSON.stringify({oldest:fixture.oldest,originalRows:fixture.originalRows})};const items=parsePublicMarket({ok:true,transport:{publicOriginals:[...f.originalRows].reverse()}}).items;
export function App({mode,version}){return <><h1>Retained runtime {version}</h1>{mode==='csr'?<ProfileCollection profile={{userId:'held-source-33',username:'fixture_creator',nextCursor:null}as any} items={items} active/>:<div id="settled"><PublicObjectArtwork item={f.oldest} artworkUrl={f.oldest.artworkUrl}/></div>}</>};`;
const plugin={name:'synthetic-public-custody-transport',setup(p){
 p.onResolve({filter:/\?url(?:&inline)?$/},args=>({path:args.path,namespace:'fixture-static-url'}));
 p.onLoad({filter:/.*/,namespace:'fixture-static-url'},args=>({loader:'js',contents:'export default '+JSON.stringify('/unused-static/'+args.path.split('/').at(-1))}));
 p.onResolve({filter:/asset-publication-runtime$/},()=>({path:'runtime',namespace:'held-source-fixture'}));
 p.onLoad({filter:/.*/,namespace:'held-source-fixture'},()=>({resolveDir:root,loader:'ts',contents:`import*as runtime from'${native}/app/lib/profile/showcase/connectedAssetPublication.client.ts';export const loadAssetPublicationRuntime=async()=>({...runtime,readHeldImportedProfileOriginalMaterial:async(...args)=>{globalThis.__materialRequests=(globalThis.__materialRequests??0)+1;if(globalThis.__materialGate)await globalThis.__materialGate;globalThis.__sourceOpens=(globalThis.__sourceOpens??0)+1;return runtime.readHeldImportedProfileOriginalMaterial(...args);}});`}));
 p.onLoad({filter:/receiz-sdk\/src\/verifier\/roots\.ts$/},()=>({loader:'ts',contents:`export const receizCurrentPinnedSignatureV4Roots=()=>new Map(${JSON.stringify(fixture.roots)}.map(root=>[root.kid,root]));export const receizV109PinnedSignatureV4Roots=receizCurrentPinnedSignatureV4Roots;`}));
}};
const common={absWorkingDir:root,bundle:true,jsx:'automatic',target:'es2022',write:false,minify:true,loader:{'.ttf':'dataurl'},external:['node:*'],alias:{...aliases,react:resolve('node_modules/react'),'react-dom':resolve('node_modules/react-dom'),'@':native,qrcode:resolve('native/npm/qrcode@1.5.4/lib/browser.js'),snarkjs:resolve('native/npm/snarkjs@0.7.6/build/browser.esm.js'),ffjavascript:resolve('native/npm/ffjavascript@0.3.1/build/browser.esm.js')},plugins:[plugin],define:{'process.env':'{}','process.env.NODE_ENV':'"production"','process.env.NEXT_PUBLIC_RECEIZ_SIGNING_V4_ROOT_PUBLIC_KEYS_JSON':JSON.stringify(JSON.stringify(fixture.roots))}};
const serverBundle=await build({...common,platform:'node',format:'cjs',outfile:join(work,'ssr.cjs'),stdin:{resolveDir:root,loader:'tsx',contents:shared+`import{renderToString}from'react-dom/server';export const render=(mode,version)=>renderToString(<App mode={mode} version={version}/>);`}});
await writeFile(join(work,'ssr.cjs'),serverBundle.outputFiles.find(file=>file.path.endsWith('.cjs')).contents);
const {render}=await import(pathToFileURL(join(work,'ssr.cjs')).href);
const browserBundle=await build({...common,platform:'browser',format:'iife',outfile:join(work,'consumer.js'),stdin:{resolveDir:root,loader:'tsx',contents:shared+`import{hydrateRoot,createRoot}from'react-dom/client';import{openProofMedia}from'${root}/src/receiz/proof-media';window.__readOldest=async()=>{const opened=await openProofMedia({kind:'public',url:f.oldest.originalUrl,digest:f.oldest.originalDigest,hasLongForm:true});const text=await opened.readText();return{digest:opened.artifactDigest,text:text.text,files:opened.files.map(file=>({kind:file.kind,bytes:Array.from(file.bytes)}))};};window.__hydrate=()=>{const props={mode:document.body.dataset.mode,version:document.body.dataset.version};if(props.mode==='csr')createRoot(document.getElementById('root')).render(<App {...props}/>);else hydrateRoot(document.getElementById('root'),<App {...props}/>);};`}});
const app=browserBundle.outputFiles.find(file=>file.path.endsWith('.js')).contents,css=browserBundle.outputFiles.find(file=>file.path.endsWith('.css'))?.text??'';
await writeFile(join(work,'consumer.js'),app);
const style=css+'body{margin:0;background:#111;color:white;font:16px sans-serif}#settled{width:128px;height:128px}#settled .asset-mark,#settled img{display:block;width:128px;height:128px;object-fit:cover}.profile-collection-grid{display:grid;grid-template-columns:repeat(4,150px)}.profile-asset-cover img{width:140px;height:140px;object-fit:cover}';
const document=(mode,version)=>'<!doctype html><html><meta charset="utf-8"><style>'+style+'</style><body data-mode="'+mode+'" data-version="'+version+'"><div id="root">'+(mode==='csr'?'':render(mode,version))+'</div><script src="/snarkjs.min.js"></script><script src="/runtime-'+version+'.js"></script></body></html>';
const savedHTML=document('ssr','a'),currentHTML=document('ssr','b');assert.ok(savedHTML.includes('src="https://receiz.com/api/profile/showcase/imported-source?'));
await writeFile(join(work,'saved-first-frame.html'),savedHTML);
const seed=`<!doctype html><script>window.seed=async f=>{const database=await new Promise((resolve,reject)=>{const r=indexedDB.open('receiz-imported-source-custody-v1',1);r.onupgradeneeded=()=>{r.result.createObjectStore('sources',{keyPath:'key'});r.result.createObjectStore('segments',{keyPath:'sha256'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});const write=async(store,row)=>await new Promise((resolve,reject)=>{const tx=database.transaction(store,'readwrite');tx.objectStore(store).put(row);tx.oncomplete=resolve;tx.onerror=event=>reject(Error('SEED_TRANSACTION:'+event.target.error?.name+':'+event.target.error?.message));tx.onabort=()=>reject(Error('SEED_ABORT:'+tx.error?.name+':'+tx.error?.message));});for(const row of f.segments)await write('segments',{sha256:row.sha256,byteLength:row.byteLength,blob:new Blob([Uint8Array.from(atob(row.bytes),c=>c.charCodeAt(0))])});for(const row of f.sources)await write('sources',row);database.close();localStorage.setItem('bankeiz-admitted-public-assets-v1',f.display);};</script>`;
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/seed'){res.writeHead(200,{'content-type':'text/html'}).end(seed);return;}if(url.pathname==='/snarkjs.min.js'){res.writeHead(200,{'content-type':'application/javascript'}).end(await readFile('native/npm/snarkjs@0.7.6/build/snarkjs.min.js'));return;}if(/^\/runtime-[ab]\.js$/.test(url.pathname)){res.writeHead(200,{'content-type':'application/javascript'}).end(app);return;}if(['/csr','/ssr','/saved'].includes(url.pathname)){res.writeHead(200,{'content-type':'text/html'}).end(url.pathname==='/saved'?savedHTML:url.pathname==='/ssr'?currentHTML:document('csr','b'));return;}res.writeHead(404).end();}catch(error){res.writeHead(500).end(error.message);}});
let browser;
try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port,results=[];
 const webkitEngine=process.env.BANK_WEBKIT_MODULE?(await import(pathToFileURL(resolve(process.env.BANK_WEBKIT_MODULE)).href)).webkit:webkit;
 for(const engine of [chromium,webkitEngine].filter(engine=>!process.env.BANK_SOURCE_BROWSER||engine.name()===process.env.BANK_SOURCE_BROWSER)){
  browser=engine===chromium?await engine.launch({headless:true,...(process.env.BANK_BROWSER_EXECUTABLE?{executablePath:process.env.BANK_BROWSER_EXECUTABLE}:{})}):null;
  for(const mode of ['csr','ssr','saved']){
   const context=browser?await browser.newContext({viewport:{width:800,height:800}}):await engine.launchPersistentContext(join(work,'webkit-'+mode),{headless:true,viewport:{width:800,height:800}}),page=await context.newPage(),external=[],errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await context.route('**/*',route=>{const request=route.request(),url=new URL(request.url());if(url.origin===origin)return route.continue();external.push({url:url.href,type:request.resourceType()});if(mode!=='csr'&&url.href===fixture.oldest.artworkUrl)return route.fulfill({status:200,contentType:'image/png',body:Buffer.from(fixture.png,'base64')});return route.abort();});
   await page.goto(origin+'/seed');await page.evaluate(async f=>{try{await window.seed(f);}catch(error){throw Error('FIXTURE_SEED:'+String(error));}},fixture);
   await page.goto(origin+'/'+mode,{waitUntil:'load'});let before,after;
   if(mode!=='csr'){
    await page.locator('#settled img').waitFor();await page.waitForFunction(()=>document.querySelector('#settled img').naturalWidth===1);
    before=await page.locator('#settled').screenshot();await page.evaluate(()=>{window.__initialImage=document.querySelector('#settled img');window.__srcChanges=[];new MutationObserver(rows=>{for(const row of rows)if(row.type==='attributes')window.__srcChanges.push(row.target.getAttribute('src'));}).observe(window.__initialImage,{attributes:true,attributeFilter:['src']});window.__materialGate=new Promise(resolve=>window.__releaseMaterial=resolve);});
    external.length=0;await page.evaluate(()=>window.__hydrate());await page.waitForFunction(()=>window.__materialRequests>0&&document.querySelector('#settled img')===window.__initialImage);
    assert.deepEqual(await page.locator('#settled').screenshot(),before,'Hydration must preserve exact carried pixels while the local Source opens.');
    assert.equal(await page.locator('#settled img').getAttribute('src'),fixture.oldest.artworkUrl);await page.evaluate(()=>window.__releaseMaterial());
    await page.waitForFunction(()=>document.querySelector('#settled img').src.startsWith('blob:')&&document.querySelector('#settled img').naturalWidth===1,undefined,{timeout:90000});
    assert.equal(await page.evaluate(()=>document.querySelector('#settled img')===window.__initialImage),true);assert.equal(await page.evaluate(()=>window.__srcChanges.some(src=>!src)),false);
    after=await page.locator('#settled').screenshot();assert.deepEqual(after,before,'Source-bound local realization must preserve exact settled pixels.');
   }else{
    await page.evaluate(()=>window.__hydrate());await page.locator('.profile-collection-grid article').first().waitFor();
    await page.evaluate(()=>document.querySelector('button.profile-load-more')?.click());
    const oldest=page.locator('.profile-asset').filter({has:page.getByRole('link',{name:'Held Original 0',exact:true})});await oldest.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>[...document.querySelectorAll('.profile-asset')].find(row=>row.textContent.includes('Held Original 0')).querySelector('img')?.src.startsWith('blob:'),undefined,{timeout:90000});
    assert.equal(await page.locator('.profile-collection-grid article').count(),33);await oldest.screenshot({path:join(work,engine.name()+'-oldest-33.png')});
   }
   const media=await page.evaluate(()=>window.__readOldest());assert.equal(media.digest,fixture.oldest.originalDigest);assert.equal(media.text,'Exact text remains after display overflow.');assert.deepEqual(media.files.find(file=>file.kind==='image').bytes,[...Buffer.from(fixture.png,'base64')]);
   assert.deepEqual(external,[],'Known held Source must not make a new external request.');assert.deepEqual(errors,[]);
   if(before){await writeFile(join(work,engine.name()+'-'+mode+'-before.png'),before);await writeFile(join(work,engine.name()+'-'+mode+'-after.png'),after);}
   console.log('PASS',engine.name(),mode);results.push({engine:engine.name(),mode,realCanonicalSdk:true,heldSourceOutside32Locators:true,exactImageAndText:true,newExternalRequests:external.length,sameSsrImage:mode==='csr'?undefined:true,pixelSha256:before?createHash('sha256').update(before).digest('hex'):undefined});await context.close();
  }
  await browser?.close();browser=null;
 }
 await writeFile(join(work,'results.json'),JSON.stringify({passed:true,syntheticTrustRoots:true,transportFixture:true,results},null,2));console.log(JSON.stringify({passed:true,results},null,2));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
