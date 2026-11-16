import type {HeldDeposit} from './deposit-source';
import type {OpenIdentity} from './native-identity';
import type {AssetComposerDraft} from './asset-composer';
import {loadAssetPublicationRuntime} from './asset-publication-runtime';
import {retainedAssetPublicationSource} from './asset-publication-adoption';
import {openCanonicalProofFile} from './proof-capture';
import {detectDocumentFormat} from '../../native/receiz/app/lib/documentSeal/fileFormat';
type SourceFile=Readonly<{id:string;role:string;name:string;mime:string;size:number;sha256:string;bytes:import('../../native/receiz/packages/receiz-sdk/src/exactByteBlocks').ExactByteBlockReference}>;
type OpenedFileSource=Readonly<{reference:{artifactSha256:string};source:{projection:{ownerReceizId:string|null;bankAsset?:{composer?:{files:readonly SourceFile[];protectedOriginal?:{profileIdentity:string;file:SourceFile}}}};composerResources?:Readonly<Record<string,Blob>>}}>;

const absentProof=new Set(['Missing proof bundle chunk (likely not the original sealed artifact).','Missing embedded PDF proof bundle.','Missing embedded HEIC proof bundle.','Missing embedded SVG proof bundle.','Missing embedded JSON proof bundle.','Missing trailer proof bundle.','Unsupported artifact format. Upload a sealed file, .receizbundle, or sealed package ZIP.']);

/** Primary-file sealing is part of the explicit creation Seal, never Save.
 * Reuse an existing sealed input exactly; a failed proof cannot be replaced. */
