import {admitReceizProfileShowcaseSuccessorWithExactPredecessorContext,admitReceizProfileShowcaseSuccessorWithPredecessorContext,createReceizArtifactAdmissionEngine,
 inspectReceizBoundedProfileShowcaseV114,readReceizBoundedProfileShowcaseInspectionCarrier,rederiveReceizBoundedProfileShowcaseCarrierFromAdmission} from '../../../../packages/receiz-sdk/src/artifactAdmission';
import {verifyReceizArtifactWithCanonicalRoots} from '../../../../packages/receiz-sdk/src/artifactVerification';
import {receizCurrentPinnedSignatureV4Roots} from '../../../../packages/receiz-sdk/src/verifier/roots';
import {createReceizProfileShowcasePersistentMemoryStoreV114} from '../../../../packages/receiz-sdk/src/profileShowcasePersistentState';
import {reconstructExactByteBlocks,type ExactByteBlockResolver} from '../../transport/exactByteBlocks';
import {readProfileShowcaseAppendTransport,readProfileShowcaseCarrierTransport,type ProfileShowcaseAppendTransport} from './completeSourceTransport';
import type {ReceizSignatureV4RootPublicKey} from '../../../../packages/receiz-sdk/src/verifier/signatureV4';

/** Current append context only. Historical Original bodies and vault restore are
 * absent. SDK exact-predecessor admission remains the authority for the head. */
async function admitCompleteAppendTransport(input:{context:ProfileShowcaseAppendTransport;
 artifactId:string;resolveBlock:ExactByteBlockResolver;roots?:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>}){
 const roots=input.roots??receizCurrentPinnedSignatureV4Roots(),owner=input.artifactId.slice('profile-showcase:'.length);
 const file=(bytes:Uint8Array)=>new File([bytes.slice().buffer as ArrayBuffer],'source.receizbundle',{type:'application/vnd.receiz.bundle+json'});
 const inspect=async(bytes:Uint8Array)=>{
  const artifact=file(bytes),verification=await verifyReceizArtifactWithCanonicalRoots(artifact,roots);
  const inspection=await inspectReceizBoundedProfileShowcaseV114({verification,ownerConstraint:owner,dependencies:{canonicalSignatureV4RootPublicKeys:roots}});
  const carrier=readReceizBoundedProfileShowcaseInspectionCarrier(inspection);
  if(carrier.artifactId!==input.artifactId)throw TypeError('PROFILE_SHOWCASE_PREDECESSOR_IDENTITY_MISMATCH');
  return {artifact,verification,carrier,digest:inspection.artifactSha256};
 };
 const current=await inspect(input.context.exactSealedArtifactBytes);
 if(current.digest!==input.context.transport.artifactDigest)throw TypeError('PROFILE_SHOWCASE_COMPLETE_TRANSPORT_INVALID');
 const headers=new Map([[current.digest,current]]);let next=0;
 // Header context is independent immutable transport. Never request any child
 // or imported media body, and never stage historical heads through the vault.
 const readers=await Promise.allSettled(Array.from({length:Math.min(8,input.context.ancestry.length)},async()=>{
  for(;;){const index=next++;if(index>=input.context.ancestry.length)return;
   const descriptor=input.context.ancestry[index]!;
   const bytes=await reconstructExactByteBlocks(descriptor.bytes,input.resolveBlock,{component:'append predecessor header',maxContentBytes:64*1024*1024,maxBlockReads:131072});
   const header=await inspect(bytes);if(header.digest!==descriptor.artifactDigest)throw TypeError('PROFILE_SHOWCASE_COMPLETE_TRANSPORT_ANCESTRY_DIGEST_MISMATCH');headers.set(header.digest,header);
  }
 }));for(const reader of readers)if(reader.status==='rejected')throw reader.reason;
 // Retain only the exact causal count→digest index after admission. Old
 // verification results and carrier byte buffers are not a permanent cache.
 const lineage=new Map<number,string>(),seen=new Set<string>();let cursor:string|undefined=current.digest;
 while(cursor){
  if(seen.has(cursor))throw TypeError('PROFILE_SHOWCASE_PREDECESSOR_CONTEXT_REQUIRED');seen.add(cursor);
  const header=headers.get(cursor);if(!header)throw TypeError('PROFILE_SHOWCASE_PREDECESSOR_CONTEXT_REQUIRED');
  const count=Number(header.carrier['profile-showcase'].resultingOperationCount);
  if(lineage.has(count))throw TypeError('PROFILE_SHOWCASE_EXACT_PREDECESSOR_HISTORY_INVALID');lineage.set(count,cursor);
  const parents=header.carrier.receizProofHistory.parentRefs;
  if(parents.length>1)throw TypeError('PROFILE_SHOWCASE_PREDECESSOR_CONTEXT_REQUIRED');
  const parent=parents[0];if(!parent)break;
  const prior=headers.get(parent.artifactDigest);
  if(!prior||parent.nodeDigest!==prior.carrier.receizProofHistory.currentNode.nodeDigest
   ||parent.nodeCount!==prior.carrier.receizProofHistory.nodeCount||parent.accumulatorRoot!==prior.carrier.receizProofHistory.accumulator.root)throw TypeError('PROFILE_SHOWCASE_EXACT_PREDECESSOR_HISTORY_INVALID');
  cursor=parent.artifactDigest;
 }
 const historical=(count:number)=>lineage.get(count)??null;
 const parents=current.carrier.receizProofHistory.parentRefs;
 if(parents.length>1)throw TypeError('PROFILE_SHOWCASE_PREDECESSOR_CONTEXT_REQUIRED');
 const parent=parents[0]?headers.get(parents[0].artifactDigest):null;
 if(parents.length&&!parent)throw TypeError('PROFILE_SHOWCASE_PREDECESSOR_CONTEXT_REQUIRED');
 const admission=parent?await admitReceizProfileShowcaseSuccessorWithExactPredecessorContext({predecessorArtifact:parent.artifact,
  candidateArtifact:current.artifact,predecessorHistoryNode:parent.carrier.receizProofHistory.currentNode,
  resolveVerifiedHistoricalArtifactDigest:historical,canonicalSignatureV4RootPublicKeys:roots})
  :await createReceizArtifactAdmissionEngine({canonicalSignatureV4RootPublicKeys:roots})(current.verification,{profile:'profile-showcase',ownerConstraint:owner});
 if(admission.profile!=='profile-showcase'||admission.verdict!=='bearer-recovery')throw TypeError('PROFILE_SHOWCASE_PREDECESSOR_CUSTODY_REQUIRED');
 const io=createReceizProfileShowcasePersistentMemoryStoreV114();
 for(const node of input.context.witnessNodes)await io.writeNode(node);
 return {admission,carrier:current.carrier,io,resolveHistorical:historical};
}

