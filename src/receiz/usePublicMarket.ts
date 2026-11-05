import {preparedBankCatalogEnabled,preparedBankCatalogState,subscribePreparedBankCatalog,readPreparedBankCatalog,type PreparedBankCatalog} from './prepared-bank-catalog';
import {readPublicMarketDocumentSeed} from './public-market-document-seed';
import {compatibleShareInventory,mergeShareInventory} from './market-share-inventory';
import {retainPublicMomentManifest} from './public-asset-manifest';
import { useCallback, useEffect, useMemo, useRef, useState,useSyncExternalStore,type SetStateAction } from 'react';
import {receizKaiNow} from '@receiz/sdk';
import { fetchPublicSports, mergePublicSports,retainPublicSportsInput } from './public-sports';
import { fetchPublicMarket, fetchPublicQuotes, mergePublicQuotes, parsePublicMarket, rememberPublicOriginalLocators, retainPublicArtwork, validatePublicQuotes, type PublicMarketCatalog } from './public-market';
import {prepareMarketDisplaySource,useMarketDisplaySource} from './market-projection/display-source';
import {publicCatalogAtPulse} from './market-projection/catalog-prices';

import {mergeAdmittedPublicAssets,subscribeAssetPublicationAdmissions} from './asset-publication-adoption';
function adoptCatalog(catalog:PublicMarketCatalog|null){const next=mergeAdmittedPublicAssets(catalog??{items:[],complete:false,revision:'local-admission',observedAt:null,sourceCount:0});return catalog||next.items.length?next:null;}
export const PUBLIC_MARKET_CACHE_KEY = 'receiz-bank-public-discovery-v2';
// Public workspaces share the settled source already in this document. Optional
// browser storage can be too small for the complete collection and card input.
let retainedCatalog:PublicMarketCatalog|null=null,retainedSports:unknown=null,restored=false,preparedDocument=false;
const catalogListeners=new Set<()=>void>();
const subscribeCatalog=(listener:()=>void)=>{catalogListeners.add(listener);const unsubscribe=subscribePreparedBankCatalog(listener);return()=>{catalogListeners.delete(listener);unsubscribe();};};
const inactiveCatalog=()=>()=>{};
function restorePublicCatalog(): PublicMarketCatalog | null {
  const carried=readPublicMarketDocumentSeed();if(carried){preparedDocument=true;rememberPublicOriginalLocators(carried.catalog);return carried.catalog;}
  try{retainedSports=JSON.parse(localStorage.getItem('receiz-bank-public-sports-v1')??'null');}catch{/* Optional public inventory. */}
  try { const saved = localStorage.getItem(PUBLIC_MARKET_CACHE_KEY); const input = saved ? JSON.parse(saved) : null; const catalog = input ? parsePublicMarket(input, input.snapshot) : null; if (!catalog) return null; rememberPublicOriginalLocators(catalog); return mergePublicSports(catalog,retainedSports); } catch { return null; }
}
let adoptedPrepared:PreparedBankCatalog['seed']|null=null;
function readPublicCatalog(){
 if(preparedBankCatalogEnabled()){const prepared=preparedBankCatalogState();
  if(prepared.value){const value=prepared.value;if(adoptedPrepared!==value.seed){adoptedPrepared=value.seed;restored=true;retainedCatalog=adoptCatalog(value.seed.catalog);rememberPublicOriginalLocators(retainedCatalog!);}return retainedCatalog;}
  if(prepared.phase!=='fallback')return null;
 }
 if(!restored){restored=true;retainedCatalog=adoptCatalog(restorePublicCatalog());}return retainedCatalog;}
function publishPublicCatalog(next:SetStateAction<PublicMarketCatalog|null>){
  const current=readPublicCatalog(),candidate=typeof next==='function'?next(current):next;
  const currentAt=Date.parse(current?.observedAt??''),candidateAt=Date.parse(candidate?.observedAt??'');
  if(candidate?.complete&&Number.isFinite(currentAt)&&Number.isFinite(candidateAt)&&candidateAt<currentAt)return;
  const updated=adoptCatalog(candidate);
  if(updated===current)return;retainedCatalog=updated;for(const listener of catalogListeners)listener();
}
let shippedCatalog:Promise<void>|undefined,shippedSports:Promise<void>|undefined;
/** Shipped inputs belong to this document, not to a mounted surface. Parse and
 * adopt each once; closing one consumer cannot cancel another's preparation. */
