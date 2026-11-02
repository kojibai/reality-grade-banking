"use client";
import {readReceizIdentityPublicBinding,admitReceizProfileShowcaseSuccessorWithPredecessorContext,createReceizArtifactAdmissionEngine,rederiveReceizBoundedProfileShowcaseCarrierFromAdmission} from '../../../../packages/receiz-sdk/src/artifactAdmission';
import {verifyReceizArtifact} from '../../../../packages/receiz-sdk/src/artifactVerification';
import {createReceizBrowserAdmissionStore} from '../../../../packages/receiz-sdk/src/browserAdmissionStore';
import {readImportedSourceTransportReference} from './importedSourceProjection';
import {jcsCanonicalize} from '../../../utils/jcs';
import type {ReceizKeyFile,ReceizVerifiedIdentityArtifactAdmission} from '../../../../packages/receiz-sdk/src/index';
import {deriveReceizProfileShowcasePersistentMembershipV114} from '../../../../packages/receiz-sdk/src/profileShowcasePersistentState';
import {createReceizBrowserArtifactTransitionStore} from './browserTransitionStore';
import {createProfileShowcaseAppendAuthority} from './authorityProvider';
import {sealCommitAndReadmitBoundedProfileShowcaseTransition} from './boundedTransitionPublication';
import {readProfileShowcaseAppendTransport,writeProfileShowcaseAppendTransport,type ProfileShowcaseAppendTransport} from './completeSourceTransport';
import {admitProfileShowcaseAppendTransport} from './appendTransportAdmission';
import {publishProfileShowcaseTransport,type ProfileShowcasePublicProjectionPublicationResult} from './publicProjectionPublication';
import {createImportedProofSourceCustody} from './importedSourceCustody.client';
import {sealAndAdmitImportedSourcePlacement} from './importedSourcePlacement.client';
import {readExactByteBlocks,reconstructExactByteBlocks,type ExactByteBlockReference,type ExactByteBlockWriter} from '../../transport/exactByteBlocks';
import {readLocalSignedActionOutbox,enqueueSourceBoundPublicationAction} from '../../offline/localSignedActionOutbox';
import type {OpenedImportedProofSource,ImportedProofSourceReference} from './importedSource';
import type {ProfileShowcaseArtifactId} from './types';
import type {ProfileShowcaseBoundedEdgeVault} from './boundedEdgeVault';
import type {receizeDocumentBytesClient} from '../../documentSeal/receizeDocumentBytesClient';

/** Extends the existing sealed head with SDK plan/capability/commit/admission.
 * Complete v2 delivery reuses immutable old byte references. No historical
 * Original, media body or full-vault restoration is on this append path. */
