import {buildInvestmentHistory,type InvestmentHistoryRow,type InvestmentHistory} from './investment-history';
import { parseMarketCapSource } from './source';
import { parseMarketHistory, type MarketHistorySnapshot } from './history';
import { buildMarketHistory } from './build-history';
import type{PublicMarketCatalog}from'../public-market';
import {buildProfileGrowth,type ProfileGrowthHistory,type ProfileGrowthRow} from './profile-growth';
let investmentRows:InvestmentHistoryRow[]|null=null,investmentHistory:InvestmentHistory|null=null;
let latest = 0, retained: MarketHistorySnapshot | null = null;
// Publish only complete curves. Ordinary same-basis refreshes retain every
// prior sample and calculate just the moving opening bounds and newest point.
self.onmessage = async (event: MessageEvent<{ id: number; source?: unknown; history?: unknown; cancel?: boolean;catalog?:PublicMarketCatalog|null;pulse?:number;profileRows?:ProfileGrowthRow[];profileHistory?:ProfileGrowthHistory|null;investmentRows?:InvestmentHistoryRow[];investmentTick?:boolean }>) => {
  const { id } = event.data; latest = id;
  if (event.data.cancel) return;
  try {
    if(event.data.investmentRows||event.data.investmentTick){if(event.data.investmentRows){investmentRows=event.data.investmentRows;investmentHistory=null;}if(!investmentRows)return;const investments=await buildInvestmentHistory(investmentRows,event.data.pulse!,()=>latest===id,()=>new Promise(resolve=>setTimeout(resolve,0)),investmentHistory);if(latest===id){if(investments)investmentHistory=investments;self.postMessage({id,investments});}return;}
    if(event.data.profileRows){let samples=0;const growth=await buildProfileGrowth(event.data.profileRows,event.data.pulse!,event.data.profileHistory??null,()=>latest===id,async()=>{if(++samples%8===0)await new Promise(resolve=>setTimeout(resolve,0));});if(latest===id&&growth)self.postMessage({id,growth});return;}
    if (event.data.history) retained = parseMarketHistory(event.data.history);
    if (!event.data.source) return;
    const source = parseMarketCapSource(event.data.source);
    const next = await buildMarketHistory(source, retained, () => latest === id, () => new Promise(resolve => setTimeout(resolve, 0)),event.data.pulse===undefined?undefined:{catalog:event.data.catalog??null,pulse:event.data.pulse});
    if (latest !== id) return;
    // A newer retained capture is a completed job too. Without an ack the UI
    // keeps its queue busy forever and never dispatches newly arrived operands.
    if (!next) { self.postMessage({id,retained:true}); return; }
    retained = next; self.postMessage({ id, history: next });
  } catch { if (latest === id) self.postMessage({ id, error: 'Projected market history is unavailable.' }); }
};
