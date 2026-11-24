import {expect,it,vi} from 'vitest';
import {fixture,pulse} from './helpers/market-history-original-addition-fixture';
import {parseMarketHistory} from '../src/receiz/market-projection/history';
it('the genuine worker publishes a new Original and then its next live Kai point',async()=>{
 const {source,before,after}=fixture(),pending={...after,items:after.items.map((item,index)=>index?{...item,shareInventory:undefined}:item)},messages:any[]=[];
 const host={onmessage:null as unknown as (event:{data:unknown})=>Promise<void>,postMessage:(value:unknown)=>messages.push(value)};
 vi.stubGlobal('self',host);
 try{
  await import('../src/receiz/market-projection/worker');
  await host.onmessage({data:{id:1,source:{ok:true,marketCapProjection:source},catalog:before,pulse,shareCapitalization:true}});
  const first=parseMarketHistory(messages.at(-1).history);expect(first.summary.shareCapitalization?.covered).toBe(1);
  await host.onmessage({data:{id:2,source:{ok:true,marketCapProjection:source},history:first,catalog:pending,pulse:pulse+1,shareCapitalization:true}});
  const added=parseMarketHistory(messages.at(-1).history);expect(added.summary.shareCapitalization).toMatchObject({covered:1,listed:2,complete:false});expect(added.summary.serverPulse).toBe(pulse+1);
  await host.onmessage({data:{id:3,marketTick:true,pulse:pulse+2}});
  const tick=parseMarketHistory(messages.at(-1).history);expect(tick.summary.serverPulse).toBe(pulse+2);expect(tick.summary.shareCapitalization?.covered).toBe(1);
  await host.onmessage({data:{id:4,source:{ok:true,marketCapProjection:source},history:tick,catalog:after,pulse:pulse+3,shareCapitalization:true}});
  const quoted=parseMarketHistory(messages.at(-1).history);expect(quoted.summary.shareCapitalization?.covered).toBe(2);expect(quoted.membershipSha256).toBe(tick.membershipSha256);
  await host.onmessage({data:{id:5,marketTick:true,pulse:pulse+4}});expect(parseMarketHistory(messages.at(-1).history).summary.serverPulse).toBe(pulse+4);
  expect(messages.every(message=>message.history&&!message.error)).toBe(true);
 }finally{vi.unstubAllGlobals();}
},10000);

it('does not replace held share coverage with a proof-only membership capture',async()=>{
 const {source,before,after}=fixture();
 const card={...before.items[0],id:'sports:retained',assetId:'retained-sports',category:'sports' as const,
  shareInventory:undefined,livePulseSeed:undefined,priceUsd:10,capitalizationUsdCents:'1000',circulationCount:1};
 const full={...before,sportsCoverage:'complete' as const,items:[...before.items,card]};
 const input={...source,cardsInCirculation:1};
 const {buildMarketHistory}=await import('../src/receiz/market-projection/build-history');
 const held=await buildMarketHistory(input,null,undefined,undefined,{catalog:full,pulse,capitalization:true});
 expect(held?.summary.shareCapitalization).toMatchObject({listed:2,covered:2});
 const interim=await buildMarketHistory(input,held,undefined,undefined,{catalog:{...before,sportsCoverage:'missing'},pulse:pulse+1,capitalization:true});
 expect(interim).toBeNull();
 const successor={...after,sportsCoverage:'complete' as const,items:[...after.items,card]};
 const next=await buildMarketHistory(input,held,undefined,undefined,{catalog:successor,pulse:pulse+2,capitalization:true});
 expect(next?.summary.shareCapitalization).toMatchObject({listed:3,covered:3});
},10000);
