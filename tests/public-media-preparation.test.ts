// @vitest-environment happy-dom
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {openProofMedia,retainedPublicMedia,type ProofMediaSource} from '../src/receiz/proof-media';
const ports=vi.hoisted(()=>({load:vi.fn(),read:vi.fn()}));
vi.mock('../src/receiz/ledger-offline-proof',()=>({loadOfflineProofVerifier:ports.load}));
const deferred=<T,>()=>{let resolve!:(v:T)=>void,reject!:(e:unknown)=>void;return{promise:new Promise<T>((a,b)=>{resolve=a;reject=b;}),resolve,reject};};
let sequence=100;
function source():Extract<ProofMediaSource,{kind:'public'}>{const digest=(sequence++).toString(16).padStart(64,'0');return{kind:'public',digest,url:`https://receiz.com/api/proof-material/packages/${digest}/artifact`};}
function original(digest:string){const bytes=new TextEncoder().encode('Exact original content');return{report:{schema:'bankeiz.offline-proof-inspection.v1',sdk:'129.0.0',artifactSha256:digest,artifactBytes:1,payloadSha256:'f'.repeat(64),payloadBytes:bytes.length,payloadFilename:'original.txt',payloadMimeType:'text/plain',verification:{ok:true,integrity:{ok:true}},groth16:null,scope:'Controlled canonical read'},payload:{bytes,filename:'original.txt',mimeType:'text/plain',sha256:'f'.repeat(64)}};}
beforeEach(()=>{ports.load.mockReset().mockResolvedValue({readArtifact:ports.read});ports.read.mockReset();});
afterEach(()=>vi.restoreAllMocks());
it('loads the existing verifier beside the same exact-byte download',async()=>{
 const selected=source(),gate=deferred<Response>(),fetch=vi.spyOn(globalThis,'fetch').mockReturnValue(gate.promise);ports.read.mockResolvedValue(original(selected.digest));
 const opening=openProofMedia(selected);try{await vi.waitFor(()=>expect(fetch).toHaveBeenCalledOnce());expect(ports.load).toHaveBeenCalledOnce();expect(ports.read).not.toHaveBeenCalled();}finally{gate.resolve(new Response(new Uint8Array([1])));await opening;}
 expect((await opening).files[0].text).toBe('Exact original content');expect(ports.read).toHaveBeenCalledOnce();
});
it('shares two simultaneous identical public opens and reuses their settled projection',async()=>{
 const selected=source(),gate=deferred<void>(),fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>{await gate.promise;return new Response(new Uint8Array([1]));});ports.read.mockResolvedValue(original(selected.digest));
 const a=openProofMedia(selected),b=openProofMedia({...selected});try{await vi.waitFor(()=>expect(fetch).toHaveBeenCalled());expect(fetch).toHaveBeenCalledOnce();}finally{gate.resolve();await Promise.all([a,b]);}
 expect((await a).files[0].text).toBe('Exact original content');expect(await b).toBe(await a);expect(ports.read).toHaveBeenCalledOnce();expect(await openProofMedia(selected)).toBe(await a);expect(fetch).toHaveBeenCalledOnce();
});
it('canceling one reader rejects it immediately while the other retains the same request',async()=>{
 const selected=source(),gate=deferred<Response>(),a=new AbortController(),b=new AbortController();let transport:AbortSignal|undefined;
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async(_url,init)=>{transport=init?.signal as AbortSignal;return gate.promise;});ports.read.mockResolvedValue(original(selected.digest));
 let canceled=false;const first=openProofMedia(selected,a.signal),second=openProofMedia({...selected},b.signal),refused=first.then(()=>{throw Error('Canceled reader resolved');},cause=>{expect(cause).toMatchObject({name:'AbortError'});canceled=true;});
 await vi.waitFor(()=>expect(fetch).toHaveBeenCalled());a.abort();try{await vi.waitFor(()=>expect(canceled).toBe(true),{timeout:300});expect(transport?.aborted).toBe(false);}finally{gate.resolve(new Response(new Uint8Array([1])));await Promise.allSettled([refused,second]);}
 expect((await second).files[0].text).toBe('Exact original content');expect(fetch).toHaveBeenCalledOnce();expect(ports.read).toHaveBeenCalledOnce();
});
it('aborts the shared download only after every reader leaves and permits a fresh retry',async()=>{
 const selected=source(),a=new AbortController(),b=new AbortController();let transport:AbortSignal|undefined;
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async(_url,init)=>new Promise<Response>((_resolve,reject)=>{transport=init?.signal as AbortSignal;transport.addEventListener('abort',()=>reject(transport!.reason),{once:true});}));ports.read.mockResolvedValue(original(selected.digest));
 const first=openProofMedia(selected,a.signal),second=openProofMedia(selected,b.signal),results=Promise.allSettled([first,second]);await vi.waitFor(()=>expect(fetch).toHaveBeenCalled());a.abort();b.abort();
 const rejected=await results;expect(rejected.every(row=>row.status==='rejected')).toBe(true);expect(transport?.aborted).toBe(true);expect(ports.read).not.toHaveBeenCalled();expect(retainedPublicMedia(selected)).toBeNull();
 fetch.mockResolvedValue(new Response(new Uint8Array([1])));expect((await openProofMedia(selected)).files[0].text).toBe('Exact original content');expect(fetch).toHaveBeenCalledTimes(2);
});
it('does not publish late media when every reader cancels during verifier preparation',async()=>{
 const selected=source(),gate=deferred<{readArtifact:typeof ports.read}>(),abort=new AbortController();ports.load.mockReturnValue(gate.promise);ports.read.mockResolvedValue(original(selected.digest));vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(new Uint8Array([1])));
 const opening=openProofMedia(selected,abort.signal),rejected=expect(opening).rejects.toMatchObject({name:'AbortError'});await vi.waitFor(()=>expect(ports.load).toHaveBeenCalledOnce());abort.abort();gate.resolve({readArtifact:ports.read});await rejected;await new Promise(resolve=>setTimeout(resolve,0));expect(retainedPublicMedia(selected)).toBeNull();expect(ports.read).not.toHaveBeenCalled();
});
it('shares a failure without retaining it or preventing an explicit retry',async()=>{
 const selected=source(),fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(new Uint8Array([1])));ports.read.mockRejectedValue(Error('bad enclosing proof'));
 const results=await Promise.allSettled([openProofMedia(selected),openProofMedia(selected)]);expect(results.every(row=>row.status==='rejected')).toBe(true);expect(retainedPublicMedia(selected)).toBeNull();expect(fetch).toHaveBeenCalledOnce();
 fetch.mockResolvedValue(new Response(new Uint8Array([1])));ports.read.mockResolvedValue(original(selected.digest));expect((await openProofMedia(selected)).files[0].text).toBe('Exact original content');expect(fetch).toHaveBeenCalledTimes(2);
});
it('never shares a private held source or a different public reading context',async()=>{
 const selected=source(),fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>new Response(new Uint8Array([1])));ports.read.mockResolvedValue(original(selected.digest));
 await Promise.all([openProofMedia(selected),openProofMedia({...selected,postUrl:'https://receiz.com/post/first'}),openProofMedia({...selected,hasLongForm:true}),openProofMedia({...selected,url:'https://receiz.com/api/proof-material/packages/'+'e'.repeat(64)+'/artifact'})]);expect(fetch).toHaveBeenCalledTimes(4);
 const held={kind:'held' as const,bytes:new Uint8Array([1]),filename:'private.receiz',digest:selected.digest};await Promise.all([openProofMedia(held),openProofMedia(held)]);expect(ports.read).toHaveBeenCalledTimes(6);
});
it('preserves digest mismatch and malformed-source rejection before exposing media',async()=>{
 const selected=source(),fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(new Uint8Array([1])));ports.read.mockResolvedValue(original('f'.repeat(64)));
 await expect(openProofMedia(selected)).rejects.toThrow('match');expect(retainedPublicMedia(selected)).toBeNull();ports.load.mockClear();fetch.mockClear();
 await expect(openProofMedia({...source(),url:'https://foreign.invalid/private'})).rejects.toThrow();expect(fetch).not.toHaveBeenCalled();expect(ports.load).not.toHaveBeenCalled();
});
it('rejects an already-canceled reader without starting preparation',()=>{
 const selected=source(),abort=new AbortController();abort.abort();const fetch=vi.spyOn(globalThis,'fetch');expect(()=>openProofMedia(selected,abort.signal)).toThrow();expect(fetch).not.toHaveBeenCalled();expect(ports.load).not.toHaveBeenCalled();
});
it('preserves a delayed purchase-required source result when verifier loading fails first',async()=>{
 const selected=source(),gate=deferred<Response>();vi.spyOn(globalThis,'fetch').mockReturnValue(gate.promise);ports.load.mockRejectedValue(Error('verifier startup failed'));let settled=false;
 const outcome=openProofMedia(selected).then(value=>{settled=true;return value;},cause=>{settled=true;return cause;});
 try{await new Promise(resolve=>setTimeout(resolve,0));expect(settled).toBe(false);}finally{gate.resolve(new Response('{}',{status:402}));}
 expect((await outcome).name).toBe('PublicOriginalPurchaseRequired');expect(retainedPublicMedia(selected)).toBeNull();expect(ports.read).not.toHaveBeenCalled();
});
it('last-reader cancellation still aborts a pending source after early verifier loading failure',async()=>{
 const selected=source(),abort=new AbortController();let transport:AbortSignal|undefined;
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async(_url,init)=>new Promise<Response>((_resolve,reject)=>{transport=init?.signal as AbortSignal;transport.addEventListener('abort',()=>reject(transport!.reason),{once:true});}));ports.load.mockRejectedValue(Error('verifier startup failed'));
 const outcome=openProofMedia(selected,abort.signal).catch(e=>e);await vi.waitFor(()=>expect(fetch).toHaveBeenCalledOnce());await new Promise(resolve=>setTimeout(resolve,0));abort.abort();expect((await outcome).name).toBe('AbortError');expect(transport?.aborted).toBe(true);expect(retainedPublicMedia(selected)).toBeNull();
});
