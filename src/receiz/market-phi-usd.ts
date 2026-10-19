import {computeIntrinsicUnsigned,type SigilMetadataLite} from '@receiz/sdk/valuation';
import {DEFAULT_ISSUANCE_POLICY,quotePhiForUsd} from './canonical-market-issuance';

/** The existing Market object quote, with its fixed public context. No caller
 * price, contribution amount or wallet aggregate can select the exchange rate. */
export function marketProofUsdQuote(metadata:SigilMetadataLite,pulse:number,computed?:Pick<ReturnType<typeof computeIntrinsicUnsigned>,'unsigned'>){
 const quoteInputs={meta:metadata,nowPulse:pulse,usd:100,currentStreakDays:0,lifetimeUsdSoFar:0,plannedHoldBeats:0};
 // The quote consumes only unsigned arithmetic. Chart sampling can omit trace
 // allocation; the generated evaluator is checked against the SDK byte source.
 const quote=quotePhiForUsd(quoteInputs,DEFAULT_ISSUANCE_POLICY,computed as ReturnType<typeof computeIntrinsicUnsigned>|undefined);
 if(!Number.isFinite(quote.usdPerPhi)||quote.usdPerPhi<=0)throw Error('Public valuation quote is unavailable.');
 return {quoteInputs,quote};
}
/** Preserve Market's binary64 multiplication and Math.round order exactly. */
export function marketProofUsdCents(phi:number,usdPerPhi:number){return Math.round(phi*usdPerPhi*100);}
