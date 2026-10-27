import type {SigilMetadataLite} from '@receiz/sdk/valuation';
import {computeIntrinsicUnsigned as unsignedAtPulse} from '../generated/chart-valuation.mjs';
import {marketProofUsdQuote,marketProofUsdCents} from '../market-phi-usd';
import type { MarketCapSource, MarketValueRow,MarketPulseSeed } from './source';
import {boundSportsHistoryObservation,type SportsHistoryObservation} from './sports-observations';
import type { ChartPeriod } from '../../core/chart-history';
import { marketPulseTime, marketPeriodPulses } from './coordinates';
import {marketPulseAtOrAfterTime,type MarketSealedBirth,type MarketSealedCopy} from './sealed-copies';
// Canonical public Proof Graph display rules from the v129 Receiz host.
// Pricing stays deterministic; historical membership starts at the carried seal.
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const round = (n: number, places = 4) => Number(n.toFixed(places));
const roundPhi = (n: number) => Math.round(n * 1e6) / 1e6;
function hash(input: string) { let h = 2166136261; for (let i = 0; i < input.length; i++) h = Math.imul(h ^ input.charCodeAt(i), 16777619); return h >>> 0; }
const rateMeta = { ip: { expectedCashflowPhi: [] } } as unknown as SigilMetadataLite;
function rate(pulse: number, meta = rateMeta, computed={unsigned:unsignedAtPulse(meta,pulse)}) { return marketProofUsdQuote(meta,pulse,computed).quote.usdPerPhi; }
export function publicSigilQuoteAtPulse(seed:MarketPulseSeed,pulse:number){
 if(seed.kind!=='sigil'||!Number.isSafeInteger(pulse)||pulse<seed.claimPulse)throw Error('Public object valuation seed is unavailable.');
 const meta={pulse:seed.claimPulse,kaiPulse:seed.claimPulse,beat:seed.beat,stepIndex:seed.stepIndex,stepsPerBeat:44,quality:'high',creatorVerified:seed.creatorVerified,creatorRep:0,chakraDay:seed.chakraDay??undefined,kaiSignature:seed.kaiSignature??undefined,userPhiKey:seed.userPhiKey??undefined}as SigilMetadataLite;
 const computed={unsigned:unsignedAtPulse(meta,pulse)},phi=Math.max(.000001,roundPhi(computed.unsigned.valuePhi));
 const usdPerPhi=rate(pulse,meta,computed);return {pricePhi:phi,quoteUsdPerPhi:usdPerPhi,priceUsd:marketProofUsdCents(phi,usdPerPhi)/100};
}
export function publicSigilUsdAtPulse(seed:MarketPulseSeed,pulse:number):number{return publicSigilQuoteAtPulse(seed,pulse).priceUsd;}
function marketValue(row: MarketValueRow, pulse: number, usdPerPhi: number): number {
  const item = row.marketItem!; let phi: number;
  if (item.livePulseSeed?.kind === 'sigil') {
    return publicSigilUsdAtPulse(item.livePulseSeed,Math.max(item.livePulseSeed.claimPulse,pulse));
  } else {
    const base = Math.max(.000001, item.pricePhi || item.priceUsd / Math.max(item.quoteUsdPerPhi, 1)), key = item.pricingSourceKey || item.id;
    const wave = Math.sin(pulse * .173 + hash(`${key}:pulse-a`) % 6283 / 1000) * .56 + Math.cos(pulse * .071 + hash(`${key}:pulse-b`) % 6283 / 1000) * .31 + Math.sin(pulse * .287 + hash(`${key}:pulse-c`) % 6283 / 1000) * .13;
    const amplitude = item.source === 'asset-seal' ? clamp(.008 + Math.abs(item.changePct) / 420, .008, .028) : clamp(.0045 + Math.abs(item.changePct) / 620, .0045, .018);
    phi = Math.max(.000001, roundPhi(base * (1 + wave * amplitude)));
  }
  return Math.round(phi * usdPerPhi * 100) / 100;
}
export function sportsUnitValue(row: MarketValueRow, pulse: number, quoteMove: number): number {
  const base = row.baseUsdValue; if (base <= 0 || row.proofTotalValueUsd <= 0) return 0;
  const signal = (hash(`card:${row.seed}`) % 1e6) / 1e6;
  const wave = (Math.sin((pulse + signal * 987) * .19) + 1) / 2, drift = (Math.sin((pulse + signal * 421) * .047) + 1) / 2, trend = (Math.sin((pulse + signal * 193) * .083) + 1) / 2;
  const pressure = round(base * clamp((row.marketUsdValue - base) / base, 0, .18) * .22);
  const carry = base * (.001 + quoteMove * .008 + wave * .0038 + drift * .0014 + trend * .0011 + clamp(Math.max(0, row.scoreDelta) * .0012, 0, .018) + clamp(Math.max(0, base - row.birthUsdValue) / base, 0, .12) * .028) + pressure;
  return round(base + round(Math.max(.0001, carry)));
}
function sportsValue(row:MarketValueRow,pulse:number,quoteMove:number){const unit=sportsUnitValue(row,pulse,quoteMove);return unit>0?round(row.proofTotalValueUsd*unit/row.baseUsdValue):0;}
function sealedCopyValue(copy:MarketSealedCopy,pulse:number,quoteMove:number):number{
 if(pulse<marketPulseAtOrAfterTime(copy.sealedAt))return 0;
 const model=copy.valuation,observed=copy.valuationPulse;
 if(model&&observed!==undefined&&pulse>=observed){
  if(pulse===observed)return copy.currentValueUsd;
  // The host rounds each single-card chart quote to cents before summing.
  return Number(Math.max(0,sportsUnitValue({id:copy.collectibleId,source:'sports-economy-card',...model,proofTotalValueUsd:model.baseUsdValue},pulse,quoteMove)).toFixed(2));
 }
 let amount=copy.birthUsdValue;
 for(const point of copy.valueHistory??[]){if(pulse<(point.pulse??marketPulseAtOrAfterTime(point.at)))break;amount=point.usdValue;}
 return amount;
}
interface PreparedSportsRow {observation?:SportsHistoryObservation;observed?:number;model?:MarketValueRow;laterBirths:{pulse:number;usdValue:number}[];}
interface MarketProjectionContext {rows:ReadonlyMap<MarketValueRow,PreparedSportsRow>;birthPulses:ReadonlyMap<MarketSealedBirth,number>;}
function prepareSportsRow(row:MarketValueRow):PreparedSportsRow{
 const observation=boundSportsHistoryObservation(row.historyObservation,row);if(!observation)return {laterBirths:[]};
 const at=Date.parse(observation.at);
 return {observation,observed:marketPulseAtOrAfterTime(observation.at),model:observation.model?{...row,...observation.model}:undefined,laterBirths:(row.sealedCopies??row.sealedBirths??[]).filter(copy=>Date.parse(copy.sealedAt)>at).map(copy=>({pulse:marketPulseAtOrAfterTime(copy.sealedAt),usdValue:copy.birthUsdValue}))};
}
/** One immutable worker input is checked once for a complete history build.
 * This context is never retained across inputs, including reused object refs. */