/** A new device follows exact carrier coordinates back to its complete prefix.
 * Reuse that prefix's SDK admission and node custody, then admit only the sparse
 * successors. No historical child payload or imported media is reopened. */
export async function admitProfileShowcaseAppendTransport(input:{context:ProfileShowcaseAppendTransport|Awaited<ReturnType<typeof readProfileShowcaseCarrierTransport>>;
 artifactId:string;resolveBlock:ExactByteBlockResolver;roots?:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>;
 predecessorTransports?:readonly import('./completeSourceTransport').ProfileShowcaseCompleteSourceTransport[]}){
 if('children'in input.context)return admitCompleteAppendTransport({...input,context:input.context});
 const suffix:Awaited<ReturnType<typeof readProfileShowcaseCarrierTransport>>[]=[],seen=new Set<string>();
 let cursor=input.context;
 while(cursor.singleTransition){
  if(seen.has(cursor.transport.artifactDigest))throw TypeError('PROFILE_SHOWCASE_PREDECESSOR_CONTEXT_REQUIRED');
  let predecessor=cursor.predecessor;
  if(!predecessor&&input.predecessorTransports?.length){
   // Older saved actions did not carry a wire parent. Header metadata only
   // locates the exact parent named by this canonically inspected artifact.
   const roots=input.roots??receizCurrentPinnedSignatureV4Roots(),artifact=new File([cursor.exactSealedArtifactBytes.slice().buffer as ArrayBuffer],'source.receizbundle',{type:'application/vnd.receiz.bundle+json'});
   const inspected=await inspectReceizBoundedProfileShowcaseV114({verification:await verifyReceizArtifactWithCanonicalRoots(artifact,roots),ownerConstraint:input.artifactId.slice('profile-showcase:'.length),dependencies:{canonicalSignatureV4RootPublicKeys:roots}});
   const carrier=readReceizBoundedProfileShowcaseInspectionCarrier(inspected);
   if(inspected.artifactSha256!==cursor.transport.artifactDigest||carrier.artifactId!==input.artifactId)throw TypeError('PROFILE_SHOWCASE_PREDECESSOR_IDENTITY_MISMATCH');
   if(carrier.receizProofHistory.parentRefs.length===1)predecessor=input.predecessorTransports.find(value=>value.artifactDigest===carrier.receizProofHistory.parentRefs[0]!.artifactDigest);
  }
  if(!predecessor)throw TypeError('PROFILE_SHOWCASE_PREDECESSOR_CONTEXT_REQUIRED');
  seen.add(cursor.transport.artifactDigest);suffix.push(cursor);
  cursor=await readProfileShowcaseCarrierTransport(predecessor,input.resolveBlock);
 }
 if(seen.has(cursor.transport.artifactDigest))throw TypeError('PROFILE_SHOWCASE_PREDECESSOR_CONTEXT_REQUIRED');
 const context=await readProfileShowcaseAppendTransport(cursor.transport,input.resolveBlock);
 if(context.envelope.legacyPredecessor||context.envelope.checkpointBoundary)throw TypeError('PROFILE_SHOWCASE_PREDECESSOR_CONTEXT_REQUIRED');
 const prefix=await admitCompleteAppendTransport({...input,context}),lineage=new Map<number,string>();
 const resolveHistorical=(count:number)=>lineage.get(count)??prefix.resolveHistorical(count);
 let {admission,carrier}=prefix;
 for(const current of suffix.reverse()){
  const artifact=new File([current.exactSealedArtifactBytes.slice().buffer as ArrayBuffer],'source.receizbundle',{type:'application/vnd.receiz.bundle+json'});
  admission=await admitReceizProfileShowcaseSuccessorWithPredecessorContext({predecessorAdmission:admission,candidateArtifact:{artifact},resolveVerifiedHistoricalArtifactDigest:resolveHistorical});
  if(admission.artifactSha256!==current.transport.artifactDigest)throw TypeError('PROFILE_SHOWCASE_COMPLETE_TRANSPORT_INVALID');
  carrier=await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(admission);
  if(carrier.artifactId!==input.artifactId)throw TypeError('PROFILE_SHOWCASE_PREDECESSOR_IDENTITY_MISMATCH');
  const head=carrier['profile-showcase'];
  for(const node of head.firstPaintWitnessNodes)await prefix.io.writeNode(node);
  for(const node of head.stateTransitionWitnessNodes)await prefix.io.writeNode(node);
  lineage.set(Number(head.resultingOperationCount),admission.artifactSha256);
 }
 return{admission,carrier,io:prefix.io,resolveHistorical};
}
