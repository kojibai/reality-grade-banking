import {untilAborted,preparedBankCatalogEnabled,preparedBankCatalogState,subscribePreparedBankCatalog,readPreparedBankCatalog,prepareCarriedBankCatalog,adoptPublicDocumentCatalog,type PublicDocumentHandoff,type PreparedBankCatalog} from './prepared-bank-catalog';
import {readPublicMarketDocumentSeed,type PublicMarketDocumentSeed} from './public-market-document-seed';
import {compatibleShareInventory,mergeShareInventory} from './market-share-inventory';
import {retainPublicMomentManifest} from './public-asset-manifest';
import { useCallback, useEffect, useMemo, useRef, useState,useSyncExternalStore,type SetStateAction } from 'react';
import {receizKaiNow} from '@receiz/sdk';
import { fetchPublicSports, mergePublicSports,retainPublicSportsInput,readStoredPublicSportsInput,restorePublicSportsInput,retainSelectedPublicSportsInput } from './public-sports';
import { fetchPublicMarket, rememberPublicMarketResponse, retainPublicMarket, retainPublicProfileHeaders, reusePublicMarketResponse, fetchPublicQuotes, readRetainedPublicQuotes, mergePublicQuotes, parsePublicMarket, rememberPublicOriginalLocators, retainPublicArtwork, validatePublicQuotes, type PublicMarketCatalog } from './public-market';
import {prepareMarketDisplaySource,useMarketDisplaySource,adoptMarketDisplaySource} from './market-projection/display-source';
import {publicCatalogAtPulse} from './market-projection/catalog-prices';

