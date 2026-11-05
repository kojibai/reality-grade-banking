import type {MarketCapSource} from './market-projection/source';
import type {PublicDocumentFormat} from '../core/public-document-format';
import type {PublicMarketCatalog} from './public-market';
import {parseMarketHistory,type MarketHistorySnapshot} from './market-projection/history';
import type {CompactMarketHistory} from './market-projection/history-wire';

/** Carried presentation bytes only; these never admit ownership or spending. */
export type PublicMarketDocumentSeed={schema:'bank.public-market.document.v1';generation:string;path:string;catalog:PublicMarketCatalog;visibleCount:number;asOfPulse:number;format:PublicDocumentFormat;history?:CompactMarketHistory;capitalization?:MarketCapSource};
const readSeeds=new WeakMap<Element,{text:string;seed:PublicMarketDocumentSeed|null}>();
const readHistories=new WeakMap<PublicMarketDocumentSeed,MarketHistorySnapshot>();
export function publicMarketDocumentHistory(seed:PublicMarketDocumentSeed):MarketHistorySnapshot|undefined{
 if(!seed.history)return undefined;const held=readHistories.get(seed);if(held)return held;
 const history=parseMarketHistory(seed.history);readHistories.set(seed,history);return history;
}
export function publicMarketDocumentSeedScript(seed:PublicMarketDocumentSeed):string{
 return `<script id="public-market-seed" type="application/json">${JSON.stringify(seed).replaceAll('<','\\u003c').replaceAll('>','\\u003e').replaceAll('&','\\u0026')}</script>`;
}
export function readPublicMarketDocumentSeed(doc:Pick<Document,'getElementById'>|undefined=typeof document==='undefined'?undefined:document):PublicMarketDocumentSeed|null{
 const element=doc?.getElementById('public-market-seed'),text=element?.textContent;if(!element||!text||text.length>32*1024*1024)return null;
 const held=readSeeds.get(element);if(held?.text===text)return held.seed;
 try{
  const seed=JSON.parse(text) as PublicMarketDocumentSeed,items=seed?.catalog?.items;
  if(seed.schema!=='bank.public-market.document.v1'||!/^[a-f0-9]{64}$/.test(seed.generation)||typeof seed.path!=='string'||!Number.isSafeInteger(seed.asOfPulse)||seed.asOfPulse<0||seed.asOfPulse>1e10||seed.catalog.complete!==true||!Array.isArray(items)||items.length>10000||!Number.isSafeInteger(seed.visibleCount)||seed.visibleCount<0||seed.visibleCount>items.length||new Set(items.map(item=>item.id)).size!==items.length||items.some(item=>typeof item.id!=='string'||item.authority!=='projection-only'||item.canTrade!==false))return null;
  if(typeof seed.format?.locale!=='string'||seed.format.locale.length>128||typeof seed.format.timeZone!=='string'||seed.format.timeZone.length>128)return null;
  new Intl.DateTimeFormat(seed.format.locale,{timeZone:seed.format.timeZone});
  readSeeds.set(element,{text,seed});return seed;
 }catch{return null;}
}
