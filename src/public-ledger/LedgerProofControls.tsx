import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,Check,Download,ShieldCheck,Upload,X} from 'lucide-react';
import {readPublicLedgerBytes} from '../receiz/public-ledger-transfer';
import type {PublicLedgerFileReview} from '../receiz/public-ledger-proof';
const MAX_UPLOAD=24*1024*1024;
import {readPublicLedgerDiscoveries,isPublicLedgerDiscovery as isDiscovery,type PublicLedgerDiscovery as Discovery} from '../receiz/public-ledger-discovery';
import {announcePublicLedgerPublication,subscribePublicLedgerSync} from '../receiz/public-ledger-sync';
async function readJson(response:Response,max=1024*1024){return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await readPublicLedgerBytes(response,max)));}
async function readPublicOriginal(digest:string){
 const response=await fetch('/api/bank/ledger-proof?source='+digest,{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(30_000)});if(!response.ok)throw Error();
 const bytes=await readPublicLedgerBytes(response,16*1024*1024),{inspectPublicLedgerFile}=await import('../receiz/public-ledger-proof');
 const opened=await inspectPublicLedgerFile({bytes,filename:'public-source.receizbundle'});if(opened.artifactSha256!==digest)throw Error('PUBLIC_LEDGER_SOURCE_MISMATCH');return opened;
}
/** A refresh can advance retained custody only after canonical verification and
 * the existing full-source continuation check. It never changes a UI review. */
