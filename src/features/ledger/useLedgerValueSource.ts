import { useEffect, useMemo, useRef, useState } from 'react';
import {loadReceiz} from '../../receiz/client';
import { indexLedgerValues,sameLedgerValueInputs,type LedgerValueIndex } from '../../receiz/ledger-value';
import {readMarketDisplaySource,useMarketDisplaySource} from '../../receiz/market-projection/display-source';

/** One existing public projection for the ledger, with no original-file requests per row. */
export function useLedgerValueSource(active: boolean) {
  const source=useMarketDisplaySource(active),[pulse,setPulse]=useState<number|null>(null);
  const heldIndex=useRef<LedgerValueIndex|null>(null);
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
      if (pending && live) return;
      if (live) pending = true;
      try {
        if(!controller.signal.aborted)await readMarketDisplaySource(path);
      } catch { /* A missing projection leaves the carried source value visible. */ }
      finally { if (live) pending = false; }
    };
    void read('/receiz-public-capitalization.json', false);
    void read('/api/bank/public-market/capitalization', true);
    const refresh = () => { if (document.visibilityState === 'visible') void read('/api/bank/public-market/capitalization', true); };
    const timer = setInterval(refresh, 60_000);
    window.addEventListener('online', refresh);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('online', refresh); };
  }, [active]);
  const index=useMemo(()=>{if(!source)return null;if(!heldIndex.current||!sameLedgerValueInputs(heldIndex.current.source,source))heldIndex.current=indexLedgerValues(source);return heldIndex.current;},[source]);
  return useMemo(()=>index&&source?{...index,source,evaluationPulse:pulse===null?source.serverPulse:Math.max(pulse,source.serverPulse)}:null,[index,pulse,source]);
}
