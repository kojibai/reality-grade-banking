import {canonicalizeReceizV122,createReceizArtifactAdmissionEngine,parseReceizPortableAssetDocument,receizBase64UrlDecode,sha256ReceizBytes,validateReceizValueExecutionOutcomeV123,validateReceizValueIntentV122,digestReceizCanonicalV122,type ReceizWorldValueIntentV122,type ReceizPortableSealedArtifactV124} from '@receiz/sdk';
import {verifyReceizArtifactWithCanonicalRoots,readRuntimeCustodiedReceizArtifactCanonicalOpen} from '../../../../node_modules/@receiz/sdk/dist/artifactVerification.js';
import type {ReceizSignatureV4RootPublicKey} from '../../../../node_modules/@receiz/sdk/dist/verifier/signatureV4.js';
import {readReceizProofHistoryExactKksCoordinate} from '../../../../node_modules/@receiz/sdk/dist/proofHistory.js';
import {governanceSchema,readGovernanceTerms,type GovernanceDocument} from '../../../receiz/governance-documents';
import {projectClosedGovernanceDecision} from '../../../receiz/governance-closed-decision';
import type {GovernanceDecision} from '../../../receiz/governance-execution-plan';
import type {GovernanceRow} from '../../../receiz/governance-directory';

export type QualificationName='election'|'treasury';
type Wire=ReceizPortableSealedArtifactV124;
export type Qualification={schema:string;decision:GovernanceDecision;registerHead:string;predecessor:Wire;successor:Wire;
 sources:{schema:string;proposal:string;originals:Wire[]};roots:ReceizSignatureV4RootPublicKey[]};
const pins={
 election:'cb568d7b4bd8ef1ff59a4e55f9669dd65fc28c09851db2b6f839c6b0db5b98a3',
 treasury:'5b093c9c13765ee7cfb80b9bf1ae16b820815bd6ae73e72992f16eea92801210',
};
const same=(a:unknown,b:unknown)=>canonicalizeReceizV122(a)===canonicalizeReceizV122(b);
const fail=(message:string):never=>{throw Error(message);};

/** Isolated read-only verification of two shipped test runs. The package digest
 * pins the test key as well as all enclosing originals. This emits no custody. */
export async function verifyGovernanceQualification(name:QualificationName,bytes:Uint8Array){
 if(await sha256ReceizBytes(bytes)!==pins[name])return fail('The package differs from the selected qualification.');
 const text=new TextDecoder('utf-8',{fatal:true}),p:Qualification=JSON.parse(text.decode(bytes)),roots=new Map(p.roots.map(key=>[key.kid,key]));
 const admit=createReceizArtifactAdmissionEngine({canonicalSignatureV4RootPublicKeys:roots});
 async function open(wire:Wire){
  const exact=receizBase64UrlDecode(wire.exactBytesB64u),file=new File([new Uint8Array(exact)],wire.filename,{type:wire.mimeType});
  const verified=await verifyReceizArtifactWithCanonicalRoots(file,roots);
  if(verified.status!=='verified-artifact'||verified.artifactDigest.value!==wire.artifactSha256||verified.payloadDigest.value!==wire.payloadSha256)return fail('A signed Original failed verification.');
  const payload=await readRuntimeCustodiedReceizArtifactCanonicalOpen(verified,roots);
  if(!payload||payload.payloadMimeType!=='application/json')return fail('A public JSON Original is required.');
  return {verified,raw:text.decode(payload.payloadBytes)};
 }
 const rows:GovernanceRow[]=[];
 for(const wire of p.sources.originals){
  const {verified,raw}=await open(wire),source=JSON.parse(raw) as GovernanceDocument;
  const doc:GovernanceDocument={schema:governanceSchema,author:source.author,accountUid:source.accountUid,visibility:'public' as const,terms:readGovernanceTerms(source.terms)};
  const seal=verified.verification.bundle.nativeRecordSeal as {ownerReceizId?:unknown}|undefined;
  if(canonicalizeReceizV122(doc)!==raw||!seal||seal.ownerReceizId!==doc.author)return fail('A public document differs from its signed author or terms.');
  rows.push({digest:wire.artifactSha256,document:doc,pulse:String(verified.verification.bundle.kaiPulseEternal),profileUid:null});
 }
 const {decision,authority}=projectClosedGovernanceDecision(p.sources.proposal,rows);
 if(!same(decision,p.decision)||decision.decision.toLowerCase()!==name)return fail('The signed votes and closure differ from the reported decision.');
 async function register(wire:Wire){
  const {verified,raw}=await open(wire),entry=await admit(verified,{profile:'portable-state',ownerConstraint:authority.custodian});
  if(entry.verdict!=='bearer-recovery'||!entry.proofHistory)return fail('The native register Original failed admission.');
  const history=entry.proofHistory,portable=await parseReceizPortableAssetDocument(JSON.parse(raw));
  if(history.artifactId!==authority.registerProofObjectId||history.rootDigest!==authority.registerGenesisHead||history.currentOwnerReceizId!==authority.custodian||history.terminal||history.headDigests.length!==1)return fail('The register differs from the charter’s ratified source.');
  return {history,portable};
 }
 const before=await register(p.predecessor),after=await register(p.successor);
 const heads=after.history.headDigests,last=after.history.nodes.find(node=>node.nodeDigest===heads[0]),append=after.portable.provenance.appends.at(-1);
 if(before.history.nodes.length!==1||before.history.headDigests[0]!==authority.registerGenesisHead||after.history.nodes.length!==2||
    !last||!same(last.parentDigests,before.history.headDigests)||heads[0]!==p.registerHead||!after.history.nodes.some(node=>same(node,before.history.nodes[0]))||
    before.portable.provenance.appends.length!==0||after.portable.provenance.appends.length!==1||append?.schema!=='bankeiz.governance.register-append.v1'||!same(append.decision,decision))
    return fail('The register does not carry the expected successor and certified decision.');
 const coordinate=await readReceizProofHistoryExactKksCoordinate(last);
 if(!coordinate||BigInt(coordinate.kaiPulse)<BigInt(decision.closedAtKai))return fail('The independently verified register pulse precedes closure.');
 return {decision,registerHead:heads[0],registerGenesisHead:authority.registerGenesisHead,sourceCount:rows.length,registerPulse:coordinate.kaiPulse};
}

