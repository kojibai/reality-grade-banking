import {expect,it} from 'vitest';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildOfflineShell} from '../scripts/build-offline-shell.mjs';
import {writeOriginalsQualificationAssets} from '../scripts/originals-qualification-assets.mjs';

async function fixture(){
 const root=await mkdtemp(join(tmpdir(),'bank-guide-closure-'));
 const put=async(path:string,value:string)=>{await mkdir(join(root,path,'..'),{recursive:true});await writeFile(join(root,path),value);};
 await put('.vite/manifest.json',JSON.stringify({'index.html':{file:'assets/app.js'}}));await put('assets/app.js','installed bank');await put('proof-verifier/v129/verifier.js','verifier');
 const pages={'/learn/':{content:'All guides'},'/learn/guides/':{content:'Guide directory'}};
 await put('index.html',`<script id="receiz-navigation" type="application/json">${JSON.stringify({pages})}</script>`);await put('learn/index.html','<html>Learn</html>');await put('learn/guides/index.html','<html>All guides</html>');await put('learn/contact.js','contact');await put('learn/guide-directory.js',await readFile('public/learn/guide-directory.js','utf8'));
 const renderBuildFile=join(root,'render-build.json');await put('render-build.json',JSON.stringify({schema:'bank.public-market.render-build.v1',sha256:'a'.repeat(64)}));
 return {root,put,renderBuildFile,dispose:()=>rm(root,{recursive:true,force:true})};
}
it('retains the existing guide directory module when its route participates in the installed public shell',async()=>{
 const f=await fixture();try{const report=await buildOfflineShell(f.root,{fixed:[],renderBuildFile:f.renderBuildFile}),bytes=await readFile(join(f.root,'learn/guide-directory.js'));expect(report.resources.find(row=>row.url==='/learn/guide-directory.js')).toEqual({url:'/learn/guide-directory.js',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}finally{await f.dispose();}
});
it('retains the real producer entry and every emitted lazy module, refusing altered metadata and excluding stale files',async()=>{
 const f=await fixture();try{
  const result=await writeOriginalsQualificationAssets(f.root);await f.put('learn/index.html','<html><head>'+result.head+'</head><body>Guide</body></html>');await f.put('learn/originals-qualification-main-STALE.js','unrelated stale output');
  const manifest=JSON.parse(await readFile(join(f.root,'learn/originals-qualification.modules.json'),'utf8')) as {version:number;entry:string;resources:{url:string;sha256:string;bytes:number}[]};expect(manifest.resources.some(row=>row.url===manifest.entry)).toBe(true);
  const report=await buildOfflineShell(f.root,{fixed:[],renderBuildFile:f.renderBuildFile});for(const row of manifest.resources){const bytes=await readFile(join(f.root,row.url.slice(1)));expect(report.resources.find(value=>value.url===row.url)).toEqual({url:row.url,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}expect(report.resources.some(row=>row.url.includes('STALE'))).toBe(false);
  const saved=structuredClone(manifest);manifest.resources[0]!.sha256='f'.repeat(64);await f.put('learn/originals-qualification.modules.json',JSON.stringify(manifest));await expect(buildOfflineShell(f.root,{fixed:[],renderBuildFile:f.renderBuildFile})).rejects.toThrow('OFFLINE_PUBLIC_MODULE_MISMATCH');
  saved.resources[0]!.url='/api/private';await f.put('learn/originals-qualification.modules.json',JSON.stringify(saved));await expect(buildOfflineShell(f.root,{fixed:[],renderBuildFile:f.renderBuildFile})).rejects.toThrow('OFFLINE_PUBLIC_MODULE_MISMATCH');
 }finally{await f.dispose();}
});
it.each(['/receiving/','/invitation/'])('retains the complete %s extension without an invitation payload or account dependency',async path=>{
 const f=await fixture();try{const {build}=await import('esbuild'),result=await build({entryPoints:['src/adoption/receiving-public.ts'],bundle:true,platform:'browser',format:'esm',target:'es2022',minify:true,write:false}),runtime=result.outputFiles[0]!.text;await f.put('learn/receiving.js',runtime);await f.put(path.slice(1)+'index.html','<main>Receive directly.</main>');await f.put('index.html','<script id="receiz-navigation" type="application/json">'+JSON.stringify({pages:{[path]:{content:'<main data-receiving>Receive directly.</main>'}}})+'</script>');
  const report=await buildOfflineShell(f.root,{fixed:[],renderBuildFile:f.renderBuildFile});expect(report.resources.find(row=>row.url==='/learn/receiving.js')).toEqual({url:'/learn/receiving.js',bytes:Buffer.byteLength(runtime),sha256:createHash('sha256').update(runtime).digest('hex')});expect(report.pages[path]).toBe('/learn/');expect(runtime).not.toMatch(/\bfetch\(/);expect(JSON.stringify(report)).not.toContain('#invite=');
 }finally{await f.dispose();}
});
