import { useCallback, useEffect, useMemo, useRef, useState,type SetStateAction } from 'react';
import {receizKaiNow} from '@receiz/sdk';
import { fetchPublicSports, mergePublicSports,retainPublicSportsInput } from './public-sports';
import { fetchPublicMarket, fetchPublicQuotes, mergePublicQuotes, parsePublicMarket, rememberPublicOriginalLocators, retainPublicArtwork, validatePublicQuotes, type PublicMarketCatalog } from './public-market';
import {prepareMarketDisplaySource,useMarketDisplaySource} from './market-projection/display-source';
import {publicCatalogAtPulse} from './market-projection/catalog-prices';

import {mergeAdmittedPublicAssets,subscribeAssetPublicationAdmissions} from './asset-publication-adoption';
function adoptCatalog(catalog:PublicMarketCatalog|null){const next=mergeAdmittedPublicAssets(catalog??{items:[],complete:false,revision:'local-admission',observedAt:null,sourceCount:0});return catalog||next.items.length?next:null;}
export const PUBLIC_MARKET_CACHE_KEY = 'receiz-bank-public-discovery-v2';
function restorePublicCatalog(): PublicMarketCatalog | null { try { const saved = localStorage.getItem(PUBLIC_MARKET_CACHE_KEY); const input = saved ? JSON.parse(saved) : null; const catalog = input ? parsePublicMarket(input, input.snapshot) : null; if (!catalog) return null; rememberPublicOriginalLocators(catalog); try { return mergePublicSports(catalog, JSON.parse(localStorage.getItem('receiz-bank-public-sports-v1') ?? 'null')); } catch { return catalog; } } catch { return null; } }
export function usePublicMarket(active = true, displayActive = active) {
  const pricingSource=useMarketDisplaySource(),[pulse,setPulse]=useState(()=>receizKaiNow().pulse);
  const [catalog, updateCatalog] = useState<PublicMarketCatalog | null>(()=>adoptCatalog(restorePublicCatalog()));
  const setCatalog=useCallback((next:SetStateAction<PublicMarketCatalog|null>)=>updateCatalog(previous=>adoptCatalog(typeof next==='function'?next(previous):next)),[]);
  const [status, setStatus] = useState<'loading' | 'live' | 'stale' | 'error'>(catalog ? 'stale' : 'loading');
  const [quoteStatus, setQuoteStatus] = useState<'loading' | 'fresh' | 'stale'>('stale');
  const [sportsStatus, setSportsStatus] = useState<'loading' | 'fresh' | 'retained' | 'missing'>(catalog?.items.some(item => item.category === 'sports') ? 'retained' : 'loading');
  const [error, setError] = useState<string | null>(null);
  const running = useRef<AbortController | null>(null);
  const sportsRunning=useRef<AbortController|null>(null);
  const generation = useRef(0), sports = useRef<unknown>(null);
  useEffect(()=>subscribeAssetPublicationAdmissions(accepted=>{setCatalog(current=>{
    if(!accepted)return current;const previous=new Map(current?.items.map(item=>[item.id,item]));
    return mergePublicSports({...accepted,items:accepted.items.map(item=>{const prior=previous.get(item.id),next=retainPublicArtwork(item,prior);return prior?.chart.length?{...next,priceUsd:prior.priceUsd,changePct:prior.changePct,chart:prior.chart}:next;})},sports.current);
  });}),[setCatalog]);
  useEffect(() => { try { sports.current = JSON.parse(localStorage.getItem('receiz-bank-public-sports-v1') ?? 'null'); } catch { /* No retained public inventory. */ } }, []);
  const refresh = useCallback(async () => {
    if (running.current) return;
    // Prepare pricing operands beside discovery, before an object is opened.
    // The overview and direct-object paths share this same read and cache.
    void prepareMarketDisplaySource();
    const controller = new AbortController(); running.current = controller; const attempt = ++generation.current;
    setQuoteStatus('loading');
    const currentAttempt=()=>!controller.signal.aborted&&attempt===generation.current;
    let latestQuotes:unknown=null;
    // Independent sources publish independently. A stalled sports response must
    // never hold a proof object's available quote or history behind it.
    const quotesAttempt = fetchPublicQuotes(controller.signal).then(validatePublicQuotes).then(value=>{
      if(!currentAttempt())return;latestQuotes=value;
      setCatalog(current=>current?mergePublicQuotes(current,value):current);setQuoteStatus('fresh');
    },()=>{if(currentAttempt()){setQuoteStatus('stale');setError(message=>[message,'Public prices and charts could not be refreshed. Showing cached quotes.'].filter(Boolean).join(' '));}});
    const membershipAttempt = fetchPublicMarket(controller.signal).then(value=>({value,error:null}),cause=>({value:null,error:cause instanceof Error?cause.message:'The public Market could not be refreshed.'})).then(membership=>{
      if(!currentAttempt())return;const next=membership.value;
      setCatalog(current=>{
        if(!next||!next.complete&&current)return current;
        const previous=new Map(current?.items.map(item=>[item.id,item]));
        let updated=mergePublicSports({...next,items:next.items.map(item=>{
          const quoted=previous.get(item.id);
          const presented=retainPublicArtwork(item,quoted);
          return quoted?.chart.length?{...presented,priceUsd:quoted.priceUsd,changePct:quoted.changePct,chart:quoted.chart}:presented;
        })},sports.current);
        if(latestQuotes)updated=mergePublicQuotes(updated,latestQuotes);
        return updated;
      });
      setStatus(next?.complete?'live':'stale');
      setError(next?.complete?null:membership.error??'The public collection is incomplete. Keeping the last complete collection.');
    });
    if(!sportsRunning.current){
      const cards=new AbortController();sportsRunning.current=cards;
      void fetchPublicSports(cards.signal).catch(()=>null).then(value=>{
        if(cards.signal.aborted)return;
        if(value){const retained=retainPublicSportsInput(sports.current,value);sports.current=retained;setCatalog(current=>current?mergePublicSports(current,retained):current);setSportsStatus((value as {fallback?:boolean}).fallback===true||retained!==value?'retained':'fresh');}
        else setSportsStatus(sports.current?'retained':'missing');
      }).finally(()=>{if(sportsRunning.current===cards)sportsRunning.current=null;});
    }
    await Promise.allSettled([membershipAttempt,quotesAttempt]);
    if (running.current === controller) running.current = null;
  }, []);
  useEffect(() => {
    if (!active) return;
    const seed = new AbortController();
    void fetch('/receiz-public-sports.json', { signal: seed.signal, credentials: 'omit' }).then(async response => { if (!response.ok) return; const data = await response.json(); if(seed.signal.aborted)return;const next=sports.current?retainPublicSportsInput(data,sports.current):data;if(next===sports.current)return;sports.current=next;setSportsStatus('retained');setCatalog(current=>current?mergePublicSports(current,next):current); }).catch(() => {});
    void fetch('/receiz-public-market.json', { signal: seed.signal, credentials: 'omit' }).then(async response => {
      if (!response.ok) return; const input = await response.json(); const cached = parsePublicMarket(input, input.snapshot); rememberPublicOriginalLocators(cached);
      if (seed.signal.aborted) return;
      setCatalog(current => {
        if(!current||cached.complete&&Date.parse(cached.observedAt??'')>Date.parse(current.observedAt??''))return mergePublicSports(cached,sports.current);
        const hints=new Map(cached.items.map(item=>[item.id,item]));
        return {...current,items:current.items.map(item=>{
          const hint=hints.get(item.id);
          if(!hint||hint.assetId!==item.assetId||hint.pulse!==item.pulse||hint.originalDigest!==item.originalDigest||hint.verifyUrl!==item.verifyUrl)return item;
          const presented=item.mediaKind===undefined&&hint.mediaKind!==undefined?{...item,mediaKind:hint.mediaKind}:item;
          return {...retainPublicArtwork(presented,hint),...(item.hasLongForm===undefined?{hasLongForm:hint.hasLongForm,readingUrl:hint.readingUrl}:{}),...(!item.livePulseSeed&&hint.livePulseSeed?{livePulseSeed:hint.livePulseSeed,valuationBinding:hint.valuationBinding}:{})};
        })};
      });
    }).catch(() => {});
    void refresh();
    const interval = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 60_000);
    const wake = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', wake); window.addEventListener('online', wake);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', wake); window.removeEventListener('online', wake); seed.abort(); running.current?.abort(); running.current = null;sportsRunning.current?.abort();sportsRunning.current=null; };
  }, [active, refresh]);
  useEffect(()=>{if(!displayActive)return;const update=()=>{if(document.visibilityState==='visible')setPulse(previous=>Math.max(previous,receizKaiNow().pulse));};update();const timer=setInterval(update,1000);document.addEventListener('visibilitychange',update);window.addEventListener('pageshow',update);window.addEventListener('focus',update);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',update);window.removeEventListener('pageshow',update);window.removeEventListener('focus',update);};},[displayActive]);
  const pricedCatalog=useMemo(()=>active?publicCatalogAtPulse(catalog,pricingSource,pulse):catalog,[catalog,pricingSource,pulse,active]);
  return { catalog:pricedCatalog, historyCatalog:catalog, pulse, quoteStatus, sportsStatus, status: !catalog && status === 'stale' ? 'error' as const : status, error, refresh };
}
