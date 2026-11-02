"use client";
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
import {publishProfileShowcasePublicProjection,type ProfileShowcasePublicProjectionPublicationResult} from "./publicProjectionPublication";
import type {ProfileShowcaseCompletePublicSource,ProfileShowcaseBoundedFirstPaint} from "./boundedEdgeVault";
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
export async function createConnectedAssetPublicationRuntime(input:Readonly<{
 identity:Uint8Array;passphrase:string;account:Readonly<{uid:string;username:string}>;
 sealDocument:typeof receizeDocumentBytesClient;fetchImpl:typeof fetch;assertCurrent():void;onLocalAdmission?(admission:ConnectedAssetLocalAdmission):Promise<void>|void;
}>){
 input.assertCurrent();
 const admitted=await createReceizArtifactAdmissionEngine()(await verifyReceizArtifact(input.identity),{profile:"identity",identityPassphrase:input.passphrase});
 if(admitted.profile!=="identity"||admitted.verdict!=="canonical-identity"||!admitted.ownerReceizId)throw new TypeError("PROFILE_SHOWCASE_CONNECTED_IDENTITY_REQUIRED");
 const keyFile=await readReceizIdentityArtifact(input.identity);input.assertCurrent();
 const username=input.account.username.toLowerCase(),account={username,profileIdentity:input.account.uid};
 if(!/^[a-z0-9_]{3,24}$/.test(username)||!input.account.uid)throw new TypeError("PROFILE_SHOWCASE_CONNECTED_ACCOUNT_REQUIRED");
 const accepted=await readRecoveredAccountShowcaseScope({username,accountId:input.account.uid},input.fetchImpl);input.assertCurrent();
 const artifactId=accepted?.locator.showcaseArtifactId??`profile-showcase:${admitted.ownerReceizId}` as ProfileShowcaseArtifactId;
 const owner=artifactId.slice("profile-showcase:".length);
 const vault=createProfileShowcaseBoundedEdgeVault({resolveVerifiedCheckpointActorEvidence:async digest=>digest===admitted.artifactSha256?admitted:null});
 const sealDocument:typeof receizeDocumentBytesClient=async args=>{input.assertCurrent();const result=await input.sealDocument(args);input.assertCurrent();return result;};
 const childSealer:import("./composerChild").ComposerProfileOriginalChildSealer=async args=>{
  const sealed=await sealDocument({fileBytes:args.payloadBytes,filename:args.filename,mime:args.mimeType,options:{forceBundleEnvelope:true,nativeRecordSeal:{ownerReceizId:args.ownerReceizId,recordId:args.recordId}}});
  return new File([sealed.artifactBytes.slice()],sealed.downloadName,{type:sealed.kind==="bundle"?"application/vnd.receiz.bundle+json":"application/octet-stream"});
 };
 const deliveries=new Map<string,Promise<ProfileShowcasePublicProjectionPublicationResult>>();
 const custody=createImportedProofSourceCustody();
 // Acknowledged immutable source closures are already stored by this transport.
 // Reuse their exact references; never download/reopen/re-upload old media just
 // to append one new Original. Finalization still admits the full successor.
 const deliveredSources=new Set<string>();
 const acceptedHeads=new Set<string>();
 const sourceKey=(reference:import('./importedSourceReference').ImportedProofSourceReference)=>JSON.stringify(reference);
 const rememberDeliveredSources=async(source:ProfileShowcaseCompletePublicSource)=>{for(const child of source.children){const reference=await readImportedSourceTransportReference(child.exactSealedArtifactBytes);if(reference)deliveredSources.add(sourceKey(reference));}acceptedHeads.add(source.artifactDigest);};
 const deliver=(source:ProfileShowcaseCompletePublicSource)=>{
  const held=deliveries.get(source.artifactDigest);if(held)return held;
  input.assertCurrent();const result=publishProfileShowcasePublicProjection(source,owner,input.fetchImpl,username,
   {publicationVersion:2,ownerReceizId:owner,artifactId,artifactDigest:source.artifactDigest,...account},()=>{input.assertCurrent();return account;},
   async()=>({actorAdmission:admitted,keyFile,passphrase:input.passphrase}),async()=>"unavailable" as const,{exportImportedSource:async(reference,write)=>{if(!deliveredSources.has(sourceKey(reference)))await custody.exportBlocks(reference,write);}}).then(async receipt=>{if(receipt.status==='published')await rememberDeliveredSources(source);return receipt;});
  deliveries.set(source.artifactDigest,result);return result;
 };
 return {async stage(file:File){input.assertCurrent();const source=await openImportedProofSource(file,{resolveSourceBlock:custody.resolveBlock,nestedColdSpool:custody.createColdSpool});if(source.projection.ownerReceizId!==admitted.ownerReceizId)throw new TypeError('PROFILE_SHOWCASE_CONNECTED_SOURCE_OWNER_MISMATCH');const reference=await custody.hold(source),{stageProfileShowcaseSourceBlocks}=await import('./sourceBlockPublication.client');await stageProfileShowcaseSourceBlocks({scope:{publicationVersion:2,ownerReceizId:owner,artifactId,artifactDigest:reference.artifactSha256,...account},fetchImpl:input.fetchImpl,assertCurrent:input.assertCurrent,exportBlocks:write=>custody.exportBlocks(reference,write)});return reference;},prepareContent:(draft:ComposerAssetDraft)=>prepareConnectedComposerContent({draft,ownerReceizId:admitted.ownerReceizId!,writeBlock:custody.writeBlock,assertCurrent:input.assertCurrent}),sealContent:(content:import("../composerPreparation").ComposerAssetContent)=>sealConnectedComposerContent({content,sealDocument,writeBlock:custody.writeBlock,assertCurrent:input.assertCurrent}),prepare:(draft:ComposerAssetDraft)=>prepareConnectedComposerSource({draft,ownerReceizId:admitted.ownerReceizId!,sealDocument,writeBlock:custody.writeBlock,assertCurrent:input.assertCurrent}),async publish(file:File,authorizeMarket?:(input:import("../../../../packages/receiz-sdk/src/pbiLocalAuthorship").LocalPbiAuthorshipInput)=>Promise<import("./importedSourceAuthorship").ImportedSourceAuthorshipProof>){
  input.assertCurrent();
  const opened=await admitConnectedComposerSource({file,ownerReceizId:admitted.ownerReceizId!,username,assertCurrent:input.assertCurrent});
  const {source,reference}=opened;let original=opened.original;
  await withProfileShowcaseCausalAppendLock(artifactId,async()=>{input.assertCurrent();await recoverAcceptedShowcasePredecessor({username,artifactId,vault,fetchImpl:input.fetchImpl,retainImportedSources:async(complete,fromAcceptedTransport)=>{
    // Only an exact server-accepted head (or a receipt from this runtime) may
    // reuse remote media custody. A local, unacknowledged source still exports
    // its complete exact-byte closure through the unchanged transport below.
    if(fromAcceptedTransport||acceptedHeads.has(complete.artifactDigest)||complete.artifactDigest===accepted?.locator.acceptedArtifactDigest)await rememberDeliveredSources(complete);
    else await readAcceptedShowcasePredecessor({username,artifactId,vault,fetchImpl:input.fetchImpl,retainImportedSources:rememberDeliveredSources});
   }});input.assertCurrent();});
  const existing=await vault.resolveOriginalChildCustody(artifactId,original.id);
  const known=existing?JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(existing.verifiedRouteProjectionBytes)):null;
  let authorshipProof:import("./importedSourceAuthorship").ImportedSourceAuthorshipProof|undefined;
  if(authorizeMarket){
   if(known?.hasPbiSignature&&known.pbiAuthorshipProof){original=await(await import("./importedSourceAuthorship")).projectPbiSignedImportedSourceOriginal(source,reference,known.pbiAuthorshipProof);if(original.pbiReceiptHash!==known.pbiReceiptHash)throw new TypeError("IMPORTED_SOURCE_PBI_PROOF_INVALID");}
   else{const pbi=await import("./importedSourceAuthorship");authorshipProof=await authorizeMarket(await pbi.importedSourceAuthorshipInput(source,admitted.actor.actorId,profileShowcaseLiveKaiUpulse()));input.assertCurrent();original=await pbi.projectPbiSignedImportedSourceOriginal(source,reference,authorshipProof);input.assertCurrent();}
  }
  const localAdmission=async(firstPaint:ProfileShowcaseBoundedFirstPaint)=>{input.assertCurrent();retainImportedProfileOriginalMaterial(original,username,source);await input.onLocalAdmission?.(Object.freeze({username,original:sourceDisplay(original,source,username,input.account.uid),sourceReference:reference,firstPaint,artwork:sourceArtwork(source)}));input.assertCurrent();};
  if(!existing||authorshipProof){
   const placement=await sealAndAdmitImportedSourcePlacement({source,reference,ownerReceizId:owner,immutableVersion:profileShowcaseLiveKaiUpulse(),seal:childSealer,authorshipProof});input.assertCurrent();
   await publishComposerBoundedShowcaseIfAuthorized({importedPlacement:placement,renderedSealedArtifact:source.exactArtifact,username,
    actorId:admitted.actor.actorId,actorAdmission:admitted,showcaseArtifactId:artifactId,keyFile,passphrase:input.passphrase,routeProjection:placement.original,boundedVault:vault,sealDocument,childSealer,
    loadCompleteLegacyShowcase:()=>loadCompleteLegacyProfileShowcase({username,fetchPage:async cursor=>{input.assertCurrent();const response=await input.fetchImpl(`/api/profile/${username}/originals?source=inventory${cursor?`&cursor=${encodeURIComponent(cursor)}`:""}`);if(!response.ok)throw new TypeError("PROFILE_SHOWCASE_CONNECTED_INVENTORY_PENDING");const body=await response.json();if(body.ok!==true||!Array.isArray(body.originals))throw new TypeError("PROFILE_SHOWCASE_CONNECTED_INVENTORY_PENDING");return{originals:body.originals,hasMore:body.page?.hasMore===true,nextCursor:body.page?.nextCursor??null};}}),
    publishPublicProjection:deliver,onLocalAdmission:localAdmission});
  }else{const firstPaint=await vault.readFirstPaint(artifactId);if(!firstPaint)throw new TypeError("PROFILE_SHOWCASE_CONNECTED_LOCAL_ADMISSION_REQUIRED");await localAdmission(firstPaint);}
  input.assertCurrent();const complete=await vault.exportCompleteSource(artifactId);if(!complete)throw new TypeError("PROFILE_SHOWCASE_CONNECTED_COMPLETE_SOURCE_REQUIRED");
  const result=await deliver(complete);input.assertCurrent();if(result.status!=="published")deliveries.delete(complete.artifactDigest);return result;
 }};
}

/** Byte servant for already canonically opened composer manifests. */
export async function resolveComposerBlock(reference:import("../../transport/exactByteBlocks").ExactByteBlockReference):Promise<Uint8Array>{return createImportedProofSourceCustody().resolveBlock(reference);}
