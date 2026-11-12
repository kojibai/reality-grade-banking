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

it('adopts new Originals and newly received quote observations through their existing separate history transitions',async()=>{
 const values=await input(),old=parsePublicMarket(values.previous,values.previous.snapshot).items[0],inventory=old.shareInventory!;
 const at=(value:number)=>String(BigInt(value)*1000000n),capture={kaiUPulse:at(pulse-2),unitPriceUsdCents:'100',outstandingShareQuantityMicro:'1000000',availableShareQuantityMicro:'1000000'};
 const heldInventory={...inventory,observedAtKaiUPulse:capture.kaiUPulse,outstandingShareQuantityMicro:capture.outstandingShareQuantityMicro,availableShareQuantityMicro:capture.availableShareQuantityMicro,capitalizationHistory:[capture]};
 values.previous.snapshot.data.liveMarkets=[{itemId:old.id,visibility:'public',priceUsd:100,shareInventory:heldInventory}];
 const prior=parsePublicMarket(values.previous,values.previous.snapshot),source=values.capitalization.marketCapProjection;
 values.history=(await buildMarketHistory(source,null,undefined,undefined,{catalog:prior,pulse}))!;
 values.shareHistory=(await buildMarketHistory(source,null,undefined,undefined,{catalog:prior,pulse,capitalization:true}))!;
 const arrived={...heldInventory,observedAtKaiUPulse:at(pulse+2),availableShareQuantityMicro:'2000000',capitalizationHistory:[capture,{...capture,kaiUPulse:at(pulse-1),unitPriceUsdCents:'115',availableShareQuantityMicro:'2000000'},{...capture,kaiUPulse:at(pulse+2),unitPriceUsdCents:'130',availableShareQuantityMicro:'2000000'}]};
 values.snapshot.data.liveMarkets.push({itemId:old.id,visibility:'public',priceUsd:130,shareInventory:arrived});
 const fetch=vi.fn(()=>{throw Error('Unexpected Source read');});vi.stubGlobal('fetch',fetch);
 const result=await buildMembershipOnlyPublicMarketState(values),catalog=parsePublicMarket(result.source,result.source.snapshot),shares=parseMarketHistory(result.shareHistory);
 const full=(await buildMarketHistory(source,null,undefined,undefined,{catalog,pulse:shares.summary.serverPulse,capitalization:true}))!;
 const {globalMarketCapitalizationInputs,prepareGlobalShareCapitalization}=await import('../src/receiz/market-projection/global-share-capitalization'),{currentMarketDisplayModel}=await import('../src/receiz/market-projection/catalog-source');
 const scoped=globalMarketCapitalizationInputs(source,catalog),exact=prepareGlobalShareCapitalization(currentMarketDisplayModel(scoped.source,scoped.catalog,shares.summary.serverPulse),catalog);
 expect(catalog.items).toHaveLength(2);expect(shares.summary).toEqual(full.summary);
 for(const points of Object.values(shares.series))for(const point of points)expect(point.usdCents).toBe(exact.at(point.pulse));
 const added=catalog.items.find(item=>item.id!==old.id)!,nextPulse=shares.summary.serverPulse+1;
 const nextRow={id:'profile:someone:next',receizId:'next-asset',title:'Next Original',pulse:String(nextPulse),livePulseSeed:{...added.livePulseSeed!,claimPulse:nextPulse},profileOriginal:{hasPbiSignature:true}};
 const nextInventory={...added.shareInventory!,marketItemId:nextRow.id,assetId:nextRow.receizId,observedAtKaiUPulse:at(nextPulse+1),releaseCapitalization:{...added.shareInventory!.releaseCapitalization!,kaiUPulse:at(nextPulse)},history:undefined,capitalizationHistory:undefined};
 const nextMembership={...values.membership,transport:{...values.membership.transport,publicMembership:{...values.membership.transport.publicMembership,itemCount:3,revision:'3'},publicOriginals:[nextRow,...values.membership.transport.publicOriginals]}};
 const reopened=await buildMembershipOnlyPublicMarketState({...values,previous:JSON.parse(JSON.stringify(result.source)),history:JSON.parse(JSON.stringify(result.history)),shareHistory:JSON.parse(JSON.stringify(result.shareHistory)),membership:nextMembership,snapshot:{ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[...result.source.snapshot.data.liveMarkets,{itemId:nextRow.id,visibility:'public',priceUsd:100,shareInventory:nextInventory}]}}});
 expect(parsePublicMarket(reopened.source,reopened.source.snapshot).items).toHaveLength(3);
 const retained=new Map(Object.values(shares.series).flat().map(point=>[point.pulse,point.usdCents]));for(const points of Object.values(parseMarketHistory(reopened.shareHistory).series))for(const point of points)if(retained.has(point.pulse))expect(point.usdCents).toBe(retained.get(point.pulse));
 expect(fetch).not.toHaveBeenCalled();
});
