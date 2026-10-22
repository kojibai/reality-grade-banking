import {useEffect,useRef,useState} from 'react';
import type {ConformanceEvidenceObject} from './evidence-object';
import {canonicalJson} from './assessment';
export type SealedConformanceOriginal={bytes:Uint8Array;filename:string;mimeType:'image/png';object:ConformanceEvidenceObject};
export function ProofObjectSave({object,original,onSealed}:{object:ConformanceEvidenceObject;original?:SealedConformanceOriginal|null;onSealed?:(original:SealedConformanceOriginal)=>void}){
 const [busy,setBusy]=useState(false),[enrollment,setEnrollment]=useState(false),[identityRequired,setIdentityRequired]=useState(false),[identityFile,setIdentityFile]=useState<File|null>(null),[phrase,setPhrase]=useState(''),[error,setError]=useState(''),[ready,setReady]=useState(Boolean(original)),[originalUrl,setOriginalUrl]=useState<string|null>(null);
 const alive=useRef(true),running=useRef(false),retained=useRef<SealedConformanceOriginal|null>(original??null);
 const selected=useRef({file:identityFile,phrase});selected.current={file:identityFile,phrase};
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{if(!ready||!retained.current)return;const file=retained.current,url=URL.createObjectURL(new Blob([new Uint8Array(file.bytes)],{type:file.mimeType}));setOriginalUrl(url);return()=>URL.revokeObjectURL(url);},[ready]);
 function download(sealed:SealedConformanceOriginal){const url=URL.createObjectURL(new Blob([new Uint8Array(sealed.bytes)],{type:sealed.mimeType})),link=document.createElement('a');link.href=url;link.download=sealed.filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),3000);}
 async function save(allowEnrollment=false){
  if(running.current)return;
  if(retained.current){download(retained.current);return;}
  running.current=true;setBusy(true);setError('');
  const file=identityFile;
  try{
   const native=await import('./receiz-evidence-seal');
   const result=await native.sealConformanceEvidenceObject({svg:object.svg},{allowEnrollment,...(file?{identitySource:async()=>{const current=selected.current;return current.file?{bytes:new Uint8Array(await current.file.arrayBuffer()),phrase:current.phrase}:null;}}:{})});
   const {credentialHolder:sourceHolder,...sourceReport}=object.report,{credentialHolder:resultHolder,...resultReport}=result.object.report;
   if(!resultHolder||sourceHolder&&sourceHolder.receizId!==resultHolder.receizId||canonicalJson(sourceReport)!==canonicalJson(resultReport))throw Error('CONFORMANCE_PROOF_SOURCE_CHANGED');
   if(!alive.current)return;
   retained.current=result;setReady(true);setEnrollment(false);setIdentityRequired(false);setPhrase('');setIdentityFile(null);onSealed?.(result);download(result);
  }catch(cause){
   if(!alive.current)return;
   const code=(cause as {code?:unknown}|null)?.code;
   if(code==='CONFORMANCE_IDENTITY_REQUIRED'){setIdentityRequired(true);setEnrollment(false);}
   else if(code==='CONFORMANCE_ENROLLMENT_REQUIRED')setEnrollment(true);
   else if(code==='CONFORMANCE_IDENTITY_CHANGED')setError('Your identity changed. Reopen the correct Identity Record before saving. Your test evidence is preserved.');
   else setError('The proof object could not be sealed and verified. Your original test evidence is preserved. Try again.');
  }finally{running.current=false;if(alive.current)setBusy(false);}
 }
 return <div className="conformance-proof-save"><button className="conformance-button primary" disabled={busy} onClick={()=>void save()}>{busy?'Sealing and verifying…':ready?'Download public certificate':'Save public certificate'}</button>
 {identityRequired&&<div className="conformance-seal-consent"><p>Choose the Identity Record that will own this proof object. It opens locally for this action and does not replace saved identity custody.</p><label>Identity Record<input type="file" accept="image/png,.png,.receiz,application/json" disabled={busy} onChange={event=>{const file=event.target.files?.[0]??null;event.target.value='';setError('');if(file&&file.size>32*1024*1024){setError('Identity Record exceeds the supported device capacity.');setIdentityFile(null);return;}setIdentityFile(file);setPhrase('');}}/></label>{identityFile&&<><label>Recovery phrase, if required<input type="password" autoComplete="off" value={phrase} disabled={busy} onChange={event=>setPhrase(event.target.value)}/></label><button className="conformance-button secondary" disabled={busy} onClick={()=>void save()}>Save with this Identity Record</button></>}</div>}
 {enrollment&&<div className="conformance-seal-consent"><p>Enable Receiz sealing on this device to sign this proof object. This explicit action uses its admitted Identity Record and the existing device enrollment rules.</p><button className="conformance-button secondary" disabled={busy} onClick={()=>void save(true)}>Enable device signer &amp; save proof</button></div>}
 {ready&&<p role="status">Receiz proof and ownership continuity verified. {originalUrl&&<a href={originalUrl} download={retained.current?.filename} className="conformance-text-link">Open original PNG</a>}</p>}{error&&<p role="alert" className="proof-refusal">{error}</p>}
 </div>;
}
