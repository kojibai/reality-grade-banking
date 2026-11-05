import {parsePublicNetworkCache,type PublicNetworkCache} from './public-network-cache';
import {publicNetworkCacheWire} from './public-network-cache-wire';
import {decodePublicDocumentGzip} from './public-document-gzip';
import {mergePublicRecords} from './public-network';

export type PublicLedgerDocumentSeed=Readonly<{schema:'bank.public-ledger.document.v1';generation:string;path:'ledger'|'ledger/proofs';locale:string;timeZone:string;snapshot:PublicNetworkCache}>;
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
 const seed=(async()=>{try{const value=JSON.parse(text);if(value.schema!=='bank.public-ledger.document.v1'||!digest(value.generation)||!['ledger','ledger/proofs'].includes(value.path)||typeof value.locale!=='string'||value.locale.length>80||typeof value.timeZone!=='string'||value.timeZone.length>80)return null;
  new Intl.DateTimeFormat(value.locale,{timeZone:value.timeZone});
  let snapshot:PublicNetworkCache;
  if(value.snapshotGzip){
   const packets=Array.isArray(value.snapshotGzip)?value.snapshotGzip:[value.snapshotGzip];if(!packets.length||packets.length>4||packets.some((packet:PublicLedgerCompressedSnapshot)=>!packet||typeof packet!=='object'||!Number.isSafeInteger(packet.bytes)||packet.bytes<1||packet.bytes>MAX_RAW||typeof packet.gzipB64u!=='string')||packets.reduce((total:number,packet:PublicLedgerCompressedSnapshot)=>total+packet.bytes,0)>MAX_RAW||packets.reduce((total:number,packet:PublicLedgerCompressedSnapshot)=>total+packet.gzipB64u.length,0)>Math.ceil(MAX_GZIP*4/3))return null;
   const caches=await Promise.all(packets.map((packet:Record<string,unknown>)=>gzipSnapshot(packet)));if(caches.reduce((total,cache)=>total+cache.records.length,0)>100000)return null;
   const coverage=new Map(caches.flatMap(cache=>cache.coverage).map(item=>[item.source,item]));snapshot={records:caches.reduce((rows,cache)=>mergePublicRecords(rows,cache.records),[] as PublicNetworkCache['records']),capturedAt:caches.map(cache=>cache.capturedAt).filter((time):time is string=>time!==null).sort((a,b)=>Date.parse(b)-Date.parse(a))[0]??null,inspectionVersion:caches[0].inspectionVersion,coverage:[...coverage.values()]};
  }else snapshot=parsePublicNetworkCache(value.snapshot);
  return {schema:value.schema,generation:value.generation,path:value.path,locale:value.locale,timeZone:value.timeZone,snapshot} as PublicLedgerDocumentSeed;
 }catch{return null;}})();parsed.set(element,{text,seed});return seed;
}
export function publicLedgerDocumentSeedScript(seed:PublicLedgerDocumentSeed,snapshotGzip?:PublicLedgerCompressedSnapshot|readonly PublicLedgerCompressedSnapshot[]):string{
 const {snapshot,...metadata}=seed;
 return '<script id="public-ledger-document-seed" type="application/json">'+JSON.stringify({...metadata,...(snapshotGzip?{snapshotGzip}:{snapshot:publicNetworkCacheWire(snapshot)})}).replaceAll('<','\\u003c')+'</script>';
}
