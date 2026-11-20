import {parsePublicNetworkCache,type PublicNetworkCache} from './public-network-cache';
import {publicNetworkCacheWire} from './public-network-cache-wire';
import {decodePublicDocumentGzip} from './public-document-gzip';
import {readPublicProfileHeads,readPublicProfileHeadRefusals} from './public-profile-header';
import type {PublicMarketCatalog} from './public-market';
import {mergePublicRecords} from './public-network';
import {parseMarketHistory,SHARE_MARKET_HISTORY_POLICY,type MarketHistorySnapshot} from './market-projection/history';
import {packMarketHistory} from './market-projection/history-wire';

export type ObservatoryDirectory=Pick<PublicMarketCatalog,'publicProfileHeads'|'publicProfileHeadRefusals'|'publicProfileHeadsRevision'|'revision'|'observedAt'>&{collectibleSealTimes?:number[];audience?:{observedAt:string;heads:ReturnType<typeof readPublicProfileHeads>}};
export type PublicLedgerDocumentSeed=Readonly<{schema:'bank.public-ledger.document.v1';generation:string;path:'ledger'|'ledger/proofs'|'observatory';locale:string;timeZone:string;directory?:ObservatoryDirectory;snapshot:PublicNetworkCache;marketHistory?:MarketHistorySnapshot}>;
export type PublicLedgerCompressedSnapshot=Readonly<{gzipB64u:string;bytes:number}>;
// The existing public Ledger archive delivery capacities. This is a display
// cache inside HTML, never a verified Ledger original or an admission input.
const MAX_RAW=64*1024*1024,MAX_GZIP=12*1024*1024;
const parsed=new WeakMap<Element,{text:string;seed:Promise<PublicLedgerDocumentSeed|null>}>();
const digest=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
async function gzipSnapshot(value:Record<string,unknown>):Promise<PublicNetworkCache>{
 const bytes=await decodePublicDocumentGzip(value,{raw:MAX_RAW,gzip:MAX_GZIP});
 return parsePublicNetworkCache(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
}
export function readPublicLedgerDocumentSeed(doc:Document|undefined=typeof document==='undefined'?undefined:document):Promise<PublicLedgerDocumentSeed|null>{
 const element=doc?.getElementById('public-ledger-document-seed');if(!element)return Promise.resolve(null);
 const text=element.textContent??'',held=parsed.get(element);if(held?.text===text)return held.seed;
 const seed=(async()=>{try{const value=JSON.parse(text);if(value.schema!=='bank.public-ledger.document.v1'||!digest(value.generation)||!['ledger','ledger/proofs','observatory'].includes(value.path)||typeof value.locale!=='string'||value.locale.length>80||typeof value.timeZone!=='string'||value.timeZone.length>80)return null;
  new Intl.DateTimeFormat(value.locale,{timeZone:value.timeZone});
  let snapshot:PublicNetworkCache;
  if(value.snapshotGzip){
   const packets=Array.isArray(value.snapshotGzip)?value.snapshotGzip:[value.snapshotGzip];if(!packets.length||packets.length>4||packets.some((packet:PublicLedgerCompressedSnapshot)=>!packet||typeof packet!=='object'||!Number.isSafeInteger(packet.bytes)||packet.bytes<1||packet.bytes>MAX_RAW||typeof packet.gzipB64u!=='string')||packets.reduce((total:number,packet:PublicLedgerCompressedSnapshot)=>total+packet.bytes,0)>MAX_RAW||packets.reduce((total:number,packet:PublicLedgerCompressedSnapshot)=>total+packet.gzipB64u.length,0)>Math.ceil(MAX_GZIP*4/3))return null;
   const caches=await Promise.all(packets.map((packet:Record<string,unknown>)=>gzipSnapshot(packet)));if(caches.reduce((total,cache)=>total+cache.records.length,0)>100000)return null;
   // Each decoded packet is already validated, ordered and deduplicated by the cache reader.
   const [base,...additions]=caches;
   const records=additions.reduce((rows,packet)=>mergePublicRecords(rows,packet.records),base.records);
   const coverage=new Map(caches.flatMap(cache=>cache.coverage).map(item=>[item.source,item]));snapshot={records,capturedAt:caches.map(cache=>cache.capturedAt).filter((time):time is string=>time!==null).sort((a,b)=>Date.parse(b)-Date.parse(a))[0]??null,inspectionVersion:caches[0].inspectionVersion,coverage:[...coverage.values()]};
  }else snapshot=parsePublicNetworkCache(value.snapshot);
  const raw=value.directory;
  const audience=typeof raw?.audience?.observedAt==='string'&&Number.isFinite(Date.parse(raw.audience.observedAt))?{observedAt:raw.audience.observedAt,heads:readPublicProfileHeads(raw.audience.heads)}:undefined;
  const seals=raw?.collectibleSealTimes;
  const collectibleSealTimes=Array.isArray(seals)&&seals.length<=100000&&seals.every((at,index)=>Number.isSafeInteger(at)&&at>=0&&at<=8.64e15&&(!index||at>=seals[index-1]))?seals:undefined;
  const directory=raw&&typeof raw.revision==='string' ? {audience,collectibleSealTimes,revision:raw.revision,observedAt:typeof raw.observedAt==='string'?raw.observedAt:null,publicProfileHeads:readPublicProfileHeads(raw.publicProfileHeads),publicProfileHeadRefusals:readPublicProfileHeadRefusals(raw.publicProfileHeadRefusals),publicProfileHeadsRevision:typeof raw.publicProfileHeadsRevision==='string'?raw.publicProfileHeadsRevision:undefined} : undefined;
  let marketHistory:MarketHistorySnapshot|undefined;
  if(value.path==='observatory'&&value.marketHistory){
   try{const selected=parseMarketHistory(value.marketHistory);if(selected.historyPolicy===SHARE_MARKET_HISTORY_POLICY)marketHistory=selected;}
   catch{/* Ledger and its first frame remain available with the bundled pricing. */}
  }
  return {schema:value.schema,...(directory?{directory}:{}),generation:value.generation,path:value.path,locale:value.locale,timeZone:value.timeZone,snapshot,...(marketHistory?{marketHistory}:{})} as PublicLedgerDocumentSeed;
 }catch{return null;}})();parsed.set(element,{text,seed});return seed;
}
export function publicLedgerDocumentSeedScript(seed:PublicLedgerDocumentSeed,snapshotGzip?:PublicLedgerCompressedSnapshot|readonly PublicLedgerCompressedSnapshot[]):string{
 const {snapshot,marketHistory,...metadata}=seed;
 return '<script id="public-ledger-document-seed" type="application/json">'+JSON.stringify({...metadata,...(marketHistory?{marketHistory:packMarketHistory(marketHistory)}:{}),...(snapshotGzip?{snapshotGzip}:{snapshot:publicNetworkCacheWire(snapshot)})}).replaceAll('<','\\u003c')+'</script>';
}
