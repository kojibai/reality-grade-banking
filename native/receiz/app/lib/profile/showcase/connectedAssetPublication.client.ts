"use client";
import {computeLocalPbiAuthorshipActionHash} from '../../../../packages/receiz-sdk/src/pbiLocalAuthorship';
import {peekLocalPbiAuthorshipPublication,peekLocalPbiAuthorshipPublicationsForSource,enqueueLocalPbiAuthorshipPublication} from '../../pbi/localAuthorshipOutbox';
import {createIncrementalAssetPublisher} from "./incrementalAssetPublication.client";
import {prepareConnectedComposerSource,prepareConnectedComposerContent,sealConnectedComposerContent} from "../composerPreparation.client";
import type {ComposerAssetDraft} from "../composerPreparation";
import {verifyReceizArtifact,createReceizArtifactAdmissionEngine,readReceizIdentityArtifact} from "../../../../packages/receiz-sdk/src/index";
import type {receizeDocumentBytesClient} from "@/app/lib/documentSeal/receizeDocumentBytesClient";
import {createProfileShowcaseBoundedEdgeVault} from "./boundedEdgeVault";
import {createImportedProofSourceCustody} from "./importedSourceCustody.client";
import {openImportedProofSource} from "./importedSource";
import {projectImportedSourceOriginal,readImportedSourceTransportReference} from "./importedSourceProjection";
import {sealAndAdmitImportedSourcePlacement} from "./importedSourcePlacement.client";
import {publishComposerBoundedShowcaseIfAuthorized,withProfileShowcaseCausalAppendLock} from "./composerPublication";
import {profileShowcaseLiveKaiUpulse} from "./liveKaiTimeSource";
import {recoverAcceptedShowcasePredecessor,readAcceptedShowcasePredecessor} from "./acceptedPredecessorRecovery.client";
import {readRecoveredAccountShowcaseScope} from "./recoveredAccountScope.client";
import {loadCompleteLegacyProfileShowcase} from "./composerLegacyMigration";
import {writeProfileShowcaseCompleteSourceTransport,writeProfileShowcaseAcceptedTransitionTransport,type ProfileShowcaseCompleteSourceTransport} from "./completeSourceTransport";
import {ensureCurrentProfileShowcasePublicProjection} from "./publicProjectionRetry";
import {publishProfileShowcaseTransport,type ProfileShowcasePublicProjectionPublicationResult} from "./publicProjectionPublication";
import type {ProfileShowcaseCompletePublicSource,ProfileShowcasePublicationSource,ProfileShowcaseBoundedFirstPaint} from "./boundedEdgeVault";
import type {ProfileShowcaseArtifactId} from "./types";
import {retainImportedProfileOriginalMaterial} from "../materialProjection.client";
import {attachImportedSourceMarketPreviews} from "./importedSourceMarketPreview";
export type ConnectedAssetLocalAdmission=Readonly<{username:string;original:import("../types").ProfileOriginal;sourceReference:import("./importedSourceReference").ImportedProofSourceReference;firstPaint:ProfileShowcaseBoundedFirstPaint|null;artwork?:Blob}>;
const localDisplays=new WeakMap<import("../types").ProfileOriginal,Map<string,import("../types").ProfileOriginal>>();
function sourceDisplay(original:import("../types").ProfileOriginal,source:Awaited<ReturnType<typeof openImportedProofSource>>,username:string,owner:string){
 let views=localDisplays.get(original);if(!views){views=new Map();localDisplays.set(original,views);}let display=views.get(username);
 if(!display){display=attachImportedSourceMarketPreviews({originals:[original],ownerUserId:owner,ownerUsername:username,sources:[source]})[0]!;views.set(username,display);}return display;
}
function sourceArtwork(source:Awaited<ReturnType<typeof openImportedProofSource>>){const cover=source.projection.bankAsset?.composer?.files.find(file=>file.role==='cover');return cover?source.composerResources?.[cover.id]:source.projection.payloadMimeType.startsWith('image/')?source.payload:undefined;}
// The already-open ID can prepare and admit its one source without reading a Showcase.
export {prepareConnectedComposerContent,sealConnectedComposerContent};
const locallyOpened=new WeakMap<File,{source:Awaited<ReturnType<typeof openImportedProofSource>>;reference:import("./importedSourceReference").ImportedProofSourceReference;original:import("../types").ProfileOriginal}>();
export async function admitConnectedComposerSource(input:Readonly<{file:File;ownerReceizId:string;username:string;assertCurrent():void;onLocalAdmission?(admission:ConnectedAssetLocalAdmission):Promise<void>|void}>){
 input.assertCurrent();const custody=createImportedProofSourceCustody();let held=locallyOpened.get(input.file);
 if(!held){const source=await openImportedProofSource(input.file,{resolveSourceBlock:custody.resolveBlock,nestedColdSpool:custody.createColdSpool});input.assertCurrent();
  if(source.projection.ownerReceizId!==input.ownerReceizId)throw new TypeError("PROFILE_SHOWCASE_CONNECTED_SOURCE_OWNER_MISMATCH");
  const reference=await custody.hold(source),original=projectImportedSourceOriginal(source,reference);held={source,reference,original};locallyOpened.set(input.file,held);
 }
 if(held.source.projection.ownerReceizId!==input.ownerReceizId)throw new TypeError("PROFILE_SHOWCASE_CONNECTED_SOURCE_OWNER_MISMATCH");
 input.assertCurrent();retainImportedProfileOriginalMaterial(held.original,input.username,held.source);
 await input.onLocalAdmission?.(Object.freeze({username:input.username,original:sourceDisplay(held.original,held.source,input.username,input.ownerReceizId),sourceReference:held.reference,firstPaint:null,artwork:sourceArtwork(held.source)}));input.assertCurrent();return held;
}
/** Composition of the canonical Receiz uploader's exact source admission,
 * placement, causal append, custody and public projection. No parallel store. */