export type TestPosition={phase:'before'|'after';subjectId:string;proofObjectId:string;owner:string;head:string;balancePhiMicro:string};
export async function verifyQualificationSettlement(decision:GovernanceDecision,quoteBytes:Uint8Array,storageBytes:Uint8Array){
 if(await sha256ReceizBytes(quoteBytes)!=='2b0da2805db69f8b3034048e5c3ebcf217ae1c76ba4d0cc2e79e73a09b2e8023'||
   await sha256ReceizBytes(storageBytes)!=='2adde1abb23d1d6e462220611b8a8d292e6374e69c6009921ad11808e86ca3cd')return fail('The Settlement evidence differs from the qualified fixture.');
 if(!decision.approved||!decision.payment)return fail('The signed governance decision does not authorize a payment.');
 const text=new TextDecoder('utf-8',{fatal:true}),storage=JSON.parse(text.decode(storageBytes)) as {positions:TestPosition[];initialDestination:string;outcome:unknown};
 const intent=JSON.parse(text.decode(quoteBytes)) as ReceizWorldValueIntentV122,result=await validateReceizValueExecutionOutcomeV123(storage.outcome);
 const {budgetId,installment,...transfer}=decision.payment;
 const key='governance.installment:'+await digestReceizCanonicalV122({charter:decision.charter,budgetId,installment});
 if(!await validateReceizValueIntentV122(intent)||intent.idempotencyKey!==key||result.status!=='committed'||result.rail!=='settlement'||!same(result.intent,intent)||
    !Object.entries(transfer).every(([field,value])=>intent[field as keyof typeof intent]===value))return fail('The native receipt differs from the approved installment.');
 const sender=storage.positions.find(row=>row.phase==='before'&&row.proofObjectId===intent.sourceProofObjectId),debit=storage.positions.find(row=>row.phase==='after'&&row.proofObjectId===intent.sourceProofObjectId),credit=storage.positions.find(row=>row.phase==='after'&&row.subjectId===intent.destinationSubjectId);
 if(!sender||!debit||!credit||sender.head!==intent.sourceValueHead||debit.head!==result.sourceHead||credit.head!==result.destinationHead||
   BigInt(sender.balancePhiMicro)-BigInt(debit.balancePhiMicro)!==BigInt(intent.amountPhiMicro)||storage.initialDestination!=='No prior Settlement position'||
   BigInt(credit.balancePhiMicro)!==BigInt(intent.amountPhiMicro))return fail('The fixture balances differ from the recorded debit and credit.');
 return {receiptDigest:result.receipt.receiptDigest,senderBefore:sender.balancePhiMicro,senderAfter:debit.balancePhiMicro,recipientAfter:credit.balancePhiMicro,
  sourceHead:result.sourceHead,destinationHead:result.destinationHead,edgeRecoverySupplied:false};
}