export function prepareMarketProjection(source:MarketCapSource):MarketProjectionContext{
 const rows=new Map<MarketValueRow,PreparedSportsRow>(),birthPulses=new Map<MarketSealedBirth,number>();
 for(const row of source.valueRows){if(row.source==='sports-economy-card')rows.set(row,prepareSportsRow(row));for(const copy of row.sealedCopies??row.sealedBirths??[])birthPulses.set(copy,marketPulseAtOrAfterTime(copy.sealedAt));}
 for(const copy of source.unpricedSealedBirths??[])birthPulses.set(copy,marketPulseAtOrAfterTime(copy.sealedAt));
 return {rows,birthPulses};
}
function observedSportsValue(row:MarketValueRow,pulse:number,quoteMove:number,context?:MarketProjectionContext):number|undefined{
 const prepared=context?.rows.get(row)??prepareSportsRow(row),observation=prepared.observation;if(!observation)return;
 const observed=prepared.observed!;
 // A complete dated copy model supersedes aggregate snapshot coverage.
 const full=row.sealedCopies,complete=full?.length&&full.every(copy=>copy.valuationPulse!==undefined&&copy.valuationPulse<=pulse||copy.valueHistory?.some(point=>point.basis==='source-observation'&&(point.pulse??marketPulseAtOrAfterTime(point.at))<=pulse));
 if(complete)return full!.reduce((sum,copy)=>sum+sealedCopyValue(copy,pulse,quoteMove),0);
 if(pulse<observed)return;
 if(row.historyEvaluationPulse!==undefined&&pulse>=row.historyEvaluationPulse)return sportsValue(row,pulse,quoteMove);
 const extra=pulse<(row.historyEvaluationPulse??Infinity)?prepared.laterBirths.reduce((sum,copy)=>sum+(copy.pulse<=pulse?copy.usdValue:0),0):0;
 return (pulse===observed||!prepared.model?observation.usdValue:sportsValue(prepared.model,pulse,quoteMove))+extra;
}
export function publicSportsQuoteAtPulse(row:MarketValueRow,pulse:number,quoteMove?:number){
 if(row.source!=='sports-economy-card'||!Number.isSafeInteger(pulse)||pulse<0)throw Error('Public object valuation seed is unavailable.');
 if(quoteMove===undefined){const current=rate(pulse),prior=rate(Math.max(0,pulse-1));quoteMove=Math.abs(current-prior)/prior;}
 const copy=row.sealedCopies?.find(copy=>copy.claimHash===row.seed);if(copy)return sealedCopyValue(copy,pulse,quoteMove);
 return sportsUnitValue(row,pulse,quoteMove);
}
/** Current capitalization of the existing sports-copy source. The aggregate
 * is evaluated once, never multiplied by circulation again. */
