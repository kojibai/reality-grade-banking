import {useEffect,useRef,useState} from 'react';
import type {openConformanceEvidenceWorkspace} from './receiz-evidence-seal';
import {ProofObjectSave} from './ProofObjectSave';
import {downloadEvidence} from './reference';
import './evidence-object.css';
type Workspace=Awaited<ReturnType<typeof openConformanceEvidenceWorkspace>>;
export function InstitutionWorkspace({onNewAssessment,onSaveIdentity}:{onNewAssessment:()=>void;onSaveIdentity?:(holderReceizId:string)=>Promise<void>}){
 const [workspace,setWorkspace]=useState<Workspace|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[preview,setPreview]=useState<string|null>(null);
 const ticket=useRef(0),held=useRef<Workspace|null>(null);
 const close=(reason='')=>{ticket.current++;held.current=null;setWorkspace(null);setBusy(false);setError(reason);};
 useEffect(()=>()=>{ticket.current++;held.current=null;},[]);
 useEffect(()=>{if(!workspace){setPreview(null);return;}const url=URL.createObjectURL(new Blob([workspace.credential.object.svg],{type:'image/svg+xml'}));setPreview(url);return()=>URL.revokeObjectURL(url);},[workspace]);
 useEffect(()=>{
  const check=async()=>{const current=held.current;if(!current)return;let valid=false;try{valid=await current.stillCurrent();}catch{/* A read failure cannot retain authenticated eligibility. */}if(held.current===current&&!valid)close('Your device identity changed. Reopen the credential with its original holder to continue.');};
  const visible=()=>{if(!document.hidden)void check();};
  addEventListener('focus',visible);addEventListener('receiz-bank:surface',visible);addEventListener('bankeiz:conformance-identity-changed',visible);document.addEventListener('visibilitychange',visible);
  return()=>{removeEventListener('focus',visible);removeEventListener('receiz-bank:surface',visible);removeEventListener('bankeiz:conformance-identity-changed',visible);document.removeEventListener('visibilitychange',visible);};
 },[]);
 async function open(file:File){
  const current=++ticket.current;held.current=null;setWorkspace(null);setError('');setBusy(true);
  try{
   if(file.size>16*1024*1024)throw Error('CONFORMANCE_PROOF_CAPACITY');
   const bytes=new Uint8Array(await file.arrayBuffer());if(current!==ticket.current)return;
   const result=await(await import('./receiz-evidence-seal')).openConformanceEvidenceWorkspace(bytes,{},{filename:file.name});
   if(current===ticket.current){held.current=result;setWorkspace(result);}
  }catch(cause){if(current===ticket.current){const code=(cause as {code?:unknown}|null)?.code;setError(code==='CONFORMANCE_IDENTITY_REQUIRED'?'Open the same Receiz ID that owns this credential using Credential identity above. A public certificate alone cannot establish control.':code==='CONFORMANCE_IDENTITY_CHANGED'?'Your device identity changed during verification. Reopen the credential with its original holder.':'The credential or its holder could not be verified. Use the original passing Receiz proof object and its matching identity.');}}
  finally{if(current===ticket.current)setBusy(false);}
 }
 async function newAssessment(){const current=held.current;if(!current)return;let valid=false;try{valid=await current.stillCurrent();}catch{/* Missing custody cannot retain eligibility. */}if(!valid){close('Your device identity changed. Reopen the credential with its original holder to continue.');return;}onNewAssessment();}
 async function saveIdentity(){const current=held.current;if(!current||!onSaveIdentity)return;try{if(!await current.stillCurrent()){close('Your device identity changed. Reopen the credential with its original holder to continue.');return;}await onSaveIdentity(current.holderReceizId);}catch{setError('Your private Identity Record could not be saved. Reopen the same identity and try again.');}}
 const object=workspace?.credential.object,report=object?.report;
 return <section className="institution-workspace" aria-labelledby="institution-workspace-title"><header><div><p className="workspace-eyebrow">Reality-Grade Banking</p><h3 id="institution-workspace-title">Institution workspace</h3></div>{workspace&&<span className="workspace-verified">Holder verified</span>}</header>
 {!workspace?<><p>Enter with your original passing credential. The suite verifies its evidence and proves control of the same Receiz ID retained on this device. No separate account or second identity is required.</p><label className="contract-transcript-picker">{busy?'Verifying credential and holder…':'Open conformance credential'}<input type="file" accept=".png,image/png" disabled={busy} onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void open(file);}}/></label></>:<><div className="workspace-holder"><span>Credential holder · Receiz ID</span><code>{workspace.holderReceizId}</code></div><div className="workspace-metrics"><div><span>Assessed scope</span><strong>Public integration contract</strong></div><div><span>Verified cases</span><strong>{report!.cases.filter(test=>test.passed).length} / {report!.cases.length} passed</strong></div><div><span>Assessed implementation</span><strong>{report!.implementation.name}</strong></div></div>
 <p className="qualification-note">Production receiving qualification is not established by this contract credential. Its result applies to the exact tested scope and build recorded below.</p>
 {preview&&<img className="workspace-credential" src={preview} alt="Reality-Grade Banking credential showing its verified Receiz ID holder and passing scope"/>}
 <div className="workspace-records"><div><h4>Public share certificate</h4><p>Share this original and its complete evidence. It carries your Receiz ID and the exact passing result without private sign-in material.</p><ProofObjectSave key={object!.digest} object={object!} original={workspace.credential}/></div>{onSaveIdentity&&<div><h4>Private access record</h4><p>Keep your Identity Record private. It restores control of this same Receiz ID on another device.</p><button className="conformance-button secondary" onClick={()=>void saveIdentity()}>Save private Identity Record</button></div>}</div>
 <div className="assessment-actions"><button className="conformance-button secondary" onClick={()=>downloadEvidence(report,'reality-grade-banking-evidence.json')}>Export original evidence</button><button className="conformance-button secondary" onClick={()=>void newAssessment()}>New assessment</button><button className="conformance-button secondary" onClick={()=>close()}>Close workspace</button></div>
 <details className="audit-disclosure"><summary>Independent verification and complete observations</summary><p>Anyone can reopen the public original to verify its canonical seal, ownership, exact transcript and results. Workspace entry additionally requires the holder’s private identity admission. This eligibility check grants no payment or receiving authority.</p><pre>{JSON.stringify({artifactSha256:workspace.credential.artifactSha256,evidenceSha256:object!.digest,original:report},null,2)}</pre></details></>}
 {error&&<p role="alert" className="proof-refusal">{error}</p>}
 </section>;
}
