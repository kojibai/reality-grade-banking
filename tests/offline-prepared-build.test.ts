import {expect,it} from 'vitest';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const digest=(body:string)=>createHash('sha256').update(body).digest('hex');
async function fixture(){
 const directory=await mkdtemp(join(tmpdir(),'bank-prepared-installer-'));
 const put=async(path:string,body:string)=>{await mkdir(join(directory,path,'..'),{recursive:true});await writeFile(join(directory,path),body);};
 const paths=['explore','ledger','feed','discover'];
 await put('.vite/manifest.json',JSON.stringify(Object.fromEntries(['index.html',...paths.map(path=>`${path}/index.html`)].map(path=>[path,{file:'assets/app.js'}]))));
 const pages=Object.fromEntries([...paths.map(path=>`/${path}/`),'/learn/','/learn/guides/'].map(path=>[path,{content:path}]));
 await put('index.html',`<script id="receiz-navigation" type="application/json">${JSON.stringify({pages})}</script>`);
 for(const path of [...paths,'learn','learn/guides'])await put(`${path}/index.html`,'<html>immutable '+path+'</html>');
 await put('assets/app.js','app');await put('proof-verifier/v129/verifier.js','verifier');await put('learn/contact.js','contact');await put('learn/guide-directory.js','directory');
 const renderBuildFile=join(directory,'render-build.json');await put('render-build.json',JSON.stringify({schema:'bank.public-market.render-build.v1',sha256:'a'.repeat(64),files:[]}));
 return {directory,put,renderBuildFile,dispose:()=>rm(directory,{recursive:true,force:true})};
}
it('installs four physical documents while canonical public routes remain logical current reads and renderer64 binds offline version24',async()=>{
 const f=await fixture();try{const {buildOfflineShell}=await import('../scripts/build-offline-shell.mjs');const first=await buildOfflineShell(f.directory,{fixed:[],renderBuildFile:f.renderBuildFile});
  for(const path of ['explore','ledger','feed','discover']){expect(first.resources.some((row:{url:string})=>row.url===`/${path}/index.html`)).toBe(true);expect(first.resources.some((row:{url:string})=>row.url===`/${path}/`)).toBe(false);expect(first.pages[`/${path}/`]).toBe(`/${path}/index.html`);}
  expect(first.publicRenderBuild).toBe('a'.repeat(64));expect(first.resources.some((row:{url:string})=>row.url==='/learn/guide-directory.js')).toBe(true);
  const worker=await readFile(join(f.directory,'sw.js'),'utf8');expect(worker).toContain("const PUBLIC_RENDER_BUILD = '"+'a'.repeat(64)+"'");
  await f.put('render-build.json',JSON.stringify({schema:'bank.public-market.render-build.v1',sha256:'b'.repeat(64),files:[]}));const second=await buildOfflineShell(f.directory,{fixed:[],renderBuildFile:f.renderBuildFile});expect(second.version).not.toBe(first.version);expect(second.resources).toEqual(first.resources);
 }finally{await f.dispose();}
});
it('uses actual tour emitted modules as the exact lazy closure and refuses altered module metadata',async()=>{
 const f=await fixture();try{const {buildOfflineShell}=await import('../scripts/build-offline-shell.mjs');const module='/learn/originals-qualification-main-TEST.js',chunk='/learn/originals-qualification-chunk-CHUNK.js';await f.put('learn/index.html','<script src="/learn/originals-qualification.js?v=one"></script>');await f.put('learn/originals-qualification.js','import("'+module+'")');await f.put(module.slice(1),'tour');await f.put(chunk.slice(1),'lazy verifier');await f.put('learn/originals-qualification-main-STALE.js','stale');
  const manifest={version:1,entry:module,resources:[{url:module,sha256:digest('tour'),bytes:4},{url:chunk,sha256:digest('lazy verifier'),bytes:13}]};await f.put('learn/originals-qualification.modules.json',JSON.stringify(manifest));const report=await buildOfflineShell(f.directory,{fixed:[],renderBuildFile:f.renderBuildFile});
  for(const path of [module,chunk])expect(report.resources.some((row:{url:string})=>row.url===path)).toBe(true);expect(report.resources.some((row:{url:string})=>row.url.includes('STALE'))).toBe(false);
  manifest.resources[0]!.sha256='f'.repeat(64);await f.put('learn/originals-qualification.modules.json',JSON.stringify(manifest));await expect(buildOfflineShell(f.directory,{fixed:[],renderBuildFile:f.renderBuildFile})).rejects.toThrow('OFFLINE_PUBLIC_MODULE_MISMATCH');
 }finally{await f.dispose();}
});
it('refuses missing or malformed actual renderer bindings instead of guessing an offline-version match',async()=>{
 const f=await fixture();try{const {buildOfflineShell}=await import('../scripts/build-offline-shell.mjs');await f.put('render-build.json',JSON.stringify({schema:'bank.public-market.render-build.v1',sha256:'a'.repeat(24)}));await expect(buildOfflineShell(f.directory,{fixed:[],renderBuildFile:f.renderBuildFile})).rejects.toThrow('OFFLINE_PUBLIC_RENDER_BUILD_REQUIRED');
 }finally{await f.dispose();}
});