async function fileHasProof(bytes:Uint8Array,filename:string,mimeType:string){
 const {verifyReceizOfflineSealedFile}=await import('@receiz/sdk/offline');
 const verification=await verifyReceizOfflineSealedFile({bytes,filename,mimeType});
 if(verification.denial?.code==='VERIFICATION_RESOURCE_UNAVAILABLE')throw Error('ORIGINAL_FILE_PROOF_UNAVAILABLE');
 if(verification.ok)return true;
 if(verification.bundle||verification.errors.length!==1||!absentProof.has(verification.errors[0]!))throw Error('ORIGINAL_FILE_PROOF_INVALID');
 return false;
}
export async function prepareCreatedAssetPrimary(input:{draft:AssetComposerDraft;profileIdentity?:string;assertCurrent():void;seal(input:{bytes:Uint8Array;filename:string;mimeType:string}):Promise<{artifactBytes:Uint8Array;filename:string;mimeType:string;verification:{ok:boolean}}> }):Promise<AssetComposerDraft>{
 const primary=input.draft.files.find(value=>value.role==='primary');if(!primary)return input.draft;
 const policy=input.draft.collection,protectedFile=policy&&(!policy.allowOriginalDownload||policy.originalDownloadLimit!==null||policy.originalDownloadPriceCents!==null||policy.gateAudioPlayback);
 if(protectedFile){
  if(!input.profileIdentity||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(input.profileIdentity))throw Error('COMPOSER_PRIVATE_ORIGINAL_OWNER_REQUIRED');
  input.assertCurrent();const runtime=await loadAssetPublicationRuntime(),opened=await runtime.readComposerPrimaryFile(primary.file);input.assertCurrent();
  let file=primary.file,preview=opened.payload;
  if(!opened.verification.ok){
   const verification=opened.verification;
   if(verification.bundle||verification.errors.length!==1||!absentProof.has(verification.errors[0]!))throw Error('ORIGINAL_FILE_PROOF_INVALID');
   const sealed=await input.seal({bytes:new Uint8Array(await primary.file.arrayBuffer()),filename:primary.file.name,mimeType:primary.file.type||'application/octet-stream'});input.assertCurrent();
   if(!sealed.verification.ok||/\.receizbundle$/i.test(sealed.filename))throw Error('ORIGINAL_FILE_FORMAT_REQUIRED');
   file=new File([new Uint8Array(sealed.artifactBytes)],sealed.filename,{type:sealed.mimeType==='application/octet-stream'?primary.file.type:sealed.mimeType});preview=primary.file;
  }
  if(!preview)throw Error('COMPOSER_PRIVATE_ORIGINAL_PREVIEW_UNAVAILABLE');
  const files=input.draft.files.filter(value=>value!==primary);
  if(input.draft.kind==='image'){
   const {prepareProfileImage}=await import('./profile-image');const publicImage=await prepareProfileImage(preview,'banner',16*1024*1024);input.assertCurrent();
   files.push({...primary,file:publicImage});
  }else if(input.draft.kind==='video'||input.draft.kind==='audio'&&!policy.gateAudioPlayback){files.push({...primary,file:preview});}
  return {...input.draft,files,protectedOriginal:{profileIdentity:input.profileIdentity,file}};
 }
 input.assertCurrent();const bytes=new Uint8Array(await primary.file.arrayBuffer());input.assertCurrent();
 if(await fileHasProof(bytes,primary.file.name,primary.file.type)){input.assertCurrent();return input.draft;}
 input.assertCurrent();const sealed=await input.seal({bytes,filename:primary.file.name,mimeType:primary.file.type||'application/octet-stream'});input.assertCurrent();
 if(!sealed.verification.ok||/\.receizbundle$/i.test(sealed.filename))throw Error('ORIGINAL_FILE_FORMAT_REQUIRED');
 const file=new File([new Uint8Array(sealed.artifactBytes)],sealed.filename,{type:sealed.mimeType==='application/octet-stream'?primary.file.type:sealed.mimeType});
 return {...input.draft,files:input.draft.files.map(value=>value===primary?{...value,file}:value)};
}
/** MIME follows the verified native carrier; trailer formats stay opaque. */
async function preserveVerifiedOriginalFile(file:File,opened:Awaited<ReturnType<typeof openCanonicalProofFile>>,assertCurrent:()=>void):Promise<File>{
 let kind=opened.verification.kind;
 if(opened.verification.carriedAuthorship){
  kind=detectDocumentFormat(new Uint8Array(await file.arrayBuffer()),{filename:file.name,mime:file.type});assertCurrent();
 }
 const mime=({png:'image/png',pdf:'application/pdf',svg:'image/svg+xml',json:'application/json',heic:'image/heic',bundle:'application/vnd.receiz.bundle+json'} as Record<string,string>)[kind]??'application/octet-stream';
 return file.type===mime?file:new File([file],file.name,{type:mime});
}
/** Save only the already-sealed primary held by the exact composer Original.
 * It never creates a seal, exports a new record, or replaces the parent Source. */
