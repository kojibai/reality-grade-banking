import {sha256} from '@noble/hashes/sha2.js';
import {bytesToHex} from '@noble/hashes/utils.js';
import type {ReceizOpenedArtifact} from '@receiz/sdk';
import type {ProfileEditor,ProfilePatch} from './profile-edit';
import type {AssetPublicationReceipt} from './asset-publication';
import {validateComposerAssetDraft,readComposerCapacity,readComposerAssetContent,composerFileMime,type AssetComposerDraft,type PreparedComposerSource,type ComposerAssetContent} from './asset-composer';
import {parseImportedProofSourceReference,type ImportedProofSourceReference} from '../../native/receiz/app/lib/profile/showcase/importedSourceReference';
const schema=(properties:Record<string,unknown>={},required:string[]=[])=>({type:'object',properties,required,additionalProperties:false});
/** Compatible tool descriptions only. The future chat caller supplies actual
 * native consent and selected Files privately, never as ordinary model text. */
export const businessProfileTools=Object.freeze([
 {name:'business_update_profile',access:'core',requiresOwnerApproval:true,description:'Save the profile details the owner chose, including their name, bio, links and public/privacy choices.',parameters:schema({patch:{type:'object',description:'Supported native profile fields only.'}},['patch'])},
 {name:'business_check_username',access:'core',requiresOwnerApproval:false,description:'Check an exact username through the existing account without renaming or creating an identity.',parameters:schema({username:{type:'string',pattern:'^[a-z0-9_]{3,24}$'}},['username'])},
 {name:'business_set_profile_image',access:'core',requiresOwnerApproval:true,description:'Set an owner-selected or actually created image as their profile picture or cover using the native upload.',parameters:schema({kind:{type:'string',enum:['avatar','banner']}},['kind'])},
 {name:'business_seal_object',access:'core',requiresOwnerApproval:true,description:'Seal the exact selected work as a private proof object, verify its enclosing Original, and retain native source references. This does not publish or fund it.',parameters:schema({title:{type:'string',maxLength:160},description:{type:'string',maxLength:2000},longForm:{type:'string',maxLength:100000},kind:{type:'string',enum:['moment','image','audio','video','epub','pdf','file']}},['title','description','longForm','kind'])},
 {name:'business_publish_object',access:'core',requiresOwnerApproval:true,description:'Publish the exact selected verified Original on the owner profile through native Showcase. Keep pending delivery separate from confirmed publication.',parameters:schema()},
] as const);
type VerifiedObject={digest:string;content:ComposerAssetContent};
export function createBusinessProfileTools(input:{accountUid:string;ownerReceizId:string;profile():Promise<ProfileEditor>;prepareOriginal(draft:AssetComposerDraft):Promise<PreparedComposerSource>;publication():Promise<{publish(file:File):Promise<AssetPublicationReceipt>}>;verifyOriginal(file:File):Promise<ReceizOpenedArtifact>;prepareImage?(file:File,kind:'avatar'|'banner'):Promise<File>;assertOpen():void}){
 // Immutable File bytes remain authority. This memo only reuses an existing
 // canonical admission; it creates no proof, issuer, token or custody store.
 const admitted=new WeakMap<File,VerifiedObject>();
 const check=()=>input.assertOpen();
 const verify=async(original:File):Promise<VerifiedObject>=>{
  check();const known=admitted.get(original);if(known)return known;
  const opened=await input.verifyOriginal(original);check();
  if(opened.sealedArtifact.kind!=='receiz.native-record-seal'||opened.sealedArtifact.continuity.ownerReceizId!==input.ownerReceizId)throw Error('BUSINESS_PROFILE_ORIGINAL_OWNER_MISMATCH');
  const content=readComposerAssetContent(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(opened.verifiedPayload.bytes)),input.ownerReceizId);
  const result={digest:opened.sealedArtifact.artifactSha256,content};if(!/^[a-f0-9]{64}$/.test(result.digest))throw Error('BUSINESS_PROFILE_ORIGINAL_INVALID');admitted.set(original,result);return result;
 };
 return Object.freeze({
  async updateProfile(patch:ProfilePatch){check();const editor=await input.profile();check();const result=await editor.update(patch);check();if(result.accountUid!==input.accountUid)throw Error('PROFILE_ACCOUNT_MISMATCH');return result;},
  async checkUsername(username:string){check();const editor=await input.profile();check();const result=await editor.availability(username);check();return result;},
  async setProfileImage(original:File,kind:'avatar'|'banner'){
   check();if(!['avatar','banner'].includes(kind))throw Error('PROFILE_IMAGE_INVALID');
   const prepare=input.prepareImage??(await import('./profile-image')).prepareProfileImage,prepared=await prepare(original,kind);check();
   const editor=await input.profile();check();if(!editor.uploadImage)throw Error('PROFILE_IMAGE_UNAVAILABLE');const result=await editor.uploadImage(prepared,kind);check();if(result.accountUid!==input.accountUid)throw Error('PROFILE_ACCOUNT_MISMATCH');return result;
  },
  async sealObject(draft:AssetComposerDraft):Promise<{original:File;sourceReference:ImportedProofSourceReference;view:{status:'sealed';title:string;sourceDigest:string}}>{
   check();const selected=validateComposerAssetDraft(draft,readComposerCapacity()),prepared=await input.prepareOriginal(selected);check();
   const source=await verify(prepared.artifact),reference=parseImportedProofSourceReference(prepared.reference);
   if(reference.artifactSha256!==source.digest||reference.byteLength!==prepared.artifact.size||reference.filename!==prepared.artifact.name||reference.mimeType!==prepared.artifact.type)throw Error('BUSINESS_PROFILE_ORIGINAL_REFERENCE_MISMATCH');
   const c=source.content;if(c.title!==selected.title||c.description!==selected.description||c.kind!==selected.kind||c.longForm!==selected.longForm||['definition','music','book'].some(key=>JSON.stringify(c[key as keyof typeof c])!==JSON.stringify(selected[key as keyof typeof selected]))||c.files.length!==selected.files.length||c.files.some((file,index)=>{const chosen=selected.files[index];return file.name!==chosen.file.name||file.size!==chosen.file.size||file.mime!==composerFileMime(chosen.file)||file.role!==chosen.role||file.id!==chosen.id||file.attachmentRole!==chosen.attachmentRole||file.description!==chosen.description;}))throw Error('BUSINESS_PROFILE_ORIGINAL_INTENT_MISMATCH');
   // This digest compares the selected bytes with the already verified source
   // payload. It never admits proof or replaces the enclosing Original.
   for(let index=0;index<selected.files.length;index++){
    const reader=selected.files[index].file.stream().getReader(),hash=sha256.create();
    try{for(;;){check();const part=await reader.read();check();if(part.done)break;hash.update(part.value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
    if(bytesToHex(hash.digest())!==c.files[index].sha256)throw Error('BUSINESS_PROFILE_ORIGINAL_INTENT_MISMATCH');
   }
   return Object.freeze({original:prepared.artifact,sourceReference:reference,view:{status:'sealed',title:c.title,sourceDigest:source.digest}});
  },
  async publishObject(original:File){
   check();const source=await verify(original),runtime=await input.publication();check();
   let receipt:AssetPublicationReceipt;
   try{receipt=await runtime.publish(original);}catch{check();return{status:'pending' as const,sourceDigest:source.digest,code:'BUSINESS_PROFILE_PUBLICATION_UNCONFIRMED'};}
   check();if(!receipt||typeof receipt!=='object'||Array.isArray(receipt))return{status:'pending' as const,sourceDigest:source.digest,code:'BUSINESS_PROFILE_PUBLICATION_UNCONFIRMED'};
   if(receipt.status==='published'){
    if(!/^[a-f0-9]{64}$/.test(receipt.artifactDigest)||!Number.isSafeInteger(receipt.operationCount)||receipt.operationCount<0||!Number.isSafeInteger(receipt.visibleChildCount)||receipt.visibleChildCount<0)return{status:'pending' as const,sourceDigest:source.digest,code:'BUSINESS_PROFILE_PUBLICATION_UNCONFIRMED'};
    return{status:'published' as const,sourceDigest:source.digest,showcaseArtifactDigest:receipt.artifactDigest,operationCount:receipt.operationCount,visibleChildCount:receipt.visibleChildCount};
   }
   if(!['pending','rejected'].includes(receipt.status)||typeof receipt.code!=='string'||!receipt.code)return{status:'pending' as const,sourceDigest:source.digest,code:'BUSINESS_PROFILE_PUBLICATION_UNCONFIRMED'};
   return{status:receipt.status,sourceDigest:source.digest,code:receipt.code};
  },
 });
}