type ConnectedAssetRuntimeInput=Readonly<{
 identity:Uint8Array;passphrase:string;account:Readonly<{uid:string;username:string}>;
 sealDocument:typeof receizeDocumentBytesClient;fetchImpl:typeof fetch;assertCurrent():void;onLocalAdmission?(admission:ConnectedAssetLocalAdmission):Promise<void>|void;
} >;
export async function createConnectedAssetPublicationRuntime(input:ConnectedAssetRuntimeInput){
 input.assertCurrent();
 const admitted=await createReceizArtifactAdmissionEngine()(await verifyReceizArtifact(input.identity),{profile:"identity",identityPassphrase:input.passphrase});
 if(admitted.profile!=="identity"||admitted.verdict!=="canonical-identity"||!admitted.ownerReceizId)throw new TypeError("PROFILE_SHOWCASE_CONNECTED_IDENTITY_REQUIRED");
 const identityAdmission=admitted;
 const keyFile=await readReceizIdentityArtifact(input.identity);input.assertCurrent();
 const username=input.account.username.toLowerCase(),account={username,profileIdentity:input.account.uid};
 if(!/^[a-z0-9_]{3,24}$/.test(username)||!input.account.uid)throw new TypeError("PROFILE_SHOWCASE_CONNECTED_ACCOUNT_REQUIRED");
 const custody=createImportedProofSourceCustody();
 const sealDocument:typeof receizeDocumentBytesClient=async args=>{input.assertCurrent();const result=await input.sealDocument(args);input.assertCurrent();return result;};
 const signedSources=new Map<string,import("./importedSourceAuthorship").ImportedSourceAuthorshipProof>();
 let publisher:ReturnType<typeof openConnectedAssetPublisher>|undefined;
 const publication=()=>publisher??=openConnectedAssetPublisher(input,admitted,keyFile).catch(error=>{publisher=undefined;throw error;});
 type AuthorizeMarket=(input:import("../../../../packages/receiz-sdk/src/pbiLocalAuthorship").LocalPbiAuthorshipInput)=>Promise<import("./importedSourceAuthorship").ImportedSourceAuthorshipProof>;
 async function publish(file:File,authorizeMarket?:AuthorizeMarket):Promise<ProfileShowcasePublicProjectionPublicationResult>;
 async function publish(file:File,authorizeMarket:undefined,requireSavedSignature:true):Promise<ProfileShowcasePublicProjectionPublicationResult|null>;
 async function publish(file:File,authorizeMarket?:AuthorizeMarket,requireSavedSignature=false):Promise<ProfileShowcasePublicProjectionPublicationResult|null>{
   const opened=await admitConnectedComposerSource({file,ownerReceizId:identityAdmission.ownerReceizId!,username,assertCurrent:input.assertCurrent});
   const pbi=await import("./importedSourceAuthorship");let action:import("../../../../packages/receiz-sdk/src/pbiLocalAuthorship").LocalPbiAuthorshipInput|undefined;
   try{action=await pbi.importedSourceAuthorshipInput(opened.source,identityAdmission.actor.actorId,profileShowcaseLiveKaiUpulse());}catch(error){if(authorizeMarket||!(error instanceof TypeError)||error.message!=='IMPORTED_SOURCE_PBI_SOURCE_REQUIRED')throw error;}
   const actionHash=action?await computeLocalPbiAuthorshipActionHash(action):null;
   let held=actionHash?peekLocalPbiAuthorshipPublication(actionHash):null;
   if(!held&&action)for(const saved of peekLocalPbiAuthorshipPublicationsForSource(action,opened.reference.artifactSha256)){
    try{await pbi.projectPbiSignedImportedSourceOriginal(opened.source,opened.reference,saved.proof);held=saved;break;}
    catch(error){if(!(error instanceof TypeError)||!['IMPORTED_SOURCE_PBI_PROOF_REQUIRED','IMPORTED_SOURCE_PBI_PROOF_INVALID'].includes(error.message))throw error;}
   }
   let authorshipProof=signedSources.get(opened.reference.artifactSha256)??held?.proof;
   if(!authorshipProof&&authorizeMarket){if(!action)throw TypeError('IMPORTED_SOURCE_PBI_SOURCE_REQUIRED');authorshipProof=await authorizeMarket(action);}
   if(requireSavedSignature&&!authorshipProof)return null;
   input.assertCurrent();
   let original=opened.original;
   if(authorshipProof){
    original=await pbi.projectPbiSignedImportedSourceOriginal(opened.source,opened.reference,authorshipProof);input.assertCurrent();
    if(!held)await enqueueLocalPbiAuthorshipPublication(authorshipProof,async proof=>{await pbi.projectPbiSignedImportedSourceOriginal(opened.source,opened.reference,proof);return true;});
    input.assertCurrent();signedSources.set(opened.reference.artifactSha256,authorshipProof);
   }
   retainImportedProfileOriginalMaterial(original,username,opened.source);
   await input.onLocalAdmission?.(Object.freeze({username,original:sourceDisplay(original,opened.source,username,input.account.uid),sourceReference:opened.reference,firstPaint:null,artwork:sourceArtwork(opened.source)}));input.assertCurrent();
   return(await publication()).publishOpened(opened,authorshipProof);
 }
 return {
  async stage(file:File){return(await publication()).stage(file);},
  prepareContent:(draft:ComposerAssetDraft)=>prepareConnectedComposerContent({draft,ownerReceizId:identityAdmission.ownerReceizId!,writeBlock:custody.writeBlock,assertCurrent:input.assertCurrent}),
  sealContent:(content:import("../composerPreparation").ComposerAssetContent)=>sealConnectedComposerContent({content,sealDocument,writeBlock:custody.writeBlock,assertCurrent:input.assertCurrent}),
  prepare:(draft:ComposerAssetDraft)=>prepareConnectedComposerSource({draft,ownerReceizId:identityAdmission.ownerReceizId!,sealDocument,writeBlock:custody.writeBlock,assertCurrent:input.assertCurrent}),
  publish,
  // Reuse the exact durable PBI proof. A background resume can never open a
  // ceremony or publish an unsigned placement in place of the saved signature.
  resumeSignedPublication:(file:File)=>publish(file,undefined,true)
 };
}
/** Publication starts only after local admission and an explicitly requested
 * PBI ceremony. Signing cannot enter full Showcase recovery or legacy scans. */
