import {sha256} from '@noble/hashes/sha2.js';
import {bytesToHex} from '@noble/hashes/utils.js';
import {readExactByteBlocks,type ExactByteBlockResolver} from '../../transport/exactByteBlocks';
import {protectedComposerOriginalStoragePath} from '../composerPreparation';
import {requireOpenedImportedProofSource,type OpenedImportedProofSource} from './importedSource';

/** Explicit authoring only. The exact Original stays in owner-protected custody
 * and the existing private media bucket. Public Source export never gets it. */
export async function stageProtectedComposerOriginal(input:{source:OpenedImportedProofSource;profileIdentity:string;username:string;resolveProtectedBlock:ExactByteBlockResolver;fetchImpl:typeof fetch;assertCurrent():void}):Promise<void>{
 requireOpenedImportedProofSource(input.source);input.assertCurrent();
 const privateFile=input.source.projection.bankAsset?.composer?.protectedOriginal;if(!privateFile)return;
 if(typeof input.resolveProtectedBlock!=='function')throw new TypeError('COMPOSER_PROTECTED_ORIGINAL_CUSTODY_REQUIRED');
 if(privateFile.profileIdentity!==input.profileIdentity)throw Error('COMPOSER_PRIVATE_ORIGINAL_OWNER_MISMATCH');
 const file=privateFile.file,path=protectedComposerOriginalStoragePath(input.profileIdentity,file.sha256,file.name,file.mime);
 const tuple={privateOriginal:true,filename:file.name,mime:file.mime,sha256Hex:file.sha256,size:file.size};
 const plan=async(body:unknown)=>{
  input.assertCurrent();const response=await input.fetchImpl('/api/profile/originals/upload-signed',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json','x-receiz-profile-username':input.username},body:JSON.stringify(body)});input.assertCurrent();
  const value=await response.json();input.assertCurrent();
  const upload=value?.upload;
  if(!response.ok||value.ok!==true||!['crystal','supabase'].includes(value.provider)||!upload||upload.path!==path||upload.storage?.path!==path||upload.storage.bucket!=='receiz-profile-originals-private'||upload.sha256Hex!==file.sha256||upload.size!==file.size||upload.mime!==file.mime)throw Error('COMPOSER_PRIVATE_ORIGINAL_CUSTODY_PENDING');
  return value;
 };
 const initialized=await plan(tuple),upload=initialized.upload;
 if(upload.alreadyStored===true)return;
 if(typeof upload.signedUrl!=='string'||initialized.provider==='crystal'&&typeof upload.stagingObjectName!=='string')throw Error('COMPOSER_PRIVATE_ORIGINAL_CUSTODY_PENDING');
 const blobs:Blob[]=[],hash=sha256.create();
 for await(const bytes of readExactByteBlocks(file.bytes,reference=>{input.assertCurrent();return input.resolveProtectedBlock(reference);},{component:'protected composer Original',maxContentBytes:file.size,maxBlockReads:131072})){
  input.assertCurrent();hash.update(bytes);blobs.push(new Blob([bytes.slice().buffer as ArrayBuffer]));
 }
 if(bytesToHex(hash.digest())!==file.sha256)throw Error('COMPOSER_PRIVATE_ORIGINAL_BYTES_INVALID');
 const body=new Blob(blobs,{type:file.mime});if(body.size!==file.size)throw Error('COMPOSER_PRIVATE_ORIGINAL_BYTES_INVALID');
 input.assertCurrent();const saved=await input.fetchImpl(upload.signedUrl,{method:'PUT',credentials:'omit',redirect:'error',headers:{'content-type':file.mime,'x-upsert':'false'},body});input.assertCurrent();
 if(!saved.ok&&![409,412].includes(saved.status))throw Error('COMPOSER_PRIVATE_ORIGINAL_CUSTODY_PENDING');
 // Completion qualifies the exact already sealed file at its private destination;
 // a successful upload response alone is never a private custody acknowledgment.
 await plan({...tuple,action:'complete',path,...(initialized.provider==='crystal'?{stagingObjectName:upload.stagingObjectName}:{})});
}
