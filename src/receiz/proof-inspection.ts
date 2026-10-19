import type {ReceizOpenedArtifact} from '@receiz/sdk';

export type ProofInspection={schema:string;sdk:string;artifactSha256:string;artifactBytes:number;payloadSha256:string;payloadBytes:number;payloadFilename:string;payloadMimeType:string;verification:Record<string,unknown>;groth16:Record<string,unknown>|null;verificationMaterial?:Record<string,unknown>;scope:string};
type OriginalInspection={report:ProofInspection;bytes:Uint8Array;filename:string;retained:boolean};
const originals=new Map<string,OriginalInspection>(),pending=new Map<string,Promise<OriginalInspection|null>>(),listeners=new Set<()=>void>();
const admitted=new WeakMap<ProofInspection,OriginalInspection>(),MAX=64*1024*1024;
export const subscribeProofInspections=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
export const retainedProofInspection=(digest:string|undefined)=>digest?originals.get(digest.toLowerCase())??null:null;
export const admittedProofInspection=(report:ProofInspection)=>admitted.get(report);

/** Only successful canonical inspection/open paths publish here. Exact bytes
 * remain attached to the report so arbitrary JSON cannot enter an offline kit. */
export function retainProofInspection(report:ProofInspection,bytes:Uint8Array,filename:string,retained=false):OriginalInspection{
 const digest=report.artifactSha256.toLowerCase(),entry={report,bytes:bytes.slice(),filename,retained};
 originals.delete(digest);
 while(originals.size&&(originals.size>=16||[...originals.values()].reduce((sum,item)=>sum+item.bytes.length,0)+bytes.length>MAX))originals.delete(originals.keys().next().value!);
 originals.set(digest,entry);admitted.set(report,entry);for(const listener of listeners)listener();return entry;
}
/** Observe work already requested by the user. Subscribers never start IO or
 * verification; another inspector can await the same successful publication. */
export function trackProofInspection<T>(digest:string,work:Promise<T>):Promise<T>{
 const key=digest.toLowerCase(),existing=pending.get(key);
 if(!existing){const observation=work.then(()=>retainedProofInspection(key),()=>retainedProofInspection(key));pending.set(key,observation);void observation.finally(()=>{if(pending.get(key)===observation)pending.delete(key);});}
 return work;
}
export async function reuseProofInspection(digest:string){return retainedProofInspection(digest)??await pending.get(digest.toLowerCase())??null;}

/** Display decoding of an already verified bundle. Keep the crypto runtime
 * lazy: JSON/base64 decoding does not import snarkjs or perform verification. */
function carriedGroth16(value:unknown):Record<string,unknown>|null{
 if(typeof value!=='string'||value.length>65536||!/^g16:[A-Za-z0-9_-]+$/.test(value))return null;
 try{const raw=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value.slice(4).replace(/-/g,'+').replace(/_/g,'/')),character=>character.charCodeAt(0))));
  return raw&&typeof raw.v==='string'&&raw.proof&&typeof raw.proof==='object'&&Array.isArray(raw.publicSignals)?{version:raw.v,proof:raw.proof,publicSignals:raw.publicSignals}:null;
 }catch{return null;}
}

/** Project the SDK's successful, digest-matched open. Decode public proof
 * structure only; this does not run cryptography or reconstruct proof data. */
export function retainOpenedProofInspection(opened:ReceizOpenedArtifact,bytes:Uint8Array,filename:string,digest:string){
 if(opened.sealedArtifact.artifactSha256.toLowerCase()!==digest.toLowerCase())throw Error('SELECTED_RECORD_DIGEST_MISMATCH');
 const verification=opened.verification as unknown as Record<string,unknown>,bundle=verification?.bundle as Record<string,unknown>|undefined;
 if(verification?.ok!==true||(verification.integrity as {ok?:boolean}|undefined)?.ok!==true||!bundle)return null;
 const payload=opened.verifiedPayload;
 const report:ProofInspection={schema:'bankeiz.offline-proof-inspection.v1',sdk:'129.0.0',artifactSha256:digest.toLowerCase(),artifactBytes:bytes.length,payloadSha256:payload.sha256,payloadBytes:payload.bytes.length,payloadFilename:payload.filename,payloadMimeType:payload.mimeType,verification,groth16:carriedGroth16(bundle.groth16Proof),scope:'Canonical enclosing artifact and carried continuity only. No live spendability, account balance or execution authorization.'};
 return retainProofInspection(report,bytes,filename);
}
