import {useEffect,useRef,useState} from 'react';
import type {OpenIdentity} from '../receiz/native-identity';
import type {createCheckoutIdentitySession} from '../checkout/checkout-identity';

type IdentitySession=ReturnType<typeof createCheckoutIdentitySession>;
export type ConformanceIdentitySessionFactory=(restoreOnly?:boolean)=>Promise<IdentitySession>;
const defaultSessionFactory:ConformanceIdentitySessionFactory=async(restoreOnly=false)=>{
 const entry=await import('../checkout/checkout-identity');
 if(!restoreOnly)return entry.checkoutIdentitySession();
 const native=await import('../receiz/native-identity');
 return entry.createCheckoutIdentitySession({restore:native.restoreNativeIdentity,create:async()=>{throw Error('CONFORMANCE_SAVED_IDENTITY_REQUIRED');},importIdentity:native.importNativeIdentity});
};
async function savedIdentityDigest():Promise<string|null>{
 const {loadDeviceIdentity}=await import('../receiz/identity-vault'),saved=await loadDeviceIdentity();
 if(!saved?.readConsent)return null;
 const {loadReceiz}=await import('../receiz/client');return(await loadReceiz()).sha256ReceizBytes(saved.bytes);
}

/** The existing canonical identity entry owns custody, restore and replacement.
 * This component only manages its lifetime and public holder presentation. */
