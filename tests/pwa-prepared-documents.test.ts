import {expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import {runInNewContext} from 'node:vm';

const origin='https://bank.test',renderA='a'.repeat(64),renderB='b'.repeat(64),coordinate='c'.repeat(64),generation='d'.repeat(64);
const sha=(bytes:string|Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
type WorkerEvent={request?:Request;waitUntil?:(promise:Promise<unknown>)=>void;respondWith?:(promise:Promise<Response>)=>void;data?:unknown;ports?:{postMessage:(value:unknown)=>void}[];source?:{url:string}};
function platform(){
 const stores=new Map<string,Map<string,Response>>(),network=new Map<string,string>(),requests:Request[]=[];
 let api:(request:Request)=>Promise<Response>=async()=>new Response(null,{status:503});
 const href=(input:Request|string)=>new URL(typeof input==='string'?input:input.url,origin).href;
 const caches={open:async(name:string)=>{if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name)!;return {match:async(key:Request|string)=>store.get(href(key))?.clone(),put:async(key:Request|string,response:Response)=>{store.set(href(key),response.clone());},delete:async(key:Request|string)=>store.delete(href(key)),keys:async()=>[...store.keys()].map(key=>new Request(key))};},keys:async()=>[...stores.keys()],delete:async(name:string)=>stores.delete(name)};
 const fetch=async(input:Request|string)=>{const request=typeof input==='string'?new Request(href(input)):input;requests.push(request);let response:Response;if(new URL(request.url).pathname==='/api/explore')response=await api(request);else{const value=network.get(request.url);if(value===undefined)throw Error('OFFLINE');response=new Response(value,{headers:{'content-type':'text/html'}});}if(!response.url)Object.defineProperty(response,'url',{value:request.url});return response;};
 function worker(version='A',render=renderA,crypto=webcrypto){
  const values={'/index.html':`<html>Bank ${version}</html>`,'/explore/index.html':`<html>Explore ${version}</html>`,'/ledger/index.html':`<html>Ledger ${version}</html>`,'/feed/index.html':`<html>Feed ${version}</html>`,'/discover/index.html':`<html>Discover ${version}</html>`,'/assets/app.js':`app ${version}`,'/native/offline-notes.v129.mjs':`native ${version}`};
  for(const [path,body]of Object.entries(values))network.set(href(path),body);
  const routes={'/':'/index.html','/index.html':'/index.html','/explore/':'/explore/index.html','/explore':'/explore/index.html','/explorer/':'/explore/index.html','/ledger/':'/ledger/index.html','/ledger':'/ledger/index.html','/feed/':'/feed/index.html','/feed':'/feed/index.html','/discover/':'/discover/index.html','/discover':'/discover/index.html','/explore/music/':'/explore/index.html','/market-cap/':'/explore/index.html'};
  const resources=Object.fromEntries(Object.entries(values).map(([path,body])=>[path,{sha256:sha(body),bytes:Buffer.byteLength(body)}]));
  const handlers:Record<string,(event:WorkerEvent)=>void>={};let forced=false;
  const source=readFileSync('src/pwa/sw.template.js','utf8').replaceAll('__CACHE_VERSION__',version).replace('__SHELL_ASSETS__',JSON.stringify(Object.keys(values))).replace('__RESOURCE_HASHES__',JSON.stringify(resources)).replace('__PAGE_ROUTES__',JSON.stringify(routes)).replaceAll('__PUBLIC_RENDER_BUILD__',render);
  runInNewContext(source,{URL,Request,Response,Headers,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,Blob,AbortController,DOMException,ReadableStream,crypto,caches,fetch,setTimeout,clearTimeout,self:{location:{origin},addEventListener:(event:string,handler:typeof handlers[string])=>{handlers[event]=handler;},skipWaiting:()=>{forced=true;},clients:{claim:()=>{forced=true;}}}});
  async function lifetime(name:string){let promise:Promise<unknown>|undefined;handlers[name]!({waitUntil:work=>{promise=work;}});await promise;}
  async function load(path:string,{method='GET',navigate=false,signal}:{method?:string;navigate?:boolean;signal?:AbortSignal}={}){let promise:Promise<Response>|undefined;const request=new Request(href(path),{method,signal});if(navigate)Object.defineProperty(request,'mode',{value:'navigate'});handlers.fetch!({request,respondWith:work=>{promise=work;}});return promise;}
  async function status(){let promise:Promise<unknown>|undefined,result:unknown;handlers.message!({data:{type:'BANK_OFFLINE_STATUS',version:1},source:{url:origin+'/'},ports:[{postMessage:value=>{result=value;}}],waitUntil:work=>{promise=work;}});await promise;return result;}
  return {install:()=>lifetime('install'),activate:()=>lifetime('activate'),load,status,forced:()=>forced};
 }
 return {worker,stores,network,requests,api:(handler:typeof api)=>{api=handler;},reads:()=>requests.filter(request=>new URL(request.url).pathname==='/api/explore')};
}
function prepared(body:string|null='<html>New accepted public state</html>',extra:Record<string,string>={},status=200){return new Response(body,{status,headers:{'content-type':'text/html; charset=utf-8','x-receiz-public-render-build':renderA,'x-receiz-public-material-revision':generation,'x-receiz-public-html-sha256':sha(body??''),'x-receiz-public-html-state':'current','x-receiz-public-state-coordinate':coordinate,...extra}});}
async function installed(){const env=platform(),worker=env.worker();await worker.install();return {env,worker};}

it('delivers a complete same-render public append online without changing installed runtime or readiness',async()=>{
 const {env,worker}=await installed();env.api(async()=>prepared());const response=await worker.load('/explore/',{navigate:true});expect(await response!.text()).toBe('<html>New accepted public state</html>');expect(response!.headers.get('x-receiz-public-html-state')).toBe('current');
 expect(await env.stores.get('receiz-bank-A')!.get(origin+'/explore/index.html')!.clone().text()).toBe('<html>Explore A</html>');expect(await worker.status()).toMatchObject({ready:true,required:7,cached:7});expect(worker.forced()).toBe(false);
 expect(env.reads().map(request=>[new URL(request.url).searchParams.get('path'),new URL(request.url).searchParams.get('build'),request.credentials])).toEqual([['explore',renderA,'omit']]);
});
it('qualifies one cached full body with fresh HEAD and attaches only fresh current or retained labels',async()=>{
 const {env,worker}=await installed();env.api(async request=>request.method==='HEAD'?prepared(null,{'x-receiz-public-html-sha256':sha('<html>New accepted public state</html>'),'x-receiz-public-html-state':'retained','x-receiz-public-pending-state-coordinate':'e'.repeat(64)}):prepared());
 await worker.load('/feed/');const response=await worker.load('/feed/');expect(await response!.text()).toBe('<html>New accepted public state</html>');expect(response!.headers.get('x-receiz-public-html-state')).toBe('retained');expect(response!.headers.get('x-receiz-public-pending-state-coordinate')).toBe('e'.repeat(64));expect(env.reads().map(request=>request.method)).toEqual(['GET','HEAD']);
 const display=[...env.stores].filter(([key])=>key!=='receiz-bank-A');expect(display).toHaveLength(1);expect(display[0]![1].size).toBe(1);
});
it('uses a fresh complete GET when HEAD selects new material and restores an evicted display body without another install',async()=>{
 const {env,worker}=await installed();let body='<html>B</html>';env.api(async()=>prepared(body));await worker.load('/ledger/');body='<html>C</html>';expect(await(await worker.load('/ledger/'))!.text()).toBe(body);expect(env.reads().map(request=>request.method)).toEqual(['GET','HEAD','GET']);
 const display=[...env.stores].find(([name])=>name!=='receiz-bank-A')![1];display.clear();const restored=env.worker('A');expect(await(await restored.load('/ledger/'))!.text()).toBe(body);expect(env.reads().at(-1)!.method).toBe('GET');expect(env.stores.get('receiz-bank-A')!.size).toBe(7);
});
it('uses historical installed A on Source503 without qualifying cached B or overwriting either closure',async()=>{
 const {env,worker}=await installed();env.api(async()=>prepared());await worker.load('/explore/');env.api(async()=>new Response(null,{status:503}));const response=await worker.load('/explore/');expect(await response!.text()).toBe('<html>Explore A</html>');expect(response!.headers.has('x-receiz-public-html-state')).toBe(false);expect(env.reads().map(request=>request.method)).toEqual(['GET','HEAD']);
});
it('keeps a different complete waiting renderer out of A and activates only through the ordinary lifecycle',async()=>{
 const {env,worker}=await installed();const next=env.worker('B',renderB);await next.install();env.api(async()=>prepared('<html>Renderer B</html>',{'x-receiz-public-render-build':renderB}));expect(await(await worker.load('/',{navigate:true}))!.text()).toBe('<html>Bank A</html>');expect(await(await worker.load('/native/offline-notes.v129.mjs'))!.text()).toBe('native A');expect(next.forced()).toBe(false);expect(env.stores.has('receiz-bank-A')).toBe(true);await next.activate();expect(env.stores.has('receiz-bank-A')).toBe(false);
});
it.each([
 ['wrong build',{'x-receiz-public-render-build':renderB}],['wrong generation',{'x-receiz-public-material-revision':'invalid'}],['tampered body',{'x-receiz-public-html-sha256':'f'.repeat(64)}],['unqualified state',{'x-receiz-public-html-state':'pending'}],['retained without pending',{'x-receiz-public-html-state':'retained'}],['false current with pending',{'x-receiz-public-pending-state-coordinate':'e'.repeat(64)}],['wrong type',{'content-type':'application/json'}],['truncated body',{'content-length':'999'}],['declared oversized',{'content-length':String(32*1024*1024+1)}],
])('refuses %s without publishing a prepared body',async(_name,headers)=>{
 const {env,worker}=await installed();env.api(async()=>prepared('<html>not selected</html>',headers));expect(await(await worker.load('/feed/',{navigate:true}))!.text()).toBe('<html>Feed A</html>');expect([...env.stores].filter(([name])=>name!=='receiz-bank-A').every(([,store])=>store.size===0)).toBe(true);
});
it.each(['foreign','redirected','opaque'])('refuses %s prepared transport',async(kind)=>{
 const {env,worker}=await installed();env.api(async()=>{const response=prepared();Object.defineProperty(response,kind==='foreign'?'url':kind==='redirected'?'redirected':'type',{value:kind==='foreign'?'https://other.test/api/explore':kind==='redirected'?true:'opaque'});return response;});expect(await(await worker.load('/ledger/'))!.text()).toBe('<html>Ledger A</html>');
});
it('does not commit after successful headers if the body fails, and bounds actual chunks without Content-Length',async()=>{
 const {env,worker}=await installed();let cancelled=false;env.api(async()=>{const response=prepared();return new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('<html>'));controller.error(Error('TRUNCATED'));},cancel(){cancelled=true;}}),{headers:response.headers});});expect(await(await worker.load('/feed/'))!.text()).toBe('<html>Feed A</html>');
 env.api(async()=>new Response(new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(16*1024*1024));},cancel(){cancelled=true;}}),{headers:prepared().headers}));expect(await(await worker.load('/feed/'))!.text()).toBe('<html>Feed A</html>');expect(cancelled).toBe(true);expect([...env.stores].filter(([name])=>name!=='receiz-bank-A').every(([,store])=>store.size===0)).toBe(true);
});
it('bounds the whole response body deadline and cancels a stalled reader after fast headers',async()=>{
 vi.useFakeTimers();try{const {env,worker}=await installed();let reached!:()=>void,cancelled=false;const reading=new Promise<void>(resolve=>{reached=resolve;});env.api(async()=>new Response(new ReadableStream({pull(){reached();},cancel(){cancelled=true;}}),{headers:prepared().headers}));const pending=worker.load('/explore/');await reading;await vi.advanceTimersByTimeAsync(15001);expect(await(await pending)!.text()).toBe('<html>Explore A</html>');expect(cancelled).toBe(true);}finally{vi.useRealTimers();}
});
it('preserves incoming cancellation before headers and during body without delivering fallback or publishing',async()=>{
 const {env,worker}=await installed();let reached!:()=>void,cancelled=false;const reading=new Promise<void>(resolve=>{reached=resolve;});env.api(async()=>new Response(new ReadableStream({pull(){reached();},cancel(){cancelled=true;}}),{headers:prepared().headers}));const abort=new AbortController(),pending=worker.load('/feed/',{signal:abort.signal});await reading;abort.abort();await expect(pending).rejects.toMatchObject({name:'AbortError'});expect(cancelled).toBe(true);
 const stopped=new AbortController();stopped.abort();const before=env.reads().length;await expect(worker.load('/feed/',{signal:stopped.signal})).rejects.toMatchObject({name:'AbortError'});expect(env.reads()).toHaveLength(before);
});
it('delivers closed helper GET/HEAD and keeps ledger proof view distinct from All Activity',async()=>{
 const {env,worker}=await installed();env.api(async request=>request.method==='HEAD'?new Response(null,{headers:prepared().headers}):prepared());expect((await worker.load('/feed/'))!.status).toBe(200);const head=await worker.load('/ledger/',{method:'HEAD'});expect(head!.status).toBe(200);expect(head!.body).toBe(null);
 await worker.load('/ledger/proofs?source='+'1'.repeat(64),{navigate:true});expect(new URL(env.reads().at(-1)!.url).searchParams.get('path')).toBe('ledger/proofs');expect(new URL(env.reads().at(-1)!.url).searchParams.get('source')).toBe('1'.repeat(64));env.api(async()=>new Response(null,{status:503}));expect((await worker.load('/ledger/proofs',{navigate:true}))!.status).toBe(503);
});
it('keeps root account queries on the exact installed entry and leaves all private APIs, assets and non-GET methods alone',async()=>{
 const {env,worker}=await installed();env.api(async()=>prepared());expect(await(await worker.load('/?bankNotification=1&conversation=private#account/messages',{navigate:true}))!.text()).toBe('<html>Bank A</html>');expect(env.reads()).toHaveLength(0);
 const before=env.reads().length;for(const path of ['/api/wallet/me','/api/bank/native/fund','https://receiz.com/api/bank/notes','/feed/?private=1','/ledger/?source=invalid','/explore/?path=bank']){expect(await worker.load(path)).toBeUndefined();expect(await worker.load(path,{method:'POST'})).toBeUndefined();}expect(env.reads()).toHaveLength(before);
 expect(await(await worker.load('/explore/index.html'))!.text()).toBe('<html>Explore A</html>');expect(env.reads()).toHaveLength(before);
});
it('refuses a same-origin response for a different endpoint instead of treating origin alone as the selected path',async()=>{
 const {env,worker}=await installed();env.api(async()=>{const response=prepared();Object.defineProperty(response,'url',{value:origin+'/api/other'});return response;});expect(await(await worker.load('/explore/'))!.text()).toBe('<html>Explore A</html>');
});
it('bounds stalled headers as well as body and refuses invalid UTF8 even when the byte digest matches',async()=>{
 vi.useFakeTimers();try{const {env,worker}=await installed();let fetched!:()=>void;const called=new Promise<void>(resolve=>{fetched=resolve;});env.api(async()=>{fetched();return new Promise<Response>(()=>{});});const pending=worker.load('/feed/');await called;await vi.advanceTimersByTimeAsync(15001);expect(await(await pending)!.text()).toBe('<html>Feed A</html>');}finally{vi.useRealTimers();}
 const {env,worker}=await installed(),bytes=new Uint8Array([255]);env.api(async()=>new Response(bytes,{headers:prepared(null,{'x-receiz-public-html-sha256':sha(bytes)}).headers}));expect(await(await worker.load('/ledger/'))!.text()).toBe('<html>Ledger A</html>');
});
it('does not commit a response cancelled while the actual byte digest is completing',async()=>{
 const env=platform();let stop=false,hashed!:()=>void,resume!:()=>void;const reached=new Promise<void>(resolve=>{hashed=resolve;}),release=new Promise<void>(resolve=>{resume=resolve;});
 const crypto=new Proxy(webcrypto,{get(target,key){if(key!=='subtle')return Reflect.get(target,key);return new Proxy(target.subtle,{get(subtle,name){if(name==='digest')return async(...args:Parameters<typeof webcrypto.subtle.digest>)=>{const result=await subtle.digest(...args);if(stop){hashed();await release;}return result;};const value=Reflect.get(subtle,name);return typeof value==='function'?value.bind(subtle):value;}});}});
 const worker=env.worker('A',renderA,crypto);await worker.install();stop=true;env.api(async()=>prepared());const abort=new AbortController(),pending=worker.load('/feed/',{signal:abort.signal});const rejected=expect(pending).rejects.toMatchObject({name:'AbortError'});await reached;abort.abort();resume();await rejected;for(let i=0;i<10;i++)await Promise.resolve();expect([...env.stores].filter(([name])=>name!=='receiz-bank-A').every(([,store])=>store.size===0)).toBe(true);
});
it('keeps concurrent request cancellation independent and never overwrites a later completed page with an earlier delayed page',async()=>{
 const {env,worker}=await installed();let first!:()=>void,resume!:()=>void;const reached=new Promise<void>(resolve=>{first=resolve;}),release=new Promise<void>(resolve=>{resume=resolve;});let calls=0;
 env.api(async request=>{if(request.method==='HEAD')return prepared(null,{'x-receiz-public-html-sha256':sha('<html>C</html>')});if(++calls===1){first();await release;return prepared('<html>B</html>');}return prepared('<html>C</html>');});
 const before=worker.load('/feed/');await reached;expect(await(await worker.load('/feed/'))!.text()).toBe('<html>C</html>');resume();expect(await(await before)!.text()).toBe('<html>B</html>');expect(await(await worker.load('/feed/'))!.text()).toBe('<html>C</html>');expect(env.reads().map(request=>request.method)).toEqual(['GET','GET','HEAD']);
 let cancel!:()=>void;const waiting=new Promise<void>(resolve=>{cancel=resolve;});env.api(async request=>{if(new URL(request.url).searchParams.get('path')==='ledger'){cancel();return new Promise<Response>((_,reject)=>request.signal.addEventListener('abort',()=>reject(request.signal.reason),{once:true}));}return prepared();});const controller=new AbortController(),stopped=worker.load('/ledger/',{signal:controller.signal});const rejected=expect(stopped).rejects.toMatchObject({name:'AbortError'});await waiting;expect((await worker.load('/explore/'))!.status).toBe(200);controller.abort();await rejected;
});
it('fails closed on an absent renderer mapping and does not reuse a newer display cache after normal activation',async()=>{
 const env=platform(),missing=env.worker('A','invalid');await missing.install();env.api(async()=>prepared());expect(await(await missing.load('/',{navigate:true}))!.text()).toBe('<html>Bank A</html>');expect(env.reads()).toHaveLength(0);
 const current=env.worker('C',renderA);await current.install();await current.load('/feed/');const next=env.worker('D',renderB);await next.install();expect([...env.stores.keys()].some(name=>name.startsWith('bankeiz-public-pages-'))).toBe(true);await next.activate();expect([...env.stores.keys()].filter(name=>name.startsWith('bankeiz-public-pages-'))).toEqual([]);expect(next.forced()).toBe(false);
});
it.each([false,true])('rechecks persistent cached bytes before attaching a fresh Source receipt, including worker restart=%s',async(restart)=>{
 const {env,worker}=await installed(),body='<html>New accepted public state</html>';env.api(async request=>request.method==='HEAD'?prepared(null,{'x-receiz-public-html-sha256':sha(body)}):prepared());await worker.load('/feed/');
 const store=[...env.stores].find(([name])=>name!=='receiz-bank-A')![1],entry=[...store][0]!;store.set(entry[0],new Response('<html>Altered persistent bytes</html>',{headers:entry[1].headers}));
 const reader=restart?env.worker('A'):worker,response=await reader.load('/feed/');expect(await response!.text()).toBe(body);expect(response!.headers.get('x-receiz-public-html-sha256')).toBe(sha(body));expect(env.reads().map(request=>request.method)).toEqual(restart?['GET','HEAD','GET']:['GET','HEAD']);
});
it('admits a restored disk body once and reuses exact private immutable bytes without rehashing or unbounded retention',async()=>{
 const env=platform();let hashes=0;const crypto=new Proxy(webcrypto,{get(target,key){if(key!=='subtle')return Reflect.get(target,key);return new Proxy(target.subtle,{get(subtle,name){if(name==='digest')return async(...args:Parameters<typeof webcrypto.subtle.digest>)=>{hashes++;return subtle.digest(...args);};const value=Reflect.get(subtle,name);return typeof value==='function'?value.bind(subtle):value;}});}});
 const worker=env.worker('A',renderA,crypto);await worker.install();const body='<html>New accepted public state</html>';env.api(async request=>request.method==='HEAD'?prepared(null,{'x-receiz-public-html-sha256':sha(body)}):prepared());await worker.load('/feed/');const admitted=hashes;await worker.load('/feed/');expect(hashes,'fresh HEAD must not hash the exact owned Blob again').toBe(admitted);
 const restored=env.worker('A',renderA,crypto);await restored.load('/feed/');expect(hashes,'untrusted disk body receives one actual SHA check').toBe(admitted+1);await restored.load('/feed/');expect(hashes).toBe(admitted+1);
 await restored.load('/explore/');await restored.load('/ledger/');const before=hashes;await restored.load('/feed/');expect(hashes,'the oldest of three visited bodies was evicted from the two-body RAM bound').toBe(before+1);expect(env.reads().filter(request=>request.method==='GET'),'RAM eviction restores disk, not network or history').toHaveLength(3);
});
it('bounds private retained body bytes independently of the two-page count',async()=>{
 const env=platform();let hashes=0;const crypto=new Proxy(webcrypto,{get(target,key){if(key!=='subtle')return Reflect.get(target,key);return new Proxy(target.subtle,{get(subtle,name){if(name==='digest')return async(...args:Parameters<typeof webcrypto.subtle.digest>)=>{hashes++;return subtle.digest(...args);};const value=Reflect.get(subtle,name);return typeof value==='function'?value.bind(subtle):value;}});}});
 const worker=env.worker('A',renderA,crypto);await worker.install();const body='x'.repeat(17*1024*1024);env.api(async request=>request.method==='HEAD'?prepared(null,{'x-receiz-public-html-sha256':sha(body)}):prepared(body));await worker.load('/feed/');await worker.load('/explore/');const before=hashes;await worker.load('/feed/');expect(hashes,'two 17MiB bodies cannot both remain in a32MiB private held set').toBe(before+1);expect(env.reads().filter(request=>request.method==='GET'),'the evicted public body restores from disk without another source GET').toHaveLength(2);
});
it('checks decoded HTML bytes against Source SHA without mistaking gzip wire length for decoded length',async()=>{
 const {env,worker}=await installed(),body='<html>Compressed transport, exact decoded public state</html>';env.api(async()=>prepared(body,{'content-encoding':'gzip','content-length':'27'}));const response=await worker.load('/feed/');expect(await response!.text()).toBe(body);expect(response!.headers.get('x-receiz-public-html-sha256')).toBe(sha(body));expect(response!.headers.has('content-encoding')).toBe(false);expect(response!.headers.has('content-length')).toBe(false);
});
it('serves the exact installed cold entrance while a prepared Source would stall, with zero HEAD or GET',async()=>{
 const {env,worker}=await installed(),controller=new AbortController();env.api(async request=>new Promise<Response>((_resolve,reject)=>{request.signal.addEventListener('abort',()=>reject(request.signal.reason),{once:true});}));
 vi.useFakeTimers();const pending=worker.load('/',{navigate:true,signal:controller.signal}),settled=vi.fn();void pending.then(settled,()=>{});
 try{await vi.advanceTimersByTimeAsync(1);expect(env.reads()).toHaveLength(0);expect(settled).toHaveBeenCalledOnce();const response=await pending;expect(await response!.text()).toBe('<html>Bank A</html>');expect(response!.headers.has('x-receiz-public-html-state')).toBe(false);expect(worker.forced()).toBe(false);}
 finally{controller.abort();await Promise.allSettled([pending]);vi.useRealTimers();}
});
it.each([false,true])('ignores an old prepared Root cache instead of using its body or receipt for native entry; restart=%s',async restart=>{
 const {env,worker}=await installed(),key=origin+'/api/explore?path=bank-entry&build='+renderA;
 env.stores.set('bankeiz-public-pages-A',new Map([[key,prepared('<html>OLD PREPARED CATALOG, NOT THE NATIVE ENTRY</html>')]]));env.api(async()=>new Response(null,{status:403}));const reader=restart?env.worker('A'):worker;
 for(const path of ['/','/?bankNotification=1#account/messages','/index.html']){const response=await reader.load(path,{navigate:true});expect(await response!.text()).toBe('<html>Bank A</html>');expect([...response!.headers.keys()].some(name=>name.startsWith('x-receiz-public-'))).toBe(false);}
 expect(env.reads()).toHaveLength(0);expect(env.stores.get('receiz-bank-A')!.size).toBe(7);
});
it('restores an evicted static entrance only from exact immutable build bytes and refuses a different build',async()=>{
 const {env,worker}=await installed(),cache=env.stores.get('receiz-bank-A')!,before=env.requests.length;cache.delete(origin+'/index.html');
 expect(await(await worker.load('/',{navigate:true}))!.text()).toBe('<html>Bank A</html>');expect(env.requests.slice(before).map(request=>new URL(request.url).pathname)).toEqual(['/index.html']);expect(env.reads()).toHaveLength(0);
 cache.delete(origin+'/index.html');env.network.set(origin+'/index.html','<html>Bank X</html>');await expect(worker.load('/',{navigate:true})).rejects.toThrow('OFFLINE_RESOURCE_BUILD_MISMATCH');expect(cache.has(origin+'/index.html')).toBe(false);expect(env.reads()).toHaveLength(0);
});
it('keeps Root HEAD and the existing prepared Bank data endpoint outside worker interception',async()=>{
 const {env,worker}=await installed();expect(await worker.load('/',{method:'HEAD'})).toBeUndefined();expect(await worker.load('/api/explore?path=bank')).toBeUndefined();expect(env.reads()).toHaveLength(0);
 env.api(async()=>prepared('<html>Existing qualified public collection</html>'));const response=await worker.load('/explore/',{navigate:true});expect(await response!.text()).toBe('<html>Existing qualified public collection</html>');expect(env.reads().map(request=>new URL(request.url).searchParams.get('path'))).toEqual(['explore']);
});

it('opens Discover from the immutable static closure without any Source qualification, even when Source stalls',async()=>{
 const {env,worker}=await installed();env.api(async()=>new Promise<Response>(()=>{}));
 const response=await worker.load('/discover/',{navigate:true});
 expect(await response!.text()).toBe('<html>Discover A</html>');expect(env.reads()).toHaveLength(0);
 expect(response!.headers.has('x-receiz-public-html-state')).toBe(false);
 env.network.delete(origin+'/discover/index.html');
 expect(await(await worker.load('/discover/',{navigate:true}))!.text()).toBe('<html>Discover A</html>');expect(env.reads()).toHaveLength(0);
});