async function refreshPublicLedger(){
 let response:Response;try{response=await fetch('/api/bank/ledger-proof',{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(30_000)});}catch{return null;}if(!response.ok)return null;
 const {openPublicLedgerSource}=await import('../receiz/public-ledger-proof'),{retainPublicLedgerReview}=await import('../receiz/public-ledger-retention');
 const opened=await openPublicLedgerSource(await readJson(response,24*1024*1024));
 try{return await retainPublicLedgerReview(opened);}catch(error){if(!(error instanceof Error)||error.message!=='PUBLIC_LEDGER_LOCAL_STORAGE_UNAVAILABLE')throw error;return opened;}
}
export function LedgerProofControls(){
 const picker=useRef<HTMLInputElement>(null),refreshing=useRef<Promise<PublicLedgerFileReview|null>|null>(null),[review,setReview]=useState<PublicLedgerFileReview|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[consentDigest,setConsentDigest]=useState<string|null>(null),[publicDigest,setPublicDigest]=useState<string|null>(null),[discoveries,setDiscoveries]=useState<Discovery[]>([]),[nextCursor,setNextCursor]=useState<number|null>(null);
 const discoveryCount=useRef<number|undefined>(undefined);
 useEffect(()=>{
  let live=true,pending=false,initialized=false,sourceCursor:number|undefined,requestedSync=0,completedSync=0;const controller=new AbortController();
  const synchronize=async(forceSource=false)=>{
   if(forceSource)requestedSync++;
   if(!live||pending||document.visibilityState==='hidden')return;pending=true;
   try{const previousCount=discoveryCount.current,page=await readPublicLedgerDiscoveries(previousCount,controller.signal);if(!live)return;
    if(page.watchCursor!==null)discoveryCount.current=page.watchCursor;
    if(!initialized){setNextCursor(page.nextCursor);initialized=true;}
    setDiscoveries(previous=>{const rows=new Map([...previous,...page.entries].map(row=>[row.artifactSha256,row]));return [...rows.values()].sort((a,b)=>BigInt(a.kaiPulse)===BigInt(b.kaiPulse)?a.artifactSha256.localeCompare(b.artifactSha256):BigInt(a.kaiPulse)>BigInt(b.kaiPulse)?-1:1);});
    const target=page.watchCursor,revision=requestedSync;
    if((target!==null&&target>0&&target!==sourceCursor)||revision!==completedSync){
     const opened=await refresh();
     if(opened){sourceCursor=target??sourceCursor;completedSync=revision;}
    }
   }catch{/* The retained view and local file controls remain available. */}
   finally{pending=false;}
  };
  void synchronize();const wake=()=>{void synchronize();};
  const stop=subscribePublicLedgerSync(()=>{void synchronize(true);}),timer=setInterval(wake,60000);
  document.addEventListener('visibilitychange',wake);window.addEventListener('online',wake);
  if(new URL(location.href).searchParams.has('source'))void openLink();
  return()=>{live=false;controller.abort();stop();clearInterval(timer);document.removeEventListener('visibilitychange',wake);window.removeEventListener('online',wake);};
 },[]);
 async function moreDiscoveries(){if(nextCursor===null)return;setBusy(true);try{const response=await fetch(`/api/bank/ledger-proof?discovery=1&limit=12&cursor=${nextCursor}`,{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(15_000)});if(!response.ok)throw Error();const value=await readJson(response);if(!Array.isArray(value.entries))throw Error();const incoming=value.entries.filter(isDiscovery);setDiscoveries(previous=>[...previous,...incoming.filter((v:Discovery)=>!previous.some(p=>p.artifactSha256===v.artifactSha256))]);setNextCursor(Number.isSafeInteger(value.nextCursor)&&value.nextCursor>nextCursor?value.nextCursor:null);}catch{setMessage('Earlier originals could not be read. The current list is retained.');}finally{setBusy(false);}}
 async function inspect(file:File){setBusy(true);setMessage('');setConsentDigest(null);setPublicDigest(null);try{
  if(file.size>MAX_UPLOAD)throw Error('CAPACITY');const {inspectPublicLedgerFile}=await import('../receiz/public-ledger-proof');setReview(await inspectPublicLedgerFile({bytes:new Uint8Array(await file.arrayBuffer()),filename:file.name}));
 }catch{setReview(null);setMessage('This file could not be admitted. Use an original public proof or a Ledger Crystal with its complete source. Private identity files and spendable notes cannot be published.');}finally{setBusy(false);}}
 function refresh(){if(refreshing.current)return refreshing.current;const pending=refreshPublicLedger();refreshing.current=pending;void pending.finally(()=>{if(refreshing.current===pending)refreshing.current=null;}).catch(()=>{});return pending;}
 async function download(){setBusy(true);setMessage('');try{
  const {readRetainedPublicLedger}=await import('../receiz/public-ledger-retention');
  let opened=await readRetainedPublicLedger().catch(()=>null);
  if(opened?.snapshot)void refresh().catch(()=>{});else opened=await refresh();
  if(!opened?.snapshot){setMessage('A complete verified Ledger source is not available yet. You can still inspect public activity or open a Ledger Crystal you already hold.');return;}
  await saveImage(opened);setMessage(`Memory Crystal saved with all ${opened.snapshot.records.length.toLocaleString()} records in its declared source.`);
 }catch{setMessage('The complete source could not be saved. Your retained history is unchanged.');}finally{setBusy(false);}}
 async function saveImage(value:PublicLedgerFileReview){const {createPublicLedgerCrystal}=await import('../receiz/public-ledger-crystal-image');const output=await createPublicLedgerCrystal(value),url=URL.createObjectURL(new Blob([new Uint8Array(output.bytes)],{type:'image/png'}));const link=document.createElement('a');link.href=url;link.download=output.filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),30_000);}
 async function retain(){if(!review)return;setBusy(true);try{const {retainPublicLedgerReview}=await import('../receiz/public-ledger-retention');const retained=await retainPublicLedgerReview(review);setReview(current=>current===review?retained:current);setMessage('Verified original retained on this browser. Nothing was published.');}catch{setMessage('This source conflicts with retained history or local storage is unavailable. No history was replaced.');}finally{setBusy(false);}}
 async function publish(){if(!review||consentDigest!==review.artifactSha256)return;setBusy(true);setMessage('');try{
  const {heldPublicLedgerFile}=await import('../receiz/public-ledger-proof'),{receizBase64UrlEncode}=await import('@receiz/sdk'),source=heldPublicLedgerFile(review);
  const body=JSON.stringify({action:'publish',filename:source.filename,exactBytesB64u:receizBase64UrlEncode(source.bytes),consent:{artifactSha256:review.artifactSha256,publicOriginals:true,effect:review.kind==='ledger'?'synchronize-ledger':'discover-proof'}});
  if(new TextEncoder().encode(body).length>4*1024*1024){setMessage('This original exceeds the public relay’s upload capacity. Keep the verified file locally; it has not been published.');return;}
  const response=await fetch('/api/bank/ledger-proof',{method:'POST',credentials:'omit',redirect:'error',headers:{'Content-Type':'application/json'},body,signal:AbortSignal.timeout(30_000)});if(!response.ok)throw Error();const result=await readJson(response);if(result.artifactSha256!==review.artifactSha256)throw Error();const confirmed=await readPublicOriginal(review.artifactSha256);setPublicDigest(confirmed.artifactSha256);setDiscoveries(previous=>previous.some(value=>value.artifactSha256===confirmed.artifactSha256)?previous:[{artifactSha256:confirmed.artifactSha256,kind:confirmed.kind,kaiPulse:confirmed.kaiPulse},...previous]);setMessage('The verified original is now publicly available.');announcePublicLedgerPublication(confirmed.artifactSha256);
 }catch{setMessage('Publication could not be confirmed. Keep this exact file and retry; the same original will not create a duplicate.');}finally{setBusy(false);}}
 async function openLink(){const digest=new URL(location.href).searchParams.get('source');if(!digest||!/^[a-f0-9]{64}$/.test(digest))return;setBusy(true);setConsentDigest(null);setPublicDigest(null);try{
  const {readRetainedPublicLedger}=await import('../receiz/public-ledger-retention'),held=await readRetainedPublicLedger().catch(()=>null),local=held?.artifactSha256===digest;
  const opened=local?held:await readPublicOriginal(digest);setReview(opened);setPublicDigest(local?null:digest);
 }catch{setMessage('This public original is unavailable. Open the original file to verify the proof it carries.');}finally{setBusy(false);}}
 return <section className="ledger-proof-tools" aria-label="Ledger originals"><div><ShieldCheck size={19}/><span><strong>Keep the original.</strong><small>Complete source. Verifiable history.</small></span></div><nav aria-label="Ledger proof tools">{new URL(location.href).searchParams.has('source')&&<button disabled={busy} onClick={()=>void openLink()}>Inspect linked proof<ArrowUpRight size={14}/></button>}<button disabled={busy} onClick={()=>void download()}><Download size={15}/>Memory Crystal</button><button disabled={busy} onClick={()=>picker.current?.click()}><Upload size={15}/>Open proof</button></nav><input ref={picker} hidden type="file" accept=".png,.receiz,.receizbundle,.json,application/octet-stream" onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void inspect(file);}}/>
  {discoveries.length>0&&<details className="ledger-proof-discoveries"><summary>Published originals<span>{discoveries.length}</span></summary>{discoveries.map(value=><a key={value.artifactSha256} href={`/ledger/?source=${value.artifactSha256}`}><span>{value.kind==='ledger'?'Ledger source':'Proof object'}<small>☤KAI {value.kaiPulse}</small></span><code>{value.artifactSha256.slice(0,12)}…</code><ArrowUpRight size={14}/></a>)}{nextCursor!==null&&<button disabled={busy} onClick={()=>void moreDiscoveries()}>More published originals</button>}</details>}{busy&&<p role="status">Verifying the complete original…</p>}{message&&<p role="status">{message}</p>}
  {review&&<div className="ledger-proof-review"><div className="ledger-proof-review-title"><ShieldCheck size={20}/><h2>{review.kind==='ledger'?'Ledger source verified':'Original proof verified'}</h2><button aria-label="Close proof review" onClick={()=>{setReview(null);setConsentDigest(null);}}><X size={18}/></button></div><p>{review.snapshot?`${review.snapshot.records.length.toLocaleString()} records · complete public action history · ${review.snapshot.baseline==='native'?'native source':'observed baseline'}`:'Original integrity, ownership and coordinate verified. Publication makes no new financial or ownership claim.'}</p><dl><div><dt>Source</dt><dd>{review.artifactSha256}</dd></div><div><dt>Coordinate</dt><dd>☤KAI {review.kaiPulse}</dd></div>{review.ownerReceizId&&<div><dt>Original owner</dt><dd>{review.ownerReceizId}</dd></div>}</dl><div className="ledger-proof-local-actions"><button disabled={busy} onClick={()=>void retain()}>Keep verified original<Check size={14}/></button>{review.snapshot&&<button disabled={busy} onClick={()=>{setBusy(true);void saveImage(review).catch(()=>setMessage('The image could not be saved.')).finally(()=>setBusy(false));}}>Save Crystal<Download size={14}/></button>}</div>{publicDigest===review.artifactSha256?<a className="ledger-proof-public-link" href={`/ledger/?source=${publicDigest}`}>Open public proof<ArrowUpRight size={14}/></a>:<div className="ledger-proof-publish"><label><input type="checkbox" checked={consentDigest===review.artifactSha256} onChange={event=>setConsentDigest(event.target.checked?review.artifactSha256:null)}/>I choose to make this exact original and all its carried contents public. Public copies cannot be recalled.</label><button disabled={consentDigest!==review.artifactSha256||busy} onClick={()=>void publish()}>Publish verified original<ArrowUpRight size={14}/></button></div>}</div>}
 </section>;
}