export function publicSportsCapitalizationUsdAtPulse(row:MarketValueRow,pulse:number,quoteMove:number){
 if(row.source!=='sports-economy-card'||!Number.isSafeInteger(pulse)||pulse<0)throw Error('Public object valuation seed is unavailable.');
 return row.sealedCopies?round(row.sealedCopies.reduce((sum,copy)=>sum+sealedCopyValue(copy,pulse,quoteMove),0)):sportsValue(row,pulse,quoteMove);
}
export function marketQuoteMovementAtPulse(pulse:number){const current=rate(pulse),previous=rate(Math.max(0,pulse-1));return Math.abs(current-previous)/previous;}
/** Single-object display math, using the same admitted sigil operands as the graph. */
export function marketAssetUsdAtPulse(row:MarketValueRow,pulse:number):number{
 const meta=row.marketItem?.livePulseSeed;if(row.source!=='market-desk-live-asset'||meta?.kind!=='sigil'||!Number.isSafeInteger(pulse)||pulse<meta.claimPulse)throw Error('Public object valuation seed is unavailable.');
 return marketValue(row,pulse,1);
}
export function marketCapUsdAtPulse(seed: MarketCapSource, pulse: number,context?:MarketProjectionContext): number {
  if (!Number.isSafeInteger(pulse) || pulse < seed.firstIssuancePulse) throw new Error('Market projection pulse outside its issuance range.');
  if (pulse === seed.serverPulse) return round(seed.currentUsd);
  const snapshot=seed.sportsHistorySnapshot,captured=snapshot&&marketPulseAtOrAfterTime(snapshot.at);
  const unpriced=(seed.unpricedSealedBirths??[]).reduce((sum,copy)=>sum+(pulse<(context?.birthPulses.get(copy)??marketPulseAtOrAfterTime(copy.sealedAt))||snapshot&&pulse>=captured!&&(Date.parse(copy.sealedAt)<=Date.parse(snapshot.at)||pulse>=(seed.sportsHistoryEvaluationPulse??Infinity))?0:copy.birthUsdValue),0);
  const dated=marketRowsUsdAtPulse(seed.valueRows,pulse,true,context)+unpriced,observation=seed.undatedHistory;
  if(snapshot)return round(dated);
  if(!observation||pulse<observation.observationPulse)return dated;
  const aggregateRows=seed.valueRows.filter(row=>!row.marketItem?.livePulseSeed&&!row.sealedCopies?.length);
  const aggregate=pulse<=observation.modelPulse?observation.observationUsd:marketRowsUsdAtPulse(aggregateRows,pulse,false,context)-marketRowsUsdAtPulse(aggregateRows,pulse,true,context)-unpriced;
  return round(dated+aggregate);
}
export function marketRowsUsdAtPulse(rows:MarketValueRow[],pulse:number,historical=false,context?:MarketProjectionContext):number{
 const quote=rate(pulse),previous=rate(Math.max(0,pulse-1)),quoteMove=Math.abs(quote-previous)/previous;
 return round(rows.reduce((sum,row)=>{
  if(historical&&row.source==='sports-economy-card'){const observed=observedSportsValue(row,pulse,quoteMove,context);if(observed!==undefined)return sum+observed;}
  if(row.source==='sports-economy-card'&&row.sealedCopies)return sum+row.sealedCopies.reduce((value,copy)=>value+sealedCopyValue(copy,pulse,quoteMove),0);
  if(historical&&row.source==='sports-economy-card'&&row.sealedBirths)return sum+row.sealedBirths.reduce((value,copy)=>value+(pulse<(context?.birthPulses.get(copy)??marketPulseAtOrAfterTime(copy.sealedAt))?0:copy.birthUsdValue),0);
  if(historical){const sealed=row.marketItem?.livePulseSeed?.claimPulse;if(sealed===undefined||pulse<sealed)return sum;}
  return sum+(row.source==='market-desk-live-asset'?marketValue(row,pulse,quote):sportsValue(row,pulse,quoteMove));
 },0));
}
export { marketPulseTime, marketPeriodPulses } from './coordinates';
export function projectMarketPeriod(seed: MarketCapSource, period: ChartPeriod) { return marketPeriodPulses(seed, period).map(pulse => ({ at: new Date(marketPulseTime(pulse)).toISOString(), pulse, usdCents: String(Math.round(marketCapUsdAtPulse(seed, pulse) * 100)) })); }