export function ConformanceIdentity({activeSurface=true,sessionFactory=defaultSessionFactory,onIdentity}:{activeSurface?:boolean;sessionFactory?:ConformanceIdentitySessionFactory;onIdentity?:(identity:OpenIdentity|null)=>void}){
 const [identity,setIdentity]=useState<OpenIdentity|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState(''),[record,setRecord]=useState<File|null>(null),[phrase,setPhrase]=useState('');
 const picker=useRef<HTMLInputElement>(null),lifetime=useRef(0),operation=useRef(0),sessionEpoch=useRef(0),session=useRef<IdentitySession|null>(null),pending=useRef<Promise<IdentitySession>|null>(null),held=useRef<OpenIdentity|null>(null),callback=useRef(onIdentity),openedOnce=useRef(false);
 callback.current=onIdentity;
 const current=(generation:number,attempt:number)=>lifetime.current===generation&&operation.current===attempt;
 async function getSession(generation:number,restoreOnly=false):Promise<IdentitySession>{
  if(session.current)return session.current;
  if(pending.current)return pending.current;
  const epoch=sessionEpoch.current;
  const attempt=Promise.resolve().then(()=>sessionFactory(restoreOnly)).then(next=>{
   if(lifetime.current!==generation||sessionEpoch.current!==epoch){next.close();throw Error('CONFORMANCE_IDENTITY_SESSION_CLOSED');}
   session.current=next;return next;
  });
  pending.current=attempt;
  void attempt.finally(()=>{if(pending.current===attempt)pending.current=null;}).catch(()=>{});
  return attempt;
 }
 function resetSession(){sessionEpoch.current++;session.current?.close();session.current=null;pending.current=null;held.current=null;setIdentity(null);callback.current?.(null);}
 function publish(next:OpenIdentity){
  const owner=next?.binding?.artifactOwnerReceizId;
  if(typeof owner!=='string'||!owner.trim()||typeof next.binding.keyId!=='string'||!next.binding.keyId){
   session.current?.close();session.current=null;held.current=null;setIdentity(null);callback.current?.(null);
   throw Error('CONFORMANCE_PUBLIC_IDENTITY_BINDING_REQUIRED');
  }
  held.current=next;setIdentity(next);callback.current?.(next);
 }
 async function open(generation=lifetime.current){
  const attempt=++operation.current;setBusy(true);setError('');callback.current?.(null);
  try{const selected=await getSession(generation),next=await selected.open();if(current(generation,attempt))publish(next);}
  catch{if(current(generation,attempt))setError('Your saved Receiz identity could not be opened. Retry or use your original Identity Record.');}
  finally{if(current(generation,attempt))setBusy(false);}
 }
 async function reconcile(){
  const generation=lifetime.current,attempt=++operation.current;setIdentity(null);setBusy(true);setError('');setRecord(null);setPhrase('');callback.current?.(null);
  try{
   const digest=await savedIdentityDigest();if(!current(generation,attempt))return;
   if(digest&&held.current?.binding.artifactSha256===digest){publish(held.current);return;}
   resetSession();
   if(!digest){setError('No readable Receiz identity is saved on this device. Use your original Identity Record.');return;}
   const selected=await getSession(generation,true),next=await selected.open();if(!current(generation,attempt))return;
   const latest=await savedIdentityDigest();if(!current(generation,attempt))return;
   if(latest!==next.binding.artifactSha256){resetSession();throw Error('CONFORMANCE_IDENTITY_CHANGED');}
   publish(next);
  }catch{if(current(generation,attempt)){resetSession();setError('Your saved Receiz identity could not be verified. Retry or use your original Identity Record.');}}
  finally{if(current(generation,attempt))setBusy(false);}
 }
 useEffect(()=>{
  lifetime.current++;openedOnce.current=false;
  return()=>{lifetime.current++;operation.current++;sessionEpoch.current++;session.current?.close();session.current=null;pending.current=null;held.current=null;callback.current?.(null);};
 },[sessionFactory]);
 useEffect(()=>{
  let frame:number|undefined;
  const suspend=()=>{operation.current++;setIdentity(null);setBusy(false);callback.current?.(null);};
  const refresh=()=>{if(!activeSurface||document.hidden){suspend();return;}if(openedOnce.current){void reconcile();return;}const generation=lifetime.current;frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>{openedOnce.current=true;void open(generation);});});};
  refresh();addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  return()=>{if(frame!==undefined)cancelAnimationFrame(frame);removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[activeSurface,sessionFactory]);
 async function importRecord(file:File,unlock:string,generation:number,attempt:number){
  try{const selected=await getSession(generation),next=await selected.import(file,unlock);if(!current(generation,attempt))return;publish(next);setRecord(null);setPhrase('');}
  catch{if(current(generation,attempt)){setError('This Identity Record could not be opened. Keep your original record and try again.');callback.current?.(held.current);}}
  finally{if(current(generation,attempt)){setBusy(false);setPhrase('');}}
 }
 async function choose(file:File){
  const generation=lifetime.current,attempt=++operation.current;setBusy(true);setError('');setRecord(null);setPhrase('');callback.current?.(null);
  try{
   const {inspectIdentityLock}=await import('../receiz/identity-lock');const lock=await inspectIdentityLock(file);
   if(!current(generation,attempt))return;
   if(lock.needsPhrase){setRecord(file);setBusy(false);return;}
   await importRecord(file,'',generation,attempt);
  }catch{if(current(generation,attempt)){setBusy(false);setError('Choose your complete original Identity Record.');callback.current?.(held.current);}}
 }
 async function save(){
  const selected=held.current;if(!selected)return;const generation=lifetime.current,attempt=++operation.current;setBusy(true);setError('');
  try{const {saveIdentityRecord}=await import('../checkout/CheckoutIdentity');if(current(generation,attempt)&&held.current===selected)saveIdentityRecord(selected);}
  catch{if(current(generation,attempt))setError('Your Identity Record could not be saved. Keep this identity open and try again.');}
  finally{if(current(generation,attempt))setBusy(false);}
 }
 return <section className="conformance-identity" aria-labelledby="conformance-identity-title" aria-busy={busy}>
  <div className="conformance-identity-holder"><h2 id="conformance-identity-title">Credential holder</h2>{identity?<dl><div><dt>Verified Receiz ID</dt><dd><code data-conformance-receiz-id>{identity.binding.artifactOwnerReceizId}</code></dd></div></dl>:<p role="status">{busy?'Opening your Receiz identity…':'Receiz identity unavailable.'}</p>}<p>One Receiz ID. The same identity holds your credential and opens your workspace.</p></div>
  <div className="conformance-identity-actions">{identity&&<button className="conformance-button secondary" disabled={busy} onClick={()=>void save()}>Save Identity Record</button>}<button className="conformance-button secondary" disabled={busy} onClick={()=>picker.current?.click()}>Use existing Identity Record</button>{error&&!identity&&<button className="conformance-button secondary" disabled={busy} onClick={()=>void open()}>Retry identity</button>}<input ref={picker} type="file" hidden disabled={busy} accept=".png,.pdf,.receiz,.receizkey,.json,application/octet-stream" aria-label="Existing Receiz Identity Record" onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void choose(file);}}/></div>
  {record&&<form className="conformance-identity-unlock" onSubmit={event=>{event.preventDefault();if(!phrase||busy)return;const unlock=phrase;setPhrase('');setBusy(true);setError('');void importRecord(record,unlock,lifetime.current,++operation.current);}}><label>Unlock your Identity Record<input type="password" value={phrase} onChange={event=>setPhrase(event.target.value)} autoComplete="off" disabled={busy}/></label><button className="conformance-button primary" disabled={busy||!phrase}>Unlock record</button><button type="button" className="conformance-button secondary" disabled={busy} onClick={()=>{operation.current++;setRecord(null);setPhrase('');callback.current?.(held.current);}}>Cancel record import</button></form>}
  {error&&<p className="conformance-identity-error" role="alert">{error}</p>}
 </section>;
}
