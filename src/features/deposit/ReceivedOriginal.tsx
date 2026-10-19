import {useEffect,useRef,useState} from 'react';
import {Check,ShieldCheck,Upload} from 'lucide-react';
import type {OpenIdentity} from '../../receiz/native-identity';
import type {ReceivedProof,ReceivedProofReview,ReceivedProofStatus} from '../../receiz/received-proof';
function receiveError(cause:unknown){
 const code=cause instanceof Error?cause.message:'';
 if(code.includes('DEDICATED_NOTE_PATH_REQUIRED'))return 'Use Deposit note for an Offline Note.';
 if(code.includes('DEDICATED_FUNDING_PATH_REQUIRED'))return 'This funding proof needs its original Receiz deposit flow.';
 if(code.includes('CLAIM_CAPACITY'))return 'This original is too large for the receiving transport. Keep the complete file; no ownership claim has been submitted.';
 if(code.includes('OWNERSHIP_SOURCE_REQUIRED'))return 'This original does not carry a supported ownership handoff. Keep the original and its existing ownership history.';
 if(code.includes('PENDING'))return 'Finish the saved receiving request before opening another original.';
 return 'The original could not be received yet. Keep this file and device; any saved receiving request remains available below.';
}
export function ReceivedOriginal({identity,onRefresh,onClose}:{identity:OpenIdentity;onRefresh:()=>void;onClose:()=>void}){
 const [api,setApi]=useState<ReceivedProof|null>(null),[review,setReview]=useState<ReceivedProofReview|null>(null),[status,setStatus]=useState<ReceivedProofStatus|null>(null);
 const [approved,setApproved]=useState(false),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const generation=useRef(0),running=useRef(false);
 useEffect(()=>{const ticket=++generation.current;running.current=false;setBusy(false);setLoading(true);setApi(null);setReview(null);setStatus(null);setError('');setApproved(false);
  void identity.receivedProof!().then(async value=>{const saved=await value.status();if(ticket===generation.current){setApi(value);setStatus(saved?.status==='held'?null:saved);}}).catch(()=>{if(ticket===generation.current)setError('Saved receiving details could not be opened. Keep this device and retry.');}).finally(()=>{if(ticket===generation.current)setLoading(false);});
  return()=>{generation.current++;};
 },[identity]);
 async function run(operation:()=>Promise<void>){if(running.current)return;running.current=true;setBusy(true);setError('');const ticket=generation.current;
  try{await operation();}catch(cause){if(ticket===generation.current){setError(receiveError(cause));if(api)try{const saved=await api.status();if(ticket===generation.current)setStatus(saved);}catch{/* Preserve the original error and retained state. */}}}finally{if(ticket===generation.current){running.current=false;setBusy(false);}}
 }
 async function inspect(file?:File){if(!api||!file)return;const ticket=generation.current;await run(async()=>{const next=await api.inspect(file);if(ticket===generation.current){if(review)api.discard(review);setReview(next);setApproved(false);setStatus(null);}});}
 async function receive(){if(!api||!review||!approved)return;const ticket=generation.current;await run(async()=>{const next=await api.receive(review,review.digest);if(ticket===generation.current){setStatus(next);setReview(null);setApproved(false);if(next.status==='held')onRefresh();}});}
 async function resume(){if(!api||!status||!approved)return;const ticket=generation.current;await run(async()=>{const next=await api.resume(status.digest);if(ticket===generation.current){setStatus(next);setApproved(false);if(next?.status==='held')onRefresh();}});}
 async function save(){if(!api)return;await run(async()=>{const file=await api.exportHeld(),url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download=file.name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);});}
 const pending=status&&status.status!=='held',held=status?.status==='held';
 return <section className="received-original">
  {held?<><div className="status-icon success"><Check size={34}/></div><h1 className="sheet-hero">Your original is held.</h1><p className="body-copy">The complete proof and its verified ownership are saved privately on this device.</p><div className="detail-list"><div><span>Original</span><strong>{status.filename}</strong></div><div><span>Status</span><strong>Original proof held</strong></div></div><button className="primary-button" disabled={busy} onClick={()=>void save()}>Save original proof</button><button className="secondary-button" onClick={onClose}>Done</button></>:
  <><h1 className="sheet-hero">Bring your value<br/>with you.</h1><p className="body-copy">Open the complete original to review its proof and ownership.</p>
  {loading&&<p className="body-copy" role="status">Opening saved receiving details…</p>}
  {!loading&&!pending&&<label className="file-drop"><Upload size={30}/><strong>{busy?'Verifying original proof…':'Choose your proof object'}</strong><span>Original PNG, PDF, SVG, JSON or supported file</span><input disabled={!api||busy} type="file" aria-label="Choose original proof object" onChange={event=>{void inspect(event.target.files?.[0]);event.target.value='';}}/></label>}
  {review&&<><div className="detail-list"><div><span>Original</span><strong>{review.title}</strong></div><div><span>Current owner</span><strong>{review.owner.replace(/\.receiz\.id$/,'')}</strong></div><div><span>Receiving</span><strong>{review.kind==='claim'?'Ownership handoff':'Already owned by you'}</strong></div></div><details className="deposit-consent-details"><summary>Proof reference</summary><code className="payment-link">{review.digest}</code></details><label className="consent-option"><input type="checkbox" checked={approved} disabled={busy} onChange={event=>setApproved(event.target.checked)}/><span>{review.kind==='claim'?'Receive this exact original into my Receiz ID and preserve its ownership history.':'Keep this exact original in my account.'}</span></label><button className="primary-button" disabled={busy||!approved} onClick={()=>void receive()}>{busy?'Receiving original…':review.kind==='claim'?'Receive original':'Keep original'}</button></>}
  {pending&&<><div className="note-box"><ShieldCheck size={18}/><p>{status.status==='claimed'?'Ownership was verified. Finish saving the original on this device.':'Your receiving request is saved. Resume the same original to confirm its result.'}</p></div><div className="detail-list"><div><span>Original</span><strong>{status.filename}</strong></div></div><label className="consent-option"><input type="checkbox" checked={approved} disabled={busy} onChange={event=>setApproved(event.target.checked)}/><span>{status.status==='claimed'?'Save the verified original on this device.':'Resume this exact receiving request.'}</span></label><button className="primary-button" disabled={busy||!approved} onClick={()=>void resume()}>{busy?'Checking original…':status.status==='claimed'?'Finish saving original':'Resume receiving'}</button></>}
  <p className="body-copy small-copy">The proof’s own rules determine its ownership and use. Receiving an original does not itself add a cash deposit.</p></>}
  {error&&<p className="error-message" role="alert">{error}</p>}
 </section>;
}
