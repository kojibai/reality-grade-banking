import {preparedBankCatalogEnabled,preparedBankCatalogState,subscribePreparedBankCatalog,readPreparedBankCatalog} from '../prepared-bank-catalog';
import {useSyncExternalStore} from 'react';
import {readPublicMarketDocumentSeed} from '../public-market-document-seed';
import {parseMarketCapSource,retainMarketSourceHistory,type MarketCapSource} from './source';
let source:MarketCapSource|null=null;
let sourceKind:'live'|'shipped'='shipped';
const KEY='receiz-bank-public-object-value-source-v1';
let restored=false,initialRead:Promise<void>|undefined;
const reads=new Map<string,Promise<MarketCapSource>>();
const listeners=new Set<()=>void>();
function store(next:MarketCapSource,kind:'live'|'shipped'){
 source=next;sourceKind=kind;
 try{localStorage.setItem(KEY,JSON.stringify({ok:true,marketCapProjection:next,displaySourceKind:kind}));}catch{/* Optional display retention. */}
 for(const listener of listeners)listener();
}
/** Replace the already selected complete public display operand exactly. This
 * carries no ownership or financial authority and performs no source read. */
export function adoptMarketDisplaySource(next:MarketCapSource):void{
 restored=true;if(source===next&&sourceKind==='live')return;store(next,'live');
}
/** Retain public pricing operands only. This display model grants no rights. */
export function publishMarketDisplaySource(next:MarketCapSource,kind:'live'|'shipped'='live'):void{
 if(source&&(next.serverPulse<source.serverPulse||next.serverPulse===source.serverPulse&&kind==='shipped'&&sourceKind==='live')||next===source)return;store(retainMarketSourceHistory(next,source),kind);
}
const subscribe=(listener:()=>void)=>{listeners.add(listener);const unsubscribe=subscribePreparedBankCatalog(listener);return()=>{listeners.delete(listener);unsubscribe();};};
export function retainedMarketDisplaySource(){
 if(preparedBankCatalogEnabled()){const prepared=preparedBankCatalogState(),held=prepared.value??prepared.carried;if(held)return held.capitalization;}
 if(!restored){restored=true;const prepared=readPublicMarketDocumentSeed()?.capitalization;
  if(prepared){source=prepared;sourceKind='live';}
  else try{const input=JSON.parse(localStorage.getItem(KEY)??'null'),cached=parseMarketCapSource(input);if(!source||cached.serverPulse>source.serverPulse){source=cached;sourceKind=input.displaySourceKind==='shipped'?'shipped':'live';}}catch{/* No qualified public cache. */}}
 return source;
}
/** Coalesce the existing overview and object readers, including cold deep links. */
export function readMarketDisplaySource(path:string):Promise<MarketCapSource>{
 const pending=reads.get(path);if(pending)return pending;
 const attempt=(async()=>{const response=await fetch(path,{credentials:'omit',signal:AbortSignal.timeout(60_000)});if(!response.ok)throw Error('Public pricing source unavailable.');const next=parseMarketCapSource(await response.json());publishMarketDisplaySource(next,path==='/receiz-public-capitalization.json'?'shipped':'live');return retainedMarketDisplaySource()!;})();
 reads.set(path,attempt);void attempt.finally(()=>{if(reads.get(path)===attempt)reads.delete(path);}).catch(()=>{});return attempt;
}
export function prepareMarketDisplaySource(refreshMissing=false):Promise<void>{
 const held=retainedMarketDisplaySource();if(held&&!refreshMissing)return Promise.resolve();
 if(preparedBankCatalogEnabled()&&(preparedBankCatalogState().phase!=='fallback'||preparedBankCatalogState().value||preparedBankCatalogState().carried))return readPreparedBankCatalog().then(value=>{if(!value&&!preparedBankCatalogState().value&&!preparedBankCatalogState().carried)return prepareMarketDisplaySource(refreshMissing);});
 if(initialRead)return initialRead;
 const attempt=(async()=>{await Promise.allSettled([...(held?[]:[readMarketDisplaySource('/receiz-public-capitalization.json')]),readMarketDisplaySource('/api/bank/public-market/capitalization')]);})();
 initialRead=attempt;void attempt.finally(()=>{if(initialRead===attempt)initialRead=undefined;});return attempt;
}
export function useMarketDisplaySource(active=true){return useSyncExternalStore(subscribe,active?retainedMarketDisplaySource:()=>null,()=>null);}
