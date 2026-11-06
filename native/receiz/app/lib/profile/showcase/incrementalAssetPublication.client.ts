"use client";
import {createReceizArtifactAdmissionEngine,readReceizIdentityPublicBinding,admitReceizProfileShowcaseSuccessorWithPredecessorContext,rederiveReceizBoundedProfileShowcaseCarrierFromAdmission} from '../../../../packages/receiz-sdk/src/artifactAdmission';
import {verifyReceizArtifactWithCanonicalRoots} from '../../../../packages/receiz-sdk/src/artifactVerification';
import {receizCurrentPinnedSignatureV4Roots} from '../../../../packages/receiz-sdk/src/verifier/roots';
import {createReceizProfileShowcaseSegmentMechanicsV114} from '../../../../packages/receiz-sdk/src/compositeProofTransport';
import {createReceizBrowserAdmissionStore} from '../../../../packages/receiz-sdk/src/browserAdmissionStore';
import {readImportedSourceTransportReference} from './importedSourceProjection';
import {jcsCanonicalize} from '../../../utils/jcs';
import type {ReceizKeyFile,ReceizVerifiedIdentityArtifactAdmission} from '../../../../packages/receiz-sdk/src/index';
import {deriveReceizProfileShowcasePersistentPlacementV114} from '../../../../packages/receiz-sdk/src/profileShowcasePersistentState';
import {createReceizBrowserArtifactTransitionStore} from './browserTransitionStore';
import {createProfileShowcaseAppendAuthority} from './authorityProvider';
import {sealCommitAndReadmitBoundedProfileShowcaseTransition} from './boundedTransitionPublication';
import {readProfileShowcaseAppendTransport,readProfileShowcaseCarrierTransport,writeProfileShowcaseAcceptedTransitionTransport,type ProfileShowcaseAppendTransport,type ProfileShowcaseCompleteSourceTransport} from './completeSourceTransport';
import {admitProfileShowcaseAppendTransport} from './appendTransportAdmission';
import {publishProfileShowcaseTransport,type ProfileShowcasePublicProjectionPublicationResult} from './publicProjectionPublication';
import {createImportedProofSourceCustody} from './importedSourceCustody.client';
import {sealAndAdmitImportedSourcePlacement} from './importedSourcePlacement.client';
import {decodeReceizBundleEnvelope} from '../../documentSeal/bundleContainer';
import {decodeProfileOriginalRouteProjectionAppend} from './routeProjectionEncoding';
import {readExactByteBlocks,reconstructExactByteBlocks,type ExactByteBlockReference,type ExactByteBlockWriter} from '../../transport/exactByteBlocks';
import {readLocalSignedActionOutbox,enqueueSourceBoundPublicationAction} from '../../offline/localSignedActionOutbox';
import type {OpenedImportedProofSource,ImportedProofSourceReference} from './importedSource';
import type {ProfileShowcaseArtifactId,ProfileShowcaseCommittedSegment} from './types';
import type {ProfileShowcaseBoundedEdgeVault} from './boundedEdgeVault';
import type {receizeDocumentBytesClient} from '../../documentSeal/receizeDocumentBytesClient';

type CarrierContext=Awaited<ReturnType<typeof readProfileShowcaseCarrierTransport>>;
type DeliveryContext=ProfileShowcaseAppendTransport|CarrierContext;
type AdmittedPrior=Awaited<ReturnType<typeof admitProfileShowcaseAppendTransport>>;
 type QualifiedPrior=Omit<AdmittedPrior,'resolveHistorical'|'io'>&Readonly<{io:import('../../../../packages/receiz-sdk/src/profileShowcasePersistentState').ReceizProfileShowcasePersistentStateIOV114;resolveHistorical(count:number):Promise<string|null>}>;
 type AcceptedContext=Readonly<{context?:DeliveryContext;prior:QualifiedPrior}>;