export async function createdAssetOriginalFile(identity:OpenIdentity,result:HeldDeposit,assertCurrent:()=>void):Promise<File>{
 assertCurrent();
 const file=retainedAssetPublicationSource(result.digest)??new File([new Uint8Array(result.bytes)],result.filename,{type:/\.receizbundle$/i.test(result.filename)?'application/vnd.receiz.bundle+json':'application/octet-stream'});
 const owner=identity.binding?.artifactOwnerReceizId;if(!owner)throw Error('ORIGINAL_FILE_OWNER_REQUIRED');
 // Read the exact private proof before selecting any composer custody. An
 // already-authored native file carries its stronger enclosing Source and PBI;
 // unwrapping it would discard proof that is already present in these bytes.
 const canonical=await openCanonicalProofFile(file);assertCurrent();
 if(canonical.sealedArtifact.artifactSha256!==result.digest||canonical.sealedArtifact.continuity.ownerReceizId!==owner)throw Error('ORIGINAL_FILE_SOURCE_MISMATCH');
 if(canonical.verification.carriedAuthorship)return preserveVerifiedOriginalFile(file,canonical,assertCurrent);
 let content:unknown;
 if(canonical.verifiedPayload.mimeType==='application/json')try{content=JSON.parse(new TextDecoder().decode(canonical.verifiedPayload.bytes));}catch{/* Ordinary verified JSON remains its complete native proof. */}
 const directComposer=!!content&&typeof content==='object'&&(content as {schema?:unknown}).schema==='receiz.bank.asset-content.v2';
 const continuity=canonical.verification.assetContinuity as {state?:unknown;carrier?:unknown;document?:{payload?:{mimeType?:unknown}}}|undefined;
 // The canonical imported-source placement already binds its nested Source.
 // Let the existing importer resolve that verified reference and native primary.
 const sourcePlacement=continuity?.state==='verified'&&continuity.carrier==='portable_asset'&&continuity.document?.payload?.mimeType==='application/vnd.receiz.imported-proof-source+json';
 if(!directComposer&&!sourcePlacement)return preserveVerifiedOriginalFile(file,canonical,assertCurrent);
 const username=identity.accountUsername?.()??identity.username;if(!username)throw Error('ORIGINAL_FILE_OWNER_REQUIRED');
 const runtime=await loadAssetPublicationRuntime();assertCurrent();
 const opened=await runtime.admitConnectedComposerSource({file,ownerReceizId:owner,username,assertCurrent}) as OpenedFileSource;
 assertCurrent();
 if(opened.reference.artifactSha256!==result.digest||opened.source.projection.ownerReceizId!==owner)throw Error('ORIGINAL_FILE_SOURCE_MISMATCH');
 const composer=opened.source.projection.bankAsset?.composer,protectedOriginal=composer?.protectedOriginal;
 if(!composer)return preserveVerifiedOriginalFile(file,canonical,assertCurrent);
 const primary=protectedOriginal?.file??composer?.files.find(value=>value.role==='primary');
 if(!primary){const authored=await runtime.readComposerAuthoredFile({file,originalFile:file,ownerReceizId:owner,username,assertCurrent});assertCurrent();if(result.pbiSigned&&!authored)throw Error('ORIGINAL_FILE_SIGNATURE_SOURCE_UNAVAILABLE');return authored??file;}
 let payload:Blob|undefined;
 if(protectedOriginal){
  if(protectedOriginal.profileIdentity!==identity.walletReceivingAddress?.()||!identity.binding?.artifactSha256)throw Error('ORIGINAL_FILE_OWNER_REQUIRED');
  const [{readExactByteBlocks},{composerOriginalCustody}]=await Promise.all([import('../../native/receiz/packages/receiz-sdk/src/exactByteBlocks'),import('./composer-original-custody')]);assertCurrent();
  const custody=composerOriginalCustody(identity.binding,assertCurrent),parts:Blob[]=[];
  for await(const bytes of readExactByteBlocks(primary.bytes,custody.resolveProtectedBlock,{component:'saved composer Original',maxContentBytes:primary.size,maxBlockReads:131072})){assertCurrent();parts.push(new Blob([bytes.slice().buffer as ArrayBuffer]));}
  payload=new Blob(parts,{type:primary.mime});
 }else payload=opened.source.composerResources?.[primary.id];
 if(!payload||payload.size!==primary.size)throw Error('ORIGINAL_FILE_SOURCE_UNAVAILABLE');
 const bytes=new Uint8Array(await payload.arrayBuffer());assertCurrent();
 const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(value=>value.toString(16).padStart(2,'0')).join('');assertCurrent();
 if(digest!==primary.sha256)throw Error('ORIGINAL_FILE_SOURCE_MISMATCH');
 const originalFile=new File([bytes],primary.name,{type:primary.mime});
 const authored=await runtime.readComposerAuthoredFile({file,originalFile,ownerReceizId:owner,username,assertCurrent});assertCurrent();
 if(authored)return authored;
 if(result.pbiSigned)throw Error('ORIGINAL_FILE_SIGNATURE_SOURCE_UNAVAILABLE');
 // Preserve the complete existing Original for pre-fix creations that never
 // retained a standalone sealed primary. Saving must not manufacture its seal.
 if(!await fileHasProof(bytes,primary.name,primary.mime)){if(protectedOriginal)throw Error('ORIGINAL_FILE_PROOF_INVALID');return file;}
 assertCurrent();return originalFile;
}
