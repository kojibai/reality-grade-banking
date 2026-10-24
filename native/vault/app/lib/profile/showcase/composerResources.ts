import {sha256} from "@noble/hashes/sha2.js";
import {bytesToHex} from "@noble/hashes/utils.js";
import {readExactByteBlocks,type ExactByteBlockResolver} from "../../transport/exactByteBlocks";
import type {ComposerAssetContent} from "../composerPreparation";
import {readComposerCapacity} from "../composerPreparation";
import {rejectImportedSourceRecoveryBlob} from "./importedSourcePrivacy";
import {ImportedProofSourceUnavailableError} from "./importedSourceErrors";
/** Only interpreted beneath canonical enclosing-source verification. The host
 * resolver supplies bytes, never authority. Every committed file must close. */
export async function openComposerResources(content:ComposerAssetContent,resolve:ExactByteBlockResolver|undefined,reserve:(bytes:number)=>void,readBlock:()=>void):Promise<Readonly<Record<string,Blob>>>{
 const unavailable=():never=>{throw new ImportedProofSourceUnavailableError("IMPORTED_SOURCE_COMPOSER_RESOURCE_UNAVAILABLE","VERIFICATION_RESOURCE_UNAVAILABLE","verified");};
 if(content.files.length&&!resolve)unavailable();
 const capacity=readComposerCapacity(),resources:Record<string,Blob>=Object.create(null);let total=0;
 for(const file of content.files){
  total+=file.size;if(total>capacity.maxTotalBytes||file.size>(file.role==="cover"?capacity.maxCoverBytes:file.role==="attachment"?capacity.maxAttachmentBytes:capacity.maxPrimaryBytes[content.kind]??0))unavailable();
  reserve(file.size);const chunks:Blob[]=[],hash=sha256.create();
  try{
   for await(const bytes of readExactByteBlocks(file.bytes,async ref=>{readBlock();return resolve!(ref);},{component:"composer resource",maxContentBytes:file.size,maxBlockReads:131072})){
    hash.update(bytes);chunks.push(new Blob([bytes.slice().buffer as ArrayBuffer]));
   }
  }catch(error){if(error instanceof Error&&error.message==="EXACT_BYTE_BLOCK_MISSING")unavailable();throw error;}
  if(bytesToHex(hash.digest())!==file.sha256)throw new TypeError("IMPORTED_SOURCE_COMPOSER_RESOURCE_BINDING_INVALID");
  const blob=new Blob(chunks,{type:file.mime});await rejectImportedSourceRecoveryBlob(blob);resources[file.id]=blob;
 }
 return Object.freeze(resources);
}