// Reuse genuine SDK custody across reopened publishers in this owner lifetime.
// Public metadata and copied descriptors can only select an exact held digest.
const heldAcceptedContexts=new Map<string,Map<string,AcceptedContext>>();
type HistoryPoint=Readonly<{zero?:HistoryPoint;one?:HistoryPoint;digest?:string}>;
const historyBases=new WeakMap<AcceptedContext['prior'],Readonly<{root:HistoryPoint|undefined;base:AcceptedContext['prior']['resolveHistorical']}>>();
const addHistoryPoint=(root:HistoryPoint|undefined,count:number,digest:string,bit=52):HistoryPoint=>{if(bit<0)return{digest};const branch=Math.floor(count/2**bit)%2?'one':'zero';return{...root,[branch]:addHistoryPoint(root?.[branch],count,digest,bit-1)};};
const historyPoint=(root:HistoryPoint|undefined,count:number):string|undefined=>{if(!Number.isSafeInteger(count)||count<0)return;for(let bit=52;bit>=0&&root;bit--)root=root[Math.floor(count/2**bit)%2?'one':'zero'];return root?.digest;};
/** Extends the existing sealed head with SDK plan/capability/commit/admission.
 * Complete v2 delivery reuses immutable old byte references. No historical
 * Original, media body or full-vault restoration is on this append path. */
