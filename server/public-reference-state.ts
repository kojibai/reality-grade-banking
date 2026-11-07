import {createPublicMaterialWindowReader} from './public-material-window.js';
import {preparedPublicMaterialSelection} from './prepared-public-material.js';
import {readPublicReferenceHistory} from './public-reference-history.js';
import {readPublicReferenceBaseline} from './public-reference-baseline.js';
import {compatibleShareInventory} from '../src/receiz/market-share-inventory.js';
import {readPublicProfileHeader} from '../src/receiz/public-profile-header.js';
import {parsePublicMarket} from '../src/receiz/public-market.js';
import {parseMarketCapSource} from '../src/receiz/market-projection/source.js';
import {mergePublicSports} from '../src/receiz/public-sports.js';
const empty=Object.freeze({}),parsedRows=new WeakMap<object,WeakMap<object,{basis:string;item:ReturnType<typeof parsePublicMarket>['items'][number];base:ReturnType<typeof parsePublicMarket>['items'][number]}>>();
function parseRow(row:Record<string,unknown>,quote:Record<string,unknown>|undefined,head:unknown){
 const q=quote??empty,header=readPublicProfileHeader(head),selected=header?.userId===row.ownerUserId?header:null,basis=selected?JSON.stringify([selected.userId,selected.username,selected.displayName,selected.avatarUrl,selected.createdAt]):'';
 let quotes=parsedRows.get(row);if(!quotes){quotes=new WeakMap();parsedRows.set(row,quotes);}const held=quotes.get(q);if(held?.basis===basis)return held.item;
 const base=held?.base??parsePublicMarket({ok:true,transport:{publicOriginals:[row]}},{ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:quote?[quote]:[]}}).items[0];let item=base;if(!item||item.id!==row.id||item.assetId!==row.receizId)throw Error('PUBLIC_MATERIAL_COMPLETE_DISPLAY_REQUIRED');
 if(selected){const id=`profile:${selected.username}:${item.assetId}`;item={...item,id,ownerUsername:selected.username,ownerDisplayName:selected.displayName,ownerAvatarUrl:selected.avatarUrl,ownerProfileUrl:`https://receiz.com/${selected.username}`,sourceUrl:`https://receiz.com/${selected.username}/verified/${encodeURIComponent(item.assetId)}`,ownerIdentity:selected.createdAt?{userId:selected.userId,username:selected.username,createdAt:selected.createdAt}:item.ownerIdentity,valuationBinding:{itemId:id,assetId:item.assetId}};item={...item,shareInventory:compatibleShareInventory(item,item.shareInventory)};}
 quotes.set(q,{basis,item,base});return item;
}
type PartReader=(generation:string)=>Promise<string>;
const sources=new WeakMap<PartReader,{readers:Map<string,ReturnType<typeof createPublicMaterialWindowReader>>;retainedParts:Map<string,Promise<unknown>>}>();
/** Called inside the publication renderer after the fixed Source selected this
 * exact root. The request owner rechecks eligibility before promoting HTML.
 * This cache holds immutable display bytes, never serialized SDK authority. */
type ReferenceInput={material:string;generation:string;path?:string;readPart?:(generation:string)=>Promise<string>};
export async function prepareSelectedPublicReferenceCatalog(input:ReferenceInput,includeSports=true){
 const selection=input.readPart?null:preparedPublicMaterialSelection({root:input.generation}),port=input.readPart??selection!.read;let cache=sources.get(port);if(!cache){cache={readers:new Map(),retainedParts:new Map()};sources.set(port,cache);}const {readers,retainedParts}=cache;let reader=readers.get(input.generation);if(!reader){reader=createPublicMaterialWindowReader({...input,readPart:port,retainedParts,...(selection?{recheckPart:selection.recheck}:{})});readers.set(input.generation,reader);while(readers.size>4){const oldest=readers.keys().next().value!,released=readers.get(oldest)!;readers.delete(oldest);released.releaseUnusedParts(id=>[...readers.values()].some(held=>held.usesPart(id)));}}
 // Existing app seeds carry the full current cohort. Open its immutable rows
 // once in the write-side renderer; never combine the unrelated financial
 // ledger into the Market material or replay canonical Source history here.
 const baseline=await readPublicReferenceBaseline(reader),rows:Record<string,unknown>[]=baseline?.rows??[],quotes:Record<string,unknown>[]=baseline?.quotes??[],heads=baseline?.heads??new Map<string,unknown>();let cursor:import('../src/receiz/public-material-references.js').PublicMaterialWindowCursor|undefined;
 if(!baseline)do{const selected=await reader.window({limit:512,...(cursor?{cursor}:{})});rows.push(...selected.membership.transport.publicOriginals);quotes.push(...selected.snapshot.data.liveMarkets);for(const head of selected.membership.transport.publicProfileHeads){const uid=(head as {profile:{userId:string}}).profile.userId;heads.set(uid,head);}cursor=selected.nextCursor??undefined;}while(cursor);
 if(rows.length!==reader.root.membership.count)throw Error('PUBLIC_MATERIAL_COMPLETE_DISPLAY_REQUIRED');
 const metadata=await reader.readPart(reader.root.membership.metadata) as {transport:Record<string,unknown>&{publicMembership:Record<string,unknown>}},snapshot=await reader.readPart(reader.root.snapshot.metadata) as {data:Record<string,unknown>};
 const selected=metadata.transport?.publicMembership;if(selected?.version!==1||selected.source!=='canonical-complete'||selected.scope!=='whole-market-visible-showcase'||selected.isComplete!==true||selected.itemCount!==reader.root.membership.count)throw Error('PUBLIC_MATERIAL_COMPLETE_DISPLAY_REQUIRED');
 const membership={...metadata,transport:{...metadata.transport,publicMembership:{...metadata.transport.publicMembership,isComplete:true,itemCount:rows.length},publicOriginals:[],publicProfileHeads:[...heads.values()]}},observations={...snapshot,data:{...snapshot.data,liveMarkets:[]}},byId=new Map(quotes.map(quote=>[quote.itemId,quote])),items=rows.map(row=>parseRow(row,byId.get(row.id),heads.get(String(row.ownerUserId)))),base={...parsePublicMarket(membership,observations),items,complete:items.length===reader.root.membership.count};
 if(new Set(items.map(item=>item.id)).size!==items.length||!base.complete||base.items.length!==rows.length)throw Error('PUBLIC_MATERIAL_COMPLETE_DISPLAY_REQUIRED');
 const sports=includeSports&&reader.root.sports?await reader.readPart(reader.root.sports):null,catalog=sports?mergePublicSports(base,sports):base;
 if(catalog.items.length!==reader.root.membership.count+(includeSports?reader.root.sportsCount:0))throw Error('PUBLIC_MATERIAL_COMPLETE_DISPLAY_REQUIRED');
 return{catalog,asOfPulse:reader.root.marketPrepared.asOfPulse,reader};
}
export async function prepareSelectedPublicReferenceState(input:ReferenceInput){
 const {catalog,asOfPulse,reader}=await prepareSelectedPublicReferenceCatalog(input),[history,capitalization]=await Promise.all([readPublicReferenceHistory(reader),reader.root.capitalization?reader.readPart(reader.root.capitalization).then(parseMarketCapSource):Promise.resolve(null)]);
 return{catalog,history,capitalization,asOfPulse,reader};
}
