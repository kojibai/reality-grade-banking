import type {HeldDeposit} from './deposit-source';
import type {OpenIdentity} from './native-identity';
import type {AssetComposerDraft} from './asset-composer';
import {loadAssetPublicationRuntime} from './asset-publication-runtime';
import {retainedAssetPublicationSource} from './asset-publication-adoption';
type OpenedFileSource=Readonly<{reference:{artifactSha256:string};source:{projection:{ownerReceizId:string|null;bankAsset?:{composer?:{files:readonly {id:string;role:string;name:string;mime:string;size:number;sha256:string}[]}}};composerResources?:Readonly<Record<string,Blob>>}}>;

const absentProof=new Set(['Missing proof bundle chunk (likely not the original sealed artifact).','Missing embedded PDF proof bundle.','Missing embedded HEIC proof bundle.','Missing embedded SVG proof bundle.','Missing embedded JSON proof bundle.','Missing trailer proof bundle.','Unsupported artifact format. Upload a sealed file, .receizbundle, or sealed package ZIP.']);

/** Primary-file sealing is part of the explicit creation Seal, never Save.
 * Reuse an existing sealed input exactly; a failed proof cannot be replaced. */
async function fileHasProof(bytes:Uint8Array,filename:string,mimeType:string){
 const {verifyReceizOfflineSealedFile}=await import('@receiz/sdk/offline');
 const verification=await verifyReceizOfflineSealedFile({bytes,filename,mimeType});
 if(verification.ok)return true;
 if(verification.bundle||verification.errors.length!==1||!absentProof.has(verification.errors[0]!))throw Error('ORIGINAL_FILE_PROOF_INVALID');
 return false;
}
export async function prepareCreatedAssetPrimary(input:{draft:AssetComposerDraft;assertCurrent():void;seal(input:{bytes:Uint8Array;filename:string;mimeType:string}):Promise<{artifactBytes:Uint8Array;filename:string;mimeType:string;verification:{ok:boolean}}> }):Promise<AssetComposerDraft>{
 const primary=input.draft.files.find(value=>value.role==='primary');if(!primary)return input.draft;
 input.assertCurrent();const bytes=new Uint8Array(await primary.file.arrayBuffer());input.assertCurrent();
 if(await fileHasProof(bytes,primary.file.name,primary.file.type)){input.assertCurrent();return input.draft;}
 input.assertCurrent();const sealed=await input.seal({bytes,filename:primary.file.name,mimeType:primary.file.type||'application/octet-stream'});input.assertCurrent();
 if(!sealed.verification.ok||/\.receizbundle$/i.test(sealed.filename))throw Error('ORIGINAL_FILE_FORMAT_REQUIRED');
 const file=new File([new Uint8Array(sealed.artifactBytes)],sealed.filename,{type:sealed.mimeType==='application/octet-stream'?primary.file.type:sealed.mimeType});
 return {...input.draft,files:input.draft.files.map(value=>value===primary?{...value,file}:value)};
}
/** Save only the already-sealed primary held by the exact composer Original.
 * It never creates a seal, exports a new record, or replaces the parent Source. */
export async function createdAssetOriginalFile(identity:OpenIdentity,result:HeldDeposit,assertCurrent:()=>void):Promise<File>{
 assertCurrent();
 const file=retainedAssetPublicationSource(result.digest)??new File([new Uint8Array(result.bytes)],result.filename,{type:'application/vnd.receiz.bundle+json'});
 const username=identity.accountUsername?.()??identity.username,owner=identity.binding?.artifactOwnerReceizId;
 if(!username||!owner)throw Error('ORIGINAL_FILE_OWNER_REQUIRED');
 const runtime=await loadAssetPublicationRuntime();assertCurrent();
 const opened=await runtime.admitConnectedComposerSource({file,ownerReceizId:owner,username,assertCurrent}) as OpenedFileSource;
 assertCurrent();
 if(opened.reference.artifactSha256!==result.digest||opened.source.projection.ownerReceizId!==owner)throw Error('ORIGINAL_FILE_SOURCE_MISMATCH');
 const primary=opened.source.projection.bankAsset?.composer?.files.find(value=>value.role==='primary');
 if(!primary)return file;
 const payload=opened.source.composerResources?.[primary.id];
 if(!payload||payload.size!==primary.size)throw Error('ORIGINAL_FILE_SOURCE_UNAVAILABLE');
 const bytes=new Uint8Array(await payload.arrayBuffer());assertCurrent();
 const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(value=>value.toString(16).padStart(2,'0')).join('');assertCurrent();
 if(digest!==primary.sha256)throw Error('ORIGINAL_FILE_SOURCE_MISMATCH');
 // Preserve the complete existing Original for pre-fix creations that never
 // retained a standalone sealed primary. Saving must not manufacture its seal.
 if(!await fileHasProof(bytes,primary.name,primary.mime))return file;
 assertCurrent();return new File([bytes],primary.name,{type:primary.mime});
}
