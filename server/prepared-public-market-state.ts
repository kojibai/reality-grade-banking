import {receizKaiNow} from '@receiz/sdk';
import {readFile} from 'node:fs/promises';
import {parsePublicMarket,type PublicMarketCatalog} from '../src/receiz/public-market.js';
import {mergePublicSports} from '../src/receiz/public-sports.js';
import {buildMarketHistory} from '../src/receiz/market-projection/build-history.js';
import {parseMarketHistory} from '../src/receiz/market-projection/history.js';
import {packMarketHistory} from '../src/receiz/market-projection/history-wire.js';
import {parseMarketCapSource} from '../src/receiz/market-projection/source.js';
let shippedHistory:Promise<ReturnType<typeof parseMarketHistory>>|undefined;
function retainedInitialHistory(){return shippedHistory??=readFile('public/receiz-public-share-chart-history.json').then(bytes=>{if(bytes.length>32*1024*1024)throw Error('PUBLIC_MARKET_RENDER_CAPACITY');return parseMarketHistory(JSON.parse(bytes.toString('utf8')));}).catch(error=>{shippedHistory=undefined;throw error;});}

function priorCatalogSelection(input:unknown,catalog:PublicMarketCatalog):PublicMarketCatalog|undefined{
 if(!input||typeof input!=='object')return undefined;const selected=input as PublicMarketCatalog&{ids?:unknown};
 if(selected.complete!==true||!Array.isArray(selected.ids)||selected.ids.length>10000||selected.ids.some(id=>typeof id!=='string')||new Set(selected.ids).size!==selected.ids.length)return undefined;
 const byId=new Map(catalog.items.map(item=>[item.id,item]));if(selected.ids.some(id=>!byId.has(id)))return undefined;
 const {ids,...metadata}=selected;return {...catalog,...metadata,items:ids.map(id=>byId.get(id)!)} as PublicMarketCatalog;
}
/** One write-side chart preparation per accepted material. Existing model,
 * quantity-prefix and exact previous-basis guards remain authoritative for
 * display continuity; no Source, Original or financial grant is admitted. */
export async function preparePublicMarketState(input:Record<string,unknown>){
 const base=parsePublicMarket(input.membership,input.snapshot),catalog=input.sports?mergePublicSports(base,input.sports):base;
 if(!base.complete||catalog.items.length>10000)throw Error('PUBLIC_MARKET_RENDER_COMPLETE_REQUIRED');
 const previous=input.history==null?await retainedInitialHistory():parseMarketHistory(input.history),capitalization=input.capitalization?parseMarketCapSource(input.capitalization):null,prior=priorCatalogSelection(input.priorCatalogSelection,catalog),pulse=receizKaiNow().pulse;
 const history=capitalization?await buildMarketHistory(capitalization,previous,()=>true,async()=>{},{catalog,pulse:Math.max(pulse,capitalization.serverPulse),capitalization:true,...(prior?{priorInput:{source:capitalization,catalog:prior}}:{})}):previous;
 if(!history)throw Error('PUBLIC_MARKET_RENDER_HISTORY_PENDING');
 return {history:packMarketHistory(history),asOfPulse:Math.max(pulse,history.summary.serverPulse)};
}
