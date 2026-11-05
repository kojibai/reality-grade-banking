// @vitest-environment node
import{readFileSync}from'node:fs';
import{createHash,webcrypto}from'node:crypto';
import{runInNewContext}from'node:vm';
import{transformSync}from'esbuild';
import{expect,it}from'vitest';
// Reuse the existing CacheStorage/network fixture with the real unchanged
// worker and real WebCrypto. No SDK, account or financial code is imported.
const original=readFileSync('tests/pwa-prepared-documents.test.ts','utf8');
const measured=original.slice(original.indexOf('const origin='),original.indexOf("\nit('delivers")).replace('function platform(){','function platform(){let cacheOpens=0;').replace('open:async(name:string)=>{','open:async(name:string)=>{cacheOpens++;').replace('return {worker,stores,network,requests,','return {cacheOpens:()=>cacheOpens,worker,stores,network,requests,');
const harness=transformSync(measured,{loader:'ts',target:'es2022'}).code;
let digestCalls=0;const measuredCrypto={subtle:{digest:(...args:Parameters<typeof webcrypto.subtle.digest>)=>{digestCalls++;return webcrypto.subtle.digest(...args);}}};
type Worker={install():Promise<void>;load(path:string,options?:{navigate?:boolean;method?:string;signal?:AbortSignal}):Promise<Response|undefined>};
type Platform={cacheOpens():number;worker():Worker;api(handler:(request:Request)=>Promise<Response>):void;reads():Request[];stores:Map<string,Map<string,Response>>};
const fixture=new Function('readFileSync','createHash','webcrypto','runInNewContext',harness+';return{platform,prepared};')(readFileSync,createHash,measuredCrypto,runInNewContext)as{platform():Platform;prepared(body?:string|null,extra?:Record<string,string>,status?:number):Response};
async function held(){const env=fixture.platform(),worker=env.worker();await worker.install();env.api(async()=>fixture.prepared('<html>Complete held B</html>'));expect(await(await worker.load('/explore/'))!.text()).toBe('<html>Complete held B</html>');return{env,worker};}
const turn=()=>new Promise<void>(resolve=>setImmediate(resolve));
for(const restore of[false,true])it(`opens known same-build historical B without a Source call while Source stalls (${restore?'CacheStorage restart':'private RAM'})`,async()=>{
 const f=await held(),worker=restore?f.env.worker():f.worker,before=f.env.reads().length,opens=f.env.cacheOpens(),hashes=digestCalls,abort=new AbortController();f.env.api(()=>new Promise<Response>(()=>{}));let settled=false;
 const pending=worker.load('/explore/',{navigate:true,signal:abort.signal}).then(response=>{settled=true;return response;});void pending.catch(()=>{});
 try{for(let i=0;i<12;i++)await turn();expect(f.env.reads().slice(before)).toEqual([]);expect(f.env.cacheOpens()).toBe(opens+(restore?1:0));expect(digestCalls).toBe(hashes+(restore?1:0));expect(settled).toBe(true);const response=(await pending)!;expect(await response.text()).toBe('<html>Complete held B</html>');expect(response.headers.get('x-receiz-public-html-state')).toBe('historical');
  const admittedOpens=f.env.cacheOpens(),admittedHashes=digestCalls;expect(await(await worker.load('/explore/',{navigate:true}))!.text()).toBe('<html>Complete held B</html>');expect(f.env.cacheOpens()).toBe(admittedOpens);expect(digestCalls).toBe(admittedHashes);expect(f.env.reads().slice(before)).toEqual([]);
  for(const name of ['material-revision','render-build','html-sha256','state-coordinate','pending-state-coordinate'])expect(response.headers.has('x-receiz-public-'+name)).toBe(false);
 }finally{abort.abort();}
});
it('keeps an unavailable Source out of held navigation and leaves the qualified cache receipt intact for later fetches',async()=>{
 const f=await held(),before=f.env.reads().length;f.env.api(async()=>new Response(null,{status:503}));const response=(await f.worker.load('/explore/',{navigate:true}))!;expect(await response.text()).toBe('<html>Complete held B</html>');expect(f.env.reads()).toHaveLength(before);
 const saved=[...f.env.stores.entries()].find(([name])=>name.startsWith('bankeiz-public-pages-'))![1];expect([...saved.values()][0].headers.get('x-receiz-public-html-state')).toBe('current');
});
it('still qualifies helper GET and HEAD after local historical navigation, without borrowing its stripped verdict',async()=>{
 const f=await held();await f.worker.load('/explore/',{navigate:true});const before=f.env.reads().length;
 const b=fixture.prepared('<html>Complete held B</html>');f.env.api(async request=>request.method==='HEAD'?new Response(null,{headers:b.headers}):b.clone());
 const response=(await f.worker.load('/explore/'))!;expect(response.headers.get('x-receiz-public-html-state')).toBe('current');expect(await response.text()).toBe('<html>Complete held B</html>');const head=(await f.worker.load('/explore/',{method:'HEAD'}))!;expect(head.headers.get('x-receiz-public-html-state')).toBe('current');expect(f.env.reads().slice(before).map(r=>r.method)).toEqual(['HEAD','HEAD']);
});
it.each(['tampered','wrong build','truncated']as const)('refuses %s disk bytes and uses the existing bounded reader/fallback',async(kind)=>{
 const f=await held(),store=[...f.env.stores.entries()].find(([name])=>name.startsWith('bankeiz-public-pages-'))![1],[key,saved]=[...store.entries()][0],headers=new Headers(saved.headers);
 if(kind==='wrong build')headers.set('x-receiz-public-render-build','f'.repeat(64));if(kind==='truncated')headers.set('content-length','999');store.set(key,new Response(kind==='tampered'?'<html>Altered</html>':'<html>Complete held B</html>',{headers}));
 const worker=f.env.worker(),before=f.env.reads().length;f.env.api(async()=>new Response(null,{status:503}));expect(await(await worker.load('/explore/',{navigate:true}))!.text()).toBe('<html>Explore A</html>');expect(f.env.reads().length).toBeGreaterThan(before);
});
it('uses the existing complete qualified reader when no held body exists',async()=>{
 const env=fixture.platform(),worker=env.worker();await worker.install();env.api(async()=>fixture.prepared('<html>New C</html>'));const response=(await worker.load('/feed/',{navigate:true}))!;expect(await response.text()).toBe('<html>New C</html>');expect(response.headers.get('x-receiz-public-html-state')).toBe('current');expect(env.reads().map(r=>r.method)).toEqual(['GET']);
});
it('preserves cancellation and excludes account and financial API requests from either public cache path',async()=>{
 const f=await held(),before=f.env.reads().length,stop=new AbortController();stop.abort();await expect(f.worker.load('/explore/',{navigate:true,signal:stop.signal})).rejects.toMatchObject({name:'AbortError'});
 for(const path of ['/api/connect/account-proof','/api/connect/bank/assets/portfolio','/api/ledger/proof'])expect(await f.worker.load(path)).toBeUndefined();expect(f.env.reads()).toHaveLength(before);
});
