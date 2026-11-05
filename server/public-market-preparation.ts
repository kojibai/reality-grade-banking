import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {mergePublicQuotes,parsePublicMarket} from '../src/receiz/public-market.js';
import {compatibleShareInventory} from '../src/receiz/market-share-inventory.js';
import {mergePublicSports,retainPublicSportsInput} from '../src/receiz/public-sports.js';
import {curatePublicMarketMembership,readReceizPublicMarketSource} from './public-market.js';

export type PublicMarketOperand='membership'|'quotes'|'sports'|'capitalization';
const MAX=32*1024*1024;
export const PUBLIC_DISPLAY_POLICY='bank.public-market.curated-display.v2';
let shippedSports:Promise<unknown>|undefined;
function retainedSports(){return shippedSports??=readFile('public/receiz-public-sports.json').then(bytes=>{if(bytes.length>MAX)throw Error('PUBLIC_MARKET_RENDER_CAPACITY');return JSON.parse(bytes.toString('utf8')) as unknown;}).catch(error=>{shippedSports=undefined;throw error;});}
async function completeSports(input:unknown,previous?:unknown){return retainPublicSportsInput(previous??await retainedSports(),input);}
function ledgerPacketFields(preparedLedger:unknown):Record<string,unknown>{
 if(!preparedLedger)return {};
 const packet=preparedLedger as {heads?:{actions?:{count:string;lastSeq:string;entryHash?:string|null};wallet?:{count:string;lastKaiUpulse:string|null}}};
 const heads=packet.heads;
 return {preparedLedger,...(heads?.actions&&heads.wallet?{ledgerHeads:{actions:{count:heads.actions.count,seq:heads.actions.lastSeq,hash:heads.actions.entryHash??null},wallet:{count:heads.wallet.count,kai:heads.wallet.lastKaiUpulse}}}:{})};
}
/** Existing build seed projection: only displayed quote samples are bounded;
 * complete share/capitalization observations retain their existing operands. */
export function publicMarketSeedQuotes(snapshot:unknown,wanted:ReadonlySet<string>):unknown{
 const source=snapshot as {data?:{schema?:unknown;liveMarkets?:Array<Record<string,unknown>>}};
 if(!source?.data||!Array.isArray(source.data.liveMarkets))throw Error('PUBLIC_MARKET_QUOTES_REQUIRED');
 return {...source,data:{schema:source.data.schema,liveMarkets:source.data.liveMarkets.filter(item=>wanted.has(String(item.itemId))).map(item=>({itemId:item.itemId,visibility:item.visibility,priceUsd:item.priceUsd,quoteUsdPerPhi:item.quoteUsdPerPhi,changePct:item.changePct,...(item.shareInventory?{shareInventory:item.shareInventory}:{}),chart:Array.isArray(item.chart)?item.chart.slice(-48).map(point=>({value:(point as Record<string,unknown>).value})):undefined}))}};
}
/** Write-side preparation only. The existing fixed public Source transports
 * and selectors supply these display bytes; no Original or identity is opened. */
