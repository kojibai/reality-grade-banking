import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowUpRight,Banknote,Check,Download,FileCheck2,KeyRound,Layers3,ShieldCheck,Upload} from 'lucide-react';
import {BankMark} from '../../components/BankMark';
import {formatMoney} from '../../core/money';
import {createVaultPublicReader,type VaultDisclosure} from '../../receiz/vault/public-reader';
import type {VaultLocation} from '../../receiz/vault/location';
import './vault.css';
const units=(v:string)=>{const n=BigInt(v),whole=n/1000000n,fraction=String(n%1000000n).padStart(6,'0').replace(/0+$/,'');return whole.toLocaleString('en-US')+(fraction?'.'+fraction:'');};
function save(record:VaultDisclosure){
 const url=URL.createObjectURL(new Blob([JSON.stringify(record.record)],{type:'application/json'})),a=document.createElement('a');
 try{a.href=url;a.download=`vault-${record.vaultId}.public-proof.json`;a.click();}finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
function message(error:unknown){const code=error instanceof Error?error.message:'';return code==='VAULT_PUBLIC_RECORD_NOT_FOUND'?'This exact record has not been published. Open its original proof instead.':code==='VAULT_PRIVATE_ORIGINAL'?'This is a private original. Choose Open private vault to use it.':code==='VAULT_PUBLIC_RECORD_UNAVAILABLE'?'This record could not be reached. You can still open its saved original.':'This original could not be verified. Choose the complete, unchanged proof.';}
export function VaultPublicPage({route,onOpenPrivate}:{route:VaultLocation;onOpenPrivate(bytes:Uint8Array):Promise<void>|void}){
 const reader=useMemo(()=>createVaultPublicReader(),[]),[record,setRecord]=useState<VaultDisclosure|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[reading,setReading]=useState(Boolean(route.proof)),generation=useRef(0);
 useEffect(()=>{
  const revision=++generation.current;setRecord(null);setError('');setReading(Boolean(route.proof));
  if(route.proof)void reader.load(route).then(value=>{if(generation.current===revision)setRecord(value);}).catch(cause=>{if(generation.current===revision)setError(message(cause));}).finally(()=>{if(generation.current===revision)setReading(false);});
  return()=>{generation.current++;};
 },[reader,route.vaultId,route.proof]);
 async function open(file:File|undefined,privateOriginal:boolean){
  if(!file||busy)return;setBusy(true);setError('');const revision=generation.current;
  try{if(file.size>48*1024*1024)throw Error('VAULT_IMAGE_CAPACITY');const bytes=new Uint8Array(await file.arrayBuffer());
   if(privateOriginal)await onOpenPrivate(bytes);else{const value=await reader.open(bytes);if(value.vaultId!==route.vaultId)throw Error('VAULT_PUBLIC_LOCATOR_MISMATCH');if(generation.current===revision)setRecord(value);}
  }catch(cause){if(generation.current===revision)setError(message(cause));}finally{if(generation.current===revision)setBusy(false);}
 }
 const upload=(privateOriginal:boolean)=> <label className="vault-upload"><span>{privateOriginal?<KeyRound size={17}/>:<Upload size={17}/>} {privateOriginal?'Open private vault':'Open an original'}</span><input aria-label={privateOriginal?'Open private vault':'Open an original'} disabled={busy} type="file" accept="image/png,.png,application/json,.json" onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';void open(file,privateOriginal);}}/></label>;
 return <main className="vault-public-page"><header className="vault-page-header"><a href="/" aria-label="Bankeiz home"><BankMark/></a><span>Vault</span><a href="/" aria-label="Return to account"><ArrowLeft size={19}/></a></header>
 <article className="vault-proof-sheet" aria-busy={reading||busy}>
  <div className="vault-proof-eyebrow"><span>Ownership evidence</span><span><ShieldCheck size={15}/>View only</span></div>
  {record?<><div className="vault-verified"><Check size={16}/>Verified holdings</div><h1>{record.name}</h1><p className="vault-owner-label">Owner · Receiz ID</p><p className="vault-owner-id">{record.ownerReceizId}</p>
   <div className="vault-holdings-heading"><h2>Held in this record</h2><span>{record.holdings.length.toLocaleString('en-US')} {record.holdings.length===1?'holding':'holdings'}</span></div>
   <ul className="vault-holdings-list">{record.holdings.map(holding=><li key={holding.kind+':'+holding.id}><span className="vault-holding-symbol">{holding.kind==='money'?<Banknote size={22}/>:holding.kind==='asset'?<FileCheck2 size={22}/>:<Layers3 size={22}/>}</span><div><strong>{holding.title}</strong><span>{holding.kind==='money'?holding.amountUsdCents&&BigInt(holding.amountUsdCents)>0n?`${formatMoney(holding.amountUsdCents)} · recorded amount`:holding.amountPhiMicro?`${units(holding.amountPhiMicro)} Φ`:'Recorded value':`${units(holding.quantityMicro!)} ownership units`}</span><details><summary>Source evidence <ArrowUpRight size={12}/></summary><dl><div><dt>Source head</dt><dd>{holding.sourceHead}</dd></div><div><dt>Kai µpulse</dt><dd>{holding.atKaiUPulse}</dd></div>{holding.amountPhiMicro&&<div><dt>Exact Phi</dt><dd>{units(holding.amountPhiMicro)} Φ</dd></div>}</dl></details></div></li>)}</ul>
   {!record.holdings.length&&<p className="vault-empty">No holdings were selected for this disclosure.</p>}
   <div className="vault-proof-coordinate"><span>Recorded at Kai µpulse</span><strong>{BigInt(record.sealedAtKaiUPulse).toLocaleString('en-US')}</strong><code>{record.recordSha256}</code></div>
   <button className="vault-save-proof" onClick={()=>save(record)}><Download size={17}/>Save proof</button><p className="vault-scope">This proof preserves the ownership and value disclosed at its recorded coordinate. It does not assert that the holdings remain unspent today.</p>
  </>:<div className="vault-public-empty"><span className="vault-empty-mark"><ShieldCheck size={34} strokeWidth={1.2}/></span><h1>{reading?'Opening the record.':'The original holds the proof.'}</h1><p>{reading?'The exact published evidence is being opened.':'Open an original to inspect its owner, holdings and complete carried evidence.'}</p>{upload(false)}</div>}
  {error&&<p className="vault-error" role="alert">{error}</p>}
  <footer className="vault-proof-footer"><p>Shared evidence grants no access to money, assets or an account.</p><a href="/vault-verifier/v1/verify.html" target="_blank" rel="noreferrer">Offline reader <ArrowUpRight size={13}/></a>{upload(true)}</footer>
 </article><p className="vault-page-caption">Reality-grade banking</p></main>;
}
