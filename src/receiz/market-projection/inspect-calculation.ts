import {computeIntrinsicUnsigned,SIGIL_VALUATION_POLICY,SIGIL_VALUATION_POLICY_CHECKSUM} from '@receiz/sdk/valuation';
import {DEFAULT_ISSUANCE_POLICY} from '../canonical-market-issuance';
import {marketProofUsdQuote,marketProofUsdCents} from '../market-phi-usd';
import type {SigilQuoteCalculation} from './calculation';
import issuanceSource from '../canonical-market-issuance.ts?raw';
/** Canonical explanatory terms are requested only for an explicitly opened
 * Original. This never participates in pricing or chart publication. */
export function inspectMarketSigil(value:SigilQuoteCalculation){
 const computed=computeIntrinsicUnsigned(value.metadata,value.pulse),quote=marketProofUsdQuote(value.metadata,value.pulse,computed);
 if(!Object.is(computed.unsigned.valuePhi,value.intrinsicPhi)||!Object.is(Math.max(.000001,Math.round(value.intrinsicPhi*1000000)/1000000),value.roundedPhi)||!Object.is(quote.quote.usdPerPhi,value.usdPerPhi)||String(marketProofUsdCents(value.roundedPhi,value.usdPerPhi))!==value.usdCents)throw Error('MARKET_CALCULATION_FRAME_MISMATCH');
 return {metadata:value.metadata,pulse:value.pulse,calculation:computed.calculation,appliedDefaults:computed.appliedDefaults,valuationPolicy:SIGIL_VALUATION_POLICY,valuationPolicyChecksum:SIGIL_VALUATION_POLICY_CHECKSUM,issuancePolicy:DEFAULT_ISSUANCE_POLICY,issuanceSource,...quote};
}
