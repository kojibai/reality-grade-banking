import {publicSportsSealedCopies,marketPulseAtOrAfterTime,type MarketSealedCopy} from './market-projection/sealed-copies';
import {nativeHistoricalValue} from './market-projection/interpolated-history';
import {marketQuoteMovementAtPulse,publicSportsQuoteAtPulse} from './market-projection/project';
import type {MarketValueRow} from './market-projection/source';
type PricedCopy=MarketSealedCopy&{valuation:NonNullable<MarketSealedCopy['valuation']>;valuationPulse:number};
export type LedgerCardCopyValuation={copy:PricedCopy;row:MarketValueRow;issue:number;earlierQuotes:ReadonlyMap<number,number|null>};
/** Every copy binds its own model. Group representatives and aggregate totals
 * cannot substitute for the original's seal, value basis or motion seed. */
export function readLedgerCopyValuation(raw:unknown,sourcePulse:number,sport?:string){
 const copy=publicSportsSealedCopies([raw])?.[0];if(!copy?.valuation||copy.valuationPulse===undefined||copy.valuationPulse>sourcePulse)return null;
 const model=copy.valuation,seed=model.seed;
 const bound=seed===copy.claimHash||(['baseball','soccer','fight']as const).some(prefix=>(!sport||sport===prefix)&&seed.startsWith(`${prefix}:${copy.collectibleId}:${copy.claimHash}:`)&&seed.length>`${prefix}:${copy.collectibleId}:${copy.claimHash}:`.length);
 if(!bound||model.birthUsdValue!==copy.birthUsdValue||model.baseUsdValue!==copy.proofValueUsd)return null;
 const issue=marketPulseAtOrAfterTime(copy.sealedAt);if(issue>copy.valuationPulse)return null;
 const earlierQuotes=new Map<number,number|null>();
 for(const point of copy.valueHistory??[]){if(point.basis!=='source-observation')continue;const pulse=point.pulse??marketPulseAtOrAfterTime(point.at);if(pulse>=copy.valuationPulse)continue;earlierQuotes.set(pulse,!earlierQuotes.has(pulse)||earlierQuotes.get(pulse)===point.usdValue?point.usdValue:null);}
 return {copy:copy as PricedCopy,issue,earlierQuotes};
}
export function prepareLedgerCardCopyValuation(raw:unknown,row:MarketValueRow,sourcePulse:number):LedgerCardCopyValuation|null{
 const value=readLedgerCopyValuation(raw,sourcePulse,row.sportsGroup?.sport);return value?{...value,row}:null;
}
/** A public transfer projection may carry the already computed native copy
 * operands beside its unchanged event evidence. This is display context only. */
const carried=new WeakMap<object,LedgerCardCopyValuation|null>();
export function carriedLedgerCardCopyValuation(raw:unknown):LedgerCardCopyValuation|null{
 if(!raw||typeof raw!=='object')return null;
 if(carried.has(raw))return carried.get(raw)!;
 const value=readLedgerCopyValuation(raw,1e10);if(!value){carried.set(raw,null);return null;}
 const model=value.copy.valuation,row:MarketValueRow={id:`${value.copy.collectibleId}:${value.copy.claimHash}`,source:'sports-economy-card',...model,proofTotalValueUsd:model.baseUsdValue};
 const result={...value,row};carried.set(raw,result);return result;
}
export function ledgerCardCopyUsdAtPulse(value:LedgerCardCopyValuation,pulse:number):number|undefined{
 const {copy,issue}=value;if(!Number.isSafeInteger(pulse)||pulse<issue)return;
 if(pulse===issue)return copy.birthUsdValue;
 if(pulse===copy.valuationPulse)return copy.currentValueUsd;
 const model={...copy.valuation,proofTotalValueUsd:copy.valuation.baseUsdValue};
 if(pulse>copy.valuationPulse)return Number(publicSportsQuoteAtPulse({...value.row,...model},pulse).toFixed(2));
 if(value.earlierQuotes.size)return value.earlierQuotes.get(pulse)??undefined;
 return nativeHistoricalValue({issue,until:copy.valuationPulse,birth:copy.birthUsdValue,model},pulse,marketQuoteMovementAtPulse(pulse));
}
