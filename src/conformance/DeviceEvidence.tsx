import { AndroidDownloadLink } from '../features/account/AndroidDownloadLink';
import {useEffect,useId,useRef,useState} from 'react';
import {deviceCustodyProbeReadiness,inspectDeviceCustodyEvidence,type DeviceCustodyEvidence,type DeviceAuthenticator} from './device-evidence';
const yes=(value:boolean|null)=>value===null?'Not reported':value?'Yes':'No';
export function DeviceEvidence({onEvidence}:{onEvidence:(value:DeviceCustodyEvidence|null)=>void}){
 const[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[stage,setStage]=useState(''),[report,setReport]=useState<DeviceCustodyEvidence|null>(null);
 const[attachment,setAttachment]=useState<DeviceAuthenticator>('platform');
 const authenticatorGroup=useId();
 const selectAuthenticator=(value:DeviceAuthenticator)=>{
  setAttachment(value);setConsent(false);setReport(null);onEvidence(null);
 };
 const[readiness,setReadiness]=useState<'checking'|'ready'|'existing-custody'|'unavailable'>('checking');
 const active=useRef<AbortController|null>(null);
 useEffect(()=>{
  const controller=new AbortController();
  void deviceCustodyProbeReadiness(controller.signal).then(value=>{if(!controller.signal.aborted)setReadiness(value);});
  return()=>{controller.abort();active.current?.abort();active.current=null;};
 },[]);
 const run=async()=>{
  if(!consent||active.current||readiness!=='ready')return;
  const controller=new AbortController();active.current=controller;setBusy(true);setReport(null);onEvidence(null);
  const result=await inspectDeviceCustodyEvidence({signal:controller.signal,attachment,onProgress:next=>{if(active.current===controller)setStage(next==='registration'?(attachment==='platform'?'Create the test passkey on this device.':'Tap or connect your security key when prompted.'):next==='verifier'?'Opening the pinned v129 verifier.':'Approve the test assertion on this device.');}});
  if(active.current!==controller||controller.signal.aborted)return;
  active.current=null;setBusy(false);setStage('');setReport(result);onEvidence(result);
 };
 return <section id="device-evidence" className="device-evidence">
  <h3>This device’s custody evidence.</h3>
  <p>Inspect what this browser actually returns, then run Receiz v129’s unchanged rollback check. This check does not qualify custody or issue a Note.</p>
  <p>{attachment==='platform'?<>This check creates a passkey named <strong>Reality-grade banking device test</strong> in your password manager. Your password manager may sync it.</>:<>This check creates a separate test credential on your security key. Tap or connect the key when prompted. Your browser may ask for its PIN.</>} Test responses stay on this device.</p>
  <p>Run this check on an authenticator with no active Offline Cash or issued Offline Notes. Some authenticators share a counter across credentials. Existing local qualified Note custody blocks this check.</p>
  <label className="device-evidence-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={event=>setConsent(event.target.checked)}/><span>I hold no Offline Cash or issued Offline Notes on this authenticator and approve creating a test credential and up to two test assertions.</span></label>
  <fieldset className="device-evidence-authenticator" disabled={busy||readiness!=='ready'}>
   <legend>Authenticator to check</legend>
   <label><input type="radio" name={authenticatorGroup} checked={attachment==='platform'} onChange={()=>selectAuthenticator('platform')}/>Built-in</label>
   <label><input type="radio" name={authenticatorGroup} checked={attachment==='cross-platform'} onChange={()=>selectAuthenticator('cross-platform')}/>Security key</label>
  </fieldset>
  <div className="device-evidence-actions"><button className="conformance-button secondary" disabled={!consent||busy||readiness!=='ready'} onClick={()=>void run()}>{busy?'Checking this device':'Check this device'}</button>{busy&&<button className="conformance-text-link" onClick={()=>{active.current?.abort();active.current=null;setBusy(false);setStage('Check cancelled.');}}>Cancel check</button>}</div>
  {readiness==='checking'&&<p>Reading local custody metadata.</p>}
  {readiness==='existing-custody'&&<p role="status">Existing custody is retained. This diagnostic will not create a credential or request assertions. Inspect the existing Note through its normal action.</p>}
  {readiness==='unavailable'&&<p role="status">Local custody could not be checked. The diagnostic remains unavailable; no credential or assertion has been requested.</p>}
  {(readiness==='unavailable'||report?.rollbackConformance.status==='refused')&&<AndroidDownloadLink className="conformance-text-link"/>}
  <p role="status">{stage}</p>
  {report&&<div className="device-evidence-result">
   <h4>Device verification record</h4>
   <p>{report.rollbackConformance.status==='passed'?'Counter validation passed for this credential. Custody qualification additionally requires verified vendor attestation and the applicable financial-source evidence.':report.rollbackConformance.status==='refused'?'Rollback check refused. The original v129 requirements remain in force.':'The rollback check did not run.'}</p>
   <dl>
    <div><dt>Protocol</dt><dd>Receiz v129</dd></div>
    <div><dt>WebAuthn available</dt><dd>{yes(report.webAuthnAvailable)}</dd></div>
    {report.registration&&<>
     <div><dt>Authenticator</dt><dd>{report.registration.attachment==='platform'?'Built-in':'Security key'}</dd></div>
     <div><dt>Attestation format</dt><dd>{report.registration.format}</dd></div>
     <div><dt>Registration user verified</dt><dd>{yes(report.registration.userVerified)}</dd></div>
     <div><dt>Backup eligible / backed up</dt><dd>{yes(report.registration.backupEligible)} / {yes(report.registration.backedUp)}</dd></div>
     <div><dt>Browser-reported sequence</dt><dd>Counter {[report.registration.counter,...report.assertions.map(value=>value.counter)].join(' → ')}</dd></div>
     <div><dt>PRF enabled at registration</dt><dd>{yes(report.registration.extensions.prfEnabled)}</dd></div>
     <div><dt>PRF result provided</dt><dd>{report.assertions.length?yes(report.assertions.some(value=>value.extensions.prfOutputProvided)):'Not requested'}</dd></div>
     <div><dt>largeBlob supported</dt><dd>{yes(report.registration.extensions.largeBlobSupported)}</dd></div>
    </>}
    <div><dt>Vendor attestation verification</dt><dd>Not assessed</dd></div>
    <div><dt>Financial actions</dt><dd>0</dd></div>
   </dl>
   {report.rollbackConformance.code&&<code>{report.rollbackConformance.code}</code>}
   {report.failure&&<p>Stopped at {report.failure.stage} · {report.failure.name}</p>}
   <p className="device-evidence-note">Browser observations and extension support are diagnostics. The SDK counter result covers only this fresh test credential; it is not a device attestation certificate, spend authority or a current Note inventory proof. {attachment==='platform'?'You can remove the test passkey from your password manager.':'You can remove the test credential using your security key’s credential manager.'}</p>
  </div>}
 </section>;
}
