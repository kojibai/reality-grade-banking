import {afterEach,expect,it,vi} from 'vitest';
import {buildMembershipOnlyPublicMarketState} from '../server/public-market-preparation';
import {parsePublicMarket} from '../src/receiz/public-market';
import {buildMarketHistory} from '../src/receiz/market-projection/build-history';
import {parseMarketHistory} from '../src/receiz/market-projection/history';
import {fixture,pulse} from './helpers/market-history-original-addition-fixture';

async function input(){
 const f=fixture(),old=f.before.items[0],row={id:old.id,receizId:old.assetId,title:old.title,pulse:old.pulse,livePulseSeed:old.livePulseSeed,profileOriginal:{hasPbiSignature:true}},added={...row,id:'profile:someone:new',receizId:'new-asset',title:'Another Original',pulse:String(pulse+1),livePulseSeed:{...old.livePulseSeed!,claimPulse:pulse+1}},inventory={...old.shareInventory!,marketItemId:added.id,assetId:added.receizId,observedAtKaiUPulse:String(BigInt(pulse+2)*1000000n+123n),outstandingShareQuantityMicro:'0',positionsMicro:'0',releaseCapitalization:{...old.shareInventory!.releaseCapitalization!,kaiUPulse:String(BigInt(pulse+1)*1000000n)}};
 const membership=(rows:unknown[])=>({ok:true,transport:{generatedAt:f.before.observedAt,publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:rows.length,revision:String(rows.length)},publicOriginals:rows}}),snapshot=(rows:unknown[])=>({ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:rows}});
 const previous={...membership([row]),snapshot:snapshot([{itemId:old.id,visibility:'public',priceUsd:100,shareInventory:old.shareInventory}])},catalog=parsePublicMarket(previous,previous.snapshot),history=(await buildMarketHistory(f.source,null,undefined,undefined,{catalog,pulse}))!,shareHistory=(await buildMarketHistory(f.source,null,undefined,undefined,{catalog,pulse,capitalization:true}))!;
 return{previous,membership:membership([added,row]),snapshot:snapshot([{itemId:added.id,visibility:'public',priceUsd:100,shareInventory:inventory}]),capitalization:{ok:true,marketCapProjection:f.source},history,shareHistory};
}
afterEach(()=>vi.unstubAllGlobals());

it('advances both saved histories from one membership transition using only supplied held operands',async()=>{
 const values=await input(),saved=JSON.stringify(values),fetch=vi.fn(()=>{throw Error('Unexpected Source read');});vi.stubGlobal('fetch',fetch);
 const result=await buildMembershipOnlyPublicMarketState(values),catalog=parsePublicMarket(result.source,result.source.snapshot),history=parseMarketHistory(result.history),shares=parseMarketHistory(result.shareHistory);
 expect(catalog.items).toHaveLength(2);expect(history.summary.serverPulse).toBe(pulse+3);expect(shares.summary.serverPulse).toBe(pulse+3);expect(history.summary.marketAssetsPriced).toBe(2);expect(shares.summary.shareCapitalization).toMatchObject({listed:2,covered:2});
 for(const [before,after] of [[values.history,history],[values.shareHistory,shares]]){const old=new Map(Object.values(before.series).flat().map(point=>[point.pulse,point.usdCents]));for(const points of Object.values(after.series))for(const point of points)if(old.has(point.pulse))expect(point.usdCents).toBe(old.get(point.pulse));for(const range of Object.values(after.series))expect(range.at(-1)?.pulse).toBe(pulse+3);}
 expect(JSON.stringify(values)).toBe(saved);expect(fetch).not.toHaveBeenCalled();
});

it.each(['history','shareHistory'] as const)('refuses a mismatched prior %s instead of rebuilding its saved samples',async key=>{
 const values=await input();values[key]={...values[key],basisSha256:'f'.repeat(64)};
 await expect(buildMembershipOnlyPublicMarketState(values)).rejects.toThrow('PUBLIC_MARKET_HISTORY_PREFIX_REQUIRED');
});
