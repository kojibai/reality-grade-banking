import { useEffect, useMemo, useRef, useState } from 'react';
import {loadReceiz} from '../../receiz/client';
import { indexLedgerValues,sameLedgerValueInputs,type LedgerValueIndex } from '../../receiz/ledger-value';
import {readMarketDisplaySource,retainedMarketDisplaySource,useMarketDisplaySource} from '../../receiz/market-projection/display-source';

const refreshInterval=60_000;

/** One existing public projection for the ledger, with no original-file requests per row. */
export function useLedgerValueSource(active: boolean) {
  const source=useMarketDisplaySource(active),[pulse,setPulse]=useState<number|null>(null);
  const heldIndex=useRef<LedgerValueIndex|null>(null),heldValue=useRef<LedgerValueIndex|null>(null);
  const lastLiveRead=useRef<{at:number;failed:boolean}|null>(null);
  useEffect(()=>{
    if(!active)return;let alive=true,timer:ReturnType<typeof setInterval>|undefined;
    // Re-evaluate immutable public operands locally; no wallet or ownership
    // authority is inferred from this presentation clock.
    void loadReceiz().then(sdk=>{if(!alive)return;const tick=()=>{if(alive&&document.visibilityState==='visible')setPulse(sdk.receizKaiNow().pulse);};tick();timer=setInterval(tick,1000);}).catch(()=>{});
    return()=>{alive=false;clearInterval(timer);};
  },[active]);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController(); let pending = false;
    const read = async (path: string, live: boolean) => {
      if (controller.signal.aborted || pending && live) return;
      const attempt=live?{at:Date.now(),failed:false}:null;
      if (attempt) { pending = true; lastLiveRead.current=attempt; }
      try {
        await readMarketDisplaySource(path);
      } catch { if(attempt)attempt.failed=true; /* A missing projection leaves the carried source value visible. */ }
      finally { if (live) pending = false; }
    };
    if(!retainedMarketDisplaySource())void read('/receiz-public-capitalization.json', false);
    const age=lastLiveRead.current?Date.now()-lastLiveRead.current.at:refreshInterval;
    const resume=lastLiveRead.current&&!lastLiveRead.current.failed&&age>=0&&age<refreshInterval;
    if(!resume)void read('/api/bank/public-market/capitalization', true);
    const refresh = () => { if (document.visibilityState === 'visible') void read('/api/bank/public-market/capitalization', true); };
    // A retained return resumes the existing deadline rather than restarting
    // its read or delaying the next update by another full interval.
    let timer=setTimeout(function poll(){refresh();timer=setTimeout(poll,refreshInterval);},resume?refreshInterval-age:refreshInterval);
    window.addEventListener('online', refresh);
    return () => { controller.abort(); clearTimeout(timer); window.removeEventListener('online', refresh); };
  }, [active]);
  const index=useMemo(()=>{if(!source)return null;if(!heldIndex.current||!sameLedgerValueInputs(heldIndex.current.source,source))heldIndex.current=indexLedgerValues(source);return heldIndex.current;},[source]);
  return useMemo(()=>{
    if(!active)return heldValue.current;
    const next=index&&source?{...index,source,evaluationPulse:pulse===null?source.serverPulse:Math.max(pulse,source.serverPulse)}:null;
    heldValue.current=next;return next;
  },[active,index,pulse,source]);
}
