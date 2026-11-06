import {createHash} from 'node:crypto';
import {createPublicPricingCheckpoint,publicPricingCheckpointSha256,type PublicPricingCheckpoint} from './public-pricing-checkpoint.js';
import {curatePublicMarketMembership} from './public-market.js';
import {PUBLIC_DISPLAY_POLICY,publicMarketSeedQuotes} from './public-market-preparation.js';
import {parsePublicMarket} from '../src/receiz/public-market.js';
import {MARKET_CONTENT_FILTERS,matchesMarketContent,type MarketContentFilter} from '../src/receiz/market-categories.js';

type ObjectValue=Record<string,unknown>;
export type PublicOriginalPartInput={selectionKey:string;projectOriginals:readonly {row:ObjectValue;quote?:ObjectValue}[]};
export type PublicOriginalPart={logicalKey:string;inputSha256:string;rowSha256:string;profileOriginalCanonicalSha256:string;facets:readonly MarketContentFilter[];row:ObjectValue;quote?:ObjectValue;pricingCheckpoint:PublicPricingCheckpoint;pricingCheckpointSha256:string};
export type PublicOriginalParts={schema:'bank.public-market.original-parts.v1';publicDisplayPolicy:typeof PUBLIC_DISPLAY_POLICY;selectionKey:string;entries:readonly PublicOriginalPart[]};
const object=(value:unknown):ObjectValue=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as ObjectValue:{};
const sha=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Pure projection of only the supplied changed public rows. This operation
 * neither reads prior state nor admits Source/ownership/value. Source retains
 * the real Original locator; the canonical JSON digest here is a separate
 * output-integrity check, never a substitute for its exact route byte hash. */
export function preparePublicOriginalParts(input:PublicOriginalPartInput):PublicOriginalParts{
 if(!/^[a-f0-9]{64}$/.test(input?.selectionKey)||!Array.isArray(input.projectOriginals)||!input.projectOriginals.length||input.projectOriginals.length>32)throw Error('PUBLIC_ORIGINAL_PART_INPUT_INVALID');
 const seen=new Set<string>(),entries=input.projectOriginals.map(value=>{
  const raw=object(value.row),uid=raw.ownerUserId,id=raw.receizId;
  if(typeof uid!=='string'||!uid||uid.length>256||typeof id!=='string'||!id||id.length>256||typeof raw.id!=='string'||raw.visibility!==undefined&&raw.visibility!=='public')throw Error('PUBLIC_ORIGINAL_PART_INPUT_INVALID');
  const logicalKey=JSON.stringify([uid,id]);if(seen.has(logicalKey))throw Error('PUBLIC_ORIGINAL_PART_INPUT_INVALID');seen.add(logicalKey);
  const envelope=curatePublicMarketMembership({ok:true,transport:{publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:1,revision:input.selectionKey},publicOriginals:[raw]}}),source={ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:value.quote?[value.quote]:[]}},catalog=parsePublicMarket(envelope,source),item=catalog.items[0];
  if(!catalog.complete||catalog.items.length!==1||item.ownerIdentity?.userId!==uid||item.assetId!==id||item.id!==raw.id||value.quote&&(value.quote.itemId!==raw.id||value.quote.visibility!=='public'))throw Error('PUBLIC_ORIGINAL_PART_INPUT_INVALID');
  const row=(envelope.transport as {publicOriginals:ObjectValue[]}).publicOriginals[0],quotes=publicMarketSeedQuotes(source,new Set([item.id])) as {data:{liveMarkets:ObjectValue[]}},quote=quotes.data.liveMarkets[0];
  if(quote){if(Array.isArray(value.quote?.chart))quote.chart=value.quote.chart.slice(-256).flatMap((point:unknown)=>{const n=object(point).value;return typeof n==='number'&&Number.isFinite(n)&&n>=0?[{value:n}]:[];});delete quote.shareInventory;if(item.shareInventory)quote.shareInventory=item.shareInventory;quote.priceUsd=item.priceUsd;quote.changePct=item.changePct;}
  const pricingCheckpoint=createPublicPricingCheckpoint(item);
  return {logicalKey,inputSha256:sha(value),rowSha256:sha(row),profileOriginalCanonicalSha256:sha(row.profileOriginal),pricingCheckpoint,pricingCheckpointSha256:publicPricingCheckpointSha256(pricingCheckpoint),facets:MARKET_CONTENT_FILTERS.filter(filter=>matchesMarketContent(item,filter)),row,...(quote?{quote}:{})};
 });
 return {schema:'bank.public-market.original-parts.v1',publicDisplayPolicy:PUBLIC_DISPLAY_POLICY,selectionKey:input.selectionKey,entries};
}
