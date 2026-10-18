import { useEffect, useMemo, useState } from 'react';
import {loadReceiz} from '../../receiz/client';
import { indexLedgerValues } from '../../receiz/ledger-value';
import { type MarketCapSource } from '../../receiz/market-projection/source';
import {readMarketDisplaySource} from '../../receiz/market-projection/display-source';

/** One existing public projection for the ledger, with no original-file requests per row. */
export function useLedgerValueSource(active: boolean) {
  const [source, setSource] = useState<MarketCapSource | null>(null),[pulse,setPulse]=useState<number|null>(null);
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
        const next = await readMarketDisplaySource(path);
        if (!controller.signal.aborted) setSource(current => current && current.serverPulse > next.serverPulse ? current : next);
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
  const index=useMemo(() => source ? indexLedgerValues(source) : null, [source]);
  return useMemo(()=>index?{...index,evaluationPulse:pulse===null?index.source.serverPulse:Math.max(pulse,index.source.serverPulse)}:null,[index,pulse]);
}
