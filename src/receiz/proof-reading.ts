import {loadReceiz} from './client';
import {safeReceizPublicUrl} from './public-market';
import {readPublicLedgerBytes} from './public-ledger-transfer';
export type ProofReading={title:string;text:string;sha256:string;artifactDigest:string};
const readings=new Map<string,ProofReading>();
type ReadingPreparation={controller:AbortController;work:Promise<ProofReading>;readers:number;done:boolean};
const preparations=new Map<string,ReadingPreparation>();
const readingKey=(postUrl:string,imageDigest:string)=>imageDigest.toLowerCase()+':'+postUrl;
/** Public, verified text only. Reopening a reader does not reread its source. */
export function retainedPublicReading(postUrl:string,imageDigest:string){return readings.get(readingKey(postUrl,imageDigest))??null;}
const object=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
export async function verifyProofReadingBytes(bytes:Uint8Array,imageDigest:string,postUrl:string):Promise<ProofReading>{
 const safe=safeReceizPublicUrl(postUrl,'proof');if(!safe||!bytes.length||bytes.length>16*1024*1024||!/^[a-f0-9]{64}$/i.test(imageDigest))throw Error('This carried text source is not supported.');
 const {verifyReceizArtifact}=await loadReceiz(),result=await verifyReceizArtifact(bytes);
 if(result.status!=='verified-artifact')throw Error('The carried text could not be verified. Inspect its proof source for details.');
 const verification=result.verification,anchor=object(verification.anchor),bundle=object(verification.bundle),coordinate=new URL(safe);
 if(bundle.verifyPath!==coordinate.pathname||anchor.anchorId!==coordinate.searchParams.get('a')||String(bundle.createdAtMs)!==coordinate.searchParams.get('ms'))throw Error('This reading does not match the selected post.');
 const file=object(anchor.file);if(typeof file.sealedSha256Hex!=='string'||file.sealedSha256Hex.toLowerCase()!==imageDigest.toLowerCase())throw Error('This reading does not match the selected original.');
 const longForm=object(object(anchor.claim).longForm),text=longForm.text,title=longForm.title,sha=longForm.sha256Hex;
 if(typeof text!=='string'||!text.length||text.length>100_000||typeof sha!=='string'||!/^[a-f0-9]{64}$/i.test(sha)||title!==null&&title!==undefined&&(typeof title!=='string'||title.length>160))throw Error('This post does not carry supported full text.');
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),actual=[...digest].map(value=>value.toString(16).padStart(2,'0')).join('');
 if(actual!==sha.toLowerCase())throw Error('The carried text does not match its sealed text digest.');
 return {title:typeof title==='string'&&title?title:'Complete text',text,sha256:actual,artifactDigest:result.artifactDigest.value};
}
export async function readPublicProofReading(postUrl:string,imageDigest:string,signal?:AbortSignal):Promise<ProofReading>{
 const safe=safeReceizPublicUrl(postUrl,'proof');if(!safe)throw Error('This carried text source is not supported.');signal?.throwIfAborted();
 const key=readingKey(postUrl,imageDigest),retained=readings.get(key);if(retained){readings.delete(key);readings.set(key,retained);return retained;}
 let preparation=preparations.get(key);
 if(!preparation){
  const controller=new AbortController(),work=(async()=>{
   const url=new URL(safe),requestSignal=AbortSignal.any([controller.signal,AbortSignal.timeout(90_000)]);
   const response=await fetch(`/api/bank/public-market/record?path=${encodeURIComponent(url.pathname+url.search)}`,{credentials:'omit',redirect:'error',signal:requestSignal});
   if(!response.ok)throw Error('The carried text could not be opened. You can retry or inspect its source.');
   const bytes=await readPublicLedgerBytes(response,16*1024*1024);requestSignal.throwIfAborted();const reading=await verifyProofReadingBytes(bytes,imageDigest,safe);requestSignal.throwIfAborted();readings.set(key,reading);while(readings.size>24)readings.delete(readings.keys().next().value!);return reading;
  })();
  preparation={controller,work,readers:0,done:false};preparations.set(key,preparation);
  const held=preparation,finish=()=>{held.done=true;if(preparations.get(key)===held)preparations.delete(key);};void work.then(finish,finish);
 }
 const held=preparation;held.readers++;
 return new Promise((resolve,reject)=>{
  let active=true;
  const release=()=>{if(!active)return;active=false;signal?.removeEventListener('abort',abort);held.readers--;if(!held.readers&&!held.done){if(preparations.get(key)===held)preparations.delete(key);held.controller.abort();}};
  const abort=()=>{if(!active)return;release();reject(signal?.reason??new DOMException('Aborted','AbortError'));};
  if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
  void held.work.then(value=>{if(active){release();resolve(value);}},cause=>{if(active){release();reject(cause);}});
 });
}
