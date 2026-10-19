import type {PublicRecord} from './public-network';
import type {ProofInspection} from './proof-inspection';
import {admittedProofInspection} from './proof-inspection';
import {ledgerFundingTrace,type LedgerFundingTrace,type LedgerCausalStep} from './ledger-funding-trace';
import {ledgerProofHistorySteps} from './ledger-proof-history';
const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const text=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=512;
const hash=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/i.test(v);
const cached=new WeakMap<ProofInspection,WeakMap<PublicRecord,LedgerFundingTrace|null>>();
/** Observe only a canonically inspected, digest-matched original already held
 * by the shared reader. This function cannot fetch or admit a financial source. */
export function ledgerInspectedProvenance(record:PublicRecord,report:ProofInspection|undefined):LedgerFundingTrace|null{
 if(!report||!admittedProofInspection(report)||report.artifactSha256!==record.evidence.artifactDigest?.toLowerCase())return null;
 let records=cached.get(report);if(!records){records=new WeakMap();cached.set(report,records);}if(records.has(record))return records.get(record)!;
 const finish=(value:LedgerFundingTrace|null)=>{records!.set(record,value);return value;};
 if(report.causalLineage){const trace=ledgerFundingTrace({...record,details:{...record.details,causalLineage:report.causalLineage as unknown as NonNullable<PublicRecord['details']>}});if(trace.basis==='native-causal-history')return finish(trace);}
 if(report.proofHistory){
  // The canonical original's digest binds its carried artifact ID even when
  // a listing uses a separate public showcase ID for the same original.
  const bound={...record,valueOperands:{...record.valueOperands,assetId:report.proofHistory.artifactId,objectId:report.proofHistory.artifactId},evidence:{...record.evidence,objectId:report.proofHistory.artifactId},details:{...record.details,proofHistory:report.proofHistory as unknown as NonNullable<PublicRecord['details']>}};
  const steps=ledgerProofHistorySteps(bound);if(steps?.length)return finish({valueOrigins:ledgerFundingTrace(record).valueOrigins,basis:'proof-object-history',boundary:'source-origins',sources:steps.filter(step=>step.kind==='proof_genesis'),steps,components:ledgerFundingTrace(record).components,proofHash:report.proofHistory.historyDigest,sourceSchema:report.proofHistory.schema});
 }
 const bundle=object(report.verification.bundle),continuity=object(object(bundle.nativeRecordSeal).ownershipContinuity),history=continuity.history;
 if(continuity.schema!=='receiz.native_ownership_continuity.v1'||!text(continuity.artifactId)||!hash(continuity.historyDigestSha256)||!Array.isArray(history)||!history.length||history.length>10000)return finish(null);
 const steps:LedgerCausalStep[]=[];let previous:string|undefined,owner:string|undefined;
 for(const [index,input]of history.entries()){
  const row=object(input),genesis=index===0;
  if(row.index!==index||row.schema!==(genesis?'receiz.native_ownership_genesis.v1':'receiz.native_ownership_transfer.v1')||!text(row.headReference)||!hash(row.historyDigestSha256)||genesis&&!text(row.ownerReceizId)||!genesis&&(row.priorHeadReference!==previous||row.fromOwnerReceizId!==owner||!text(row.toOwnerReceizId)||!hash(row.sourceArtifactSha256)))return finish(null);
  const next=String(genesis?row.ownerReceizId:row.toOwnerReceizId);
  steps.push({id:row.historyDigestSha256,kind:genesis?'proof_genesis':'ownership.transition',label:genesis?'Sealed proof origin':'Ownership transition',detail:genesis?`Genesis owner · ${next}`:`${owner} → ${next}`,sourceId:continuity.artifactId,...(!genesis?{sourceHash:String(row.sourceArtifactSha256)}:{}),headReference:row.headReference,...(previous?{priorHeadReference:previous}:{}),...(genesis&&typeof bundle.kaiPulseEternal==='string'?{kaiPulse:bundle.kaiPulseEternal}:{})});previous=row.headReference;owner=next;
 }
 if(previous!==continuity.headReference||owner!==continuity.ownerReceizId||steps.at(-1)?.id!==continuity.historyDigestSha256)return finish(null);
 return finish({valueOrigins:ledgerFundingTrace(record).valueOrigins,basis:'proof-object-history',boundary:steps.length>1?'undated-source-history':'source-origins',steps,sources:steps.slice(0,1),components:ledgerFundingTrace(record).components,sourceSchema:String(continuity.schema),proofHash:continuity.historyDigestSha256});
}