export function createIncrementalAssetPublisher(input:{artifactId:ProfileShowcaseArtifactId;owner:string;username:string;uid:string;
 actorAdmission:ReceizVerifiedIdentityArtifactAdmission;keyFile:ReceizKeyFile;passphrase:string;
 sealDocument:typeof receizeDocumentBytesClient;childSealer:Parameters<typeof sealAndAdmitImportedSourcePlacement>[0]['seal'];
 fetchImpl:typeof fetch;assertCurrent():void;readAccepted(refresh?:boolean):Promise<unknown>;vault:ProfileShowcaseBoundedEdgeVault}){
 const custody=createImportedProofSourceCustody();let accepted:unknown;const heldBlocks=new Map<string,Promise<Uint8Array>>();
 const published=new Map<string,ProfileShowcasePublicProjectionPublicationResult>();
 let heldHead:{context:ProfileShowcaseAppendTransport;prior:Awaited<ReturnType<typeof admitProfileShowcaseAppendTransport>>}|undefined;
 const resolve=async(ref:ExactByteBlockReference)=>{
  input.assertCurrent();let held=heldBlocks.get(ref.sha256);if(held)return held;
  held=(async()=>{try{return await custody.resolveBlock(ref);}catch(error){if(!(error instanceof Error)||error.message!=='IMPORTED_SOURCE_CUSTODY_SEGMENT_MISSING')throw error;}
   const response=await input.fetchImpl(`/api/profile/showcase/accepted-source?username=${encodeURIComponent(input.username)}&block=${encodeURIComponent(JSON.stringify(ref))}`,{credentials:'same-origin',cache:'no-store'});
   if(!response.ok)throw TypeError('PROFILE_SHOWCASE_PREDECESSOR_DELIVERY_PENDING');
   const bytes=new Uint8Array(await response.arrayBuffer());await custody.writeBlock(ref,bytes);input.assertCurrent();return bytes;
  })();heldBlocks.set(ref.sha256,held);try{return await held;}catch(error){heldBlocks.delete(ref.sha256);throw error;}
 };
 const scope=(artifactDigest:string)=>({publicationVersion:2 as const,ownerReceizId:input.owner,artifactId:input.artifactId,
  artifactDigest,username:input.username,profileIdentity:input.uid});
 const identity=()=>({actorAdmission:input.actorAdmission,keyFile:input.keyFile,passphrase:input.passphrase});
 const actor=async()=>{const binding=await readReceizIdentityPublicBinding(input.actorAdmission);return{binding,custody:{keyFile:input.keyFile,passphrase:input.passphrase,
  actor:{uid:input.uid,email:null,username:input.username,displayName:null,receizKeyId:binding.keyId,publicKeyRawB64u:binding.publicKeyRawB64u,localUid:input.actorAdmission.actor.actorId}}};};
 const validAccepted=(value:any)=>value?.status==='accepted'&&value.artifactId===input.artifactId&&value.binding?.username===input.username
  &&value.binding.profileIdentity===input.uid&&value.binding.locator?.acceptedArtifactDigest===value.transport?.artifactDigest;
 const databaseName='receiz-profile-showcase-local-transition-v1';
 const commitDomain={scheme:'receiz-commit-domain.v1' as const,value:`profile-showcase:${input.owner}:local`};
 const readCommit=(predecessor:string)=>createReceizBrowserAdmissionStore({databaseName,namespace:`profile-showcase-local:${predecessor}`})
  .readAggregate(`${commitDomain.value}\u0000${input.artifactId}`);
 const readPreparedAction=async(reference:ImportedProofSourceReference)=>{
  for(const entry of Object.values(readLocalSignedActionOutbox().entries)){
   if(entry.envelope.actor.uid!==input.uid||entry.envelope.actor.receizKeyId!==input.keyFile.keyId||entry.envelope.request.path!=='/api/profile/showcase/publication')continue;
   let body;try{body=JSON.parse(entry.envelope.request.bodyReplayText??'');}catch{continue;}
   if(body.action!=='finalize'||body.publicationSourceArtifactSha256!==reference.artifactSha256||body.scope?.profileIdentity!==input.uid
    ||body.scope.username!==input.username||body.scope.artifactId!==input.artifactId||! /^[a-f0-9]{64}$/.test(body.publicationPredecessorArtifactDigest??''))continue;
   const committed=await readCommit(body.publicationPredecessorArtifactDigest);
   // Outbox entries may be prepared before commit. Never send a staged-only
   // candidate. The store is a locator; exact SDK admission below is authority.
   if((committed?.state as any)?.artifactDigest!==body.scope.artifactDigest)continue;
   const context=await readProfileShowcaseAppendTransport(body.transport,custody.resolveBlock);
   const prior=await admitProfileShowcaseAppendTransport({context,artifactId:input.artifactId,resolveBlock:resolve});
   if(prior.admission.artifactSha256!==body.scope.artifactDigest||committed?.headDigest!==prior.admission.proofHistoryHead?.headDigest)throw TypeError('PROFILE_SHOWCASE_PREPARED_COMMIT_MISMATCH');
   const child=context.children.find(child=>child.reference.childArtifactDigest===body.publicationChildArtifactDigest);
   const head=prior.carrier['profile-showcase'];
   const membership=await deriveReceizProfileShowcasePersistentMembershipV114({state:{schema:'receiz.profile-showcase.persistent-state.v114',placementRoot:head.placementRoot as string,
    orderRoot:head.orderRoot as string,counts:head.counts as any,maximumKaiUpulse:head.headKaiUpulse as string},io:prior.io});
   if(!child||!membership.placements.some(member=>jcsCanonicalize(member.reference)===jcsCanonicalize(child.reference)))throw TypeError('PROFILE_SHOWCASE_PREPARED_CHILD_REQUIRED');
   const bytes=await reconstructExactByteBlocks(child.bytes,custody.resolveBlock,{component:'prepared child',maxContentBytes:64*1024*1024,maxBlockReads:131072});
   const admitted=await createReceizArtifactAdmissionEngine()(await verifyReceizArtifact(new File([bytes.slice().buffer as ArrayBuffer],'child.receizbundle')),{profile:'portable-state',ownerConstraint:input.owner});
   if(admitted.profile!=='portable-state'||admitted.artifactSha256!==child.reference.childArtifactDigest
    ||admitted.artifactId!==child.reference.stableChildArtifactId||admitted.payloadSha256!==child.reference.contentDigest
    ||jcsCanonicalize(await readImportedSourceTransportReference(bytes))!==jcsCanonicalize(reference))throw TypeError('PROFILE_SHOWCASE_PREPARED_SOURCE_MISMATCH');
   input.assertCurrent();return{body,context,prior};
  }return null;
 };
 const emitTree=async(ref:ExactByteBlockReference,write:ExactByteBlockWriter)=>{
  for await(const _ of readExactByteBlocks(ref,async node=>{const bytes=await custody.resolveBlock(node);await write(node,bytes);return bytes;},{component:'prepared append transport',maxContentBytes:512*1024*1024,maxBlockReads:131072})){/* Existing byte-tree decoder verifies every exact block. */}
 };
 const emitPrepared=async(context:ProfileShowcaseAppendTransport,childDigest:string,reference:ImportedProofSourceReference,write:ExactByteBlockWriter)=>{
  await custody.exportBlocks(reference,write);
  const child=context.children.find(child=>child.reference.childArtifactDigest===childDigest);if(!child)throw TypeError('PROFILE_SHOWCASE_PREPARED_CHILD_REQUIRED');
  for(const ref of [context.transport.root,context.envelope.carrier,context.envelope.nodes,context.envelope.children,context.envelope.ancestry,child.bytes])if(ref)await emitTree(ref as ExactByteBlockReference,write);
 };
 const deliverPrepared=async(body:any,prepared:ProfileShowcaseAppendTransport,reference:ImportedProofSourceReference)=>{
  const result=await publishProfileShowcaseTransport(body.scope.artifactDigest,input.owner,input.fetchImpl,input.username,body.scope,
   ()=>{input.assertCurrent();return{username:input.username,profileIdentity:input.uid};},async()=>identity(),async()=> 'unavailable',async write=>{
    await emitPrepared(prepared,body.publicationChildArtifactDigest,reference,write);return body.transport;
   },{publicationSourceArtifactSha256:reference.artifactSha256,publicationChildArtifactDigest:body.publicationChildArtifactDigest,publicationPredecessorArtifactDigest:body.publicationPredecessorArtifactDigest});
  if(result.status==='published'){heldHead=undefined;published.set(reference.artifactSha256,result);accepted={status:'accepted',artifactId:input.artifactId,transport:body.transport,
   binding:{username:input.username,profileIdentity:input.uid,locator:{acceptedArtifactDigest:body.transport.artifactDigest}}};}
  return result;
 };
 return {async publish(opened:{source:OpenedImportedProofSource;reference:ImportedProofSourceReference}):Promise<ProfileShowcasePublicProjectionPublicationResult|null>{
  input.assertCurrent();
  const known=published.get(opened.reference.artifactSha256);if(known)return known;
  const replay=await readPreparedAction(opened.reference);
  if(replay){
   const {body,context:prepared}=replay;
   // Replay transport only: the saved signature and unchanged server verifier
   // still govern acceptance. No persisted projection is promoted to proof.
   return deliverPrepared(body,prepared,opened.reference);
  }
  accepted??=await input.readAccepted();
  if((accepted as any)?.status==='unmigrated')return null;
  if(!validAccepted(accepted))throw TypeError('PROFILE_SHOWCASE_PREDECESSOR_DELIVERY_PENDING');
  const readHead=async()=>{
   const context=await readProfileShowcaseAppendTransport((accepted as any).transport,resolve);
   if(context.envelope.legacyPredecessor||context.envelope.checkpointBoundary)return null;
   try{return{context,prior:await admitProfileShowcaseAppendTransport({context,artifactId:input.artifactId,resolveBlock:resolve})};}
   catch(error){if(error instanceof Error&&error.message==='PROFILE_SHOWCASE_PREDECESSOR_CONTEXT_REQUIRED')return null;throw error;}
  };
  if(!heldHead){const next=await readHead();if(!next)return null;heldHead=next;}
  // Another tab may have advanced this exact local commit domain while this
  // runtime was warm. Refresh only on actual divergence, inside the append lock.
  const committed=await readCommit(heldHead.prior.admission.artifactSha256);
  if(committed?.headDigest&&committed.headDigest!==heldHead.prior.admission.proofHistoryHead!.headDigest){
   accepted=await input.readAccepted(true);input.assertCurrent();if(!validAccepted(accepted))throw TypeError('PROFILE_SHOWCASE_PREDECESSOR_DELIVERY_PENDING');
   const next=await readHead();if(!next)return null;
   if(next.prior.admission.artifactSha256===heldHead.prior.admission.artifactSha256){
    // Earlier publishers committed before preparing a delivery action. Locate
    // that exact candidate, then admit its direct succession and carried child.
    // Neither the local pointer nor its projection is proof authority.
    const digest=(committed.state as any)?.artifactDigest;
    if(typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest))throw TypeError('PROFILE_SHOWCASE_PREDECESSOR_DELIVERY_PENDING');
    const {context,prior}=next,store=createReceizBrowserArtifactTransitionStore({databaseName,namespace:`profile-showcase-local:${prior.admission.artifactSha256}`,commitDomain});
    const candidate=await store.resolveCandidate({algorithm:'sha-256',binds:'exact-artifact-bytes',value:digest});
    if(!candidate)throw TypeError('PROFILE_SHOWCASE_COMMITTED_CANDIDATE_UNAVAILABLE');
    const admission=await admitReceizProfileShowcaseSuccessorWithPredecessorContext({predecessorAdmission:prior.admission,
     candidateArtifact:{artifact:new File([candidate.exactBytes.slice().buffer as ArrayBuffer],candidate.filename,{type:candidate.mimeType})},resolveVerifiedHistoricalArtifactDigest:prior.resolveHistorical});
    if(admission.artifactSha256!==digest||admission.proofHistoryHead?.headDigest!==committed.headDigest)throw TypeError('PROFILE_SHOWCASE_PREPARED_COMMIT_MISMATCH');
    const carrier=await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(admission),head=carrier['profile-showcase'];
    const localIO=await input.vault.createTransitionPersistentStateIO(input.artifactId,digest);
    const membership=await deriveReceizProfileShowcasePersistentMembershipV114({state:{schema:'receiz.profile-showcase.persistent-state.v114',placementRoot:head.placementRoot as string,
     orderRoot:head.orderRoot as string,counts:head.counts as any,maximumKaiUpulse:head.headKaiUpulse as string},io:{writeNode:localIO.writeNode,resolveNode:async digest=>await localIO.resolveNode(digest)??await prior.io.resolveNode(digest)}});
    const added=membership.placements.filter(member=>!context.children.some(child=>child.reference.childArtifactDigest===member.reference.childArtifactDigest));
    if(added.length!==1)throw TypeError('PROFILE_SHOWCASE_PREPARED_CHILD_REQUIRED');
    const child=await input.vault.reopenRetainedChild(added[0]!.reference);
    if(!child)throw TypeError('PROFILE_SHOWCASE_PREPARED_CHILD_REQUIRED');
    const childAdmission=child.admittedArtifact;
    const childBytes=new Uint8Array(await childAdmission.openedArtifact.sealedArtifact.artifact.arrayBuffer());
    if(childAdmission.profile!=='portable-state'||childAdmission.artifactSha256!==added[0]!.reference.childArtifactDigest
     ||childAdmission.artifactId!==added[0]!.reference.stableChildArtifactId||childAdmission.payloadSha256!==added[0]!.reference.contentDigest
     ||jcsCanonicalize(await readImportedSourceTransportReference(childBytes))!==jcsCanonicalize(opened.reference))throw TypeError('PROFILE_SHOWCASE_PREPARED_SOURCE_MISMATCH');
    input.assertCurrent();
    const transport=await writeProfileShowcaseAppendTransport(context,{artifactDigest:digest,exactSealedArtifactBytes:candidate.exactBytes,witnessNodes:membership.witnessNodes,
     children:[{reference:added[0]!.reference,exactSealedArtifactBytes:childBytes}]},custody.writeBlock);
    const prepared=await readProfileShowcaseAppendTransport(transport,custody.resolveBlock),signer=await actor();input.assertCurrent();
    const body={action:'finalize',scope:scope(digest),transport,publicationSourceArtifactSha256:opened.reference.artifactSha256,
     publicationChildArtifactDigest:childAdmission.artifactSha256,publicationPredecessorArtifactDigest:prior.admission.artifactSha256,identityBinding:signer.binding};
    const action=await enqueueSourceBoundPublicationAction(JSON.stringify(body),signer.custody),held=action&&readLocalSignedActionOutbox().entries[action.actionId];
    if(!action||held?.signatureB64Url!==action.signatureB64Url||held.envelope.request.bodyReplayText!==action.envelope.request.bodyReplayText)throw TypeError('PROFILE_SHOWCASE_PUBLICATION_ACTION_NOT_RETAINED');
    input.assertCurrent();return deliverPrepared(body,prepared,opened.reference);
   }
   heldHead=next;
  }
  const {context,prior}=heldHead;input.assertCurrent();
  if(!opened.source.projection.pulse)throw TypeError('PROFILE_SHOWCASE_SOURCE_KAI_REQUIRED');
  const placement=await sealAndAdmitImportedSourcePlacement({source:opened.source,reference:opened.reference,ownerReceizId:input.owner,
   immutableVersion:opened.source.projection.pulse,seal:input.childSealer});input.assertCurrent();
  const store=createReceizBrowserArtifactTransitionStore({databaseName,namespace:`profile-showcase-local:${prior.admission.artifactSha256}`,commitDomain});
  await store.ensureHead(input.artifactId,{algorithm:'sha-256',binds:'verified-proof-history',value:prior.admission.proofHistoryHead!.headDigest});
  let prepared:ProfileShowcaseAppendTransport|undefined;
  const association={publicationSourceArtifactSha256:opened.reference.artifactSha256,publicationChildArtifactDigest:placement.admission.artifactSha256,
   publicationPredecessorArtifactDigest:prior.admission.artifactSha256};
  const sealer=async({predecessor,successorPayloadBytes}:Parameters<import('../../../../packages/receiz-sdk/src/index').ReceizArtifactTransitionSealer>[0])=>{
   input.assertCurrent();const sealed=await input.sealDocument({fileBytes:successorPayloadBytes,filename:'profile-showcase.json',mime:'application/json',options:{forceBundleEnvelope:true,nativeRecordSeal:{ownerReceizId:input.owner,recordId:input.artifactId}}});
   const artifact=new File([sealed.artifactBytes.slice()],predecessor.openedArtifact!.sealedArtifact.filename,{type:predecessor.openedArtifact!.sealedArtifact.mimeType});
   const admitted=await admitReceizProfileShowcaseSuccessorWithPredecessorContext({predecessorAdmission:prior.admission,candidateArtifact:{artifact},resolveVerifiedHistoricalArtifactDigest:prior.resolveHistorical});
   const carrier=await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(admitted),head=carrier['profile-showcase'];
   const complete=await deriveReceizProfileShowcasePersistentMembershipV114({state:{schema:'receiz.profile-showcase.persistent-state.v114',placementRoot:head.placementRoot as string,
    orderRoot:head.orderRoot as string,counts:head.counts as any,maximumKaiUpulse:head.headKaiUpulse as string},io:prior.io});
   const transport=await writeProfileShowcaseAppendTransport(context,{artifactDigest:admitted.artifactSha256,
    exactSealedArtifactBytes:new Uint8Array(await admitted.openedArtifact.sealedArtifact.artifact.arrayBuffer()),witnessNodes:complete.witnessNodes,
    children:[{reference:authority.children[0]!.reference,exactSealedArtifactBytes:new Uint8Array(await placement.admission.openedArtifact.sealedArtifact.artifact.arrayBuffer())}]},custody.writeBlock);
   prepared=await readProfileShowcaseAppendTransport(transport,custody.resolveBlock);
   const signer=await actor();input.assertCurrent();
   const action=await enqueueSourceBoundPublicationAction(JSON.stringify({action:'finalize',scope:scope(transport.artifactDigest),transport,...association,identityBinding:signer.binding}),signer.custody);
   if(!action)throw TypeError('PROFILE_SHOWCASE_PUBLICATION_ACTION_REQUIRED');
   const held=readLocalSignedActionOutbox().entries[action.actionId];
   if(!held||held.signatureB64Url!==action.signatureB64Url||held.challengeB64Url!==action.challengeB64Url
    ||held.envelope.request.bodyReplayText!==action.envelope.request.bodyReplayText)throw TypeError('PROFILE_SHOWCASE_PUBLICATION_ACTION_NOT_RETAINED');
   // Exact delivery material is durable before stage/atomic commit. Automatic
   // generic outbox replay excludes this endpoint; replay also checks commit.
   input.assertCurrent();return admitted.openedArtifact.sealedArtifact;
  };
  const authority=await createProfileShowcaseAppendAuthority({actorAdmission:input.actorAdmission,predecessorAdmission:prior.admission,childAdmission:placement.admission,
   keyFile:input.keyFile,passphrase:input.passphrase,commitDomain,sealer,store,persistentStateIO:prior.io,resolveVerifiedHistoricalArtifactDigest:prior.resolveHistorical});
  const admission=await sealCommitAndReadmitBoundedProfileShowcaseTransition({...authority,resolveVerifiedHistoricalArtifactDigest:prior.resolveHistorical});input.assertCurrent();
  if(!prepared||prepared.transport.artifactDigest!==admission.artifactSha256)throw TypeError('PROFILE_SHOWCASE_PREPARED_COMMIT_MISMATCH');
  const transport=prepared.transport,selected=scope(transport.artifactDigest);
  const carrier=await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(admission),head=carrier['profile-showcase'];
  const result=await publishProfileShowcaseTransport(transport.artifactDigest,input.owner,input.fetchImpl,input.username,selected,
   ()=>{input.assertCurrent();return{username:input.username,profileIdentity:input.uid};},async()=>identity(),async()=> 'unavailable',async write=>{
    await emitPrepared(prepared,association.publicationChildArtifactDigest,opened.reference,write);return transport;
   },association);
  if(result.status==='published'){heldHead={context:prepared,prior:{admission,carrier,io:prior.io,
   resolveHistorical:count=>count===head.resultingOperationCount?admission.artifactSha256:prior.resolveHistorical(count)}};
   published.set(opened.reference.artifactSha256,result);accepted={status:'accepted',artifactId:input.artifactId,transport,
   binding:{username:input.username,profileIdentity:input.uid,locator:{acceptedArtifactDigest:transport.artifactDigest}}};}
  return result;
 }};
}