import {mergeAdmittedPublicAssets,subscribeAssetPublicationAdmissions,retainedDiscoveredPublicCatalog} from './asset-publication-adoption';
function adoptCatalog(catalog:PublicMarketCatalog|null){const next=mergeAdmittedPublicAssets(catalog??{items:[],complete:false,revision:'local-admission',observedAt:null,sourceCount:0});return catalog||next.items.length?next:null;}
export const PUBLIC_MARKET_CACHE_KEY = 'receiz-bank-public-discovery-v2';
// Public workspaces share the settled source already in this document. Optional
// browser storage can be too small for the complete collection and card input.
let restoredDiskCatalog:PublicMarketCatalog|null=null;
let retainedCatalog:PublicMarketCatalog|null=null,retainedSports:unknown=null,restored=false,preparedDocument=false,lastRefreshAt=0,lastRefreshFailed=false;
const refreshInterval=60_000;
const catalogListeners=new Set<()=>void>();
const subscribeCatalog=(listener:()=>void)=>{catalogListeners.add(listener);const unsubscribe=subscribePreparedBankCatalog(listener);return()=>{catalogListeners.delete(listener);unsubscribe();};};
const inactiveCatalog=()=>()=>{};
function restorePublicCatalog(): PublicMarketCatalog | null {
  const carried=readPublicMarketDocumentSeed();if(carried){preparedDocument=true;rememberPublicOriginalLocators(carried.catalog);return carried.catalog;}
  retainedSports=readStoredPublicSportsInput();
  try { const saved = localStorage.getItem(PUBLIC_MARKET_CACHE_KEY); const input = saved ? JSON.parse(saved) : null; const catalog = input ? parsePublicMarket(input, input.snapshot) : null; if (!catalog) return null; rememberPublicMarketResponse(catalog,input);rememberPublicOriginalLocators(catalog); const disk=mergePublicSports(catalog,retainedSports);reusePublicMarketResponse(catalog,disk);restoredDiskCatalog=disk;if(catalog.complete&&!lastRefreshAt&&typeof location!=='undefined'&&location.pathname==='/')lastRefreshAt=Date.now();return disk; } catch { return null; }
}
// Only this exact disk-restored display may yield to the complete carried
// family. A subsequent RAM publication has a different reference.
function restoreAdoptedCatalog(){const cached=restorePublicCatalog(),catalog=adoptCatalog(cached);if(cached&&catalog)reusePublicMarketResponse(cached,catalog);if(cached&&cached===restoredDiskCatalog)restoredDiskCatalog=catalog;return catalog;}
let adoptedPrepared:PreparedBankCatalog['seed']|null=null,adoptedCarried:PreparedBankCatalog['seed']|null=null,adoptedBare:PublicMarketCatalog|null=null;
function readPublicCatalog(){
 const prepared=preparedBankCatalogState();
 // A complete publication may have settled in Feed before this owner loaded.
 // Its RAM selection precedes historical disk/carried display, never a newly
 // qualified Bank packet or an already selected RAM successor.
 if(!retainedCatalog&&!restored&&!prepared.value){const accepted=retainedDiscoveredPublicCatalog();if(accepted){restored=true;retainedCatalog=adoptCatalog(accepted);if(retainedCatalog)reusePublicMarketResponse(accepted,retainedCatalog);if(!lastRefreshAt)lastRefreshAt=Date.now();}}
 if((!prepared.value&&!prepared.carried||(prepared.value??prepared.carried)?.fromCache)&&!retainedCatalog&&!restored){restored=true;retainedCatalog=restoreAdoptedCatalog();}
 if(prepared.bareCatalog!==adoptedBare&&prepared.bareCatalog&&!retainedCatalog?.complete&&!retainedDiscoveredPublicCatalog()){adoptedBare=prepared.bareCatalog;restored=true;retainedCatalog=adoptCatalog(mergePublicSports(prepared.bareCatalog,retainedSports));restoredDiskCatalog=retainedCatalog;if(retainedCatalog)reusePublicMarketResponse(prepared.bareCatalog,retainedCatalog);rememberPublicOriginalLocators(retainedCatalog!);if(!lastRefreshAt)lastRefreshAt=Date.now();}
  if(prepared.value){const value=prepared.value;if(value.fromCache&&retainedCatalog?.complete&&retainedCatalog!==value.seed.catalog){adoptedPrepared=value.seed;adoptedCarried=value.seed;return retainedCatalog;}if(adoptedPrepared!==value.seed){adoptedPrepared=value.seed;if(!lastRefreshAt)lastRefreshAt=Date.now();if(value.seed!==adoptedCarried){restored=true;retainedCatalog=adoptCatalog(value.seed.catalog);rememberPublicOriginalLocators(retainedCatalog!);}}return retainedCatalog;}
 if(preparedBankCatalogEnabled()){
  if(prepared.carried){const value=prepared.carried;if(adoptedCarried!==value.seed){
   // A boot display cannot roll back a newer public discovery that completed
   // while this document's compressed seed was being decoded.
   if(value.fromCache&&retainedCatalog?.complete){adoptedCarried=value.seed;}
   else if(!retainedCatalog||retainedCatalog===restoredDiskCatalog||retainedCatalog.revision==='local-admission'){adoptedCarried=value.seed;restored=true;retainedCatalog=adoptCatalog(value.seed.catalog);rememberPublicOriginalLocators(retainedCatalog!);}
   if(!lastRefreshAt)lastRefreshAt=value.receivedAt;
  }return retainedCatalog;}
  if(prepared.phase!=='fallback'){
   if(!retainedCatalog&&!restored){restored=true;retainedCatalog=restoreAdoptedCatalog();}
   return retainedCatalog;
  }
 }
 if(!restored){restored=true;retainedCatalog=restoreAdoptedCatalog();}return retainedCatalog;}
/** The existing public entry has already qualified its saved document. Adopt
 * its parsed family once; no new Bank receipt or caller funding is inferred. */
