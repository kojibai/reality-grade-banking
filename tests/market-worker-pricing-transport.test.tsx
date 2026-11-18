// @vitest-environment happy-dom
import {readFileSync}from'node:fs';
import {act}from'react';import{createRoot}from'react-dom/client';import{afterEach,expect,it,vi}from'vitest';
import{parsePublicMarket}from'../src/receiz/public-market';import{mergePublicSports}from'../src/receiz/public-sports';
import{createPublicPricingCheckpoint,PUBLIC_PRICING_METADATA_FIELDS}from'../server/public-pricing-checkpoint';
import{parseMarketCapSource}from'../src/receiz/market-projection/source';import{publishMarketDisplaySource}from'../src/receiz/market-projection/display-source';
import{useMarketCapitalization}from'../src/receiz/market-projection/useMarketCapitalization';
const base='.';
const clock=vi.hoisted(()=>({pulse:14720000}));vi.mock('@receiz/sdk',async original=>({...await original<typeof import('@receiz/sdk')>(),receizKaiNow:()=>({pulse:clock.pulse})}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();localStorage.clear();});
it('sends existing pricing operands only once per held catalog identity, preserving the full Source and exact sports pricing/history objects',async()=>{
 vi.useFakeTimers();const packet=JSON.parse(readFileSync(base+'/public/receiz-public-market.json','utf8')),sports=JSON.parse(readFileSync(base+'/public/receiz-public-sports.json','utf8'));
 const catalog=mergePublicSports(parsePublicMarket(packet,packet.snapshot),sports),source=parseMarketCapSource(JSON.parse(readFileSync(base+'/public/receiz-public-capitalization.json','utf8')));
 publishMarketDisplaySource(source);clock.pulse=source.serverPulse;
 const unknown={retained:'full Source namespace'},held={...catalog,unknownNamespace:unknown},bytes=JSON.stringify(held),proofs=held.items.filter(item=>item.category==='proof');
 expect(held.complete).toBe(true);expect(proofs).toHaveLength(packet.transport.publicMembership.itemCount);expect(held.items.some(item=>item.category==='sports')).toBe(true);
 const expectedItems=held.items.map(item=>({...Object.fromEntries(['id','assetId','category','originalDigest','pulse','priceUsd','changePct','shareInventory','livePulseSeed','valuationBinding','nativeAsset','circulationCount','capitalizationUsdCents','title','sportsValuation','sealedBirths'].flatMap(key=>(item as any)[key]===undefined?[]:[[key,(item as any)[key]]]))}));
 for(const item of proofs)expect(createPublicPricingCheckpoint(item).item).not.toHaveProperty('title');
 let operandReads=0;const digest=proofs[0].originalDigest;Object.defineProperty(proofs[0],'originalDigest',{enumerable:true,get(){operandReads++;return digest;}});
 const messages:any[]=[],workers:any[]=[],fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 class WorkerStub{onmessage:((event:any)=>void)|null=null;terminate=vi.fn();constructor(){workers.push(this);}postMessage(message:any){messages.push(message);}}
 vi.stubGlobal('Worker',WorkerStub);const root=createRoot(document.createElement('div'));
 function Probe({active,period='ALL',input=held}:{active:boolean;period?:'ALL'|'1D';input?:typeof held}){useMarketCapitalization(period,active,input,false);return null;}
 try{
  await act(()=>root.render(<Probe active={false}/>));expect(operandReads).toBe(0);expect(workers).toHaveLength(0);
  await act(()=>root.render(<Probe active/>));const first=messages.find(message=>message.source),worker=workers[0];
  expect(first.catalog).not.toBe(held);expect(first.catalog.items).toEqual(expectedItems);
  expect(Object.keys(first.catalog).sort()).toEqual([...PUBLIC_PRICING_METADATA_FIELDS.filter(key=>held[key]!==undefined),'items'].sort());
  const projected=first.catalog.items.find((item:any)=>item.category==='proof');for(const key of['art','content','proofHeader','profileHeader','profileOriginal','unknownNamespace'])expect(projected).not.toHaveProperty(key);
  for(let index=0;index<held.items.length;index++)if(held.items[index].category!=='proof'){const item=held.items[index],pricing=first.catalog.items[index];expect(pricing.title).toBe(item.title);expect(pricing.sportsValuation).toBe(item.sportsValuation);expect(pricing.sealedBirths).toBe(item.sealedBirths);expect(pricing.shareInventory).toBe(item.shareInventory);expect(pricing).not.toHaveProperty('art');}
  expect(operandReads).toBe(1);act(()=>worker.onmessage({data:{id:first.id,retained:true}}));
  await act(()=>root.render(<Probe active period="1D"/>));expect(operandReads).toBe(1);
  await act(()=>root.render(<Probe active={false}/>));clock.pulse++;await act(()=>root.render(<Probe active/>));
  expect(workers).toHaveLength(1);expect(messages.filter(message=>message.source)).toHaveLength(1);expect(messages.at(-1)).toMatchObject({marketTick:true});expect(operandReads).toBe(1);
  // A resume can queue the newly sampled pulse behind the first retained tick.
  for(let ack=0;ack<3;ack++){const job=messages.at(-1);act(()=>worker.onmessage({data:{id:job.id,retained:true}}));if(messages.at(-1)===job)break;}
  const next={...held};await act(()=>root.render(<Probe active input={next}/>));expect(messages.filter(message=>message.source)).toHaveLength(2);expect(operandReads).toBe(2);
  expect(held.items).toBe(catalog.items);expect(held.unknownNamespace).toBe(unknown);expect(JSON.stringify(held)).toBe(bytes);expect(fetcher).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
},30000);
