import {useEffect,useRef,useState} from 'react';
import {Download,FileCheck2} from 'lucide-react';
import type {GovernanceOriginal} from '../../receiz/governance-documents';
import type {GovernanceRow} from '../../receiz/governance-directory';
import {verifyGovernanceEvidence,type GovernanceEvidence} from '../../receiz/governance-evidence';

type Props={row:GovernanceRow;rows:readonly GovernanceRow[];read:(digest:string)=>Promise<GovernanceOriginal>;go:(digest:string)=>void;download:(row:GovernanceRow)=>void};
export function GovernanceProof({row,rows,read,go,download}:Props){
  const [proof,setProof]=useState<GovernanceEvidence|null>(null),[error,setError]=useState(''),[working,setWorking]=useState(false);
  const alive=useRef(true);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  async function verify(){
    setWorking(true);setError('');setProof(null);
    try{const evidence=await verifyGovernanceEvidence(row.digest,read,rows);if(alive.current)setProof(evidence);}
    catch{if(alive.current)setError('The exact Original could not be verified on this device.');}
    finally{if(alive.current)setWorking(false);}
  }
  return <section className="gov-box gov-stack"><div className="gov-actions">
    <button className="gov-primary" disabled={working} onClick={()=>void verify()}><FileCheck2 size={17}/>{working?'Verifying…':row.document.terms.kind==='ballot'?'Verify ballot':'Verify Original'}</button>
    <button onClick={()=>download(row)}><Download size={16}/>Save Original</button>

  </div>
  {proof&&<div role="status"><h3>Verified on this device</h3><p>{proof.scope}</p><dl className="gov-facts">
    <div><dt>Signing owner</dt><dd>{proof.original.document.author}</dd></div>
    {proof.original.document.terms.kind==='ballot'&&<div><dt>Signed choice</dt><dd>{proof.original.document.terms.choice}</dd></div>}
    <div><dt>Original SHA-256</dt><dd>{proof.original.digest}</dd></div><div><dt>Sealed Kai pulse</dt><dd>{proof.original.pulse}</dd></div>
  </dl>{proof.references.length>0&&<details><summary>Supporting Originals ({proof.references.length})</summary>{proof.references.map(r=><button key={r.digest} className="gov-row" onClick={()=>go(r.digest)}><strong>{r.label}</strong><small>{r.digest}</small></button>)}</details>}</div>}
  {error&&<p role="alert">{error}</p>}</section>;
}
