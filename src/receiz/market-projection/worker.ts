import {buildInvestmentHistory,type InvestmentHistoryRow,type InvestmentHistory} from './investment-history';
import { parseMarketCapSource,type MarketCapSource } from './source';
import { parseMarketHistory, type MarketHistorySnapshot } from './history';
import { buildMarketHistory } from './build-history';
import type{PublicMarketCatalog}from'../public-market';
import {buildProfileGrowth,type ProfileGrowthHistory,type ProfileGrowthRow} from './profile-growth';
import type {GlobalMarketCalculation} from './calculation';
let investmentRows:InvestmentHistoryRow[]|null=null,investmentHistory:InvestmentHistory|null=null;
let profileRows:ProfileGrowthRow[]|null=null,profileHistory:ProfileGrowthHistory|null=null;
let latest = 0, retained: MarketHistorySnapshot | null = null;
let marketSource:MarketCapSource|null=null,marketCatalog:PublicMarketCatalog|null=null,shareCapitalization=false;
let marketCalculation:GlobalMarketCalculation|null=null,inspectMarket=false;
// Publish only complete curves. Ordinary same-basis refreshes retain every
// prior sample and calculate just the moving opening bounds and newest point.
self.onmessage = async (event: MessageEvent<{ id: number; source?: unknown; history?: unknown; cancel?: boolean;catalog?:PublicMarketCatalog|null;pulse?:number;marketTick?:boolean;marketInspect?:boolean;readCalculation?:boolean;shareCapitalization?:boolean;profileRows?:ProfileGrowthRow[];profileHistory?:ProfileGrowthHistory|null;profileTick?:boolean;investmentRows?:InvestmentHistoryRow[];investmentTick?:boolean }>) => {
  // Inspection reads the completed calculation already held by this worker.
  // It must not cancel an in-flight publication or start another valuation.
  if(event.data.marketInspect!==undefined){inspectMarket=event.data.marketInspect;if(inspectMarket&&event.data.readCalculation!==false)self.postMessage({inspectionOnly:true,marketCalculation});return;}
  const { id } = event.data; latest = id;
  if (event.data.cancel) return;
  try {
    if(event.data.investmentRows||event.data.investmentTick){if(event.data.investmentRows){investmentRows=event.data.investmentRows;investmentHistory=null;}if(!investmentRows)return;const investments=await buildInvestmentHistory(investmentRows,event.data.pulse!,()=>latest===id,()=>new Promise(resolve=>setTimeout(resolve,0)),investmentHistory);if(latest===id){if(investments)investmentHistory=investments;self.postMessage({id,investments});}return;}
    if(event.data.profileRows||event.data.profileTick){if(event.data.profileRows){profileRows=event.data.profileRows;profileHistory=event.data.profileHistory??null;}if(!profileRows)return;let samples=0;const growth=await buildProfileGrowth(profileRows,event.data.pulse!,profileHistory,()=>latest===id,async()=>{if(++samples%8===0)await new Promise(resolve=>setTimeout(resolve,0));});if(latest===id&&growth){profileHistory=growth;self.postMessage({id,growth});}return;}
    if(event.data.source)marketSource=null;
    if (event.data.history) retained = parseMarketHistory(event.data.history);
    if(event.data.source){marketSource=parseMarketCapSource(event.data.source);marketCatalog=event.data.catalog??null;shareCapitalization=event.data.shareCapitalization===true;}
    else if(!event.data.marketTick)return;
    if(!marketSource)throw Error('Market inputs are unavailable.');
    if(shareCapitalization&&!marketCatalog){self.postMessage({id,retained:true});return;}
    let calculation:GlobalMarketCalculation|null=null;
    const next = await buildMarketHistory(marketSource, retained, () => latest === id, () => new Promise(resolve => setTimeout(resolve, 0)),event.data.pulse===undefined?undefined:{catalog:marketCatalog,pulse:event.data.pulse,capitalization:shareCapitalization,...(shareCapitalization?{onCalculation:(value:GlobalMarketCalculation)=>{calculation=value;}}:{})});
    if (latest !== id) return;
    // A newer retained capture is a completed job too. Without an ack the UI
    // keeps its queue busy forever and never dispatches newly arrived operands.
    if (!next) { self.postMessage({id,retained:true}); return; }
    retained = next;marketCalculation=calculation;self.postMessage({ id, history: next,...(inspectMarket?{marketCalculation}:{}) });
  } catch { if (latest === id) self.postMessage({ id, error: 'Projected market history is unavailable.' }); }
};
