"use client";
import {sha256} from "@noble/hashes/sha2.js";
import {bytesToHex} from "@noble/hashes/utils.js";
import {jcsCanonicalize} from "@/app/utils/jcs";
import {validateComposerAssetDraft,readComposerCapacity,composerFileMime,type ComposerAssetDraft,type ComposerAssetContent,type ComposerAssetFile,type PreparedComposerSource} from "./composerPreparation";
import {writeExactByteBlocks,type ExactByteBlockWriter} from "../transport/exactByteBlocks";
import {parseImportedProofSourceReference} from "./showcase/importedSource";
import {rejectImportedSourceRecoveryBlob} from "./showcase/importedSourcePrivacy";
import type {receizeDocumentBytesClient} from "../documentSeal/receizeDocumentBytesClient";
export type ComposerDocumentSealer=(input:Parameters<typeof receizeDocumentBytesClient>[0])=>Promise<Pick<Awaited<ReturnType<typeof receizeDocumentBytesClient>>,"artifactBytes"|"downloadName"|"kind">>;
export async function prepareConnectedComposerSource(input:{draft:ComposerAssetDraft;ownerReceizId:string;sealDocument:ComposerDocumentSealer;writeBlock?:ExactByteBlockWriter;assertCurrent():void}):Promise<PreparedComposerSource>{
 input.assertCurrent();const draft=validateComposerAssetDraft(input.draft,readComposerCapacity());
 if(!/^[A-Za-z0-9_.:@-]{3,160}$/u.test(input.ownerReceizId))throw new TypeError("COMPOSER_OWNER_REQUIRED");
 const writeBlock=input.writeBlock??(await import("./showcase/importedSourceCustody.client")).createImportedProofSourceCustody().writeBlock;
 const files:ComposerAssetFile[]=[];
 for(const selected of draft.files){
  input.assertCurrent();await rejectImportedSourceRecoveryBlob(selected.file);input.assertCurrent();const hash=sha256.create();
  const bytes=await writeExactByteBlocks(selected.file,async(reference,block)=>{input.assertCurrent();if(reference.kind==="bytes")hash.update(block);await writeBlock(reference,block);input.assertCurrent();});
  const {file,...description}=selected;
  files.push(Object.freeze({...description,name:file.name,mime:composerFileMime(file),size:file.size,sha256:bytesToHex(hash.digest()),bytes}));
 }
 const metadata={title:draft.title,description:draft.description,kind:draft.kind,longForm:draft.longForm,...(draft.music?{music:draft.music}:{}),...(draft.book?{book:draft.book}:{})};
 const content:ComposerAssetContent=Object.freeze({schema:"receiz.bank.asset-content.v2",ownerReceizId:input.ownerReceizId,...metadata,files:Object.freeze(files)});
 const payloadBytes=new TextEncoder().encode(jcsCanonicalize(content));
 const {prepareNativeProofObjectSeal}=await import("../documentSeal/prepareNativeProofObjectSeal");
 const prepared=await prepareNativeProofObjectSeal({fileBytes:payloadBytes,filename:"asset-content.json",mime:"application/json",ownerReceizId:input.ownerReceizId});input.assertCurrent();
 const sealed=await input.sealDocument({fileBytes:prepared.fileBytes,filename:prepared.filename,mime:prepared.mime,options:{forceBundleEnvelope:true,nativeRecordSeal:prepared.nativeRecordSeal}});input.assertCurrent();
 const exact=Uint8Array.from(sealed.artifactBytes),artifact=new File([exact.buffer],sealed.downloadName,{type:sealed.kind==="bundle"?"application/vnd.receiz.bundle+json":"application/octet-stream"});
 const bytes=await writeExactByteBlocks(artifact,async(reference,block)=>{input.assertCurrent();await writeBlock(reference,block);input.assertCurrent();});
 const reference=parseImportedProofSourceReference({schema:"receiz.imported-proof-source.v1",artifactSha256:bytesToHex(sha256(exact)),byteLength:artifact.size,filename:artifact.name,mimeType:artifact.type,bytes});
 return Object.freeze({artifact,reference,content});
}
