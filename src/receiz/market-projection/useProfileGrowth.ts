import {useEffect,useMemo,useRef,useState} from 'react';
import type {PublicMarketCatalog,PublicMarketItem} from '../public-market';
import type {MarketCapSource} from './source';
import {profileGrowthRows,type ProfileGrowthHistory,type ProfileGrowthRow} from './profile-growth';

type PreparedProfile={source:MarketCapSource|null;catalog:PublicMarketCatalog|null;rows:ProfileGrowthRow[];history:ProfileGrowthHistory};
// Exactly one latest prepared view per retained immutable collection. A
// profile leaving the held source cache also releases its derived history.
const preparedProfiles=new WeakMap<PublicMarketItem[],PreparedProfile>();

/** Prepare one bounded local curve off the UI thread. No source read or clock;
 * subsequent visible updates calculate only moving window edges. */
export function useProfileGrowth(items:PublicMarketItem[],source:MarketCapSource|null,pulse:number,active:boolean,opened:boolean,catalog:PublicMarketCatalog|null=null){
 const known=preparedProfiles.get(items),reused=known?.source===source&&known.catalog===catalog?known:null;
 const [inputs,setInputs]=useState<{items:PublicMarketItem[];source:MarketCapSource|null;catalog:PublicMarketCatalog|null}|null>(()=>reused?{items,source,catalog}:null);
 if(opened&&(!inputs||inputs.items!==items||inputs.source!==source||inputs.catalog!==catalog))setInputs({items,source,catalog});
 // First paint does not wait for aggregate chart preparation. The existing
 // yielding worker prepares once after that paint, rather than on the tap.
 useEffect(()=>{if(!active||!items.length||inputs?.items===items&&inputs.source===source&&inputs.catalog===catalog)return;let second=0;const first=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>setInputs({items,source,catalog}));});return()=>{cancelAnimationFrame(first);if(second)cancelAnimationFrame(second);};},[items,source,catalog,active,inputs]);
 const rows=useMemo(()=>{if(!inputs)return null;const known=preparedProfiles.get(inputs.items);return known?.source===inputs.source&&known.catalog===inputs.catalog?known.rows:profileGrowthRows(inputs.items,inputs.source,inputs.catalog);},[inputs]),worker=useRef<Worker|null>(null),request=useRef(0),busy=useRef(false),queued=useRef<number|null>(null),held=useRef<ProfileGrowthHistory|null>(reused?.history??null),heldRows=useRef<ProfileGrowthRow[]|null>(reused?.rows??null),send=useRef<()=>void>(()=>{}),latest=useRef(pulse);
 const processing=useRef<number|null>(null);
 latest.current=pulse;
 const [published,setPublished]=useState<{rows:typeof rows;history:ProfileGrowthHistory}|null>(()=>reused?{rows:reused.rows,history:reused.history}:null),[unavailable,setUnavailable]=useState(false);
 useEffect(()=>{
  if(!rows||!active)return;
  let instance:Worker;try{instance=new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});}catch{setUnavailable(true);return;}
  worker.current=instance;busy.current=false;setUnavailable(false);let initialized=false;
  const dispatch=()=>{if(busy.current||queued.current===null)return;const next=queued.current;queued.current=null;busy.current=true;processing.current=next;const id=++request.current;if(initialized)instance.postMessage({id,profileTick:true,pulse:next});else{instance.postMessage({id,profileRows:rows,pulse:next,profileHistory:held.current});initialized=true;}};send.current=dispatch;
  instance.onmessage=event=>{if(event.data.id!==request.current)return;busy.current=false;processing.current=null;if(event.data.growth){held.current=event.data.growth;heldRows.current=rows;if(inputs)preparedProfiles.set(inputs.items,{source:inputs.source,catalog:inputs.catalog,rows,history:event.data.growth});setPublished({rows,history:event.data.growth});}else if(event.data.error)setUnavailable(true);dispatch();};
  instance.onerror=()=>{instance.terminate();worker.current=null;busy.current=false;processing.current=null;queued.current=null;send.current=()=>{};setUnavailable(true);};
  queued.current=heldRows.current===rows&&held.current?.pulse===latest.current?null:latest.current;dispatch();
  return()=>{instance.terminate();worker.current=null;busy.current=false;processing.current=null;queued.current=null;send.current=()=>{};++request.current;};
 },[rows,active]);
 useEffect(()=>{if(!active||!opened||!worker.current||held.current?.pulse===pulse||processing.current===pulse||queued.current===pulse)return;queued.current=pulse;send.current();},[active,opened,pulse,rows]);
 const current=inputs?.items===items&&inputs.source===source&&inputs.catalog===catalog;
 return {history:current&&published?.rows===rows?published.history:null,rows:current?rows:null,unavailable:unavailable||!!inputs&&!rows};
}
