import type {PublicRecord} from './public-network';
import {ledgerInspectionDocument} from './ledger-inspection';
import {ledgerValueForRecord} from './ledger-value';
import {safeReceizPublicUrl} from './public-market';
import {resolvePublicOriginalUrl} from './public-original';
import {readPublicLedgerBytes} from './public-ledger-transfer';
import {zipSync} from 'fflate';

export type OfflineProofReport={schema:string;sdk:string;artifactSha256:string;artifactBytes:number;payloadSha256:string;payloadBytes:number;payloadFilename:string;payloadMimeType:string;verification:Record<string,unknown>;groth16:Record<string,unknown>|null;verificationMaterial:Record<string,unknown>;scope:string};
export type OfflineProofVerifier={materials:Record<string,unknown>;inspectArtifact(bytes:Uint8Array,filename?:string):Promise<OfflineProofReport>;inspectWalletCapsule(bundle:unknown):Promise<Record<string,unknown>>;sha256Hex(bytes:Uint8Array|string):Promise<string>};
declare global{var ReceizOfflineVerifier:OfflineProofVerifier;}
const BASE='/proof-verifier/v129/',MAX=24*1024*1024;
let runtime:Promise<OfflineProofVerifier>|undefined;
export function loadOfflineProofVerifier(){return runtime??=import(/* @vite-ignore */ new URL(BASE+'verifier.js',location.origin).href).then(()=>globalThis.ReceizOfflineVerifier).catch(error=>{runtime=undefined;throw error;});}
const held=new WeakMap<OfflineProofReport,{bytes:Uint8Array;filename:string}>();
function database(){return new Promise<IDBDatabase>((resolve,reject)=>{try{const r=indexedDB.open('bankeiz.public-proof-inspection.v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('originals');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}catch(error){reject(error);}});}
async function cached(digest:string):Promise<Uint8Array|null>{let db:IDBDatabase|undefined;try{db=await database();return await new Promise((resolve,reject)=>{const r=db!.transaction('originals').objectStore('originals').get(digest);r.onsuccess=()=>resolve(r.result instanceof Uint8Array?r.result:null);r.onerror=()=>reject(r.error);});}catch{return null;}finally{db?.close();}}
async function retain(digest:string,bytes:Uint8Array){let db:IDBDatabase|undefined;try{db=await database();await new Promise<void>((resolve,reject)=>{const tx=db!.transaction('originals','readwrite'),store=tx.objectStore('originals'),r=store.getAll();r.onsuccess=()=>{const all=r.result as Uint8Array[];if(all.reduce((n,b)=>n+b.length,0)+bytes.length>64*1024*1024){tx.abort();return;}store.put(bytes,digest);};tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(tx.error);});return true;}catch{return false;}finally{db?.close();}}
export async function inspectLedgerOriginal(record:PublicRecord,signal?:AbortSignal){
 const original=record.details?.originalUrl,digest=record.evidence.artifactDigest;
 if(typeof original!=='string'||!safeReceizPublicUrl(original,'original')||!/^[a-f0-9]{64}$/i.test(digest??''))throw Error('ORIGINAL_NOT_SUPPLIED');
 const verifier=await loadOfflineProofVerifier();signal?.throwIfAborted();
 let bytes=await cached(digest),filename='original.receiz';
 if(bytes&&await verifier.sha256Hex(bytes)!==digest.toLowerCase())bytes=null;
 if(!bytes){const url=new URL(await resolvePublicOriginalUrl(original,digest,signal));const response=await fetch(`/api/bank/public-market/original?path=${encodeURIComponent(url.pathname+url.search)}`,{credentials:'omit',redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(90000)]):AbortSignal.timeout(90000)});if(!response.ok)throw Error('ORIGINAL_READ_UNAVAILABLE');bytes=await readPublicLedgerBytes(response,MAX);}
 if(await verifier.sha256Hex(bytes)!==digest.toLowerCase())throw Error('SELECTED_RECORD_DIGEST_MISMATCH');
 const report=await verifier.inspectArtifact(bytes,filename);signal?.throwIfAborted();
 if(report.artifactSha256!==digest.toLowerCase())throw Error('SELECTED_RECORD_DIGEST_MISMATCH');
 held.set(report,{bytes:bytes.slice(),filename});const retained=await retain(digest,bytes);signal?.throwIfAborted();return {report,retained};
}
/** Exact original is admitted only through this runtime's canonical inspection.
 * A caller-supplied JSON report cannot substitute for its bytes. */
export async function downloadLedgerEvidence(record:PublicRecord,report?:OfflineProofReport|null):Promise<Uint8Array>{
 const verifier=await loadOfflineProofVerifier(),files:Record<string,Uint8Array>={},encode=(v:unknown)=>new TextEncoder().encode(JSON.stringify(v,null,2));
 const buildResponse=await fetch(BASE+'build.json',{credentials:'omit'});if(!buildResponse.ok)throw Error('OFFLINE_VERIFIER_UNAVAILABLE');const build=await buildResponse.json() as {sdk:string;files:Record<string,{sha256:string;bytes:number}>};
 if(build.sdk!=='129.0.0'||!build.files||Object.keys(build.files).length>30)throw Error('OFFLINE_VERIFIER_BUILD_INVALID');
 await Promise.all(Object.entries(build.files).map(async([name,entry])=>{if(!/^[a-zA-Z0-9_.-]+$/.test(name)||entry.bytes>8*1024*1024)throw Error('OFFLINE_VERIFIER_BUILD_INVALID');const r=await fetch(BASE+name,{credentials:'omit'});if(!r.ok)throw Error('OFFLINE_VERIFIER_UNAVAILABLE');const bytes=await readPublicLedgerBytes(r,8*1024*1024);if(bytes.length!==entry.bytes||await verifier.sha256Hex(bytes)!==entry.sha256)throw Error('OFFLINE_VERIFIER_INTEGRITY');files[name]=bytes;}));
 files['build.json']=encode(build);files['record.json']=encode(ledgerInspectionDocument(record,ledgerValueForRecord(record)));
 if(report){const source=held.get(report);if(!source||report.artifactSha256!==record.evidence.artifactDigest?.toLowerCase()||await verifier.sha256Hex(source.bytes)!==report.artifactSha256)throw Error('ORIGINAL_INSPECTION_REQUIRED');files['original.receiz']=source.bytes.slice();files['proof-inspection.json']=encode(report);}
 files['availability.json']=encode({sealedOriginal:!!report,groth16:report?.groth16?'carried in original':'not supplied in a verified original',missing:report?[]:['Complete signed original bytes for this record. A hash capsule alone cannot supply them.'],privateWitnesses:'Not needed for verification; signing keys and private witnesses are not exported.'});
 const hashes:Record<string,unknown>={};for(const [name,bytes]of Object.entries(files))hashes[name]={sha256:await verifier.sha256Hex(bytes),bytes:bytes.length};files['hashes.json']=encode(hashes);
 return zipSync(Object.fromEntries(Object.entries(files).map(([name,bytes])=>[name,[bytes,{level:0}]])),{level:0});
}