export function adoptPublicMarketDocument(seed:PublicMarketDocumentSeed,qualification?:PublicDocumentHandoff){
 const adopted=adoptPublicDocumentCatalog(seed,display=>{retainedCatalog=adoptCatalog(display.seed.catalog);restored=true;preparedDocument=true;adoptedCarried=display.seed;lastRefreshAt=display.receivedAt;adoptMarketDisplaySource(display.capitalization);},qualification);
 const held=preparedBankCatalogState();if(adopted||(held.value??held.carried)?.seed.generation===seed.generation)preparedDocument=true;
 if(adopted){rememberPublicOriginalLocators(retainedCatalog!);for(const listener of catalogListeners)listener();}
 return adopted;
}
function publishPublicCatalog(next:SetStateAction<PublicMarketCatalog|null>){
  const current=readPublicCatalog(),candidate=typeof next==='function'?next(current):next;
  const currentAt=Date.parse(current?.observedAt??''),candidateAt=Date.parse(candidate?.observedAt??'');
  if(candidate?.complete&&Number.isFinite(currentAt)&&Number.isFinite(candidateAt)&&candidateAt<currentAt)return current;
  const updated=adoptCatalog(candidate?retainPublicProfileHeaders(candidate,current):candidate);
  if(updated===current)return current;retainedCatalog=updated;for(const listener of catalogListeners)listener();return updated;
}
// The accepted public projection belongs to the document, even when its last
// Market consumer is hidden or unmounted. The prepared receipt stays separate.
subscribeAssetPublicationAdmissions((accepted,snapshot)=>{const before=readPublicCatalog(),selected=publishPublicCatalog(current=>{
 if(!accepted)return snapshot&&current?mergePublicQuotes(current,snapshot):current;
 if(!accepted.complete&&current)return current;const previous=new Map(current?.items.map(item=>[item.id,item]));
 const updated=mergePublicSports({...accepted,items:accepted.items.map(item=>{const prior=previous.get(item.id),sameSource=prior?.assetId===item.assetId&&prior.originalDigest===item.originalDigest,next={...retainPublicMomentManifest(retainPublicArtwork(item,prior),prior),shareInventory:mergeShareInventory(sameSource?compatibleShareInventory(item,prior?.shareInventory):undefined,compatibleShareInventory(item,item.shareInventory)??null)};return sameSource&&!item.chart.length&&prior?.chart.length?{...next,priceUsd:prior.priceUsd,changePct:prior.changePct,chart:prior.chart}:next;})},retainedSports);
 return snapshot?mergePublicQuotes(updated,snapshot):updated;
});if(before&&selected&&!accepted){if(snapshot)retainPublicMarket(before,snapshot,selected);else reusePublicMarketResponse(before,selected);}if(accepted?.complete&&selected&&selected!==before){retainPublicMarket(accepted,snapshot,selected,before);lastRefreshAt=Date.now();lastRefreshFailed=false;}});
function exposePublicCatalog(){const marker=document.getElementById('receiz-navigation');if(marker)Object.assign(marker,{publicMarketCatalog:readPublicCatalog,subscribePublicMarketCatalog:subscribeCatalog});}
if(typeof document!=='undefined'){void prepareCarriedBankCatalog().then(()=>{const prepared=preparedBankCatalogState();if(!prepared.bareCatalog&&!prepared.value&&!prepared.carried)return;const before=retainedCatalog;readPublicCatalog();if(before!==retainedCatalog)for(const listener of catalogListeners)listener();});exposePublicCatalog();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',exposePublicCatalog,{once:true});}
let shippedCatalog:Promise<void>|undefined,shippedSports:Promise<void>|undefined;
/** Shipped inputs belong to this document, not to a mounted surface. Parse and
 * adopt each once; closing one consumer cannot cancel another's preparation. */
function prepareShippedCatalog():Promise<void>{
  if(shippedCatalog)return shippedCatalog;
  const attempt=(async()=>{
    const signal=AbortSignal.timeout(15000),response=await untilAborted(fetch('/receiz-public-market.json',{credentials:'omit',signal}),signal);
    if(!response.ok)throw Error('Public collection snapshot unavailable.');
    const input=await untilAborted(response.json(),signal),cached=parsePublicMarket(input,input.snapshot);rememberPublicOriginalLocators(cached);
    publishPublicCatalog(current=>{
      if(!current||cached.complete&&(!Number.isFinite(Date.parse(current.observedAt??''))||Date.parse(cached.observedAt??'')>Date.parse(current.observedAt??'')))return mergePublicSports(cached,retainedSports);
      const hints=new Map(cached.items.map(item=>[item.id,item]));
      const updated={...current,items:current.items.map(item=>{
        const hint=hints.get(item.id);
        if(!hint||hint.assetId!==item.assetId||hint.pulse!==item.pulse||hint.originalDigest!==item.originalDigest||hint.verifyUrl!==item.verifyUrl)return item;
        const presented=item.mediaKind===undefined&&hint.mediaKind!==undefined?{...item,mediaKind:hint.mediaKind}:item;
        return {...retainPublicMomentManifest(retainPublicArtwork(presented,hint),hint),shareInventory:mergeShareInventory(compatibleShareInventory(item,item.shareInventory),compatibleShareInventory(item,hint.shareInventory)??null),...(item.hasLongForm===undefined?{hasLongForm:hint.hasLongForm,readingUrl:hint.readingUrl}:{}),...(!item.livePulseSeed&&hint.livePulseSeed?{livePulseSeed:hint.livePulseSeed,valuationBinding:hint.valuationBinding}:{})};
      })};reusePublicMarketResponse(current,updated);return updated;
    });
  })();
  shippedCatalog=attempt;void attempt.catch(()=>{if(shippedCatalog===attempt)shippedCatalog=undefined;});return attempt;
}
function prepareShippedSports():Promise<void>{
  if(shippedSports)return shippedSports;
  const attempt=(async()=>{
    const restored=retainedSports?null:await restorePublicSportsInput();
    if(restored){retainedSports=restored;const before=readPublicCatalog(),selected=publishPublicCatalog(current=>current?mergePublicSports(current,restored):current);if(before&&selected)reusePublicMarketResponse(before,selected);return;}
    const response=await fetch('/receiz-public-sports.json',{credentials:'omit'});
    if(!response.ok)throw Error('Public collectible snapshot unavailable.');
    const data=await response.json(),next=retainedSports?retainPublicSportsInput(data,retainedSports):data;
    if(next===retainedSports)return;retainedSports=next;const before=readPublicCatalog(),selected=publishPublicCatalog(current=>current?mergePublicSports(current,next):current);if(before&&selected)reusePublicMarketResponse(before,selected);retainSelectedPublicSportsInput(next);
  })();
  shippedSports=attempt;void attempt.catch(()=>{if(shippedSports===attempt)shippedSports=undefined;});return attempt;
}
export function usePublicMarket(active = true, displayActive = active, selectedItemId?:string|null, prepareProfileDisplay=false) {
  const preparedSnapshot=useSyncExternalStore(active||displayActive?subscribePreparedBankCatalog:inactiveCatalog,preparedBankCatalogState,preparedBankCatalogState);
  const pricingSource=useMarketDisplaySource(),[pulse,setPulse]=useState(()=>receizKaiNow().pulse);
  // Profile display subscribes to existing public state without activating
  // Market polling. A genuinely missing local collection uses its shipped
  // reader once; available RAM/cache state never waits for this restoration.
  const catalog=useSyncExternalStore(active||displayActive?subscribeCatalog:inactiveCatalog,readPublicCatalog,()=>null),setCatalog=publishPublicCatalog;
  const [displayLocalSettled,setDisplayLocalSettled]=useState(false);
  const displayLocalPending=prepareProfileDisplay&&!active&&displayActive&&!catalog?.complete&&!displayLocalSettled;
  useEffect(()=>{if(!displayLocalPending)return;let alive=true;void prepareCarriedBankCatalog().then(async()=>{if(alive&&!readPublicCatalog()?.complete)await prepareShippedCatalog();}).catch(()=>{}).finally(()=>{if(alive)setDisplayLocalSettled(true);});return()=>{alive=false;};},[displayLocalPending]);
  const [status, setStatus] = useState<'loading' | 'live' | 'stale' | 'error'>(catalog ? 'stale' : 'loading');
  const [quoteStatus, setQuoteStatus] = useState<'loading' | 'fresh' | 'stale'>(()=>preparedBankCatalogEnabled()&&preparedBankCatalogState().value?.receipt.state==='current'?'fresh':'stale');
  const [sportsStatus, setSportsStatus] = useState<'loading' | 'fresh' | 'retained' | 'missing'>(catalog?.items.some(item => item.category === 'sports') ? 'retained' : 'loading');
  const [error, setError] = useState<string | null>(null);
  // These operands settle independently; a success clears only its own failure.
  const refreshErrors=useRef<{membership:string|null;quotes:string|null}>({membership:null,quotes:null});
  const updateRefreshError=useCallback((next:Partial<typeof refreshErrors.current>)=>{
    Object.assign(refreshErrors.current,next);
    setError([refreshErrors.current.membership,refreshErrors.current.quotes].filter(Boolean).join(' ')||null);
  },[]);
  const running = useRef<AbortController | null>(null);
  const sportsRunning=useRef<AbortController|null>(null),sportsFailed=useRef(false);
  const pendingMarketChange=useRef<string|undefined>(undefined);
  const quoteRead=useRef<{controller:AbortController;nonce:string|undefined;pending:Promise<void>}|null>(null);
  const quoteGeneration=useRef(0),latestQuotes=useRef<unknown>(null),quoteFailed=useRef(false);
  const generation = useRef(0);
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
      if(!current())return;latestQuotes.current=value;quoteFailed.current=false;
      if(pendingMarketChange.current===afterTrade)pendingMarketChange.current=undefined;
      const before=readPublicCatalog(),selected=setCatalog(catalog=>catalog?mergePublicQuotes(catalog,value):catalog);if(before&&selected&&selected!==before)retainPublicMarket(before,value,selected);setQuoteStatus('fresh');updateRefreshError({quotes:null});
    },()=>{if(current()){quoteFailed.current=true;setQuoteStatus('stale');updateRefreshError({quotes:'Public prices and charts could not be refreshed. Showing cached quotes.'});}}).finally(()=>{
      if(quoteRead.current?.controller===controller)quoteRead.current=null;
    });
    quoteRead.current={controller,nonce:afterTrade,pending};return pending;
  },[setCatalog,updateRefreshError]);
  // Sports has its own missing/failure lifetime, just like share quotes. A
  // wake can retry that distinct operand without rediscovering membership.
  const refreshSports=useCallback(()=>{
    if(sportsRunning.current)return;
    const cards=new AbortController();sportsRunning.current=cards;
    void fetchPublicSports(cards.signal).catch(()=>null).then(value=>{
      if(cards.signal.aborted)return;
      sportsFailed.current=!value;
      if(value){const retained=retainPublicSportsInput(retainedSports,value);retainedSports=retained;const before=readPublicCatalog(),selected=setCatalog(current=>current?mergePublicSports(current,retained):current);if(before&&selected)reusePublicMarketResponse(before,selected);retainSelectedPublicSportsInput(retained);setSportsStatus((value as {fallback?:boolean}).fallback===true||retained!==value?'retained':'fresh');}
      else setSportsStatus(retainedSports?'retained':'missing');
    }).finally(()=>{if(sportsRunning.current===cards)sportsRunning.current=null;});
  },[setCatalog]);
  const refresh = useCallback(async (quotesOnly=false,existingFallback=false) => {
    if(quotesOnly){await refreshQuotes(pendingMarketChange.current);return;}
    if (running.current) return;
    lastRefreshAt=Date.now();lastRefreshFailed=false;
    if(!existingFallback&&readPublicCatalog()===(preparedBankCatalogState().value??preparedBankCatalogState().carried)?.seed.catalog&&preparedBankCatalogEnabled()){
      const prepared=await readPreparedBankCatalog();
      if(prepared){sportsFailed.current=false;setStatus(prepared.receipt.state==='current'?'live':'stale');setQuoteStatus(prepared.receipt.state==='current'?'fresh':'stale');setSportsStatus(prepared.seed.catalog.items.some(item=>item.category==='sports')?(prepared.receipt.state==='current'?'fresh':'retained'):'missing');updateRefreshError({membership:null,quotes:null});return;}
      const held=preparedBankCatalogState();
      const retained=held.value??held.carried;
      if(retained){lastRefreshFailed=true;setStatus('stale');setQuoteStatus('stale');setSportsStatus(retained.seed.catalog.items.some(item=>item.category==='sports')?'retained':'missing');updateRefreshError({membership:held.error});return;}
      void prepareShippedSports().catch(()=>{});void prepareShippedCatalog().catch(()=>{});
    }
    void prepareShippedSports().catch(()=>{});void prepareShippedCatalog().catch(()=>{});
    // Prepare pricing operands beside discovery, before an object is opened.
    // The overview and direct-object paths share this same read and cache.
    void prepareMarketDisplaySource();
    const controller = new AbortController(); running.current = controller; const attempt = ++generation.current;
    const currentAttempt=()=>!controller.signal.aborted&&attempt===generation.current;
    latestQuotes.current=null;
    const quotesAttempt=refreshQuotes(pendingMarketChange.current);
    const membershipAttempt = fetchPublicMarket(controller.signal).then(value=>({value,error:null}),cause=>({value:null,error:cause instanceof Error?cause.message:'The public Market could not be refreshed.'})).then(membership=>{
      if(!currentAttempt())return;const next=membership.value,quotes=readRetainedPublicQuotes()?.snapshot??latestQuotes.current;if(!next?.complete)lastRefreshFailed=true;
      const before=readPublicCatalog(),selected=setCatalog(current=>{
        if(!next||!next.complete&&current)return current;
        const previous=new Map(current?.items.map(item=>[item.id,item]));
        let updated=mergePublicSports({...next,items:next.items.map(item=>{
          const quoted=previous.get(item.id);
          const presented={...retainPublicMomentManifest(retainPublicArtwork(item,quoted),quoted),shareInventory:compatibleShareInventory(item,quoted?.shareInventory)};
          return quoted?.chart.length?{...presented,priceUsd:quoted.priceUsd,changePct:quoted.changePct,chart:quoted.chart}:presented;
        })},retainedSports);
        if(quotes)updated=mergePublicQuotes(updated,quotes);
        return updated;
      });
      if(next?.complete&&selected&&selected!==before)retainPublicMarket(next,quotes,selected,before);
      setStatus(next?.complete?'live':'stale');
      updateRefreshError({membership:next?.complete?null:membership.error??'The public collection is incomplete. Keeping the last complete collection.'});
    });
    refreshSports();
    await Promise.allSettled([membershipAttempt,quotesAttempt]);
    if (running.current === controller) running.current = null;
  }, [refreshQuotes,refreshSports,updateRefreshError]);
  useEffect(()=>{if(!active)return;const changed=(event:Event)=>{const nonce=(event as CustomEvent<{clientNonce?:unknown}>).detail?.clientNonce;if(typeof nonce!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(nonce))return;pendingMarketChange.current=nonce;void refresh(true);};addEventListener('bankeiz:market-shares-changed',changed);return()=>removeEventListener('bankeiz:market-shares-changed',changed);},[active,refresh]);
  useEffect(() => {
    if (!active) return;
    let alive=true;
    const prepared=preparedBankCatalogState(),bank=preparedBankCatalogEnabled()||!!prepared.value||!!prepared.carried;
    const age=Date.now()-lastRefreshAt,heldFamily=(!!prepared.value||!!prepared.carried||readPublicCatalog()?.complete===true)&&lastRefreshAt>0;
    const prepareMissingHints=()=>{const held=readPublicCatalog(),family=preparedBankCatalogState().value??preparedBankCatalogState().carried;
      if(held&&!preparedDocument&&(!family||family.seed.catalog!==held)){
        if(held.items.some(item=>item.category==='proof'&&(!item.shareInventory||item.mediaKind===undefined)))void prepareShippedCatalog().catch(()=>{});
        if(held.sportsCoverage!=='complete'||held.items.some(item=>item.category==='sports'&&!item.sealedAt))void prepareShippedSports().then(()=>{if(alive&&retainedSports)setSportsStatus(current=>current==='fresh'?current:'retained');}).catch(()=>{});
      }
    };
    if(!prepared.bootstrapping)prepareMissingHints();
    if(prepared.bootstrapping){
      // Available held state renders immediately; local restore only
      // coordinates missing-input side effects.
      void prepareCarriedBankCatalog().then(value=>{if(!alive)return;prepareMissingHints();if(value||readPublicCatalog()?.complete&&lastRefreshAt>0&&Date.now()-lastRefreshAt<refreshInterval){readPublicCatalog();setStatus('stale');}else void refresh();});
    }else if(heldFamily){
      if(age<0||age>=refreshInterval)void refresh();
    }else if(bank&&!(prepared.phase==='fallback'&&!prepared.value)&&readPublicCatalog()?.revision!=='local-admission'){
      void refresh();
    }else if(!preparedDocument||bank){
    void prepareShippedSports().then(()=>{if(alive&&retainedSports)setSportsStatus(current=>current==='fresh'?current:'retained');}).catch(()=>{});
    void prepareShippedCatalog().catch(()=>{});
    void refresh(false,true);
    }
    let timer:ReturnType<typeof setTimeout>;
    const poll=()=>{const age=Date.now()-lastRefreshAt;if(lastRefreshAt>0&&age>=0&&age<refreshInterval){timer=setTimeout(poll,refreshInterval-age);return;}if(document.visibilityState==='visible'&&!preparedBankCatalogState().bootstrapping)void refresh();timer=setTimeout(poll,refreshInterval);};
    const elapsed=Date.now()-lastRefreshAt;timer=setTimeout(poll,lastRefreshAt>0&&elapsed>=0&&elapsed<refreshInterval?refreshInterval-elapsed:refreshInterval);
    const wake = () => {
      if(document.visibilityState!=='visible')return;
      if(pendingMarketChange.current||quoteFailed.current&&!lastRefreshFailed){void refresh(true);return;}
      if(preparedBankCatalogState().bootstrapping)return;
      if(sportsFailed.current||readPublicCatalog()?.sportsCoverage==='missing')refreshSports();
      const age=Date.now()-lastRefreshAt,prepared=preparedBankCatalogState();
      if(lastRefreshAt>0&&age>=0&&age<refreshInterval&&!lastRefreshFailed&&prepared.phase!=='fallback'&&readPublicCatalog()?.complete)return;
      void refresh();
    };
    document.addEventListener('visibilitychange', wake); window.addEventListener('online', wake);
    return () => { alive=false;clearTimeout(timer); document.removeEventListener('visibilitychange', wake); window.removeEventListener('online', wake); running.current?.abort(); running.current = null;quoteRead.current?.controller.abort();quoteRead.current=null;sportsRunning.current?.abort();sportsRunning.current=null; };
  }, [active, refresh,refreshSports]);
  useEffect(()=>{if(!displayActive)return;const update=()=>{if(document.visibilityState==='visible')setPulse(previous=>Math.max(previous,receizKaiNow().pulse));};update();const timer=setInterval(update,1000);document.addEventListener('visibilitychange',update);window.addEventListener('pageshow',update);window.addEventListener('focus',update);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',update);window.removeEventListener('pageshow',update);window.removeEventListener('focus',update);};},[displayActive]);
  const pricedCatalog=useMemo(()=>active?publicCatalogAtPulse(catalog,pricingSource,pulse,selectedItemId):catalog,[catalog,pricingSource,pulse,active,selectedItemId]);
  const prepared=preparedBankCatalogEnabled()||preparedSnapshot.value||preparedSnapshot.carried?preparedSnapshot:null,family=prepared?.value??prepared?.carried;
 // A separate membership successor does not inherit this packet's currentness.
 const selectedFamily=!!family&&catalog===family.seed.catalog,accepted=prepared?.phase==='ready'&&selectedFamily?prepared.value:null;
 const historical=!!prepared&&(!!family&&!selectedFamily||prepared.phase!=='ready'&&!!(family||prepared.phase!=='fallback'&&catalog));
 const visibleSportsStatus=(sportsStatus==='loading'||sportsStatus==='missing')&&(catalog?.sportsCoverage==='complete'||catalog?.items.some(item=>item.category==='sports'))?'retained' as const:sportsStatus;
  return { catalog:pricedCatalog, historyCatalog:catalog, pulse, quoteStatus:historical?'stale' as const:quoteStatus, sportsStatus:historical&&visibleSportsStatus==='fresh'?'retained' as const:visibleSportsStatus, status:historical?'stale' as const:accepted?(accepted.receipt.state==='current'?'live' as const:'stale' as const): !catalog && status === 'stale' ? 'error' as const : status, error, ...(displayLocalPending?{displayLocalPending:true as const}:{}), refresh };
}
