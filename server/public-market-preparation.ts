import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {mergePublicQuotes,parsePublicMarket,retainPublicArtwork,retainPublicProfileHeaders,validatePublicQuotes} from '../src/receiz/public-market.js';
import {retainPublicMomentManifest} from '../src/receiz/public-asset-manifest.js';
import {compatibleShareInventory} from '../src/receiz/market-share-inventory.js';
import {mergePublicSports,retainPublicSportsInput} from '../src/receiz/public-sports.js';
import {curatePublicMarketMembership,readReceizPublicMarketSource} from './public-market.js';
import {buildMarketHistory} from '../src/receiz/market-projection/build-history.js';
import {parseMarketHistory} from '../src/receiz/market-projection/history.js';
import {packMarketHistory} from '../src/receiz/market-projection/history-wire.js';
import {parseMarketCapSource} from '../src/receiz/market-projection/source.js';

export type PublicMarketOperand='membership'|'quotes'|'sports'|'capitalization';
const MAX=32*1024*1024;
export const PUBLIC_DISPLAY_POLICY='bank.public-market.curated-display.v3';
let shippedSports:Promise<unknown>|undefined;
function retainedSports(){return shippedSports??=readFile('public/receiz-public-sports.json').then(bytes=>{if(bytes.length>MAX)throw Error('PUBLIC_MARKET_RENDER_CAPACITY');return JSON.parse(bytes.toString('utf8')) as unknown;}).catch(error=>{shippedSports=undefined;throw error;});}
export async function completeSports(input:unknown,previous?:unknown){return retainPublicSportsInput(previous??await retainedSports(),input);}
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

/** Membership/quote display refresh over the held seed. Existing projection
 * guards retain compatible observations, artwork and receipt bases; nothing
 * here opens an Original or creates financial authority. */
type SeedQuote=Record<string,unknown>&{itemId:string};
type SeedTransport={publicOriginals:Array<{id:string;profileOriginal:Record<string,unknown>;ownerReceivingUsername?:string}>;publicProfileHeads?:Array<{profile:Record<string,unknown>}>};
export function buildMembershipOnlyPublicMarketSeed({membership:input,snapshot,previous}:{membership:Record<string,unknown>;snapshot:unknown;previous?:Record<string,unknown>}){
 validatePublicQuotes(snapshot);
 const offered=new Set(((input.transport as SeedTransport)?.publicProfileHeads??[]).map(head=>head?.profile?.userId+':'+head?.profile?.username));
 const membership=curatePublicMarketMembership({...input}),prior=previous?parsePublicMarket(previous,previous.snapshot):null,current=retainPublicProfileHeaders(parsePublicMarket(membership),prior);
 if(!current.complete||prior&&!prior.complete)throw new Error('The public source did not return its complete collection; seed not replaced.');
 const known=new Map(prior?.items.map(item=>[item.id,item])??[]),items=new Map(current.items.map(item=>[item.id,item]));
 const carried={...current,items:current.items.map(item=>({...item,shareInventory:compatibleShareInventory(item,known.get(item.id)?.shareInventory)}))};
 const quotes=new Map<string,SeedQuote>();
 for(const quote of (previous?.snapshot as {data?:{liveMarkets?:SeedQuote[]}})?.data?.liveMarkets??[]){const item=items.get(quote.itemId),old=known.get(quote.itemId);if(item&&old?.assetId===item.assetId&&quote.visibility==='public')quotes.set(quote.itemId,quote);}
 for(const quote of (snapshot as {data:{liveMarkets:SeedQuote[]}}).data.liveMarkets){if(!items.has(quote.itemId))continue;if(quote.visibility!=='public'){quotes.delete(quote.itemId);continue;}quotes.set(quote.itemId,{...quotes.get(quote.itemId),...quote});}
 const combined={ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[...quotes.values()]}},selected=mergePublicQuotes(carried,combined),selectedItems=new Map(selected.items.map(item=>[item.id,item]));
 // Serialize the inventory selected by the existing compatibility/history
 // guards, never the thinner raw observation that arrived beside it.
 const completeQuotes={...combined,data:{...combined.data,liveMarkets:combined.data.liveMarkets.map(row=>{const quote={...row};delete quote.shareInventory;const inventory=selectedItems.get(row.itemId)?.shareInventory;if(inventory)quote.shareInventory=inventory;return quote;})}};
 const rows=new Map((membership.transport as SeedTransport).publicOriginals.map(row=>[row.id,row]));
 for(const item of current.items){const previousItem=known.get(item.id),retained=retainPublicMomentManifest(retainPublicArtwork(item,previousItem),previousItem),row=rows.get(item.id)!,profile=row.profileOriginal;if(item.ownerReceivingUsername)row.ownerReceivingUsername=item.ownerReceivingUsername;if(retained.artworkUrl!==item.artworkUrl)profile.artworkUrl=retained.artworkUrl;if(retained.proofManifestSource?.recordCardMediaSha256Hex!==item.proofManifestSource?.recordCardMediaSha256Hex)profile.recordCardMediaSha256Hex=retained.proofManifestSource!.recordCardMediaSha256Hex;}
 // An offered but refused/ambiguous header is distinct from absent metadata.
 const eligiblePrior=prior?{...prior,publicProfileHeads:prior.publicProfileHeads?.filter(head=>!offered.has(head.profile.userId+':'+head.profile.username))}:null,selection=retainPublicProfileHeaders(parsePublicMarket(membership),eligiblePrior),headers=[...(selection.publicProfileHeads??[]),...(selection.publicProfileHeadRefusals??[])];
 return {...membership,transport:{...(membership.transport as SeedTransport),...(headers.length?{publicProfileHeads:headers}:{})},snapshot:publicMarketSeedQuotes(completeQuotes,new Set(items.keys())) as {data:{liveMarkets:SeedQuote[]}}};
}

