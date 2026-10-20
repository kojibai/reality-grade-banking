import { useCallback,useEffect, useRef, useState } from 'react';
import{receizKaiNow}from'@receiz/sdk';
import type { ChartPeriod } from '../../core/chart-history';
import type{PublicMarketCatalog}from'../public-market';
import {packMarketHistory} from './history-wire';
import seedHistory from '../../../public/receiz-public-chart-history.json';
import { type MarketCapSource } from './source';
import { parseMarketHistory,MARKET_HISTORY_POLICY, type MarketHistorySnapshot } from './history';
import {readMarketDisplaySource,retainedMarketDisplaySource} from './display-source';
export type { CapitalizationPoint } from './history';
const KEY = 'receiz-bank-public-graph-history-v2';
const shipped = parseMarketHistory(seedHistory);
const now=()=>{try{return receizKaiNow().pulse;}catch{return 0;}};
function restore(): MarketHistorySnapshot {
  try { const cached = parseMarketHistory(JSON.parse(localStorage.getItem(KEY) ?? 'null')); if (cached.historyPolicy===MARKET_HISTORY_POLICY&&cached.summary.serverPulse >= shipped.summary.serverPulse) return cached; } catch { /* Only bounded public display data is retained. */ }
  return shipped;
}
type WorkerInput={source:{ok:true;marketCapProjection:MarketCapSource};history:MarketHistorySnapshot;catalog:PublicMarketCatalog|null;pulse:number};
export function useMarketCapitalization(period: ChartPeriod, active: boolean,catalog:PublicMarketCatalog|null=null,sourceActive=active) {
  const [history,setHistory]=useState<MarketHistorySnapshot>(restore),[fullSource,setFullSource]=useState<MarketCapSource|null>(retainedMarketDisplaySource),[pulse,setPulse]=useState(now),[status,setStatus]=useState<'cached'|'live'|'unavailable'>('cached');
  const heldHistory=useRef(history),worker=useRef<Worker|null>(null),request=useRef(0),acceptedSource=useRef<MarketCapSource|null>(null),busy=useRef(false),queued=useRef<WorkerInput|null>(null),latestInput=useRef<WorkerInput|null>(null),restartWorker=useRef<(()=>void)|null>(null);
  heldHistory.current=history;
  const dispatch=useCallback(()=>{
    if(busy.current||!worker.current||!queued.current)return;
    const input=queued.current;queued.current=null;busy.current=true;
    worker.current.postMessage({...input,history:heldHistory.current,id:++request.current});
  },[]);
  useEffect(()=>{
    if(!active)return;
    const update=()=>{if(document.visibilityState==='visible')setPulse(previous=>Math.max(previous,now()));};update();
    const interval=setInterval(update,1000);document.addEventListener('visibilitychange',update);window.addEventListener('focus',update);window.addEventListener('pageshow',update);
    return()=>{clearInterval(interval);document.removeEventListener('visibilitychange',update);window.removeEventListener('focus',update);window.removeEventListener('pageshow',update);};
  },[active]);
  useEffect(() => {
    if (!sourceActive) return;
    const controller = new AbortController(); let pending = false;
    const read = async (path: string, live: boolean) => {
      if (pending && live) return; if (live) pending = true;
      try {
        const value = await readMarketDisplaySource(path); if (controller.signal.aborted) return;
        // Local valuation can be ahead of a remote capture's evaluation pulse.
        // Compare inventory captures to one another, never to the local clock.
        if (value.serverPulse < (acceptedSource.current?.serverPulse??0) || !live && acceptedSource.current) return;
        acceptedSource.current = value; setFullSource(value);
        if (live) setStatus('live');
      } catch { if (live && !controller.signal.aborted) setStatus('unavailable'); }
      finally { if (live) pending = false; }
    };
    void read('/receiz-public-capitalization.json', false); void read('/api/bank/public-market/capitalization', true);
    const interval = setInterval(() => { if (document.visibilityState === 'visible') void read('/api/bank/public-market/capitalization', true); }, 60000);
    return () => { controller.abort(); clearInterval(interval); };
  }, [sourceActive]);
  useEffect(() => {
    if (!active || typeof Worker === 'undefined') return;
    const start=()=>{
    worker.current?.terminate();worker.current=null;busy.current=false;++request.current;
    let instance: Worker; try { instance = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }); } catch { return; } worker.current = instance;
    instance.onmessage = event => {
      if(event.data.id!==request.current)return;busy.current=false;
      if(event.data.history)try{
        const next=parseMarketHistory(event.data.history);
        // Amount, inventory and every interval are one completed publication.
        heldHistory.current=next;setHistory(next);
        try{localStorage.setItem(KEY,JSON.stringify(packMarketHistory(next)));}catch{/* Optional public retention. */}
      }catch{/* Preserve the last complete chart. */}
      if(queued.current)dispatch();
    };
    instance.onerror=instance.onmessageerror=()=>{if(worker.current!==instance)return;instance.terminate();worker.current=null;busy.current=false;};
    if(latestInput.current){queued.current={...latestInput.current,pulse:Math.max(latestInput.current.pulse,now())};dispatch();}
    };
    restartWorker.current=start;start();
    let hidden=document.visibilityState!=='visible';
    // Installed PWAs may resume without a reply from their suspended worker.
    // Recreate that execution context, retaining the last complete publication.
    const visibility=()=>{if(document.visibilityState!=='visible'){hidden=true;return;}if(hidden){hidden=false;start();}};
    const pageshow=()=>{if(document.visibilityState==='visible')start();};
    const focus=()=>{if(document.visibilityState==='visible'&&(busy.current||!worker.current))start();};
    document.addEventListener('visibilitychange',visibility);window.addEventListener('pageshow',pageshow);window.addEventListener('focus',focus);
    return () => { restartWorker.current=null;worker.current?.terminate(); worker.current = null;busy.current=false;queued.current=null;++request.current;document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pageshow',pageshow);window.removeEventListener('focus',focus); };
  }, [dispatch,active]);
  useEffect(() => {
    if (!fullSource || !active) {latestInput.current=null;queued.current=null;busy.current=false;worker.current?.postMessage({id:++request.current,cancel:true});return;}
    // Finish the current complete publication, then process the latest request.
    // A pulse tick cannot starve a larger new-inventory rebuild by cancelling it.
    latestInput.current={source:{ok:true,marketCapProjection:fullSource},history:heldHistory.current,catalog,pulse:Math.max(pulse,fullSource.serverPulse)};queued.current=latestInput.current;
    // Retry only when a new pulse or source input arrives, never in an error loop.
    if(!worker.current)restartWorker.current?.();else dispatch();
  }, [fullSource, active,catalog,pulse,dispatch]);
  // Period selection is always a synchronous lookup, with no network or job.
  return { source:history.summary, points: history.series[period], status, get historyUpdating(){return busy.current;} };
}
