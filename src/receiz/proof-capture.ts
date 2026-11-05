import type {ReceizOpenedArtifact} from '@receiz/sdk';
import {loadReceiz} from './client';
import {parseReceizJsonProof} from '../../native/receiz/app/lib/documentSeal/jsonProof';
import {readPngTextChunks} from '../../native/receiz/app/utils/pngChunks';

const MAX=32*1024*1024;
const openedFiles=new WeakMap<File,Promise<ReceizOpenedArtifact>>();
export const isProofPng=(bytes:Uint8Array)=>[137,80,78,71,13,10,26,10].every((value,i)=>bytes[i]===value);
/** Routing only. Existing carrier parsers prevent a failed enclosing capture
 * from falling back to the legacy raw-record reader. No parsed field admits it. */
export function hasProofCaptureCarrier(bytes:Uint8Array):boolean{
 if(isProofPng(bytes))return readPngTextChunks(bytes,{keyword:'receiz.proof_bundle',maxCompressedBytes:MAX,maxTextBytes:MAX}).length>0;
 const parsed=parseReceizJsonProof(bytes);return parsed.proofCount>0||parsed.parseError!=='missing_json_proof';
}
function freezeMetadata(value:unknown,seen=new WeakSet<object>()){
 if(!value||typeof value!=='object'||seen.has(value)||ArrayBuffer.isView(value)||value instanceof ArrayBuffer||value instanceof Blob)return;
 seen.add(value);for(const child of Object.values(value))freezeMetadata(child,seen);Object.freeze(value);
}
/** A File is immutable. Only the actual SDK open is cached against that File;
 * callers cannot supply an opened DTO. Every reader receives private payload
 * bytes and verification metadata, while the SDK-issued artifact stays intact. */
export async function openCanonicalProofFile(file:File):Promise<ReceizOpenedArtifact>{
 let pending=openedFiles.get(file);
 if(!pending){
  const filename=file.name,mimeType=file.type,size=file.size;
  if(!size||size>MAX)throw Error('PROOF_SOURCE_INVALID');
  pending=(async()=>{
   const bytes=new Uint8Array(await file.arrayBuffer());if(bytes.length!==size)throw Error('PROOF_SOURCE_INVALID');
   const sdk=await loadReceiz(),opened=await sdk.createReceizClient().artifacts.verifyAndOpen(new File([bytes],filename,{type:mimeType}));
   freezeMetadata(opened.sealedArtifact);
   return{...opened,verifiedPayload:{...opened.verifiedPayload,bytes:new Uint8Array(opened.verifiedPayload.bytes)},verification:structuredClone(opened.verification)};
  })();openedFiles.set(file,pending);
 }
 const opened=await pending;
 return{...opened,verifiedPayload:{...opened.verifiedPayload,bytes:new Uint8Array(opened.verifiedPayload.bytes)},verification:structuredClone(opened.verification)};
}
