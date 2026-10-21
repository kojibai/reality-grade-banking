import {expect,it,vi} from 'vitest';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

it('reuses the exact installed verifier for its build URL without another fetch, and refuses mismatched or extra queries',async()=>{
 const path='/proof-verifier/v129/verifier.js',digest='a'.repeat(64),listeners=new Map<string,(event:unknown)=>void>(),match=vi.fn(async()=>new Response('installed exact verifier')),fetch=vi.fn(()=>{throw Error('unexpected network');});
 const template=await readFile(new URL('../src/pwa/sw.template.js',import.meta.url),'utf8');
 const script=template.replaceAll('__CACHE_VERSION__','test-build').replace('__SHELL_ASSETS__',JSON.stringify([path])).replace('__RESOURCE_HASHES__',JSON.stringify({[path]:{sha256:digest,bytes:24}})).replace('__PAGE_ROUTES__','{}');
 runInNewContext(script,{URL,Request,Response,fetch,self:{location:{origin:'https://bankeiz.com'},addEventListener:(name:string,handler:(event:unknown)=>void)=>listeners.set(name,handler)},caches:{open:async()=>({match})}});
 let response:Promise<Response>|undefined;
 const request=(suffix:string):Promise<Response>|undefined=>{response=undefined;listeners.get('fetch')!({request:new Request('https://bankeiz.com'+path+suffix),respondWith:(result:Promise<Response>)=>{response=result;}});return response;};
 expect(await(await request('?build='+digest))?.text()).toBe('installed exact verifier');expect(match).toHaveBeenCalledExactlyOnceWith(path,{ignoreVary:true});expect(fetch).not.toHaveBeenCalled();
 expect(request('?build='+'b'.repeat(64))).toBeUndefined();expect(request('?build='+digest+'&extra=1')).toBeUndefined();expect(request('?build='+digest+'&build='+digest)).toBeUndefined();expect(match).toHaveBeenCalledOnce();
});
