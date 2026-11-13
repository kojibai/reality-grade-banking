"use client";
import {sha256} from "@noble/hashes/sha2.js";
import {bytesToHex} from "@noble/hashes/utils.js";
import {jcsCanonicalize} from "@/app/utils/jcs";
import {validateComposerAssetDraft,readComposerCapacity,readComposerAssetContent,readComposerCreatorUsername,composerFileMime,composerRequiresProtectedOriginal,type ComposerAssetDraft,type ComposerAssetContent,type ComposerAssetFile,type ComposerProtectedOriginal,type PreparedComposerSource} from "./composerPreparation";
import {writeExactByteBlocks,type ExactByteBlockWriter} from "../transport/exactByteBlocks";
import {parseImportedProofSourceReference} from "./showcase/importedSource";
import {rejectImportedSourceRecoveryBlob} from "./showcase/importedSourcePrivacy";
import type {receizeDocumentBytesClient} from "../documentSeal/receizeDocumentBytesClient";
export type ComposerDocumentSealer=(input:Parameters<typeof receizeDocumentBytesClient>[0])=>Promise<Pick<Awaited<ReturnType<typeof receizeDocumentBytesClient>>,"artifactBytes"|"downloadName"|"kind">>;
function requirePreparedOriginalCustody(content:Pick<ComposerAssetContent,'kind'|'collection'>,protectedOriginal:unknown){
 if(content.kind!=="moment"&&composerRequiresProtectedOriginal(content.collection)&&!protectedOriginal)throw new TypeError("COMPOSER_PROTECTED_ORIGINAL_CUSTODY_REQUIRED");
}
export async function prepareConnectedComposerContent(input:{draft:ComposerAssetDraft;ownerReceizId:string;creatorUsername?:string;writeBlock?:ExactByteBlockWriter;writeProtectedBlock?:ExactByteBlockWriter;assertCurrent():void}):Promise<ComposerAssetContent>{
 input.assertCurrent();const draft=validateComposerAssetDraft(input.draft,readComposerCapacity());
 const creatorUsername=readComposerCreatorUsername(input.creatorUsername);
 if(!/^[A-Za-z0-9_.:@-]{3,160}$/u.test(input.ownerReceizId))throw new TypeError("COMPOSER_OWNER_REQUIRED");
 requirePreparedOriginalCustody(draft,draft.protectedOriginal);
 if(draft.protectedOriginal&&typeof input.writeProtectedBlock!=="function")throw new TypeError("COMPOSER_PROTECTED_ORIGINAL_CUSTODY_REQUIRED");
 const writeBlock=input.writeBlock??(await import("./showcase/importedSourceCustody.client")).createImportedProofSourceCustody().writeBlock;
 let protectedOriginal:ComposerProtectedOriginal|undefined;
 if(draft.protectedOriginal){
  const selected=draft.protectedOriginal,writeProtectedBlock=input.writeProtectedBlock!;
  // The host supplies its owner-protected custody port explicitly. Private
  // bytes never enter anonymous imported-source IDB or its public writer.
  input.assertCurrent();await rejectImportedSourceRecoveryBlob(selected.file);input.assertCurrent();
  const hash=sha256.create(),bytes=await writeExactByteBlocks(selected.file,async(reference,block)=>{input.assertCurrent();if(reference.kind==="bytes")hash.update(block);await writeProtectedBlock(reference,block);input.assertCurrent();});
  protectedOriginal=Object.freeze({profileIdentity:selected.profileIdentity,file:Object.freeze({id:"protected-original",role:"primary",name:selected.file.name,mime:composerFileMime(selected.file),size:selected.file.size,sha256:bytesToHex(hash.digest()),bytes})});
 }
 const files:ComposerAssetFile[]=[];
 for(const selected of draft.files){
  input.assertCurrent();await rejectImportedSourceRecoveryBlob(selected.file);input.assertCurrent();const hash=sha256.create();
  if(protectedOriginal&&selected.file.size===protectedOriginal.file.size){
   // A distinct File object can still contain the private Original. Compare
   // its exact bytes before allowing any block into public custody.
   const candidateHash=sha256.create(),candidate=await writeExactByteBlocks(selected.file,async(reference,block)=>{input.assertCurrent();if(reference.kind==="bytes")candidateHash.update(block);});
   if(bytesToHex(candidateHash.digest())===protectedOriginal.file.sha256||candidate.sha256===protectedOriginal.file.bytes.sha256)throw new TypeError("COMPOSER_PROTECTED_ORIGINAL_PUBLIC_ALIAS");
  }
  const bytes=await writeExactByteBlocks(selected.file,async(reference,block)=>{input.assertCurrent();if(reference.kind==="bytes")hash.update(block);await writeBlock(reference,block);input.assertCurrent();});
  const {file,...description}=selected;
  files.push(Object.freeze({...description,name:file.name,mime:composerFileMime(file),size:file.size,sha256:bytesToHex(hash.digest()),bytes}));
 }
 const metadata={...(protectedOriginal?{protectedOriginal}:{}),...(draft.collection?{collection:draft.collection}:{}),...(draft.definition?{definition:draft.definition}:{}),title:draft.title,description:draft.description,kind:draft.kind,longForm:draft.longForm,...(draft.music?{music:draft.music}:{}),...(draft.book?{book:draft.book}:{})};
 const content:ComposerAssetContent=Object.freeze({schema:"receiz.bank.asset-content.v2",ownerReceizId:input.ownerReceizId,...(creatorUsername!==undefined?{creatorUsername}:{}),...metadata,files:Object.freeze(files)});
 return protectedOriginal?readComposerAssetContent(content,input.ownerReceizId):content;
}
export async function sealConnectedComposerContent(input:{content:ComposerAssetContent;sealDocument:ComposerDocumentSealer;writeBlock?:ExactByteBlockWriter;assertCurrent():void}):Promise<PreparedComposerSource>{
 input.assertCurrent();const content=readComposerAssetContent(input.content,input.content.ownerReceizId);
 requirePreparedOriginalCustody(content,content.protectedOriginal);
 const writeBlock=input.writeBlock??(await import("./showcase/importedSourceCustody.client")).createImportedProofSourceCustody().writeBlock;
 const payloadBytes=new TextEncoder().encode(jcsCanonicalize(content));
 const {prepareNativeProofObjectSeal}=await import("../documentSeal/prepareNativeProofObjectSeal");
 const prepared=await prepareNativeProofObjectSeal({fileBytes:payloadBytes,filename:"asset-content.json",mime:"application/json",ownerReceizId:content.ownerReceizId});input.assertCurrent();
 const sealed=await input.sealDocument({fileBytes:prepared.fileBytes,filename:prepared.filename,mime:prepared.mime,options:{forceBundleEnvelope:true,nativeRecordSeal:prepared.nativeRecordSeal,...(content.description?{claimSha256Hex:bytesToHex(sha256(new TextEncoder().encode(content.description)))}:{})}});input.assertCurrent();
 const exact=Uint8Array.from(sealed.artifactBytes),artifact=new File([exact.buffer],sealed.downloadName,{type:sealed.kind==="bundle"?"application/vnd.receiz.bundle+json":"application/octet-stream"});
 const bytes=await writeExactByteBlocks(artifact,async(reference,block)=>{input.assertCurrent();await writeBlock(reference,block);input.assertCurrent();});
 const reference=parseImportedProofSourceReference({schema:"receiz.imported-proof-source.v1",artifactSha256:bytesToHex(sha256(exact)),byteLength:artifact.size,filename:artifact.name,mimeType:artifact.type,bytes});
 return Object.freeze({artifact,reference,content});
}

export async function prepareConnectedComposerSource(input:{draft:ComposerAssetDraft;ownerReceizId:string;creatorUsername?:string;sealDocument:ComposerDocumentSealer;writeBlock?:ExactByteBlockWriter;writeProtectedBlock?:ExactByteBlockWriter;assertCurrent():void}):Promise<PreparedComposerSource>{
 const content=await prepareConnectedComposerContent(input);return sealConnectedComposerContent({...input,content});
}
