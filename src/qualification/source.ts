import {calculateQualification,type QualificationInput,ORIGINALS_QUALIFICATION_POLICY as policy} from './policy';
export type QualificationSnapshot=QualificationInput&{
 schema:'bankeiz.originals-qualification-snapshot.v1';policyId:string;accountUid:string;username:string;
 source:{accountHead:string;historyHead:string;showcaseHead:string|null};
 sourceOriginals:{id:string;commitment:string;pbiReceiptHash:string;pbiArtifactSha256:string}[];
 fundingRoots:{checkoutSessionId:string;amountUsdCents:string;sourceSha256:string;kind:string}[];
 witnesses:{id:string;seconds:number;starts:number;retained:number}[]|null;
 membershipComplete:boolean;witnessComplete:boolean;economyActive:false;settlementCreditUsdCents:'0';
};
export const QUALIFICATION_ACTION='originals.qualification.accepted' as const;
export const qualificationKey=(uid:string)=>`originals.qualification:${uid}:${policy.id}`;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const hex=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const cents=(v:unknown):v is string=>typeof v==='string'&&/^(0|[1-9]\d{0,39})$/.test(v);
/** Closed projection contract underneath the enclosing accepted account activity.
 * A matching object or hash alone never admits a qualification. */
export function validateQualificationSnapshot(v:unknown):v is QualificationSnapshot{
 try{
  if(!object(v)||v.schema!=='bankeiz.originals-qualification-snapshot.v1'||v.policyId!==policy.id||typeof v.accountUid!=='string'||!v.accountUid||typeof v.username!=='string'||!/^[a-z0-9_]{3,24}$/.test(v.username)||v.economyActive!==false||v.settlementCreditUsdCents!=='0'||!object(v.source)||!hex(v.source.accountHead)||!hex(v.source.historyHead)||v.source.showcaseHead!==null&&!hex(v.source.showcaseHead)||typeof v.membershipComplete!=='boolean'||typeof v.witnessComplete!=='boolean'||!object(v.baseline)||Object.keys(v.baseline).sort().join()!=='avatar,header,pbi,threeOriginals,verifiedOriginal'||Object.values(v.baseline).some(x=>x!==true&&x!==false&&x!==null)||!Array.isArray(v.sourceOriginals)||!Array.isArray(v.fundingRoots))return false;
  const ids=new Set(),payloads=new Set();
  for(const original of v.sourceOriginals){if(!object(original)||typeof original.id!=='string'||!original.id||original.id.length>512||!hex(original.commitment)||!hex(original.pbiReceiptHash)||!hex(original.pbiArtifactSha256)||ids.has(original.id)||payloads.has(original.commitment))return false;ids.add(original.id);payloads.add(original.commitment);}
  if(v.membershipComplete?v.originals!==ids.size:v.originals!==null)return false;
  if(v.sourceOriginals.length&&!hex(v.source.showcaseHead))return false;
  if(v.witnessComplete?(!v.membershipComplete||v.witnessedBreaths===null||v.retention===null):(v.witnessedBreaths!==null||v.retention!==null))return false;
  if(v.baseline.threeOriginals!==(v.membershipComplete?ids.size>=3:null)||v.baseline.verifiedOriginal!==(v.membershipComplete?ids.size>0:null))return false;
  if(v.witnessComplete){
   if(!Array.isArray(v.witnesses)||v.witnesses.length!==ids.size)return false;
   let seconds=0,starts=0,retained=0;
   for(let i=0;i<v.witnesses.length;i++){
    const row=v.witnesses[i];
    if(!object(row)||row.id!==v.sourceOriginals[i].id||['seconds','starts','retained'].some(k=>typeof row[k]!=='number'||!Number.isFinite(row[k])||(row[k] as number)<0))return false;
    seconds+=row.seconds as number;starts+=row.starts as number;retained+=row.retained as number;
   }
   if(v.witnessedBreaths!==Math.floor(seconds/5.236)||!object(v.retention)||v.retention.starts!==starts||v.retention.retained!==retained)return false;
  }else if(v.witnesses!==null)return false;
  const payments=new Set();let total=0n;
  for(const root of v.fundingRoots){if(!object(root)||typeof root.checkoutSessionId!=='string'||!/^cs_[A-Za-z0-9_]{8,200}$/.test(root.checkoutSessionId)||payments.has(root.checkoutSessionId)||!cents(root.amountUsdCents)||BigInt(root.amountUsdCents)<=0n||!hex(root.sourceSha256)||typeof root.kind!=='string'||!root.kind)return false;payments.add(root.checkoutSessionId);total+=BigInt(root.amountUsdCents);}
  if(v.fundingUsdCents===null?v.fundingRoots.length!==0:!cents(v.fundingUsdCents)||BigInt(v.fundingUsdCents)!==total)return false;
  calculateQualification(v as QualificationSnapshot);return true;
 }catch{return false;}
}
/** Current account gate. Historical v1 snapshots above remain replayable. */
export const ORIGINALS_EARNING_POLICY='bankeiz.public-pbi-original.v1' as const;
export type QualifiedProgress={
 schema:'bankeiz.originals-earning.v1';policyId:typeof ORIGINALS_EARNING_POLICY;accountUid:string;username:string|null;
 source:{accountHead:string;historyHead:string;showcaseHead:string|null};
 sourceOriginals:{id:string;commitment:string;pbiReceiptHash:string;pbiArtifactSha256:string}[];
 originals:number|null;membershipComplete:boolean;economyActive:boolean;earningEnabled:boolean;settlementCreditUsdCents:'0';
 acceptance:{status:'qualifying'|'qualified';entryId:string|null;entryHash:string|null};
};
/** This validates the authenticated projection; it does not replace its enclosing
 * sealed account activity or verify an Original from a counter or display badge. */