export type PublicMarketMaterialPreparation={read?:(kind:PublicMarketOperand)=>Promise<unknown>;selectionKey?:string;history?:unknown;ledgerCacheGzipB64u?:string;previousMaterial?:string;refreshMarket?:true;membership?:Record<string,unknown>;changedQuotes?:Array<Record<string,unknown>>;prepareLedger?:(previous:unknown)=>Promise<unknown>;prepareMarket?:(input:Record<string,unknown>)=>Promise<{history:unknown;asOfPulse:number}>};
async function materialResult(value:Record<string,unknown>,prepare?:PublicMarketMaterialPreparation['prepareMarket']){
 if(prepare){const state=await prepare(value);value={...value,history:state.history,marketPrepared:{schema:'bank.public-market.prepared.v1',asOfPulse:state.asOfPulse}};}
 const material=JSON.stringify({...value,publicDisplayPolicy:PUBLIC_DISPLAY_POLICY});if(Buffer.byteLength(material)>MAX)throw Error('PUBLIC_MARKET_RENDER_CAPACITY');return {material,generation:createHash('sha256').update(material).digest('hex')};
}
export async function preparePublicMarketRenderMaterial(input:PublicMarketMaterialPreparation={}):Promise<{material:string;generation:string}>{
 if(input.previousMaterial!==undefined&&Buffer.byteLength(input.previousMaterial)>MAX)throw Error('PUBLIC_MARKET_RENDER_INPUT_INVALID');
 const previous=input.previousMaterial===undefined?undefined:JSON.parse(input.previousMaterial);
 if(input.refreshMarket&&!previous)throw Error('PUBLIC_MARKET_RENDER_INPUT_INVALID');
 if(previous&&previous.publicDisplayPolicy!==PUBLIC_DISPLAY_POLICY&&previous.sports)previous.sports=await completeSports(previous.sports);
 if(previous&&previous.publicDisplayPolicy!==PUBLIC_DISPLAY_POLICY&&!input.refreshMarket){
  // A prior projection lost normalized display fields. Refresh only its public
  // membership, preserving the held financial operands and accepted prefix.
  const read=input.read??(kind=>readReceizPublicMarketSource(kind,undefined,{fresh:true,selectionKey:input.selectionKey}));
  input={...input,membership:await read('membership') as Record<string,unknown>};
 }
 if(previous&&!input.membership&&!input.refreshMarket){
  // The Source coordinator qualifies the unchanged proof/privacy vector.
  // This operation refreshes only the already held public financial packet.
  const membership=previous.membership,meta=membership?.transport?.publicMembership;
  if(membership?.ok!==true||meta?.source!=='canonical-complete'||meta?.scope!=='whole-market-visible-showcase'||meta?.isComplete!==true||!Array.isArray(membership.transport.publicOriginals)||meta.itemCount!==membership.transport.publicOriginals.length||input.changedQuotes?.length)throw Error('PUBLIC_MARKET_RENDER_INPUT_INVALID');
  const preparedLedger=input.prepareLedger?await input.prepareLedger(previous.preparedLedger):previous.preparedLedger;
  return materialResult({...previous,...ledgerPacketFields(preparedLedger)});
 }
 if(input.previousMaterial!==undefined&&!input.refreshMarket){
  const membership=curatePublicMarketMembership(input.membership!),prior=parsePublicMarket(previous.membership,previous.snapshot),current=parsePublicMarket(membership),known=new Map(prior.items.map(item=>[item.id,item]));
  if(!prior.complete||!current.complete)throw Error('PUBLIC_MARKET_RENDER_COMPLETE_REQUIRED');
  const carried={...current,items:current.items.map(item=>({...item,shareInventory:compatibleShareInventory(item,known.get(item.id)?.shareInventory)}))};
  const changed=input.changedQuotes??[];if(changed.length>10000)throw Error('PUBLIC_MARKET_RENDER_CAPACITY');
  const updated=mergePublicQuotes(carried,{ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:changed}}),bound=new Map(updated.items.map(item=>[item.id,item]));
  const quotes=new Map<string,Record<string,unknown>>((previous.snapshot?.data?.liveMarkets??[]).map((row:Record<string,unknown>)=>[String(row.itemId),row]));
  for(const row of changed){const id=String(row.itemId),item=bound.get(id);if(!item)continue;const merged={...quotes.get(id),...row};delete merged.shareInventory;if(item.shareInventory)merged.shareInventory=item.shareInventory;quotes.set(id,merged);}
  const snapshot=publicMarketSeedQuotes({...previous.snapshot,data:{...previous.snapshot?.data,liveMarkets:[...quotes.values()]}},new Set(current.items.map(item=>item.id)));
  const completePrior=mergePublicSports(prior,previous.sports),{items:priorItems,...priorMetadata}=completePrior;
  // A bounded selection of the held cohort lets the existing chart producer
  // reproduce its previous basis. It still refuses reuse if any prior model or
  // quantity no longer reproduces that completed basis.
  const priorCatalogSelection={...priorMetadata,ids:priorItems.map(item=>item.id)};
  const preparedLedger=input.prepareLedger?await input.prepareLedger(previous.preparedLedger):previous.preparedLedger;
  return materialResult({...previous,membership,snapshot,priorCatalogSelection,...ledgerPacketFields(preparedLedger),...(input.history?{history:input.history}:{})},input.prepareMarket);
 }
 const read=input.read??(kind=>readReceizPublicMarketSource(kind,undefined,{fresh:true,selectionKey:input.selectionKey}));
 const [membership,snapshot,incomingSports,capitalization,preparedLedger]=await Promise.all([read('membership'),read('quotes'),read('sports'),read('capitalization'),input.prepareLedger?.(previous?.preparedLedger)]);
 const sports=await completeSports(incomingSports,previous?.sports);
 const catalog=parsePublicMarket(membership,snapshot);if(!catalog.complete)throw Error('PUBLIC_MARKET_RENDER_COMPLETE_REQUIRED');
 const quotes=publicMarketSeedQuotes(snapshot,new Set(catalog.items.map(item=>item.id)));
 const history=input.history??previous?.history;
 return materialResult({membership,snapshot:quotes,sports,capitalization,...(history?{history}:{}),...(preparedLedger?ledgerPacketFields(preparedLedger):input.ledgerCacheGzipB64u?{ledgerCacheGzipB64u:input.ledgerCacheGzipB64u}:{})},input.prepareMarket);
}
