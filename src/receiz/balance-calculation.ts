import {computeIntrinsicUnsigned,SIGIL_VALUATION_POLICY,SIGIL_VALUATION_POLICY_CHECKSUM} from '@receiz/sdk/valuation';
import {DEFAULT_ISSUANCE_POLICY} from './canonical-market-issuance';
import {inspectCompositeWalletAt,inspectCurrentWalletAt,type BalanceCalculationStep,type CompositeBalanceObject} from './composite-wallet-history';
import {knownNativeBalanceCalculation,type NativeBalanceCalculation} from './balance-calculation-observation';
import {currentBalanceCaptureKai} from './current-balance-source';
import type {SharedWallet} from './shared-wallet';
import type {WalletObservation} from './wallet-observation';
export type BalanceCalculation=Readonly<{kind:'native'|'composite'|'current'|'zero';userId:string;kaiUPulse:string|null;source:string;output:SharedWallet;steps:readonly BalanceCalculationStep[];objects:readonly CompositeBalanceObject[];inputs:unknown}>;
const fields=['userId','totalUsdCents','reserveUsdCents','settlementUsdCents','balancePhiMicro','reservePhiMicro','settlementPhiMicro','pulse','kaiUpulse','balanceSourceSha256'] as const;
const frames=new WeakMap<SharedWallet,string>(),sources=new WeakMap<object,string>();
function fingerprint(value:object|undefined){if(!value)return '';let result=sources.get(value);if(result===undefined){result=JSON.stringify(value);sources.set(value,result);}return result;}
function sourceFrame(wallet:SharedWallet){let value=frames.get(wallet);if(value===undefined){value=JSON.stringify([fingerprint(wallet.currentBalanceSource),fingerprint(wallet.originalProofReferences),fingerprint(wallet.reserveFundingSource)]);frames.set(wallet,value);}return value;}
const same=(left:SharedWallet,right:SharedWallet)=>fields.every(field=>left[field]===right[field])&&sourceFrame(left)===sourceFrame(right);
function native(value:NativeBalanceCalculation):BalanceCalculation{
 const output=value.output;
 return {kind:'native',userId:value.userId,kaiUPulse:value.kaiUPulse,source:value.sourceDigest??value.source,output,objects:[],inputs:{source:value.source,sourceDigest:value.sourceDigest,statement:value.statement,reserveUsdCents:value.reserveUsdCents,settlementPhiMicro:value.settlementPhiMicro,balancePhiMicro:value.balancePhiMicro,rateMicrocents:value.rateMicrocents,rateCalculation:value.rateCalculation,issuancePolicy:value.rateCalculation?DEFAULT_ISSUANCE_POLICY:undefined},steps:[
  {label:'Exact native holdings',formula:'carried source units; no conversion from dollar balances',operands:{balancePhiMicro:value.balancePhiMicro,settlementPhiMicro:value.settlementPhiMicro,reservePhiMicro:output.reservePhiMicro??'Not carried'},result:value.balancePhiMicro,unit:'Φ micro-units'},
  {label:'Settlement dollar value',formula:value.rateMicrocents===null?'No conversion: zero Settlement':'floor((Settlement Φµ × quoted microcents/Φ + 500000000000) / 1000000000000)',operands:{settlementPhiMicro:value.settlementPhiMicro,usdPerPhiMicrocents:value.rateMicrocents??'Not used'},result:output.settlementUsdCents,unit:'USD cents'},
  {label:'Reserve',formula:'source-carried fixed-dollar backing',operands:{reserveUsdCents:value.reserveUsdCents},result:output.reserveUsdCents,unit:'USD cents'},
  {label:'Displayed dollar balance',formula:'Reserve USD cents + Settlement USD cents',operands:{reserveUsdCents:output.reserveUsdCents,settlementUsdCents:output.settlementUsdCents},result:output.totalUsdCents,unit:'USD cents'},
 ]};
}
/** Read-only inspection of the SAME held source and coordinate as the header.
 * An incomplete or changed endpoint supplies no illustrative replacement. */