async function openConnectedAssetPublisher(input:ConnectedAssetRuntimeInput,admitted:import("../../../../packages/receiz-sdk/src/artifactAdmissionTypes").ReceizVerifiedIdentityArtifactAdmission,keyFile:Awaited<ReturnType<typeof readReceizIdentityArtifact>>){
 const username=input.account.username.toLowerCase(),account={username,profileIdentity:input.account.uid};
 let acceptedDelivery:unknown,acceptedReadFailure:unknown;
 const fetchDelivery:typeof fetch=async(resource,init)=>{
  const url=new URL(resource instanceof Request?resource.url:String(resource),'https://receiz.com');
  const metadata=url.pathname==='/api/profile/showcase/accepted-source'&&!url.searchParams.has('block');
  try{const response=await input.fetchImpl(resource,init);
   if(metadata){if(response.ok)acceptedDelivery=await response.clone().json();else acceptedReadFailure=TypeError(`PROFILE_SHOWCASE_DELIVERY_READ_HTTP_${response.status}`);}
   return response;
  }catch(error){if(metadata)acceptedReadFailure=error;throw error;}
 };
 const accepted=await readRecoveredAccountShowcaseScope({username,accountId:input.account.uid},fetchDelivery);input.assertCurrent();
 // Do not cache a runtime whose initial placement lookup failed. Local sealing
 // is independent; explicit delivery can open a fresh current-account runtime.
 if(acceptedReadFailure)throw acceptedReadFailure;
 const artifactId=accepted?.locator.showcaseArtifactId??`profile-showcase:${admitted.ownerReceizId}` as ProfileShowcaseArtifactId;
 const owner=artifactId.slice("profile-showcase:".length);
 const vault=createProfileShowcaseBoundedEdgeVault({resolveVerifiedCheckpointActorEvidence:async digest=>digest===admitted.artifactSha256?admitted:null});
 const sealDocument:typeof receizeDocumentBytesClient=async args=>{input.assertCurrent();const result=await input.sealDocument(args);input.assertCurrent();return result;};
 const childSealer:import("./composerChild").ComposerProfileOriginalChildSealer=async args=>{
  const sealed=await sealDocument({fileBytes:args.payloadBytes,filename:args.filename,mime:args.mimeType,options:{forceBundleEnvelope:true,nativeRecordSeal:{ownerReceizId:args.ownerReceizId,recordId:args.recordId}}});
  return new File([sealed.artifactBytes.slice()],sealed.downloadName,{type:sealed.kind==="bundle"?"application/vnd.receiz.bundle+json":"application/octet-stream"});
 };
 const incremental=createIncrementalAssetPublisher({artifactId,owner,username,uid:input.account.uid,actorAdmission:admitted,keyFile,passphrase:input.passphrase,
  sealDocument,childSealer,fetchImpl:input.fetchImpl,assertCurrent:input.assertCurrent,vault,readAccepted:async(refresh=false)=>{
   if(!refresh&&acceptedDelivery)return acceptedDelivery;const response=await fetchDelivery(`/api/profile/showcase/accepted-source?username=${encodeURIComponent(username)}`,{credentials:'same-origin',cache:'no-store'});
   if(!response.ok)throw TypeError('PROFILE_SHOWCASE_PREDECESSOR_DELIVERY_PENDING');return acceptedDelivery;
  }});
 const deliveries=new Map<string,Promise<ProfileShowcasePublicProjectionPublicationResult>>();
 const custody=createImportedProofSourceCustody();
 // Acknowledged immutable source closures are already stored by this transport.
 // Reuse their exact references; never download/reopen/re-upload old media just
 // to append one new Original. Finalization still admits the full successor.
 let initialDeliveryAccepted=false;
 const deliveredSources=new Set<string>();
 const acceptedHeads=new Set<string>();
 const sourceKey=(reference:import('./importedSourceReference').ImportedProofSourceReference)=>JSON.stringify(reference);
 const rememberDeliveredSources=async(source:ProfileShowcasePublicationSource)=>{for(const child of ('witnessNodes'in source?source.children:(source.child?[source.child]:[]))){const reference=await readImportedSourceTransportReference(child.exactSealedArtifactBytes);if(reference)deliveredSources.add(sourceKey(reference));}acceptedHeads.add(source.artifactDigest);};
 const deliver=(source:ProfileShowcasePublicationSource)=>{
  const held=deliveries.get(source.artifactDigest);if(held)return held;let prepared:ProfileShowcaseCompleteSourceTransport|undefined;
  input.assertCurrent();const result=publishProfileShowcaseTransport(source.artifactDigest,owner,input.fetchImpl,username,
   {publicationVersion:2,ownerReceizId:owner,artifactId,artifactDigest:source.artifactDigest,...account},()=>{input.assertCurrent();return account;},
   async()=>({actorAdmission:admitted,keyFile,passphrase:input.passphrase}),async()=>"unavailable" as const,async write=>{
    const cache=async(reference:import('../../transport/exactByteBlocks').ExactByteBlockReference,bytes:Uint8Array)=>{await custody.writeBlock(reference,bytes);await write(reference,bytes);};
    const options={exportImportedSource:async(reference:import('./importedSourceReference').ImportedProofSourceReference,writer:import('../../transport/exactByteBlocks').ExactByteBlockWriter)=>{if(!deliveredSources.has(sourceKey(reference)))await custody.exportBlocks(reference,writer);}};
    prepared='witnessNodes'in source?await writeProfileShowcaseCompleteSourceTransport(source,cache,options):await writeProfileShowcaseAcceptedTransitionTransport(source,cache,options);return prepared;
   }).then(async receipt=>{if(receipt.status==='published'){await rememberDeliveredSources(source);if(prepared)await incremental.acceptPublished(prepared);initialDeliveryAccepted=true;}return receipt;});
  deliveries.set(source.artifactDigest,result);return result;
 };
 return {async stage(file:File){input.assertCurrent();const source=await openImportedProofSource(file,{resolveSourceBlock:custody.resolveBlock,nestedColdSpool:custody.createColdSpool});if(source.projection.ownerReceizId!==admitted.ownerReceizId)throw new TypeError('PROFILE_SHOWCASE_CONNECTED_SOURCE_OWNER_MISMATCH');const reference=await custody.hold(source),{stageProfileShowcaseSourceBlocks}=await import('./sourceBlockPublication.client');await stageProfileShowcaseSourceBlocks({scope:{publicationVersion:2,ownerReceizId:owner,artifactId,artifactDigest:reference.artifactSha256,...account},fetchImpl:input.fetchImpl,assertCurrent:input.assertCurrent,exportBlocks:write=>custody.exportBlocks(reference,write)});return reference;},prepareContent:(draft:ComposerAssetDraft)=>prepareConnectedComposerContent({draft,ownerReceizId:admitted.ownerReceizId!,writeBlock:custody.writeBlock,assertCurrent:input.assertCurrent}),sealContent:(content:import("../composerPreparation").ComposerAssetContent)=>sealConnectedComposerContent({content,sealDocument,writeBlock:custody.writeBlock,assertCurrent:input.assertCurrent}),prepare:(draft:ComposerAssetDraft)=>prepareConnectedComposerSource({draft,ownerReceizId:admitted.ownerReceizId!,sealDocument,writeBlock:custody.writeBlock,assertCurrent:input.assertCurrent}),async publishOpened(opened:Awaited<ReturnType<typeof admitConnectedComposerSource>>,authorshipProof?:import("./importedSourceAuthorship").ImportedSourceAuthorshipProof){
  input.assertCurrent();const {source,reference}=opened,original=opened.original;
  if(authorshipProof){const result=await withProfileShowcaseCausalAppendLock(artifactId,()=>incremental.publish(opened,authorshipProof));if(!result)throw TypeError('PROFILE_SHOWCASE_SIGNING_CURRENT_HEAD_REQUIRED');input.assertCurrent();return result;}
  const authorizeMarket=undefined;
  if(!authorizeMarket){const result=await withProfileShowcaseCausalAppendLock(artifactId,()=>incremental.publish(opened));if(result){input.assertCurrent();return result;}}

  await withProfileShowcaseCausalAppendLock(artifactId,async()=>{input.assertCurrent();await recoverAcceptedShowcasePredecessor({username,artifactId,vault,fetchImpl:input.fetchImpl,retainImportedSources:async(complete,fromAcceptedTransport)=>{
    // Only an exact server-accepted head (or a receipt from this runtime) may
    // reuse remote media custody. A local, unacknowledged source still exports
    // its complete exact-byte closure through the unchanged transport below.
    if(fromAcceptedTransport||acceptedHeads.has(complete.artifactDigest)||complete.artifactDigest===accepted?.locator.acceptedArtifactDigest)await rememberDeliveredSources(complete);
    else await readAcceptedShowcasePredecessor({username,artifactId,vault,fetchImpl:input.fetchImpl,retainImportedSources:rememberDeliveredSources});
   }});input.assertCurrent();});
  const existing=await vault.resolveOriginalChildCustody(artifactId,original.id);
  const localAdmission=async(_firstPaint:ProfileShowcaseBoundedFirstPaint)=>{input.assertCurrent();retainImportedProfileOriginalMaterial(original,username,source);};
  if(!existing){
   const placement=await sealAndAdmitImportedSourcePlacement({source,reference,ownerReceizId:owner,immutableVersion:profileShowcaseLiveKaiUpulse(),seal:childSealer});input.assertCurrent();
   await publishComposerBoundedShowcaseIfAuthorized({importedPlacement:placement,renderedSealedArtifact:source.exactArtifact,username,
    actorId:admitted.actor.actorId,actorAdmission:admitted,showcaseArtifactId:artifactId,keyFile,passphrase:input.passphrase,routeProjection:placement.original,boundedVault:vault,sealDocument,childSealer,
    loadCompleteLegacyShowcase:()=>loadCompleteLegacyProfileShowcase({username,fetchPage:async cursor=>{input.assertCurrent();const response=await input.fetchImpl(`/api/profile/${username}/originals?source=inventory${cursor?`&cursor=${encodeURIComponent(cursor)}`:""}`);if(!response.ok)throw new TypeError("PROFILE_SHOWCASE_CONNECTED_INVENTORY_PENDING");const body=await response.json();if(body.ok!==true||!Array.isArray(body.originals))throw new TypeError("PROFILE_SHOWCASE_CONNECTED_INVENTORY_PENDING");return{originals:body.originals,hasMore:body.page?.hasMore===true,nextCursor:body.page?.nextCursor??null};}}),
    publishPublicProjection:deliver,onLocalAdmission:localAdmission});
  }else{const firstPaint=await vault.readFirstPaint(artifactId);if(!firstPaint)throw new TypeError("PROFILE_SHOWCASE_CONNECTED_LOCAL_ADMISSION_REQUIRED");await localAdmission(firstPaint);}
  // With no accepted Source prefix, the genuine initial migration+append is
  // missing publication input. Its full bootstrap is never an append fallback.
  if(!initialDeliveryAccepted&&acceptedDelivery&&typeof acceptedDelivery==='object'&&'status'in acceptedDelivery&&acceptedDelivery.status==='unmigrated'){
   const complete=await vault.exportCompleteSource(artifactId);if(!complete)throw TypeError('PROFILE_SHOWCASE_CONNECTED_COMPLETE_SOURCE_REQUIRED');const result=await deliver(complete);input.assertCurrent();if(result.status!=='published')deliveries.delete(complete.artifactDigest);return result;
  }
  input.assertCurrent();const head=await vault.readPublicationHead(artifactId);if(!head)throw new TypeError("PROFILE_SHOWCASE_CONNECTED_SOURCE_REQUIRED");
  const ensured=await ensureCurrentProfileShowcasePublicProjection(vault,artifactId,deliver,{readRoute:()=>{input.assertCurrent();return account;}});input.assertCurrent();
  const pending=deliveries.get(head.artifactDigest),result=pending?await pending:{status:"pending"as const,code:ensured.code??"PROFILE_SHOWCASE_PUBLICATION_PENDING"};if(result.status!=="published")deliveries.delete(head.artifactDigest);return result;
 }};
}

/** Byte servant for already canonically opened composer manifests. */
export async function resolveComposerBlock(reference:import("../../transport/exactByteBlocks").ExactByteBlockReference):Promise<Uint8Array>{return createImportedProofSourceCustody().resolveBlock(reference);}
