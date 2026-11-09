import {decodePublicDocumentGzip} from './public-document-gzip';
import {unpackPublicCatalogArtwork} from './public-catalog-artwork-wire';
import type {MarketCapSource} from './market-projection/source';
import type {PublicDocumentFormat} from '../core/public-document-format';
import type {PublicMarketCatalog} from './public-market';
import {parseMarketHistory,type MarketHistorySnapshot} from './market-projection/history';
import type {CompactMarketHistory} from './market-projection/history-wire';

/** Carried presentation bytes only; these never admit ownership or spending. */
export type PublicMarketDocumentSeed={schema:'bank.public-market.document.v1';generation:string;path:string;catalog:PublicMarketCatalog;visibleCount:number;asOfPulse:number;format:PublicDocumentFormat;history?:CompactMarketHistory;capitalization?:MarketCapSource};
type SeedRead={text:string;seed:PublicMarketDocumentSeed|null;packet?:unknown};
const readSeeds=new WeakMap<Element,SeedRead>();
const preparingSeeds=new WeakMap<Element,{text:string;seed:Promise<PublicMarketDocumentSeed|null>}>();
const readHistories=new WeakMap<PublicMarketDocumentSeed,MarketHistorySnapshot>();
export function publicMarketDocumentHistory(seed:PublicMarketDocumentSeed):MarketHistorySnapshot|undefined{
 if(!seed.history)return undefined;const held=readHistories.get(seed);if(held)return held;
 const history=parseMarketHistory(seed.history);readHistories.set(seed,history);return history;
}
export function publicMarketDocumentSeedScript(seed:PublicMarketDocumentSeed,catalogGzip?:{gzipB64u:string;bytes:number}):string{
 const {catalog,...metadata}=seed,value=catalogGzip?{...metadata,catalogGzip}:seed;
 return `<script id="public-market-seed" type="application/json">${JSON.stringify(value).replaceAll('<','\\u003c').replaceAll('>','\\u003e').replaceAll('&','\\u0026')}</script>`;
}
function inspectSeed(value:unknown):PublicMarketDocumentSeed|null{
 try{
  const seed=value as PublicMarketDocumentSeed,items=seed?.catalog?.items;
  if(seed.schema!=='bank.public-market.document.v1'||!/^[a-f0-9]{64}$/.test(seed.generation)||typeof seed.path!=='string'||!Number.isSafeInteger(seed.asOfPulse)||seed.asOfPulse<0||seed.asOfPulse>1e10||seed.catalog.complete!==true||!Array.isArray(items)||items.length>10000||!Number.isSafeInteger(seed.visibleCount)||seed.visibleCount<0||seed.visibleCount>items.length||new Set(items.map(item=>item.id)).size!==items.length||items.some(item=>typeof item.id!=='string'||item.authority!=='projection-only'||item.canTrade!==false))return null;
  if(typeof seed.format?.locale!=='string'||seed.format.locale.length>128||typeof seed.format.timeZone!=='string'||seed.format.timeZone.length>128)return null;
  new Intl.DateTimeFormat(seed.format.locale,{timeZone:seed.format.timeZone});return seed;
 }catch{return null;}
}
/** Same v1 display parser for an inert saved data document. It executes no
 * HTML or script and supplies no ownership/financial admission. */
async function preparePublicMarketSeedValue(input:unknown):Promise<PublicMarketDocumentSeed|null>{
 try{
  const value=input as PublicMarketDocumentSeed&{catalogGzip?:unknown};
  if(value?.catalogGzip!==undefined){
   if(Object.hasOwn(value,'catalog'))return null;
   const bytes=await decodePublicDocumentGzip(value.catalogGzip,{raw:32*1024*1024,gzip:8*1024*1024});
   value.catalog=unpackPublicCatalogArtwork(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));delete value.catalogGzip;
  }
  return inspectSeed(value);
 }catch{return null;}
}
export async function preparePublicMarketSeedText(text:string):Promise<PublicMarketDocumentSeed|null>{
 try{if(!text||text.length>32*1024*1024)return null;return await preparePublicMarketSeedValue(JSON.parse(text));}catch{return null;}
}
/** Reuse the parsed packet from the synchronous probe through local decode.
 * The pending packet is retired when the existing accepted seed replaces it. */
function readSeedInput(element:Element,text:string):SeedRead{
 const held=readSeeds.get(element);if(held?.text===text)return held;
 let input:SeedRead;
 try{const value=JSON.parse(text);input={text,seed:inspectSeed(value),...(value?.catalogGzip!==undefined?{packet:value}:{})};}catch{input={text,seed:null};}
 readSeeds.set(element,input);return input;
}
export function readPublicMarketDocumentSeed(doc:Pick<Document,'getElementById'>|undefined=typeof document==='undefined'?undefined:document):PublicMarketDocumentSeed|null{
 const element=doc?.getElementById('public-market-seed'),text=element?.textContent;if(!element||!text||text.length>32*1024*1024)return null;
 return readSeedInput(element,text).seed;
}
/** Decode a carried public projection once for its existing public document.
 * Account entry never awaits this helper. No source is fetched, signed,
 * financially admitted, or historically reconstructed here. */
export function preparePublicMarketDocumentSeed(doc:Pick<Document,'getElementById'>|undefined=typeof document==='undefined'?undefined:document):Promise<PublicMarketDocumentSeed|null>{
 const element=doc?.getElementById('public-market-seed'),text=element?.textContent;if(!element||!text||text.length>32*1024*1024)return Promise.resolve(null);
 const pending=preparingSeeds.get(element);if(pending?.text===text)return pending.seed;
 const input=readSeedInput(element,text);if(input.packet===undefined)return Promise.resolve(input.seed);
 const seed=(async()=>{try{
  const accepted=await preparePublicMarketSeedValue(input.packet);
  if(element.textContent!==text){if(readSeeds.get(element)===input)readSeeds.delete(element);return null;}
  readSeeds.set(element,{text,seed:accepted});return accepted;
 }catch{if(element.textContent===text)readSeeds.set(element,{text,seed:null});else if(readSeeds.get(element)===input)readSeeds.delete(element);return null;}})().finally(()=>{delete input.packet;if(preparingSeeds.get(element)?.seed===seed)preparingSeeds.delete(element);});
 preparingSeeds.set(element,{text,seed});return seed;
}