export function createIncrementalAssetPublisher(input:{artifactId:ProfileShowcaseArtifactId;owner:string;username:string;uid:string;
 actorAdmission:ReceizVerifiedIdentityArtifactAdmission;keyFile:ReceizKeyFile;passphrase:string;
 sealDocument:typeof receizeDocumentBytesClient;childSealer:Parameters<typeof sealAndAdmitImportedSourcePlacement>[0]['seal'];
 fetchImpl:typeof fetch;assertCurrent():void;readAccepted(refresh?:boolean):Promise<unknown>;vault:ProfileShowcaseBoundedEdgeVault}){
 const custody=createImportedProofSourceCustody();let accepted:unknown;const heldBlocks=new Map<string,Promise<Uint8Array>>();
 const published=new Map<string,ProfileShowcasePublicProjectionPublicationResult>();
 let heldHead:AcceptedContext|undefined;
 const contextKey=JSON.stringify([input.artifactId,input.uid,input.username,input.actorAdmission.artifactSha256,input.keyFile.keyId]);
 let shared=heldAcceptedContexts.get(contextKey);if(!shared){shared=new Map();heldAcceptedContexts.set(contextKey,shared);}
 const remember=(value:AcceptedContext)=>{shared!.set(value.prior.admission.artifactSha256,value);if(shared!.size>2){const keep=new Set([value.prior.admission.artifactSha256,...value.prior.carrier.receizProofHistory.parentRefs.map(parent=>parent.artifactDigest)]);for(const key of shared!.keys())if(!keep.has(key))shared!.delete(key);}};
 const childOf=(context:DeliveryContext,digest:string)=>'children'in context?context.children.find(child=>child.reference.childArtifactDigest===digest):context.child?.reference.childArtifactDigest===digest?context.child:undefined;
 const readContext=async(transport:ProfileShowcaseCompleteSourceTransport,reader=resolve):Promise<DeliveryContext>=>{const carrier=await readProfileShowcaseCarrierTransport(transport,reader);return carrier.singleTransition?carrier:readProfileShowcaseAppendTransport(transport,reader);};
 // Copy only the changed count-index path. These memoized points are beneath
 // actual admitted SDK roots; neither a stored descriptor nor this index admits.
 const nextPrior=(prior:AcceptedContext['prior'],admission:AcceptedContext['prior']['admission'],carrier:AcceptedContext['prior']['carrier'])=>{
  const before=historyBases.get(prior)??{root:undefined,base:prior.resolveHistorical},state={root:addHistoryPoint(before.root,Number(carrier['profile-showcase'].resultingOperationCount),admission.artifactSha256),base:before.base};
  const result={admission,carrier,io:prior.io,resolveHistorical:async(count:number)=>historyPoint(state.root,count)??await state.base(count)};historyBases.set(result,state);return result;
 };
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
 const readPreparedAction=async(reference:ImportedProofSourceReference,authorshipProof?:import('./importedSourceAuthorship').ImportedSourceAuthorshipProof)=>{
  let predecessor:{body:any;context:DeliveryContext;pbiReceiptHash?:string}|null=null;
  for(const entry of Object.values(readLocalSignedActionOutbox().entries)){
   if(entry.envelope.actor.uid!==input.uid||entry.envelope.actor.receizKeyId!==input.keyFile.keyId||entry.envelope.request.path!=='/api/profile/showcase/publication')continue;
   let body;try{body=JSON.parse(entry.envelope.request.bodyReplayText??'');}catch{continue;}
   if(body.action!=='finalize'||body.publicationSourceArtifactSha256!==reference.artifactSha256||body.scope?.profileIdentity!==input.uid
    ||body.scope.username!==input.username||body.scope.artifactId!==input.artifactId||! /^[a-f0-9]{64}$/.test(body.publicationPredecessorArtifactDigest??''))continue;
   const committed=await readCommit(body.publicationPredecessorArtifactDigest);
   // The existing SDK commit and durable signed action identify this exact
   // delivery attempt. Retrying transport creates no local transition or new
   // admission; the receiver still admits the exact source and signed consent.
   if((committed?.state as any)?.artifactDigest!==body.scope.artifactDigest)continue;
   const context=await readContext(body.transport,custody.resolveBlock);
   if(context.transport.artifactDigest!==body.scope.artifactDigest)throw TypeError('PROFILE_SHOWCASE_PREPARED_COMMIT_MISMATCH');
   const child=childOf(context,body.publicationChildArtifactDigest);
   if(!child)throw TypeError('PROFILE_SHOWCASE_PREPARED_CHILD_REQUIRED');
   input.assertCurrent();
   if(!authorshipProof)return{body,context};
   const exact=await reconstructExactByteBlocks(child.bytes,custody.resolveBlock,{component:'prepared signed Original',maxContentBytes:16*1024*1024,maxBlockReads:131072}),envelope=decodeReceizBundleEnvelope(exact);
   if(!envelope)throw TypeError('PROFILE_SHOWCASE_PREPARED_CHILD_REQUIRED');
   const document=JSON.parse(new TextDecoder().decode(envelope.originalBytes));
   const row=document.provenance?.appends?.map((append:unknown)=>decodeProfileOriginalRouteProjectionAppend(append,document.payload?.sha256)).find((row:any)=>row&&row.pbiReceiptHash===authorshipProof.pbiReceiptHash);
   const selected={body,context,pbiReceiptHash:row?.pbiReceiptHash};
   // Prefer the exact signature. An unfinished unsigned append is a causal
   // prerequisite only while it directly extends the current accepted head.
   // An older or already accepted unsigned action is not a signature retry.
   if(selected.pbiReceiptHash===authorshipProof.pbiReceiptHash)return selected;
   if(body.publicationPredecessorArtifactDigest===(accepted as any)?.transport?.artifactDigest)predecessor??=selected;
  }return predecessor;
 };
 const emitTree=async(ref:ExactByteBlockReference,write:ExactByteBlockWriter)=>{
  for await(const _ of readExactByteBlocks(ref,async node=>{const bytes=await custody.resolveBlock(node);await write(node,bytes);return bytes;},{component:'prepared append transport',maxContentBytes:512*1024*1024,maxBlockReads:131072})){/* Existing byte-tree decoder verifies every exact block. */}
 };
 const emitPrepared=async(context:DeliveryContext,childDigest:string,reference:ImportedProofSourceReference,write:ExactByteBlockWriter)=>{
  await custody.exportBlocks(reference,write);
  const child=childOf(context,childDigest);if(!child)throw TypeError('PROFILE_SHOWCASE_PREPARED_CHILD_REQUIRED');
  for(const ref of [context.transport.root,context.envelope.carrier,...("children"in context?[context.envelope.nodes,context.envelope.children,context.envelope.ancestry]:[]),child.bytes])if(ref)await emitTree(ref as ExactByteBlockReference,write);
 };
 const deliverPrepared=async(body:any,prepared:DeliveryContext,reference:ImportedProofSourceReference)=>{
  // An interruption can occur after the real SDK commit but before its local
  // proof retention. The already signed action/commit chooses exact bytes only;
  // re-admit that successor beneath its genuine prior before retaining it.
  if(!await input.vault.hasRetainedHead(input.artifactId,body.scope.artifactDigest)){
   const prior=await input.vault.reopenRetainedHead(input.artifactId,body.publicationPredecessorArtifactDigest);
   if(!prior)throw TypeError('PROFILE_SHOWCASE_PREDECESSOR_CUSTODY_REQUIRED');
   const resolveHistorical=(count:number)=>input.vault.resolveVerifiedHistoricalArtifactDigest(input.artifactId,prior.artifactSha256,count);
   const artifact=new File([prepared.exactSealedArtifactBytes.slice().buffer as ArrayBuffer],'profile-showcase.receizbundle',{type:'application/vnd.receiz.bundle+json'});
   const admission=await admitReceizProfileShowcaseSuccessorWithPredecessorContext({predecessorAdmission:prior,candidateArtifact:{artifact},resolveVerifiedHistoricalArtifactDigest:resolveHistorical});
   const carrier=await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(admission),head=carrier['profile-showcase'],priorCarrier=await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(prior);
   const child=childOf(prepared,body.publicationChildArtifactDigest),operations=head.directDelta as readonly Record<string,unknown>[];
   if(admission.artifactSha256!==body.scope.artifactDigest||carrier.artifactId!==input.artifactId||carrier.ownerReceizIdentity!==input.owner||head.profileIdentity!==priorCarrier['profile-showcase'].profileIdentity
    ||!child||operations.length!==1||operations[0]!.kind!=='showcase.append'||(operations[0]!.child as any)?.childArtifactDigest!==child.reference.childArtifactDigest)throw TypeError('PROFILE_SHOWCASE_PREPARED_COMMIT_MISMATCH');
   const bytes=await reconstructExactByteBlocks(child.bytes,custody.resolveBlock,{component:'committed Original proof recovery',maxContentBytes:16*1024*1024,maxBlockReads:131072});
   const childArtifact=new File([bytes.slice().buffer as ArrayBuffer],'profile-original.receizbundle',{type:'application/vnd.receiz.bundle+json'}),roots=receizCurrentPinnedSignatureV4Roots();
   const admittedChild=await createReceizArtifactAdmissionEngine({canonicalSignatureV4RootPublicKeys:roots})(await verifyReceizArtifactWithCanonicalRoots(childArtifact,roots),{profile:'portable-state',ownerConstraint:input.owner});
   if(admittedChild.profile!=='portable-state'||admittedChild.verdict!=='bearer-recovery'||admittedChild.artifactSha256!==child.reference.childArtifactDigest)throw TypeError('PROFILE_SHOWCASE_PREPARED_CHILD_REQUIRED');
   const segment=await createReceizProfileShowcaseSegmentMechanicsV114({operations:head.directDelta as Parameters<typeof createReceizProfileShowcaseSegmentMechanicsV114>[0]['operations'],startOperationCount:Number(head.resultingOperationCount)-1});
   input.assertCurrent();await input.vault.admit({showcaseAdmission:admission,children:[{reference:child.reference,admittedArtifact:admittedChild}],segments:[{schema:segment.schema,commitment:{...segment.commitment,authority:segment.authority},bytes:segment.bytes,operations:segment.operations as ProfileShowcaseCommittedSegment['operations'],membershipWitnesses:segment.membershipWitnesses as ProfileShowcaseCommittedSegment['membershipWitnesses'],authority:segment.authority}],retainOnly:true,retainHistoryOnly:true});
   input.assertCurrent();const io=await input.vault.createTransitionPersistentStateIO(input.artifactId,admission.artifactSha256,admission);
   remember({context:prepared,prior:{admission,carrier,io,resolveHistorical:async(count:number)=>count===Number(head.resultingOperationCount)?admission.artifactSha256:resolveHistorical(count)}});
  }
  const result=await publishProfileShowcaseTransport(body.scope.artifactDigest,input.owner,input.fetchImpl,input.username,body.scope,
   ()=>{input.assertCurrent();return{username:input.username,profileIdentity:input.uid};},async()=>identity(),async()=> 'unavailable',async write=>{
    await emitPrepared(prepared,body.publicationChildArtifactDigest,reference,write);return body.transport;
   },{publicationSourceArtifactSha256:reference.artifactSha256,publicationChildArtifactDigest:body.publicationChildArtifactDigest,publicationPredecessorArtifactDigest:body.publicationPredecessorArtifactDigest});
  if(result.status==='published'){heldHead=shared!.get(body.scope.artifactDigest);published.set(reference.artifactSha256,result);accepted={status:'accepted',artifactId:input.artifactId,transport:body.transport,
   binding:{username:input.username,profileIdentity:input.uid,locator:{acceptedArtifactDigest:body.transport.artifactDigest}}};}
  return result;
 };
 return {async acceptPublished(transport:ProfileShowcaseCompleteSourceTransport){
  input.assertCurrent();let selected=shared!.get(transport.artifactDigest);
  if(!selected){const admission=await input.vault.reopenHead(input.artifactId,transport.artifactDigest);if(!admission||admission.artifactSha256!==transport.artifactDigest)throw TypeError('PROFILE_SHOWCASE_PREDECESSOR_CUSTODY_REQUIRED');
   const context=await readContext(transport,custody.resolveBlock),carrier=await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(admission),io=await input.vault.createTransitionPersistentStateIO(input.artifactId,transport.artifactDigest);
   selected={context,prior:{admission,carrier,io,resolveHistorical:count=>input.vault.resolveVerifiedHistoricalArtifactDigest(input.artifactId,transport.artifactDigest,count)}};remember(selected);}
  if(!selected)throw TypeError('PROFILE_SHOWCASE_PREDECESSOR_CUSTODY_REQUIRED');heldHead=selected;accepted={status:'accepted',artifactId:input.artifactId,transport,binding:{username:input.username,profileIdentity:input.uid,locator:{acceptedArtifactDigest:transport.artifactDigest}}};input.assertCurrent();
 },async publish(opened:{source:OpenedImportedProofSource;reference:ImportedProofSourceReference},authorshipProof?:import('./importedSourceAuthorship').ImportedSourceAuthorshipProof):Promise<ProfileShowcasePublicProjectionPublicationResult|null>{
  input.assertCurrent();
  const publicationKey=opened.reference.artifactSha256+(authorshipProof?':'+authorshipProof.pbiReceiptHash:'');
  const known=published.get(publicationKey);if(known)return known;
  // The runtime already captured this exact current-head metadata. Reuse it
  // to distinguish a pending predecessor from a completed historical action.
  accepted??=await input.readAccepted();
  const replay=await readPreparedAction(opened.reference,authorshipProof);
  if(replay){
   const {body,context:prepared}=replay;
   // Replay transport only: the saved signature and unchanged server verifier
   // still govern acceptance. No persisted projection is promoted to proof.
   const result=await deliverPrepared(body,prepared,opened.reference);
   if(!authorshipProof||result.status!=='published')return result;
   // A prior unsigned append may be the interrupted delivery. Settle it once,
   // then sign its admitted current head; it is never a signed acknowledgment.
   if(replay.pbiReceiptHash===authorshipProof.pbiReceiptHash){published.set(publicationKey,result);return result;}
  }
  if((accepted as any)?.status==='unmigrated')return null;
  if(!validAccepted(accepted))throw TypeError('PROFILE_SHOWCASE_PREDECESSOR_DELIVERY_PENDING');
  const readHead=async()=>{
   const selected=shared!.get((accepted as any).transport.artifactDigest);if(selected)return selected;
   const local=await input.vault.reopenRetainedHead(input.artifactId,(accepted as any).transport.artifactDigest);
   if(local){const carrier=await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(local),io=await input.vault.createTransitionPersistentStateIO(input.artifactId,local.artifactSha256,local);
    const value={prior:{admission:local,carrier,io,resolveHistorical:async(count:number)=>input.vault.resolveVerifiedHistoricalArtifactDigest(input.artifactId,local.artifactSha256,count)}};remember(value);return value;}
   const context=await readContext((accepted as any).transport);
   if(!("children"in context))throw TypeError("PROFILE_SHOWCASE_PREDECESSOR_CONTEXT_REQUIRED");
   if(context.envelope.legacyPredecessor||context.envelope.checkpointBoundary)return null;
   try{const admitted=await admitProfileShowcaseAppendTransport({context,artifactId:input.artifactId,resolveBlock:resolve});const value={context,prior:{...admitted,resolveHistorical:async(count:number)=>admitted.resolveHistorical(count)}};remember(value);return value;}
   catch(error){if(error instanceof Error&&error.message==='PROFILE_SHOWCASE_PREDECESSOR_CONTEXT_REQUIRED')return null;throw error;}
  };
  if(!heldHead){const next=await readHead();if(!next)return null;heldHead=next;}
  // Another tab may have advanced this exact local commit domain while this
  // runtime was warm. Refresh only on actual divergence, inside the append lock.
  const committed=await readCommit(heldHead.prior.admission.artifactSha256);
  if(committed?.headDigest&&committed.headDigest!==heldHead.prior.admission.proofHistoryHead!.headDigest){
   accepted=await input.readAccepted(true);input.assertCurrent();if(!validAccepted(accepted))throw TypeError('PROFILE_SHOWCASE_PREDECESSOR_DELIVERY_PENDING');
   let next=await readHead();if(!next)return null;
   if(next.prior.admission.artifactSha256===heldHead.prior.admission.artifactSha256){
    // Earlier publishers committed before preparing a delivery action. Locate
    // that exact candidate, then admit its direct succession and carried child.
    // Neither the local pointer nor its projection is proof authority.
    const digest=(committed.state as any)?.artifactDigest;
    if(typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest))throw TypeError('PROFILE_SHOWCASE_PREDECESSOR_DELIVERY_PENDING');
    const {prior}=next,store=createReceizBrowserArtifactTransitionStore({databaseName,namespace:`profile-showcase-local:${prior.admission.artifactSha256}`,commitDomain});
    const candidate=await store.resolveCandidate({algorithm:'sha-256',binds:'exact-artifact-bytes',value:digest});
    if(!candidate)throw TypeError('PROFILE_SHOWCASE_COMMITTED_CANDIDATE_UNAVAILABLE');
    const admission=await admitReceizProfileShowcaseSuccessorWithPredecessorContext({predecessorAdmission:prior.admission,
     candidateArtifact:{artifact:new File([candidate.exactBytes.slice().buffer as ArrayBuffer],candidate.filename,{type:candidate.mimeType})},resolveVerifiedHistoricalArtifactDigest:prior.resolveHistorical});
    if(admission.artifactSha256!==digest||admission.proofHistoryHead?.headDigest!==committed.headDigest)throw TypeError('PROFILE_SHOWCASE_PREPARED_COMMIT_MISMATCH');
    const carrier=await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(admission),head=carrier['profile-showcase'];
    const localIO=await input.vault.createTransitionPersistentStateIO(input.artifactId,digest);
    // Resolve only the actual changed placement against the admitted root.
    // Historical Original bodies and complete membership are not mutation input.
    const delta=Array.isArray(head.directDelta)&&head.directDelta.length===1?head.directDelta[0] as Record<string,unknown>:null;
    if(delta?.kind!=='showcase.append'||!delta.child||typeof delta.child!=='object'||Array.isArray(delta.child)
      ||!('stableChildArtifactId'in delta.child)||typeof delta.child.stableChildArtifactId!=='string'
      ||!('immutableVersion'in delta.child)||typeof delta.child.immutableVersion!=='string'
      ||!('childArtifactDigest'in delta.child)||typeof delta.child.childArtifactDigest!=='string')throw TypeError('PROFILE_SHOWCASE_PREPARED_CHILD_REQUIRED');
    const childKey={stableChildArtifactId:delta.child.stableChildArtifactId,immutableVersion:delta.child.immutableVersion,childArtifactDigest:delta.child.childArtifactDigest};
    const placement=await deriveReceizProfileShowcasePersistentPlacementV114({placementRoot:String(head.placementRoot),child:childKey,
      io:{writeNode:localIO.writeNode,resolveNode:async digest=>await localIO.resolveNode(digest)??await prior.io.resolveNode(digest)}});
    if(!placement||jcsCanonicalize(placement.reference)!==jcsCanonicalize(delta.child))throw TypeError('PROFILE_SHOWCASE_PREPARED_CHILD_REQUIRED');
    if(typeof placement.reference.admissionEvidenceRoot!=='string'||typeof placement.reference.contentDigest!=='string')throw TypeError('PROFILE_SHOWCASE_PREPARED_CHILD_REQUIRED');
    const exactReference={...childKey,admissionEvidenceRoot:placement.reference.admissionEvidenceRoot,contentDigest:placement.reference.contentDigest};
    const child=await input.vault.reopenRetainedChild(exactReference);
    if(!child)throw TypeError('PROFILE_SHOWCASE_PREPARED_CHILD_REQUIRED');
    const childAdmission=child.admittedArtifact;if(!childAdmission.openedArtifact)throw TypeError('PROFILE_SHOWCASE_PREPARED_CHILD_REQUIRED');
    const childBytes=new Uint8Array(await childAdmission.openedArtifact.sealedArtifact.artifact.arrayBuffer());
    if(childAdmission.profile!=='portable-state'||childAdmission.artifactSha256!==child.reference.childArtifactDigest
     ||childAdmission.artifactId!==child.reference.stableChildArtifactId||childAdmission.payloadSha256!==child.reference.contentDigest
     ||jcsCanonicalize(await readImportedSourceTransportReference(childBytes))!==jcsCanonicalize(opened.reference))throw TypeError('PROFILE_SHOWCASE_PREPARED_SOURCE_MISMATCH');
    input.assertCurrent();
    const transport=await writeProfileShowcaseAcceptedTransitionTransport({artifactDigest:digest,exactSealedArtifactBytes:candidate.exactBytes,child:{reference:child.reference,exactSealedArtifactBytes:childBytes}},custody.writeBlock,{exportImportedSource:(reference,write)=>custody.exportBlocks(reference,write)});
    const prepared=await readContext(transport,custody.resolveBlock),signer=await actor();input.assertCurrent();
    const body={action:'finalize',scope:scope(digest),transport,publicationSourceArtifactSha256:opened.reference.artifactSha256,
     publicationChildArtifactDigest:childAdmission.artifactSha256,publicationPredecessorArtifactDigest:prior.admission.artifactSha256,identityBinding:signer.binding};
    const action=await enqueueSourceBoundPublicationAction(JSON.stringify(body),signer.custody),held=action&&readLocalSignedActionOutbox().entries[action.actionId];
    if(!action||held?.signatureB64Url!==action.signatureB64Url||held.envelope.request.bodyReplayText!==action.envelope.request.bodyReplayText)throw TypeError('PROFILE_SHOWCASE_PUBLICATION_ACTION_NOT_RETAINED');
    input.assertCurrent();const recovered=await deliverPrepared(body,prepared,opened.reference);
    if(!authorshipProof||recovered.status!=='published')return recovered;
    // That exact interrupted commit may be the unsigned placement. Its
    // acknowledgment settles delivery only; now append the requested PBI
    // addition to the same already admitted head, without reading history.
    next={context:prepared,prior:nextPrior(prior,admission,carrier)};remember(next);
   }
   heldHead=next;
  }
  const {prior}=heldHead;input.assertCurrent();
  if(!opened.source.projection.pulse)throw TypeError('PROFILE_SHOWCASE_SOURCE_KAI_REQUIRED');
  const placement=await sealAndAdmitImportedSourcePlacement({source:opened.source,reference:opened.reference,ownerReceizId:input.owner,
   immutableVersion:opened.source.projection.pulse,seal:input.childSealer,authorshipProof});input.assertCurrent();
  const store=createReceizBrowserArtifactTransitionStore({databaseName,namespace:`profile-showcase-local:${prior.admission.artifactSha256}`,commitDomain});
  await store.ensureHead(input.artifactId,{algorithm:'sha-256',binds:'verified-proof-history',value:prior.admission.proofHistoryHead!.headDigest});
  let prepared:DeliveryContext|undefined;
  const association={publicationSourceArtifactSha256:opened.reference.artifactSha256,publicationChildArtifactDigest:placement.admission.artifactSha256,
   publicationPredecessorArtifactDigest:prior.admission.artifactSha256};
  const sealer=async({predecessor,successorPayloadBytes}:Parameters<import('../../../../packages/receiz-sdk/src/index').ReceizArtifactTransitionSealer>[0])=>{
   input.assertCurrent();const sealed=await input.sealDocument({fileBytes:successorPayloadBytes,filename:'profile-showcase.json',mime:'application/json',options:{forceBundleEnvelope:true,nativeRecordSeal:{ownerReceizId:input.owner,recordId:input.artifactId}}});
   const artifact=new File([sealed.artifactBytes.slice()],predecessor.openedArtifact!.sealedArtifact.filename,{type:predecessor.openedArtifact!.sealedArtifact.mimeType});
   const admitted=await admitReceizProfileShowcaseSuccessorWithPredecessorContext({predecessorAdmission:prior.admission,candidateArtifact:{artifact},resolveVerifiedHistoricalArtifactDigest:prior.resolveHistorical});
   const transport=await writeProfileShowcaseAcceptedTransitionTransport({artifactDigest:admitted.artifactSha256,
    exactSealedArtifactBytes:new Uint8Array(await admitted.openedArtifact.sealedArtifact.artifact.arrayBuffer()),
    child:{reference:authority.children[0]!.reference,exactSealedArtifactBytes:new Uint8Array(await placement.admission.openedArtifact.sealedArtifact.artifact.arrayBuffer())}},custody.writeBlock,{exportImportedSource:(reference,write)=>custody.exportBlocks(reference,write)});
   prepared=await readContext(transport,custody.resolveBlock);
   const signer=await actor();input.assertCurrent();
   const action=await enqueueSourceBoundPublicationAction(JSON.stringify({action:'finalize',scope:scope(transport.artifactDigest),transport,...association,identityBinding:signer.binding}),signer.custody);
   if(!action)throw TypeError('PROFILE_SHOWCASE_PUBLICATION_ACTION_REQUIRED');
   const held=readLocalSignedActionOutbox().entries[action.actionId];
   if(!held||held.signatureB64Url!==action.signatureB64Url||held.challengeB64Url!==action.challengeB64Url
    ||held.envelope.request.bodyReplayText!==action.envelope.request.bodyReplayText)throw TypeError('PROFILE_SHOWCASE_PUBLICATION_ACTION_NOT_RETAINED');
   // Exact delivery material is durable before stage/atomic commit. Automatic
   // generic outbox replay excludes this endpoint; replay also checks commit.
   input.assertCurrent();const selected=admitted.openedArtifact.sealedArtifact;if(selected.kind!=='receiz.native-record-seal')throw TypeError('PROFILE_SHOWCASE_PREPARED_COMMIT_MISMATCH');return selected;
  };
  const authority=await createProfileShowcaseAppendAuthority({actorAdmission:input.actorAdmission,predecessorAdmission:prior.admission,childAdmission:placement.admission,
   keyFile:input.keyFile,passphrase:input.passphrase,commitDomain,sealer,store,persistentStateIO:prior.io,resolveVerifiedHistoricalArtifactDigest:prior.resolveHistorical});
  const admission=await sealCommitAndReadmitBoundedProfileShowcaseTransition({...authority,resolveVerifiedHistoricalArtifactDigest:prior.resolveHistorical});input.assertCurrent();
  if(!prepared||prepared.transport.artifactDigest!==admission.artifactSha256)throw TypeError('PROFILE_SHOWCASE_PREPARED_COMMIT_MISMATCH');
  const carrier=await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(admission),head=carrier['profile-showcase'];
  // Preserve actual SDK custody for the next module, not merely its delivery
  // descriptor. History-only retention never opens or selects old views.
  if(!await input.vault.hasRetainedHead(input.artifactId,prior.admission.artifactSha256))await input.vault.admit({showcaseAdmission:prior.admission,children:[],segments:[],retainOnly:true,retainHistoryOnly:true});
  if(!await input.vault.hasRetainedHead(input.artifactId,admission.artifactSha256))await input.vault.admit({showcaseAdmission:admission,children:authority.children,segments:authority.segments.filter(segment=>(carrier['profile-showcase'].segmentWindow as readonly {segmentId:string}[]).some(ref=>ref.segmentId===segment.commitment.segmentId)),retainOnly:true,retainHistoryOnly:true});
  const committedPrepared=prepared,transport=committedPrepared.transport,selected=scope(transport.artifactDigest);
  heldHead={context:prepared,prior:nextPrior(prior,admission,carrier)};remember(heldHead);
  const result=await publishProfileShowcaseTransport(transport.artifactDigest,input.owner,input.fetchImpl,input.username,selected,
   ()=>{input.assertCurrent();return{username:input.username,profileIdentity:input.uid};},async()=>identity(),async()=> 'unavailable',async write=>{
    await emitPrepared(committedPrepared,association.publicationChildArtifactDigest,opened.reference,write);return transport;
   },association);
  if(result.status==='published'){
   published.set(publicationKey,result);accepted={status:'accepted',artifactId:input.artifactId,transport,
   binding:{username:input.username,profileIdentity:input.uid,locator:{acceptedArtifactDigest:transport.artifactDigest}}};}
  return result;
 }};
}
