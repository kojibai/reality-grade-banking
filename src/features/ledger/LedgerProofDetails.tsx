import {hasLedgerNativeRecord,ledgerNativeRecord} from '../../receiz/ledger-native-record';
import {ledgerNativeInspectionMatches} from '../../receiz/ledger-offline-proof';
import {ledgerOriginalTransferId} from '../../receiz/held-transfer-original';
import type {HeldLedgerOriginalReader} from '../../receiz/held-ledger-original';
import {useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {Download,LoaderCircle,ShieldCheck} from 'lucide-react';
import type {PublicRecord} from '../../receiz/public-network';
import {downloadLedgerEvidence,downloadLedgerOriginal,inspectLedgerOriginal,loadOfflineProofVerifier,type OfflineProofReport} from '../../receiz/ledger-offline-proof';
import {retainedProofInspection,subscribeProofInspections} from '../../receiz/proof-inspection';
import {PublicOriginalPurchaseRequired} from '../../receiz/public-original';
import {readPublicProofPresentation} from '../../receiz/public-market';

export function ProofJson({label,value}:{label:string;value:unknown}){
 const [open,setOpen]=useState(false),text=useMemo(()=>open?JSON.stringify(value,null,2):'',[open,value]);
 return <details className="ledger-exact-json" onToggle={event=>{if(event.target===event.currentTarget)setOpen(event.currentTarget.open);}}><summary>{label}</summary>{open&&<pre>{text}</pre>}</details>;
}

/** The public receipt has its own proof and scope. It never supplies the
 * digest or bytes required by the sealed Original's download. */
function publicMomentForRecord(record:PublicRecord):PublicRecord|undefined{
 if(record.authority!=='public-source-projection')return;
 const item=readPublicProofPresentation(record.details?.publicAsset);
 if(!item?.verifyUrl||!item.originalUrl||item.originalUrl!==record.details?.originalUrl||item.originalDigest!==record.evidence.artifactDigest
  ||new URL(item.originalUrl).pathname!=='/api/profile/originals/download')return;
 const url=new URL(item.verifyUrl),pulse=url.pathname.split('/').at(-1),ms=url.searchParams.get('ms')??'';
 if(String(record.pulse)!==pulse||!/^\d{10,17}$/.test(ms)||!Number.isSafeInteger(Number(ms))
  ||[...url.searchParams.keys()].some(key=>!['a','ms','tz'].includes(key))
  ||!/^[a-f0-9]{8}$/i.test(url.searchParams.get('a')??''))return;
 const moment={...record,id:record.id+':public-moment',sourceUrl:url.href,evidence:{},details:{},valueOperands:undefined};
 return ledgerNativeRecord(moment)?moment:undefined;
}

export function LedgerProofDetails({record,sourceReader}:{record:PublicRecord;sourceReader?:HeldLedgerOriginalReader}){
 const publicMoment=useMemo(()=>publicMomentForRecord(record),[record]);
 const [localReport,setReport]=useState<OfflineProofReport|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[capsule,setCapsule]=useState<Record<string,unknown>|null>(null),[material,setMaterial]=useState<Record<string,unknown>|null>(null),[retainedState,setRetained]=useState(false);
 const pending=useRef<AbortController|null>(null),epoch=useRef(0),working=useRef(false);
 const shared=useSyncExternalStore(subscribeProofInspections,()=>retainedProofInspection(record.evidence.artifactDigest),()=>null);
 const momentReport=publicMoment&&localReport&&ledgerNativeInspectionMatches(publicMoment,localReport)?localReport:null;
 const originalReport=shared?.report??(localReport&&(localReport.artifactSha256===record.evidence.artifactDigest?.toLowerCase()||ledgerNativeInspectionMatches(record,localReport,sourceReader)||!!sourceReader?.transferOriginal&&localReport.transferOriginal?.transferId===ledgerOriginalTransferId(record))?localReport:null);
 const report=momentReport??originalReport,retained=momentReport?retainedState:shared?.retained??retainedState;
 useEffect(()=>{epoch.current++;working.current=false;pending.current?.abort();setReport(null);setCapsule(null);setMaterial(null);setBusy(false);setMessage('');setRetained(false);return()=>{epoch.current++;pending.current?.abort();};},[record.id,record.evidence.artifactDigest,publicMoment?.sourceUrl,sourceReader]);
 const available=hasLedgerNativeRecord(record)||!!sourceReader?.transferOriginal&&!!ledgerOriginalTransferId(record)||!!originalReport||!!sourceReader&&!!record.evidence.artifactDigest||typeof record.details?.originalUrl==='string'&&!!record.evidence.artifactDigest;
 const bundle=report?.verification.bundle as Record<string,unknown>|undefined;
 const publicSignals=report?.groth16?.publicSignals;
 const continuity=report?.verification.assetContinuity as {state?:unknown}|undefined;
 async function inspect(target=record){
  if(working.current)return;working.current=true;const current=++epoch.current;pending.current?.abort();const controller=new AbortController();pending.current=controller;setBusy(true);setMessage('');
  const moment=target===publicMoment;
  try{
   if(moment||available){
    const result=await inspectLedgerOriginal(target,controller.signal,moment?undefined:sourceReader);if(current!==epoch.current)return;
    setReport(result.report);setRetained(result.retained);
    setMessage(moment?'Public Moment verified. Its proof covers the Moment associated with this asset.':result.retained?'Original verified and kept on this device for offline inspection.':'Original verified. Download the original proof to keep its exact verified file.');
   }else{const verifier=await loadOfflineProofVerifier();if(current!==epoch.current)return;setMaterial(verifier.materials);const result=await verifier.inspectWalletCapsule(record.details?.proofBundle);if(current===epoch.current){setCapsule(result);setMessage('Carried capsule hashes match. Open the original proof source to inspect its enclosing signed proof.');}}
  }catch(cause){if(current===epoch.current)setMessage(cause instanceof PublicOriginalPurchaseRequired?cause.message:moment?'The public Moment could not be verified.':available?'The exact original could not be verified. Retry when its source is available; no verification claim has been added.':'A complete verifiable capsule was not supplied. The available source fields remain below.');}
  finally{if(current===epoch.current){working.current=false;setBusy(false);}}
 }
 async function download(mode:'original'|'kit'|'moment'){
  if(working.current)return;working.current=true;const current=epoch.current;setBusy(true);setMessage('');
  const target=mode==='moment'&&publicMoment?publicMoment:record,reader=target===record?sourceReader:undefined;
  try{
   let selected=mode==='moment'?momentReport:originalReport;if((available||mode==='moment')&&!selected){const result=await inspectLedgerOriginal(target,undefined,reader);if(current!==epoch.current)return;selected=result.report;setReport(selected);setRetained(result.retained);}
   const file=mode==='kit'?new File([new Uint8Array(await downloadLedgerEvidence(target,selected,reader))],`verification-kit-${target.sourceId.replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,80)}.zip`,{type:'application/zip'}):await downloadLedgerOriginal(target,selected,undefined,reader);
   if(current!==epoch.current)return;const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   setMessage(mode==='moment'?'Public Moment proof downloaded for offline verification.':mode==='original'?'Exact original proof downloaded. It is ready for the Receiz offline verifier.':'Verification kit downloaded with the exact original, public keys, verifier and complete verifier sources.');
  }catch(cause){if(current===epoch.current)setMessage(cause instanceof PublicOriginalPurchaseRequired?cause.message:mode==='moment'?'The public Moment proof could not be downloaded.':mode==='original'?'The exact original proof could not be downloaded. Keep its source reference and try again.':'The verification kit could not be completed. No incomplete kit has been downloaded.');}
  finally{if(current===epoch.current){working.current=false;setBusy(false);}}
 }

 return <section className="ledger-proof-details" aria-label="Independent offline proof verification"><h4>Independent verification</h4><p>{publicMoment?'Verify the public Moment or inspect the sealed Original separately.':available?'Inspect the retained Original and its carried proof, receipt and continuity.':'This activity feed carries source fields and hash references. Its original proof has not been opened here; inspect the original source for its carried proof data.'}</p><div className="ledger-proof-actions">{publicMoment&&<button disabled={busy} onClick={()=>void inspect(publicMoment)}><ShieldCheck size={14}/>Verify public Moment</button>}{momentReport&&<button disabled={busy} onClick={()=>void download('moment')}><Download size={14}/>Download Moment proof</button>}<button disabled={busy} onClick={()=>void inspect()}>{busy?<LoaderCircle size={14}/>:<ShieldCheck size={14}/>} {available?'Inspect full original':'Check carried evidence'}</button>{available&&<button disabled={busy} onClick={()=>void download('original')}><Download size={14}/>Download original proof</button>}<button disabled={busy} onClick={()=>void download('kit')}><Download size={14}/>Download verification kit</button></div>{message&&<p role="status">{message}</p>}{report&&<><p className="ledger-proof-scope">{momentReport?'Public Moment verified':report.exportedRecord?'Original export verified':'Canonical original verified'} · SHA-256 {report.artifactSha256}{retained?' · kept locally':''}. {report.scope}</p><dl className="ledger-proof-facts"><div><dt>Proof suite</dt><dd>{report.groth16?'Groth16 · BN128':'Not carried by this original'}</dd></div><div><dt>Public signals</dt><dd>{Array.isArray(publicSignals)?publicSignals.join(' · '):'Not supplied'}</dd></div><div><dt>Poseidon commitment</dt><dd>{typeof bundle?.zkPoseidonHash==='string'?bundle.zkPoseidonHash:'Not supplied'}</dd></div><div><dt>Proof SHA-256</dt><dd>{typeof bundle?.groth16ProofDigest==='string'?bundle.groth16ProofDigest:'Not supplied'}</dd></div><div><dt>Carried continuity</dt><dd>{typeof continuity?.state==='string'?continuity.state:'See original verification'}</dd></div></dl><ProofJson label={momentReport?"Complete public Moment proof":"Complete original proof · Groth16, Poseidon, signatures & continuity"} value={report}/>{report.transferOriginal&&<ProofJson label="Transfer Original and issued receipt checks" value={report.transferOriginal}/>}</>}{capsule&&<ProofJson label="Capsule consistency result" value={capsule}/>}{material&&!report&&<ProofJson label="Pinned public verification keys & trust roots" value={material}/>}<p>Upload the original proof to the Receiz offline verifier. The verification kit requires the exact original and includes its carried proof and continuity, a self-contained verifier, full verifier source, public keys and browser/Node instructions. A missing original cannot produce a complete kit.</p></section>;
}
