import policy from './policy.json';
export const ORIGINALS_QUALIFICATION_POLICY = Object.freeze(policy);
export type QualificationBaseline = Record<'pbi'|'avatar'|'header'|'threeOriginals'|'verifiedOriginal',boolean|null>;
export type QualificationInput = {
 originals:number|null;
 witnessedBreaths:number|null;
 /** Existing composite retained/starting units, summed across the same Originals. */
 retention:{starts:number;retained:number}|null;
 /** Admitted, deduplicated lifetime qualifying consideration, never account value. */
 fundingUsdCents:string|null;
 baseline:QualificationBaseline;
};
const count=(value:number|null)=>{if(value!==null&&(!Number.isSafeInteger(value)||value<0))throw Error('QUALIFICATION_COUNTER_INVALID');return value;};
const cents=(value:string|null)=>{if(value!==null&&!/^(0|[1-9]\d*)$/.test(value))throw Error('QUALIFICATION_FUNDING_INVALID');return value===null?null:BigInt(value);};
const ceilDiv=(value:bigint,divisor:bigint)=>(value+divisor-1n)/divisor;
/** Read-only contribution calculation. Its result is NOT a qualification proof,
 * an entitlement, a valuation, a financial instruction or a wallet credit. */
export function calculateQualification(input:QualificationInput){
 const originals=count(input.originals),breaths=count(input.witnessedBreaths),funding=cents(input.fundingUsdCents);
 const retention=input.retention;
 if(retention&&(!Number.isFinite(retention.starts)||!Number.isFinite(retention.retained)||retention.starts<0||retention.retained<0))throw Error('QUALIFICATION_RETENTION_INVALID');
 const rate=retention?retention.starts>0?retention.retained/retention.starts:0:null;
 const retentionMet=rate===null?null:rate>=policy.retentionMinimum;
 const baselineMet=Object.values(input.baseline).every(value=>value===true)?true:Object.values(input.baseline).some(value=>value===false)?false:null;
 const total=BigInt(policy.fullFundingUsdCents),half=total/2n,breathCap=BigInt(policy.witnessedBreaths);
 const originalOffset=originals===null?null:half*BigInt(Math.min(originals,policy.originals))/BigInt(policy.originals);
 const witnessed=retentionMet===false?0:retentionMet===true?breaths===null?null:Math.min(breaths,policy.witnessedBreaths):null;
 const required=originalOffset===null||witnessed===null?null:ceilDiv((total-originalOffset)*breathCap-half*BigInt(witnessed),breathCap);
 // Unknown work cannot invent an offset. Fully admitted funding can still
 // satisfy the funding endpoint independently of an unavailable witness read.
 const fundingCovered=funding!==null&&funding>=total||required===0n||required!==null&&funding!==null&&funding>=required;
 const remaining=required===0n?0n:required===null||funding===null?null:required>funding?required-funding:0n;
 const requirementsMet=baselineMet===false?false:fundingCovered&&baselineMet===true?true:baselineMet===null||required===null||funding===null?null:false;
 return {policyId:policy.id,originals,witnessedBreaths:breaths,retentionRate:rate,retentionMet,baselineMet,requirementsMet,
  requiredFundingUsdCents:required?.toString()??null,remainingFundingUsdCents:remaining?.toString()??null,
  originalOffsetUsdCents:originalOffset?.toString()??null,
  witnessedOffsetUsdCents:witnessed===null?null:(half*BigInt(witnessed)/breathCap).toString(),
  economyActive:false as const,settlementCreditUsdCents:'0' as const};
}