export function parseQualificationProgress(input:unknown,uid:string):QualifiedProgress{
 if(!object(input)||input.ok!==true||!object(input.qualification))throw Error('QUALIFICATION_SOURCE_INVALID');
 const q=input.qualification;
 if(q.accountUid!==uid)throw Error('QUALIFICATION_ACCOUNT_MISMATCH');
 if(q.schema!=='bankeiz.originals-earning.v1'||q.policyId!==ORIGINALS_EARNING_POLICY||q.settlementCreditUsdCents!=='0'||q.username!==null&&(typeof q.username!=='string'||!/^[a-z0-9_]{3,24}$/.test(q.username))||!object(q.source)||!hex(q.source.accountHead)||!hex(q.source.historyHead)||q.source.showcaseHead!==null&&!hex(q.source.showcaseHead)||typeof q.membershipComplete!=='boolean'||!Array.isArray(q.sourceOriginals)||q.sourceOriginals.length>1||!object(q.acceptance))throw Error('QUALIFICATION_SOURCE_INVALID');
 for(const original of q.sourceOriginals){if(!object(original)||typeof original.id!=='string'||!original.id||original.id.length>512||!hex(original.commitment)||!hex(original.pbiReceiptHash)||!hex(original.pbiArtifactSha256)||!hex(q.source.showcaseHead)||!q.username)throw Error('QUALIFICATION_SOURCE_INVALID');}
 if(q.membershipComplete?(typeof q.originals!=='number'||!Number.isSafeInteger(q.originals)||q.originals<q.sourceOriginals.length||q.originals>0&&q.sourceOriginals.length===0):q.originals!==null)throw Error('QUALIFICATION_SOURCE_INVALID');
 const accepted=q.acceptance;
 if(q.economyActive!==(accepted.status==='qualified')||q.earningEnabled!==(accepted.status==='qualified'))throw Error('QUALIFICATION_EARNING_GATE_INVALID');
 if(accepted.status==='qualified'?(!hex(accepted.entryHash)||typeof accepted.entryId!=='string'||!accepted.entryId||q.sourceOriginals.length!==1):(accepted.status!=='qualifying'||accepted.entryHash!==null||accepted.entryId!==null))throw Error('QUALIFICATION_ACCEPTANCE_INVALID');
 return structuredClone(q) as unknown as QualifiedProgress;
}
export function createQualificationProgressReader(uid:string,request:()=>Promise<unknown>,current:()=>boolean=()=>true,initial:QualifiedProgress|null=null){
 let held=initial,pending:Promise<QualifiedProgress>|undefined;
 return {known:()=>held,read(){return pending??=(async()=>{
  if(!current())throw Error('QUALIFICATION_ACCOUNT_CLOSED');
  const next=parseQualificationProgress(await request(),uid);
  if(!current())throw Error('QUALIFICATION_ACCOUNT_CLOSED');
  // Accepted sealed history survives a later locator outage or partial observation.
  if(held?.acceptance.status==='qualified')return held;
  if(held?.membershipComplete&&!next.membershipComplete&&next.acceptance.status!=='qualified')throw Error('QUALIFICATION_SOURCE_INCOMPLETE');
  held=next;return next;
 })().finally(()=>{pending=undefined;});}};
}
