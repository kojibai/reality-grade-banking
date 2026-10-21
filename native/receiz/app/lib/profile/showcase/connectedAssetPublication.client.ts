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
import {recoverAcceptedShowcasePredecessor} from "./acceptedPredecessorRecovery.client";
import {readRecoveredAccountShowcaseScope} from "./recoveredAccountScope.client";
import {loadCompleteLegacyProfileShowcase} from "./composerLegacyMigration";
import {publishProfileShowcasePublicProjection,type ProfileShowcasePublicProjectionPublicationResult} from "./publicProjectionPublication";
import type {ProfileShowcaseCompletePublicSource,ProfileShowcaseBoundedFirstPaint} from "./boundedEdgeVault";
import type {ProfileShowcaseArtifactId} from "./types";
import {retainImportedProfileOriginalMaterial} from "../materialProjection.client";
export type ConnectedAssetLocalAdmission=Readonly<{username:string;original:import("../types").ProfileOriginal;sourceReference:import("./importedSourceReference").ImportedProofSourceReference;firstPaint:ProfileShowcaseBoundedFirstPaint}>;
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
 const deliver=(source:ProfileShowcaseCompletePublicSource)=>{
  const held=deliveries.get(source.artifactDigest);if(held)return held;
  input.assertCurrent();const result=publishProfileShowcasePublicProjection(source,owner,input.fetchImpl,username,
   {publicationVersion:2,ownerReceizId:owner,artifactId,artifactDigest:source.artifactDigest,...account},()=>{input.assertCurrent();return account;},
   async()=>({actorAdmission:admitted,keyFile,passphrase:input.passphrase}),async()=>"unavailable" as const);
  deliveries.set(source.artifactDigest,result);return result;
 };
 const custody=createImportedProofSourceCustody();
 return {prepareContent:(draft:ComposerAssetDraft)=>prepareConnectedComposerContent({draft,ownerReceizId:admitted.ownerReceizId!,writeBlock:custody.writeBlock,assertCurrent:input.assertCurrent}),sealContent:(content:import("../composerPreparation").ComposerAssetContent)=>sealConnectedComposerContent({content,sealDocument,writeBlock:custody.writeBlock,assertCurrent:input.assertCurrent}),prepare:(draft:ComposerAssetDraft)=>prepareConnectedComposerSource({draft,ownerReceizId:admitted.ownerReceizId!,sealDocument,writeBlock:custody.writeBlock,assertCurrent:input.assertCurrent}),async publish(file:File){
  input.assertCurrent();
  const source=await openImportedProofSource(file,{resolveSourceBlock:custody.resolveBlock,nestedColdSpool:custody.createColdSpool});
  if(source.projection.ownerReceizId!==admitted.ownerReceizId)throw new TypeError("PROFILE_SHOWCASE_CONNECTED_SOURCE_OWNER_MISMATCH");
  const reference=await custody.hold(source),original=projectImportedSourceOriginal(source,reference);input.assertCurrent();
  await withProfileShowcaseCausalAppendLock(artifactId,async()=>{input.assertCurrent();await recoverAcceptedShowcasePredecessor({username,artifactId,vault,fetchImpl:input.fetchImpl,retainImportedSources:async complete=>{
    // The current complete source owns the visible child inventory; ancestry carries only sealed carrier bytes.
    for(const child of complete.children){
     const reference=await readImportedSourceTransportReference(child.exactSealedArtifactBytes);if(!reference)continue;
     // Root segments can survive an interrupted nested opening without a complete source record.
     try{const held=await custody.readHeld(reference);if(held){if(held.referencedSources?.length||held.projection.bankAsset?.composer)await custody.hold(held);await custody.exportBlocks(reference,async()=>{});continue;}}catch(error){if(!(error instanceof Error)||error.message!=="IMPORTED_SOURCE_CUSTODY_SEGMENT_MISSING")throw error;}
     input.assertCurrent();await custody.reopen(reference,async ref=>{
      try{return await custody.resolveBlock(ref);}catch(error){if(!(error instanceof Error)||error.message!=="IMPORTED_SOURCE_CUSTODY_SEGMENT_MISSING")throw error;}
      input.assertCurrent();const response=await input.fetchImpl(`/api/profile/showcase/accepted-source?username=${encodeURIComponent(username)}&block=${encodeURIComponent(JSON.stringify(ref))}`,{cache:"no-store"});if(!response.ok)throw new TypeError("PROFILE_SHOWCASE_PREDECESSOR_DELIVERY_PENDING");return new Uint8Array(await response.arrayBuffer());
     });input.assertCurrent();
    }
   }});input.assertCurrent();});
  const localAdmission=async(firstPaint:ProfileShowcaseBoundedFirstPaint)=>{input.assertCurrent();retainImportedProfileOriginalMaterial(original,username,source);await input.onLocalAdmission?.(Object.freeze({username,original,sourceReference:reference,firstPaint}));input.assertCurrent();};
  const existing=await vault.resolveOriginalChildCustody(artifactId,original.id);
  if(!existing){
   const placement=await sealAndAdmitImportedSourcePlacement({source,reference,ownerReceizId:owner,immutableVersion:profileShowcaseLiveKaiUpulse(),seal:childSealer});input.assertCurrent();
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