const calculations=new WeakMap<SharedWallet,{observation:WalletObservation|null;value:BalanceCalculation}>();
export function readBalanceCalculation(wallet:SharedWallet|null,observation:WalletObservation|null):BalanceCalculation|null{
 if(!wallet)return null;
 const held=calculations.get(wallet);
 if(held?.observation===observation)return held.value;
 const value=computeBalanceCalculation(wallet,observation);
 if(value)calculations.set(wallet,{observation,value});
 return value;
}
function computeBalanceCalculation(wallet:SharedWallet,observation:WalletObservation|null):BalanceCalculation|null{
 if(!wallet)return null;
 const matching=observation&&same(wallet,observation.wallet);
 if(matching){
  const current=wallet.currentBalanceSource,currentKai=observation.historyBasis?.kind==='current-valuation-v129'?observation.historyBasis.endKaiUPulse:current?currentBalanceCaptureKai(current):null;
  if(current&&currentKai){try{const actual=inspectCurrentWalletAt(current,currentKai),point=actual.point;
    if(!(['userId','totalUsdCents','reserveUsdCents','settlementUsdCents','balancePhiMicro'] as const).every(key=>wallet[key]===point[key]))return null;
    const reserve=current.reservePhiMicro;if(reserve!==null&&current.settlementPhiMicro!==null&&(wallet.reservePhiMicro!==reserve||BigInt(wallet.balancePhiMicro)<BigInt(reserve)||wallet.settlementPhiMicro!==(BigInt(wallet.balancePhiMicro)-BigInt(reserve)).toString()))return null;
    return {kind:'current',userId:wallet.userId,kaiUPulse:currentKai,source:current.sourceSha256??'Current own-signed source cohort',output:wallet,steps:actual.steps,objects:actual.objects,inputs:{currentSource:current,rateSource:actual.rateSource,rateCalculation:actual.rateCalculation,issuancePolicy:DEFAULT_ISSUANCE_POLICY}};
   }catch{return null;}}
  const recorded=knownNativeBalanceCalculation(observation);if(recorded&&same(wallet,recorded.output))return native(recorded);
  const source=observation.chartSource,kai=observation.historyBasis?.kind==='portfolio-model-v129'?observation.historyBasis.endKaiUPulse:null;
  if(source?.userId===wallet.userId&&kai){try{
   const actual=inspectCompositeWalletAt(source,kai),point=actual.point;
   if(point.totalUsdCents!==wallet.totalUsdCents||point.reserveUsdCents!==wallet.reserveUsdCents||point.settlementUsdCents!==wallet.settlementUsdCents||point.balancePhiMicro!==undefined&&point.balancePhiMicro!==wallet.balancePhiMicro)return null;
   return {kind:'composite',userId:wallet.userId,kaiUPulse:kai,source:source.earningMembershipPolicy??(source.objects.length?'Retained historical projection':'Authenticated account-only projection'),output:wallet,steps:actual.steps,objects:actual.objects,inputs:{rateSource:actual.rateSource,rateCalculation:actual.rateCalculation,schema:source.schema,composition:source.composition??'profile-plus-ledger',earningMembershipPolicy:source.earningMembershipPolicy,throughKaiUPulse:source.throughKaiUPulse,objects:source.objects.map(object=>({id:object.id,seed:object.seed,intervals:object.intervals,proof:object.proof})),transport:source.transport,movements:source.movements,lawfulValues:source.lawfulValues,issuancePolicy:DEFAULT_ISSUANCE_POLICY}};
  }catch{return null;}}
 }
 if(wallet.totalUsdCents==='0'&&wallet.balancePhiMicro==='0'&&wallet.reserveUsdCents==='0'&&wallet.settlementUsdCents==='0')return {kind:'zero',userId:wallet.userId,kaiUPulse:matching?observation.historyBasis?.endKaiUPulse??wallet.kaiUpulse:wallet.kaiUpulse,source:'Carried zero account observation',output:wallet,objects:[],inputs:{totalUsdCents:'0',balancePhiMicro:'0'},steps:[{label:'Reserve',formula:'carried zero account value; no conversion performed',operands:{totalUsdCents:'0',balancePhiMicro:'0'},result:'0',unit:'USD cents'}]};
 return null;
}
/** Expensive canonical per-Original trace is evaluated only when that Original
 * is explicitly expanded. Its output must equal the observed chart arithmetic. */
export function inspectBalanceOriginal(value:CompositeBalanceObject){
 const computation=computeIntrinsicUnsigned(value.metadata,value.pulse);
 if(!Object.is(computation.unsigned.valuePhi,value.valuePhi)||String(Math.round(computation.unsigned.valuePhi*1_000_000))!==value.phiMicro||String(Math.round(computation.unsigned.valuePhi*value.quote.usdPerPhi*100))!==value.usdCents)throw Error('BALANCE_ORIGINAL_TRACE_MISMATCH');
 return {metadata:value.metadata,pulse:value.pulse,calculation:computation.calculation,appliedDefaults:computation.appliedDefaults,valuationPolicy:SIGIL_VALUATION_POLICY,valuationPolicyChecksum:SIGIL_VALUATION_POLICY_CHECKSUM,issuancePolicy:DEFAULT_ISSUANCE_POLICY,quoteInputs:{meta:value.metadata,nowPulse:value.pulse,...value.quoteInputs},quote:value.quote,rounding:{phi:'Math.round(unrounded Φ × 1000000)',usd:'Math.round(unrounded Φ × USD/Φ × 100)'},valuePhi:value.valuePhi,phiMicro:value.phiMicro,usdCents:value.usdCents};
}
