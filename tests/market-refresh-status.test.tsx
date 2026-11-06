// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const roots:Root[]=[];
beforeEach(()=>{vi.resetModules();localStorage.clear();document.body.replaceChildren();history.replaceState(null,'','/');vi.spyOn(document,'visibilityState','get').mockReturnValue('visible');vi.stubGlobal('Worker',undefined);});
afterEach(async()=>{for(const root of roots.splice(0))await act(()=>root.unmount());vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();});
function deferred<T>(){let resolve!:(v:T)=>void,reject!:(e:unknown)=>void;const promise=new Promise<T>((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};}
const membership=()=>({ok:true,transport:{generatedAt:'2026-11-06T15:10:00Z',publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:1,revision:'held-synthetic'},publicOriginals:[{id:'synthetic-item',receizId:'synthetic-asset',title:'Synthetic held item',valueUsd:10,pulse:'14710000',livePulseSeed:{kind:'sigil',claimPulse:14710000,beat:0,stepIndex:0,creatorVerified:false},profileOriginal:{media:null}}]},snapshot:quotes()});
function quotes(){return{ok:true,data:{schema:'receiz.market.public-snapshot.v1',generatedAt:'2026-11-06T15:10:00Z',liveMarkets:[{itemId:'synthetic-item',visibility:'public',priceUsd:10,quoteUsdPerPhi:1,chart:[{value:9},{value:10}]}]}};}
async function marketProbe(fetcher:typeof fetch){
 localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify(membership()));vi.stubGlobal('fetch',fetcher);
 const {usePublicMarket}=await import('../src/receiz/usePublicMarket'),{Market}=await import('../src/features/market/Market');let state!:ReturnType<typeof usePublicMarket>;
 function Probe({active=true}:{active?:boolean}){state=usePublicMarket(active);return <Market source={state} active={active} overview={<span data-overview>Held chart input length {state.historyCatalog?.items[0]?.chart.length}</span>}/>;}
 const host=document.createElement('div'),root=createRoot(host);document.body.append(host);roots.push(root);await act(()=>root.render(<Probe/>));return{host,root,Probe,read:()=>state};
}
it('actual Market hook ignores navigation-aborted pending reads and retains exact settled inputs without a notice',async()=>{
 const calls:string[]=[];const fetcher=vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{const path=String(input);calls.push(path);if(path.includes('/membership')||path.includes('/quotes'))return new Promise<Response>((_resolve,reject)=>init?.signal?.addEventListener('abort',()=>reject(new DOMException('navigation','AbortError')),{once:true}));return new Response(null,{status:404});});
 const p=await marketProbe(fetcher);const held=p.read().historyCatalog;await act(()=>{void p.read().refresh();});await act(()=>{history.replaceState(null,'','/discover/');p.root.render(<p.Probe active={false}/>);});
 expect(p.read().error).toBeNull();expect(p.read().historyCatalog).toBe(held);await act(()=>{history.replaceState(null,'','/#market');p.root.render(<p.Probe active/>);});expect(p.read().error).toBeNull();expect(p.host.querySelector('.market-error')).toBeNull();
 expect(calls.filter(x=>x.includes('/membership'))).toHaveLength(1);expect(calls.filter(x=>x.includes('/quotes'))).toHaveLength(1);
});
it('clears only the failed quote notice after successful same-operand retry and keeps held local pricing',async()=>{
 const failedQuote=deferred<Response>();let quoteReads=0,membershipReads=0;
 const fetcher=vi.fn(async(input:RequestInfo|URL)=>{const path=String(input);if(path==='/api/bank/public-market/membership'){membershipReads++;return Response.json(membership());}if(path==='/api/bank/public-market/quotes'){quoteReads++;return quoteReads===1?failedQuote.promise:Response.json(quotes());}return new Response(null,{status:404});});
 const p=await marketProbe(fetcher);expect(p.read().catalog?.items[0].localValuationPulse).toBeTypeOf('number');expect(p.read().historyCatalog?.items[0].chart).toEqual([9,10]);
 await act(()=>{void p.read().refresh();});expect(membershipReads).toBe(1);await act(()=>failedQuote.resolve(new Response(null,{status:503})));expect(p.read().quoteStatus).toBe('stale');expect(p.read().error).toContain('Public prices and charts could not be refreshed');expect(p.host.textContent).toContain('Collection refresh is unavailable. Retained pricing inputs continue at the live Kai pulse.');
 await act(()=>{history.replaceState(null,'','/discover/');p.root.render(<p.Probe active={false}/>);});await act(()=>{history.replaceState(null,'','/#market');p.root.render(<p.Probe active/>);});expect(membershipReads).toBe(1);expect(quoteReads).toBe(1);
 await act(()=>dispatchEvent(new Event('online')));expect(quoteReads).toBe(2);expect(membershipReads).toBe(1);expect(p.read().quoteStatus).toBe('fresh');expect(p.read().error).toBeNull();expect(p.host.querySelector('.market-error')).toBeNull();expect(p.read().historyCatalog?.items[0].chart).toEqual([9,10]);
});
it('preserves an independent quote failure when membership succeeds later',async()=>{
 const nextMembership=deferred<Response>();const fetcher=vi.fn(async(input:RequestInfo|URL)=>{const path=String(input);if(path==='/api/bank/public-market/membership')return nextMembership.promise;if(path==='/api/bank/public-market/quotes')return new Response(null,{status:503});return new Response(null,{status:404});});
 const p=await marketProbe(fetcher);await act(()=>{void p.read().refresh();});expect(p.read().quoteStatus).toBe('stale');expect(p.read().error).toContain('Public prices and charts could not be refreshed');await act(()=>nextMembership.resolve(Response.json(membership())));expect(p.read().quoteStatus).toBe('stale');expect(p.read().error).toContain('Public prices and charts could not be refreshed');expect(p.host.querySelector('.market-error')).not.toBeNull();
});
it('actual quote-only success must not be treated as collection recovery after a separate membership failure',async()=>{
 let quotesRead=0,membershipRead=0;const fetcher=vi.fn(async(input:RequestInfo|URL)=>{const path=String(input);if(path==='/api/bank/public-market/membership'){membershipRead++;return new Response(null,{status:503});}if(path==='/api/bank/public-market/quotes')return ++quotesRead===1?new Response(null,{status:503}):Response.json(quotes());return new Response(null,{status:404});});
 const p=await marketProbe(fetcher);await act(()=>p.read().refresh());expect(p.read().error).toContain('The public Market could not be refreshed.');await act(()=>p.read().refresh(true));expect(p.read().quoteStatus).toBe('fresh');expect(membershipRead).toBe(1);expect(p.read().error).toContain('The public Market could not be refreshed.');expect(p.read().historyCatalog?.items[0].chart).toEqual([9,10]);
});
it('keeps the quote notice through a rejected retry shape and clears it only after validated success',async()=>{
 let quoteReads=0,membershipReads=0;const fetcher=vi.fn(async(input:RequestInfo|URL)=>{const path=String(input);if(path==='/api/bank/public-market/membership'){membershipReads++;return Response.json(membership());}if(path==='/api/bank/public-market/quotes'){quoteReads++;return quoteReads===1?new Response(null,{status:503}):Response.json(quoteReads===2?{ok:true,data:{}}:quotes());}return new Response(null,{status:404});});
 const p=await marketProbe(fetcher);await act(()=>p.read().refresh());expect(p.read().error).toContain('Public prices and charts could not be refreshed');await act(()=>p.read().refresh(true));expect(p.read().quoteStatus).toBe('stale');expect(p.read().error).toContain('Public prices and charts could not be refreshed');expect(p.read().error?.match(/Public prices and charts could not be refreshed/g)).toHaveLength(1);await act(()=>p.read().refresh(true));expect(p.read().quoteStatus).toBe('fresh');expect(p.read().error).toBeNull();expect(membershipReads).toBe(1);expect(quoteReads).toBe(3);
});
