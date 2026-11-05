// @vitest-environment node
import {access,mkdtemp,mkdir,writeFile,readFile,realpath,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'vite';
import {expect,it,vi} from 'vitest';
import {publicRuntimeExportsPlugin} from '../scripts/public-runtime-exports.mjs';

it('keeps both mount APIs on the actual three HTML-script entries, with CSS and one cached startup, without changing Bank exports',async()=>{
 const root=await realpath(await mkdtemp(join(tmpdir(),'bank-public-runtime-exports-'))),names=['discover','feed','explore'],input:Record<string,string>={};
 try{
  await writeFile(join(root,'package.json'),'{"type":"module"}');await writeFile(join(root,'shared.js'),'export const exact=value=>value;');await writeFile(join(root,'shared.css'),'.held-runtime{color:navy}');
  for(const name of [...names,'bank']){
   const directory=name==='bank'?root:join(root,name);await mkdir(directory,{recursive:true});input[name]=join(directory,'index.html');
   const actualSources:Record<string,string>={discover:'/src/public-discover/main.tsx',feed:'/src/public-feed/main.tsx',explore:'/src/public-explorer/main.tsx'};
   const repositoryHtml=name==='bank'?null:await readFile(new URL('../'+name+'/index.html',import.meta.url),'utf8');
   const source=repositoryHtml?repositoryHtml.match(/<script\b[^>]*type="module"[^>]*src="([^"]+)"/)![1]:'/bank.js';
   if(name!=='bank'){expect(source).toBe(actualSources[name]);await access(new URL('..'+source,import.meta.url));}
   await writeFile(input[name],`<!doctype html><html><head><title>${name}</title><script type="module" src="${source}"></script></head><body><main>Held ${name}</main></body></html>`);
   const file=join(root,source.slice(1));await mkdir(join(file,'..'),{recursive:true});
   await writeFile(file,`import {exact} from "${name==='bank'?'./':'../../'}shared.js";import "${name==='bank'?'./':'../../'}shared.css";globalThis.__publicRuntimeExportStarts["${name}"]++;export function mountHeldPublicDocument(root,held){root.held=exact(held);return root;}export function mountPublicDocument(root){root.documentMounts=(root.documentMounts??0)+1;return root;}`);
  }
  await build({root,configFile:false,logLevel:'silent',plugins:[publicRuntimeExportsPlugin()],build:{outDir:join(root,'dist'),manifest:true,rollupOptions:{input}}});
  vi.stubGlobal('document',{createElement:()=>({relList:{supports:()=>true}})});const starts=Object.fromEntries([...names,'bank'].map(name=>[name,0]));vi.stubGlobal('__publicRuntimeExportStarts',starts);
  for(const name of [...names,'bank']){
   const html=await readFile(join(root,'dist',name==='bank'?'index.html':name+'/index.html'),'utf8'),script=html.match(/<script\b[^>]*src="([^"]+)"/)!;
   expect(script).not.toBeNull();const url=pathToFileURL(join(root,'dist',script[1].slice(1))).href,module=await import(/* @vite-ignore */url);
   expect(html).toMatch(/<link rel="stylesheet"[^>]*href="\/assets\//);
   if(name==='bank'){expect(module.mountHeldPublicDocument).toBeUndefined();expect(module.mountPublicDocument).toBeUndefined();}
   else{expect(Object.keys(module)).toEqual(expect.arrayContaining(['mountHeldPublicDocument','mountPublicDocument']));const target:Record<string,unknown>={},held={catalog:{items:[]},generation:'a'.repeat(64)};expect(module.mountHeldPublicDocument(target,held)).toBe(target);expect(target.held).toBe(held);expect(module.mountPublicDocument(target)).toBe(target);expect(target.documentMounts).toBe(1);}
   expect(await import(/* @vite-ignore */url)).toBe(module);expect(starts[name]).toBe(1);
  }
 }finally{vi.unstubAllGlobals();await rm(root,{recursive:true,force:true});}
});
