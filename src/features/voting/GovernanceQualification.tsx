import {useEffect,useState} from 'react';
import {ArrowLeft,Download,FileCheck2} from 'lucide-react';
import {GovernanceHeading,governanceExamplePath} from './GovernanceRegister';
import type {Qualification,QualificationName,verifyGovernanceQualification} from './qualification/verify';
import election from './qualification/election.json?raw';
import approvedIntent from './qualification/approved-intent.json?raw';
import storage from './qualification/settlement.json?raw';
import treasury from './qualification/treasury.json?raw';

const rawSources={election,treasury};
const label={election:'Steward election',treasury:'Repair installment'};
type Inspection=Awaited<ReturnType<typeof verifyGovernanceQualification>>;
export function GovernanceQualification({name}:{name:QualificationName}){
 const [check,setCheck]=useState<Inspection|null>(null),[error,setError]=useState(''),[checking,setChecking]=useState(false);
 const raw=rawSources[name],p:Qualification=JSON.parse(raw),decision=p.decision,other=name==='election'?'treasury':'election';
 useEffect(()=>{document.title=label[name]+' qualification · Bankeiz';},[name]);
 async function verify(){
  setChecking(true);setError('');
  try{const {verifyGovernanceQualification,verifyQualificationSettlement}=await import('./qualification/verify'),encode=new TextEncoder();
   const checked=await verifyGovernanceQualification(name,encode.encode(raw));
   if(name==='treasury')await verifyQualificationSettlement(checked.decision,encode.encode(approvedIntent),encode.encode(storage));
   setCheck(checked);}
  catch(cause){setError(cause instanceof Error?cause.message:'Verification did not complete.');}
  finally{setChecking(false);}
 }
 return <div className="voting-board">
  <GovernanceHeading eyebrow="Isolated execution qualification" title={label[name]}/>
  <nav className="gov-actions" aria-label="Qualification navigation"><a className="gov-link" href={governanceExamplePath}><ArrowLeft size={15}/>Harbor Tool Library</a>
   <a className="gov-link" href={'/vote/?qualification='+other}>{label[other]} qualification</a></nav>
  <article className="gov-stack"><section className="gov-box">
   <h2>{name==='election'?'Workshop steward seated':'Repair installment authorized'}</h2>
   <p>{name==='election'?'Two electors seated '+decision.seated.join(', ')+' as workshop steward.':
    'Two electors approved one installment of '+decision.payment!.amountPhiMicro+' micro-Φ for the repair budget.'}</p>
   <ul className="gov-bars">{decision.counts.map(row=><li key={row.choice}><span>{row.choice}</span><strong>{row.count}</strong><meter aria-label={row.choice+' votes'} value={row.count} max={2}/></li>)}</ul>
   {decision.payment&&<><h3>Payment evidence</h3><p>The native Settlement writer recorded a debit of 25,000 micro-Φ and a matching credit in a rollback-only PostgreSQL test. The sender started with 60,000 test micro-Φ and finished with 35,000. The recipient opened a 25,000 micro-Φ position.</p><p>The package includes the recorded receipt and its two head references. Independently signed sender and recipient Settlement recovery was unavailable in this run.</p>
   <dl className="gov-facts"><div><dt>Budget</dt><dd>{decision.payment.budgetId}</dd></div><div><dt>Installment</dt><dd>{decision.payment.installment}</dd></div><div><dt>Recipient</dt><dd className="gov-proof-id">{decision.payment.destinationSubjectId}</dd></div></dl></>}
  </section>
  <section className="gov-box"><h2>Signed register</h2>
   <p>The isolated SDK run committed a register successor. Its public Originals let you check the ballots, both closure signatures and the resulting register head on this device.</p>
   <dl className="gov-facts"><div><dt>Governance Originals</dt><dd>{p.sources.originals.length}</dd></div><div><dt>Register Originals</dt><dd>2</dd></div><div><dt>Closure pulse</dt><dd>{decision.closedAtKai}</dd></div><div><dt>Successor head</dt><dd className="gov-proof-id">{p.registerHead}</dd></div></dl>
   <div className="gov-actions"><button type="button" className="gov-primary" onClick={()=>void verify()} disabled={checking}><FileCheck2 size={16}/>{checking?'Checking Originals…':'Verify public evidence'}</button>
    <a className="gov-link" href={'/vote/qualifications/'+name+'.zip'} download={'bankeiz-'+name+'-qualification.zip'}><Download size={15}/>Download offline package</a></div>
   {check&&<p role="status">Verified {check.sourceCount} governance Originals and both register Originals under the isolated test key. The signed register carries the recounted decision at pulse {check.registerPulse}.{name==='treasury'?' The approved intent, SQL receipt, debit and credit match the same installment.':''}</p>}
   {error&&<p role="alert">{error}</p>}
   <details><summary>Verify the download offline</summary><p>Unzip the package and run <code>node verify.mjs</code> with Node.js 22 or later. It contains the exact Originals, the verifier and its source code.</p></details>
  </section></article>
 </div>;
}