/** Advance the two saved display histories at the same seed transition. The
 * existing operator must prove reuse of each held prefix; this mode never
 * substitutes a full history rebuild when those operands do not match. */
export async function buildMembershipOnlyPublicMarketState(input:{membership:Record<string,unknown>;snapshot:unknown;previous:Record<string,unknown>;sports?:unknown;capitalization:unknown;history:unknown;shareHistory:unknown}){
 const previousHistory=parseMarketHistory(input.history),previousShares=parseMarketHistory(input.shareHistory),capitalization=parseMarketCapSource(input.capitalization);
 const source=buildMembershipOnlyPublicMarketSeed(input),base=parsePublicMarket(source,source.snapshot),priorBase=parsePublicMarket(input.previous,input.previous.snapshot),catalog=input.sports?mergePublicSports(base,input.sports):base,prior=input.sports?mergePublicSports(priorBase,input.sports):priorBase;
 // The carried model births and exact inventory checkpoints bound this
 // transition. Preparing a build seed does not need a fresh clock or Source.
 const pulse=catalog.items.reduce((latest,item)=>Math.max(latest,item.livePulseSeed?.claimPulse??0,item.shareInventory?Number((BigInt(item.shareInventory.observedAtKaiUPulse)+999999n)/1000000n):0),Math.max(capitalization.serverPulse,previousHistory.summary.serverPulse,previousShares.summary.serverPulse));
 const history=await buildMarketHistory(capitalization,previousHistory,undefined,undefined,{catalog,pulse,priorInput:{source:capitalization,catalog:prior},requireRetained:true});
 // Membership and newly received quote observations are separate supported
 // transitions. Keep old members' retained pricing for the append, then let
 // the same-membership operator apply the supplied observations. Combining
 // both can mistake a newly received trade for an altered retained prefix.
 const known=new Map(prior.items.map(item=>[item.id,item]));let quotesChanged=false;
 const membershipCatalog={...catalog,items:catalog.items.map(item=>{
  const inventory=compatibleShareInventory(item,known.get(item.id)?.shareInventory);
  if(!inventory||!item.shareInventory)return item;
  const pricing=(value:typeof inventory)=>[value.observedAtKaiUPulse,value.outstandingShareQuantityMicro,value.availableShareQuantityMicro,value.releaseCapitalization??null,value.family==='generic'?value.capitalizationHistory??[]:value.history??[]];
  if(JSON.stringify(pricing(inventory))===JSON.stringify(pricing(item.shareInventory)))return item;
  quotesChanged=true;return {...item,shareInventory:inventory};
 })};
 let shareHistory=await buildMarketHistory(capitalization,previousShares,undefined,undefined,{catalog:membershipCatalog,pulse,capitalization:true,priorInput:{source:capitalization,catalog:prior},requireRetained:true});
 if(shareHistory&&quotesChanged)shareHistory=await buildMarketHistory(capitalization,shareHistory,undefined,undefined,{catalog,pulse,capitalization:true,priorInput:{source:capitalization,catalog:membershipCatalog},requireRetained:true});
 if(!history||!shareHistory)throw Error('PUBLIC_MARKET_HISTORY_PREFIX_REQUIRED');
 return{source,history:packMarketHistory(history),shareHistory:packMarketHistory(shareHistory)};
}
