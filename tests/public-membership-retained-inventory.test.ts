// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();localStorage.clear();});
it.each(['omitted','weaker-history'])('retains already accepted inventory through later %s quote and cold parse',async kind=>{
 vi.resetModules();history.replaceState(null,'','/');document.body.innerHTML='';
 const saved=new Map<string,Response>();vi.stubGlobal('caches',{open:vi.fn(async()=>({match:vi.fn(async(key:string)=>saved.get(key)?.clone()),put:vi.fn(async(key:string,response:Response)=>{saved.set(key,response.clone());}),delete:vi.fn(async(key:string)=>saved.delete(key))}))});
 vi.stubGlobal('localStorage',{getItem:()=>null,setItem(){throw Error('QUOTA');}});
 const membership={ok:true,transport:{publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:1,revision:'B'},publicOriginals:[{id:'item',receizId:'item',title:'Held B',profileOriginal:{media:null}}]}};
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json(membership)));
 const module=await import('../src/receiz/public-market');
 const b=await module.fetchPublicMarket();
 const firstInventory={schema:'receiz.market.share-inventory.v1',marketItemId:'item',assetId:'item',family:'generic',quantityScope:'canonical-asset',observedAtKaiUPulse:'14710100000000',outstandingShareQuantityMicro:'1000000',availableShareQuantityMicro:'9000000',positionsMicro:'1000000',certificatesMicro:'0',reservedBuyMicro:'0',availability:'quote-capacity',historyBasis:'observations',history:[{kaiUPulse:'14710000000000',outstandingShareQuantityMicro:'0'},{kaiUPulse:'14710100000000',outstandingShareQuantityMicro:'1000000'}]};
 const quote=(inventory?:unknown)=>({ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[{itemId:'item',visibility:'public',priceUsd:20,quoteUsdPerPhi:2,chart:[{value:10}],...(inventory?{shareInventory:inventory}:{})}]}});
 const q1=quote(firstInventory),selected1=module.mergePublicQuotes(b,q1);module.retainPublicMarket(b,q1,selected1);
 await vi.waitFor(()=>expect(saved.size).toBe(1));
 const {history:_,...current}=firstInventory;const q2=quote(kind==='omitted'?undefined:{...current,observedAtKaiUPulse:'14710200000000'});
 const selected2=module.mergePublicQuotes(selected1,q2);expect(selected2.items[0].shareInventory?.history?.length).toBeGreaterThanOrEqual(2);
 module.retainPublicMarket(selected1,q2,selected2);
 const key=new URL('/api/explore?path=bank',location.origin).href;
 await vi.waitFor(async()=>{const snap=await saved.get(key)!.clone().json();expect(snap.snapshot?.data.liveMarkets[0].shareInventory?.history?.length).toBe(selected2.items[0].shareInventory!.history!.length);});
 const wire=await saved.get(key)!.clone().json(),cold=module.parsePublicMarket(wire,wire.snapshot);
 expect(cold.items[0].shareInventory?.outstandingShareQuantityMicro).toBe(selected2.items[0].shareInventory!.outstandingShareQuantityMicro);
 expect(cold.items[0].shareInventory?.history).toEqual(selected2.items[0].shareInventory!.history);
});
it('retains accepted quote operands for a selected item absent from a later partial quote response',async()=>{
 vi.resetModules();history.replaceState(null,'','/');document.body.innerHTML='';const saved=new Map<string,Response>();
 vi.stubGlobal('caches',{open:vi.fn(async()=>({match:vi.fn(async(key:string)=>saved.get(key)?.clone()),put:vi.fn(async(key:string,response:Response)=>{saved.set(key,response.clone());}),delete:vi.fn(async(key:string)=>saved.delete(key))}))});
 vi.stubGlobal('localStorage',{getItem:()=>null,setItem(){throw Error('QUOTA');}});
 const membership={ok:true,transport:{publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:2,revision:'B'},publicOriginals:[{id:'a',receizId:'a',title:'A',valueUsd:1,profileOriginal:{media:null}},{id:'b',receizId:'b',title:'B',valueUsd:3,profileOriginal:{media:null}}]}};
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json(membership)));const module=await import('../src/receiz/public-market'),b=await module.fetchPublicMarket();
 const q1={ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:['a','b'].map(itemId=>({itemId,visibility:'public',priceUsd:20,quoteUsdPerPhi:2,chart:[{value:10}]}))}},selected1=module.mergePublicQuotes(b,q1);module.retainPublicMarket(b,q1,selected1);await vi.waitFor(()=>expect(saved.size).toBe(1));
 const q2={ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[{itemId:'a',visibility:'public',priceUsd:10,quoteUsdPerPhi:2,chart:[{value:6}]}]}},selected2=module.mergePublicQuotes(selected1,q2);expect(selected2.items.find(item=>item.id==='b')!.priceUsd).toBe(20);module.retainPublicMarket(selected1,q2,selected2);
 const key=new URL('/api/explore?path=bank',location.origin).href;await vi.waitFor(async()=>expect((await saved.get(key)!.clone().json()).snapshot.data.liveMarkets.find((row:{itemId:string})=>row.itemId==='a').chart[0].value).toBe(6));const wire=await saved.get(key)!.clone().json(),cold=module.parsePublicMarket(wire,wire.snapshot),held=selected2.items.find(item=>item.id==='b')!,restored=cold.items.find(item=>item.id==='b')!;expect(restored.priceUsd).toBe(held.priceUsd);expect(restored.chart).toEqual(held.chart);
});
it('retains the accepted price when a later quote omits it and cold restore falls back to membership',async()=>{
 vi.resetModules();history.replaceState(null,'','/');document.body.innerHTML='';const saved=new Map<string,Response>();
 vi.stubGlobal('caches',{open:vi.fn(async()=>({match:vi.fn(async(key:string)=>saved.get(key)?.clone()),put:vi.fn(async(key:string,response:Response)=>{saved.set(key,response.clone());}),delete:vi.fn(async(key:string)=>saved.delete(key))}))});
 vi.stubGlobal('localStorage',{getItem:()=>null,setItem(){throw Error('QUOTA');}});
 const membership={ok:true,transport:{publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:1,revision:'B'},publicOriginals:[{id:'item',receizId:'item',title:'Held B',valueUsd:3,profileOriginal:{media:null}}]}};
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json(membership)));const module=await import('../src/receiz/public-market'),b=await module.fetchPublicMarket();
 const q1={ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[{itemId:'item',visibility:'public',priceUsd:20,quoteUsdPerPhi:2,chart:[{value:10}]}]}},selected1=module.mergePublicQuotes(b,q1);module.retainPublicMarket(b,q1,selected1);await vi.waitFor(()=>expect(saved.size).toBe(1));
 const q2={ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[{itemId:'item',visibility:'public',quoteUsdPerPhi:2,chart:[{value:6}]}]}},selected2=module.mergePublicQuotes(selected1,q2);expect(selected2.items[0].priceUsd).toBe(20);module.retainPublicMarket(selected1,q2,selected2);
 const key=new URL('/api/explore?path=bank',location.origin).href;await vi.waitFor(async()=>expect((await saved.get(key)!.clone().json()).snapshot.data.liveMarkets[0].chart[0].value).toBe(6));const wire=await saved.get(key)!.clone().json(),cold=module.parsePublicMarket(wire,wire.snapshot);expect(cold.items[0].priceUsd).toBe(selected2.items[0].priceUsd);
});
