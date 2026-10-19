import {computeIntrinsicUnsigned,SIGIL_VALUATION_POLICY,type SigilMetadataLite} from '@receiz/sdk/valuation';
import {DEFAULT_ISSUANCE_POLICY} from '../receiz/canonical-market-issuance';
import {marketProofUsdQuote,marketProofUsdCents} from '../receiz/market-phi-usd';
import {RECEIZ_VERSION} from '../receiz/client';
import {canonicalInteger,VALUE_POLICY} from './model';

/** Explicit replay of the SAME object metadata, quote and rounding as Market.
 * The live UI supplies the current Kai coordinate, never an editable USD rate. */
export function calculatePhiUsd(amount:string,kaiUPulse:string,metadata:SigilMetadataLite){
 const selected=amount.trim();
 if(selected.length>120||!/^(0|[1-9]\d*)(?:\.\d{1,6})?$/.test(selected))throw Error('Enter a nonnegative Φ amount with up to six decimal places.');
 const [whole,fraction='']=selected.split('.'),micro=BigInt(whole)*1000000n+BigInt(fraction.padEnd(6,'0'));
 if(micro>BigInt(Number.MAX_SAFE_INTEGER))throw Error('This Φ amount exceeds the exact Market micro-unit range.');
 const coordinate=canonicalInteger(kaiUPulse,'Kai µPulse'),pulse=coordinate/1000000n;
 if(pulse>BigInt(Number.MAX_SAFE_INTEGER))throw Error('Kai pulse is outside the exact Market range.');
 const nowPulse=Number(pulse),origin=metadata?.pulse??metadata?.kaiPulse;
 if(!metadata||typeof origin!=='number'||!Number.isSafeInteger(origin)||origin<0||nowPulse<origin)throw Error('Use the proof object’s original metadata and a pulse at or after its origin.');
 const meta=structuredClone(metadata),computed=computeIntrinsicUnsigned(meta,nowPulse);
 const {quoteInputs,quote}=marketProofUsdQuote(meta,nowPulse,computed),phi=Number(micro)/1000000,rawUsd=phi*quote.usdPerPhi,rawCents=rawUsd*100,cents=marketProofUsdCents(phi,quote.usdPerPhi);
 if(!Number.isSafeInteger(cents)||cents<0)throw Error('This USD value exceeds the exact Market cent range.');
 return {schema:'bankeiz.phi-usd-calculation.v2' as const,authority:'deterministic-display-only' as const,sdkVersion:RECEIZ_VERSION,
  amountPhi:selected,amountPhiMicro:micro.toString(),valuationKaiUPulse:kaiUPulse,valuationKaiPulse:pulse.toString(),usdCents:String(cents),
  rateProfile:'market-proof-object-v129' as const,conversion:{algorithm:'receiz.market-proof-usd.v129',version:'1'},quoteInputs,
  valuationPolicy:{...VALUE_POLICY,constants:SIGIL_VALUATION_POLICY},issuancePolicy:DEFAULT_ISSUANCE_POLICY,
  quote:{phiPerUsd:quote.phiPerUsd,usdPerPhi:quote.usdPerPhi,issuanceMultiplier:quote.issuanceMultiplier,multipliers:quote.multipliers,premium:quote.premium,adoption:quote.adoption,rarityScore:quote.rarityScore},
  trace:{phi,rawUsd,rawCents,roundedCents:cents,rounding:'Math.round(Phi × USDPerPhi × 100)'},writesPerformed:0};
}