function prepareShippedCatalog():Promise<void>{
  if(shippedCatalog)return shippedCatalog;
  const attempt=(async()=>{
    const response=await fetch('/receiz-public-market.json',{credentials:'omit'});
    if(!response.ok)throw Error('Public collection snapshot unavailable.');
    const input=await response.json(),cached=parsePublicMarket(input,input.snapshot);rememberPublicOriginalLocators(cached);
    publishPublicCatalog(current=>{
      if(!current||cached.complete&&(!Number.isFinite(Date.parse(current.observedAt??''))||Date.parse(cached.observedAt??'')>Date.parse(current.observedAt??'')))return mergePublicSports(cached,retainedSports);
      const hints=new Map(cached.items.map(item=>[item.id,item]));
      return {...current,items:current.items.map(item=>{
        const hint=hints.get(item.id);
        if(!hint||hint.assetId!==item.assetId||hint.pulse!==item.pulse||hint.originalDigest!==item.originalDigest||hint.verifyUrl!==item.verifyUrl)return item;
        const presented=item.mediaKind===undefined&&hint.mediaKind!==undefined?{...item,mediaKind:hint.mediaKind}:item;
        return {...retainPublicMomentManifest(retainPublicArtwork(presented,hint),hint),shareInventory:mergeShareInventory(compatibleShareInventory(item,item.shareInventory),compatibleShareInventory(item,hint.shareInventory)??null),...(item.hasLongForm===undefined?{hasLongForm:hint.hasLongForm,readingUrl:hint.readingUrl}:{}),...(!item.livePulseSeed&&hint.livePulseSeed?{livePulseSeed:hint.livePulseSeed,valuationBinding:hint.valuationBinding}:{})};
      })};
    });
  })();
  shippedCatalog=attempt;void attempt.catch(()=>{if(shippedCatalog===attempt)shippedCatalog=undefined;});return attempt;
}
function prepareShippedSports():Promise<void>{
  if(shippedSports)return shippedSports;
  const attempt=(async()=>{
    const response=await fetch('/receiz-public-sports.json',{credentials:'omit'});
    if(!response.ok)throw Error('Public collectible snapshot unavailable.');
    const data=await response.json(),next=retainedSports?retainPublicSportsInput(data,retainedSports):data;
    if(next===retainedSports)return;retainedSports=next;publishPublicCatalog(current=>current?mergePublicSports(current,next):current);
  })();
  shippedSports=attempt;void attempt.catch(()=>{if(shippedSports===attempt)shippedSports=undefined;});return attempt;
}
export function usePublicMarket(active = true, displayActive = active, selectedItemId?:string|null) {
  const preparedSnapshot=useSyncExternalStore(subscribePreparedBankCatalog,preparedBankCatalogState,preparedBankCatalogState);
  const pricingSource=useMarketDisplaySource(),[pulse,setPulse]=useState(()=>receizKaiNow().pulse);
  const catalog=useSyncExternalStore(active?subscribeCatalog:inactiveCatalog,readPublicCatalog,()=>null),setCatalog=publishPublicCatalog;
  const [status, setStatus] = useState<'loading' | 'live' | 'stale' | 'error'>(catalog ? 'stale' : 'loading');
  const [quoteStatus, setQuoteStatus] = useState<'loading' | 'fresh' | 'stale'>(()=>preparedBankCatalogEnabled()&&preparedBankCatalogState().value?.receipt.state==='current'?'fresh':'stale');
  const [sportsStatus, setSportsStatus] = useState<'loading' | 'fresh' | 'retained' | 'missing'>(catalog?.items.some(item => item.category === 'sports') ? 'retained' : 'loading');
  const [error, setError] = useState<string | null>(null);
  const running = useRef<AbortController | null>(null);
  const sportsRunning=useRef<AbortController|null>(null);
  const pendingMarketChange=useRef<string|undefined>(undefined);
  const quoteRead=useRef<{controller:AbortController;nonce:string|undefined;pending:Promise<void>}|null>(null);
  const quoteGeneration=useRef(0),latestQuotes=useRef<unknown>(null);
  const generation = useRef(0);
  useEffect(()=>subscribeAssetPublicationAdmissions(accepted=>{setCatalog(current=>{
    if(!accepted||!accepted.complete&&current)return current;const previous=new Map(current?.items.map(item=>[item.id,item]));
    return mergePublicSports({...accepted,items:accepted.items.map(item=>{const prior=previous.get(item.id),next={...retainPublicMomentManifest(retainPublicArtwork(item,prior),prior),shareInventory:compatibleShareInventory(item,prior?.shareInventory)};return prior?.chart.length?{...next,priceUsd:prior.priceUsd,changePct:prior.changePct,chart:prior.chart}:next;})},retainedSports);
  });}),[setCatalog]);
  // Share observations have their own read lifetime. A recorded trade never
  // waits for unrelated membership/sports discovery to finish first.
  const refreshQuotes=useCallback((afterTrade?:string):Promise<void>=>{
    const previous=quoteRead.current;
    if(previous&&(!afterTrade||previous.nonce===afterTrade))return previous.pending;
    previous?.controller.abort();
    const controller=new AbortController(),attempt=++quoteGeneration.current;
    const current=()=>!controller.signal.aborted&&attempt===quoteGeneration.current;
    setQuoteStatus('loading');
    const pending=fetchPublicQuotes(controller.signal,afterTrade).then(validatePublicQuotes).then(value=>{
      if(!current())return;latestQuotes.current=value;
      if(pendingMarketChange.current===afterTrade)pendingMarketChange.current=undefined;
      setCatalog(catalog=>catalog?mergePublicQuotes(catalog,value):catalog);setQuoteStatus('fresh');
    },()=>{if(current()){setQuoteStatus('stale');setError(message=>[message,'Public prices and charts could not be refreshed. Showing cached quotes.'].filter(Boolean).join(' '));}}).finally(()=>{
      if(quoteRead.current?.controller===controller)quoteRead.current=null;
    });
    quoteRead.current={controller,nonce:afterTrade,pending};return pending;
  },[setCatalog]);
  const refresh = useCallback(async (quotesOnly=false) => {
    if(quotesOnly){await refreshQuotes(pendingMarketChange.current);return;}
    if (running.current) return;
    if(preparedBankCatalogEnabled()){
      const prepared=await readPreparedBankCatalog();
      if(prepared){setStatus(prepared.receipt.state==='current'?'live':'stale');setQuoteStatus(prepared.receipt.state==='current'?'fresh':'stale');setSportsStatus(prepared.seed.catalog.items.some(item=>item.category==='sports')?(prepared.receipt.state==='current'?'fresh':'retained'):'missing');setError(null);return;}
      const held=preparedBankCatalogState();
      if(held.value){setStatus('stale');setQuoteStatus('stale');setSportsStatus(held.value.seed.catalog.items.some(item=>item.category==='sports')?'retained':'missing');setError(held.error);return;}
      void prepareShippedSports().catch(()=>{});void prepareShippedCatalog().catch(()=>{});
    }
    // Prepare pricing operands beside discovery, before an object is opened.
    // The overview and direct-object paths share this same read and cache.
    void prepareMarketDisplaySource();
    const controller = new AbortController(); running.current = controller; const attempt = ++generation.current;
    const currentAttempt=()=>!controller.signal.aborted&&attempt===generation.current;
    latestQuotes.current=null;
    const quotesAttempt=refreshQuotes(pendingMarketChange.current);
    const membershipAttempt = fetchPublicMarket(controller.signal).then(value=>({value,error:null}),cause=>({value:null,error:cause instanceof Error?cause.message:'The public Market could not be refreshed.'})).then(membership=>{
      if(!currentAttempt())return;const next=membership.value;
      setCatalog(current=>{
        if(!next||!next.complete&&current)return current;
        const previous=new Map(current?.items.map(item=>[item.id,item]));
        let updated=mergePublicSports({...next,items:next.items.map(item=>{
          const quoted=previous.get(item.id);
          const presented={...retainPublicMomentManifest(retainPublicArtwork(item,quoted),quoted),shareInventory:compatibleShareInventory(item,quoted?.shareInventory)};
          return quoted?.chart.length?{...presented,priceUsd:quoted.priceUsd,changePct:quoted.changePct,chart:quoted.chart}:presented;
        })},retainedSports);
        if(latestQuotes.current)updated=mergePublicQuotes(updated,latestQuotes.current);
        return updated;
      });
      setStatus(next?.complete?'live':'stale');
      setError(next?.complete?null:membership.error??'The public collection is incomplete. Keeping the last complete collection.');
    });
    if(!sportsRunning.current){
      const cards=new AbortController();sportsRunning.current=cards;
      void fetchPublicSports(cards.signal).catch(()=>null).then(value=>{
        if(cards.signal.aborted)return;
        if(value){const retained=retainPublicSportsInput(retainedSports,value);retainedSports=retained;setCatalog(current=>current?mergePublicSports(current,retained):current);setSportsStatus((value as {fallback?:boolean}).fallback===true||retained!==value?'retained':'fresh');}
        else setSportsStatus(retainedSports?'retained':'missing');
      }).finally(()=>{if(sportsRunning.current===cards)sportsRunning.current=null;});
    }
    await Promise.allSettled([membershipAttempt,quotesAttempt]);
    if (running.current === controller) running.current = null;
  }, [refreshQuotes]);
  useEffect(()=>{if(!active)return;const changed=(event:Event)=>{const nonce=(event as CustomEvent<{clientNonce?:unknown}>).detail?.clientNonce;if(typeof nonce!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(nonce))return;pendingMarketChange.current=nonce;void refresh(true);};addEventListener('bankeiz:market-shares-changed',changed);return()=>removeEventListener('bankeiz:market-shares-changed',changed);},[active,refresh]);
  useEffect(() => {
    if (!active) return;
    let alive=true;
    if(!preparedDocument&&preparedBankCatalogEnabled()){
      void refresh();
    }else if(!preparedDocument){
    void prepareShippedSports().then(()=>{if(alive&&retainedSports)setSportsStatus(current=>current==='fresh'?current:'retained');}).catch(()=>{});
    void prepareShippedCatalog().catch(()=>{});
    void refresh();
    }
    const interval = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 60_000);
    const wake = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', wake); window.addEventListener('online', wake);
    return () => { alive=false;clearInterval(interval); document.removeEventListener('visibilitychange', wake); window.removeEventListener('online', wake); running.current?.abort(); running.current = null;quoteRead.current?.controller.abort();quoteRead.current=null;sportsRunning.current?.abort();sportsRunning.current=null; };
  }, [active, refresh]);
  useEffect(()=>{if(!displayActive)return;const update=()=>{if(document.visibilityState==='visible')setPulse(previous=>Math.max(previous,receizKaiNow().pulse));};update();const timer=setInterval(update,1000);document.addEventListener('visibilitychange',update);window.addEventListener('pageshow',update);window.addEventListener('focus',update);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',update);window.removeEventListener('pageshow',update);window.removeEventListener('focus',update);};},[displayActive]);
  const pricedCatalog=useMemo(()=>active?publicCatalogAtPulse(catalog,pricingSource,pulse,selectedItemId):catalog,[catalog,pricingSource,pulse,active,selectedItemId]);
  const prepared=preparedBankCatalogEnabled()?preparedSnapshot:null,accepted=prepared?.phase==='ready'?prepared.value:null,historical=!!prepared?.value&&prepared.phase!=='ready';
  return { catalog:pricedCatalog, historyCatalog:catalog, pulse, quoteStatus:historical?'stale' as const:quoteStatus, sportsStatus:historical&&sportsStatus==='fresh'?'retained' as const:sportsStatus, status:historical?'stale' as const:accepted?(accepted.receipt.state==='current'?'live' as const:'stale' as const): !catalog && status === 'stale' ? 'error' as const : status, error, refresh };
}
