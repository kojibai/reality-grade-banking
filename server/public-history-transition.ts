import {prepareSelectedPublicReferenceCatalog} from './public-reference-state.js';
import {createPublicMaterialWindowReader} from './public-material-window.js';
import {readPublicReferencePricing} from './public-reference-pricing.js';
import {readPublicReferenceHistory} from './public-reference-history.js';
import {derivePublicHistoryPatch,type PublicHistoryPatch} from './public-history-patch.js';
import {parseMarketCapSource} from '../src/receiz/market-projection/source.js';
import {buildMarketHistory} from '../src/receiz/market-projection/build-history.js';
import {CHART_PERIODS,type ChartPeriod} from '../src/core/chart-history.js';
import type {CapitalizationPoint} from '../src/receiz/market-projection/history.js';
export type PublicHistoryTransitionRequest={selectionKey:string;historyTransition:{previousGeneration:string;currentGeneration:string;changedKeys?:readonly string[];asOfPulse:number}};
export type PublicHistoryTransitionInput=PublicHistoryTransitionRequest&{previousMaterial:string;currentMaterial:string;readPart:(generation:string)=>Promise<string>};
export type PublicHistoryTransitionResult={schema:'bank.public-market.history-transition.v1';previousGeneration:string;currentGeneration:string;asOfPulse:number;patch:PublicHistoryPatch|null;changedPoints?:Readonly<Record<ChartPeriod,readonly CapitalizationPoint[]>>};
/** Publication-side display computation only. The HTTP boundary selects both
 * exact roots through Source before this runs and rechecks before returning.
 * changedKeys is a delivery hint, never a replacement for the canonical math.
 * The existing calculator retains its compact model/basis checks; this adapter
 * eliminates old history bodies from the returned storage transition. */
export async function preparePublicHistoryTransition(input:PublicHistoryTransitionInput):Promise<PublicHistoryTransitionResult>{
 const {previousGeneration,currentGeneration,asOfPulse}=input.historyTransition;
 const current=await prepareSelectedPublicReferenceCatalog({material:input.currentMaterial,generation:currentGeneration,readPart:input.readPart}),priorReader=createPublicMaterialWindowReader({material:input.previousMaterial,generation:previousGeneration,readPart:input.readPart});
 const priorCatalog=priorReader.root.history.pricing?await readPublicReferencePricing(priorReader,current.catalog,current.reader.root.sports):(await prepareSelectedPublicReferenceCatalog({material:input.previousMaterial,generation:previousGeneration,readPart:input.readPart})).catalog;
 if(current.reader.root.selectionKey!==input.selectionKey||current.reader.root.marketPrepared.asOfPulse!==asOfPulse)throw Error('PUBLIC_HISTORY_TRANSITION_SELECTION_INVALID');
 const previous=await readPublicReferenceHistory(priorReader),generation=current.reader.root.capitalization;
 if(!generation||asOfPulse<previous.summary.serverPulse)throw Error('PUBLIC_HISTORY_TRANSITION_OPERANDS_REQUIRED');
 const capitalization=parseMarketCapSource(await current.reader.readPart(generation));
 if(asOfPulse<capitalization.serverPulse)throw Error('PUBLIC_HISTORY_TRANSITION_COORDINATE_INVALID');
 // A changed Source capture is a separate supported pricing transition. An
 // Original append may not silently replace those retained operands.
 if(generation!==priorReader.root.capitalization)throw Error('PUBLIC_HISTORY_TRANSITION_PRICING_CAPTURE_CHANGED');
 const next=await buildMarketHistory(capitalization,previous,()=>true,async()=>{},{catalog:current.catalog,pulse:asOfPulse,capitalization:true,priorInput:{source:capitalization,catalog:priorCatalog}});
 if(!next)throw Error('PUBLIC_MARKET_RENDER_HISTORY_PENDING');
 const patch=derivePublicHistoryPatch(previous,next),changedPoints=Object.fromEntries(CHART_PERIODS.map(period=>{const changed=new Set([...(patch?.series[period].add.map(point=>point.pulse)??[]),...(patch?.series[period].delta.map(([pulse])=>pulse)??[])]);return[period,next.series[period].filter(point=>changed.has(point.pulse))];})) as Record<ChartPeriod,CapitalizationPoint[]>;
 return{schema:'bank.public-market.history-transition.v1',previousGeneration,currentGeneration,asOfPulse,patch,changedPoints};
}
