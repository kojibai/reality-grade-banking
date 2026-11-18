import {useEffect,useRef,useState} from 'react';
import {FileCheck2,Download} from 'lucide-react';
import type {OpenIdentity} from '../../receiz/native-identity';
import type {GovernanceRow} from '../../receiz/governance-directory';
import {charterElectorate,type GovernanceOriginal} from '../../receiz/governance-documents';
import {collectClosedEvidence} from '../../receiz/governance-closure';
import {ofKind,type Row} from '../../receiz/governance-view';
import type {GovernanceExecutionReview,GovernanceExecutionOutcome} from '../../receiz/governance-execution';
import {loadReceiz} from '../../receiz/client';
import {openGovernanceRegister} from '../../receiz/governance-execution-register';
import type {GovernanceDecision} from '../../receiz/governance-execution-plan';
import {GovernanceTreasury} from './GovernanceTreasury';
import {PaymentFacts} from './CharterExecutionFields';

type Props={proposal:Row<'proposal'>;charter:Row<'charter'>;rows:readonly GovernanceRow[];read:(id:string)=>Promise<GovernanceOriginal>;identity:OpenIdentity|null};
export function GovernanceCertification({proposal,charter,rows,read,identity}:Props){
  const [message,setMessage]=useState(''),[working,setWorking]=useState(false),[review,setReview]=useState<GovernanceExecutionReview|null>(null),[outcome,setOutcome]=useState<GovernanceExecutionOutcome|null>(null);
  const [closed,setClosed]=useState<GovernanceDecision|null>(null);
  const lock=useRef(false),alive=useRef(true),observation=useRef<HTMLInputElement>(null),publicFile=useRef<HTMLInputElement>(null);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const authority=charter.document.terms.rules.execution!,members=charterElectorate(charter.document.terms.rules);
  const signers=new Set(ofKind(rows,'closure').filter(r=>r.document.terms.charter===charter.digest&&r.document.terms.proposal===proposal.digest&&members.includes(r.document.author)).map(r=>r.document.author));
  const custodian=identity?.binding.artifactOwnerReceizId===authority.custodian;
  async function run(action:()=>Promise<void>){
    if(lock.current)return;lock.current=true;setWorking(true);setMessage('');
    try{await action();}catch(e){if(alive.current)setMessage(e instanceof Error?e.message:'The operation could not finish.');}
    finally{lock.current=false;if(alive.current)setWorking(false);}
  }
  async function custody(){
    if(!custodian||!identity?.governanceExecution)throw Error('Open the charter custodian’s identity to access this register.');
    return identity.governanceExecution();
  }
  async function verify(){
    const originals=await collectClosedEvidence(proposal,rows,read);
    const decision=await (await import('../../receiz/governance-execution-plan')).readGovernanceDecision({proposal:proposal.digest,originals});
    if(alive.current)setClosed(decision);
    if(alive.current)setMessage('Verified the signed evidence manifest of all '+members.length+' voting members against '+originals.length+' exact Originals.');
    return originals;
  }
  async function inspectFile(file:File){
    const opened=await openGovernanceRegister(file,authority.custodian);
    if(opened.register.registerProofObjectId!==authority.registerProofObjectId||opened.register.registerGenesisHead!==authority.registerGenesisHead)throw Error('This register belongs to a different charter.');
    const originals=await collectClosedEvidence(proposal,rows,read);
    const decision=await (await import('../../receiz/governance-execution-plan')).readGovernanceDecision({proposal:proposal.digest,originals}),sdk=await loadReceiz();
    const entry=opened.portable.provenance.appends.find(record=>record.schema==='bankeiz.governance.register-append.v1'&&sdk.canonicalizeReceizV122(record.decision)===sdk.canonicalizeReceizV122(decision));
    if(!entry)throw Error('This register does not carry the independently recounted decision.');
    if(alive.current){setClosed(decision);setMessage('The sealed register carries the same decision as the electors’ verified closure. Register head '+opened.register.head+'. Final execution is checked through the custodian’s committed recovery.');}
  }
  async function prepare(){
    setReview(null);const device=await custody(),originals=await verify();if(!alive.current)return;
    const prepared=await device.prepare({proposal:proposal.digest,originals});
    if(alive.current)setReview(prepared);
  }
  async function execute(){
    if(!review)return;
    const device=await custody(),result=await device.execute(review,review.exactPlanDigest);
    if(alive.current){setOutcome(result);setReview(null);}
  }
  async function reopen(){
    const device=await custody(),result=await device.reopen(proposal.digest);const held=result?.status==='prepared'?await device.reopenReview(proposal.digest):null;if(alive.current){setOutcome(result);setReview(held);if(!result)setMessage('No committed record for this proposal is held by this custodian.');}
  }
  async function download(){
    const file=await (await custody()).exportRegister(proposal.digest);
    if(!alive.current)return;const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  return <div className="gov-stack"><span>{signers.size} of {members.length} electors have submitted closure statements.</span><div className="gov-actions">
    {signers.size===members.length&&<button disabled={working} onClick={()=>void run(async()=>{await verify();})}><FileCheck2 size={16}/>Verify joint closure</button>}
    {custodian&&signers.size===members.length&&!review&&outcome?.status!=='committed'&&<button disabled={working} onClick={()=>void run(prepare)}>Prepare certification</button>}
    {custodian&&<button disabled={working} onClick={()=>void run(reopen)}>Open held decision</button>}</div>
    {closed&&<div className="gov-box"><h3>Verified closed tally</h3><p>{closed.counts.map(c=>c.choice+' · '+c.count).join(' / ')}</p><p>{closed.approved?'Approval threshold reached.':'Approval threshold was not reached.'}</p></div>}
    <details><summary>Check a register Original</summary><p>Open a register file to compare its signed decision with the electors’ closure.</p><button disabled={working} onClick={()=>publicFile.current?.click()}>Choose register file</button>
      <input ref={publicFile} hidden type="file" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void run(()=>inspectFile(f));}}/></details>
    {custodian&&<details><summary>Signing authority</summary><p>Use a protected issuer-state Original for this custodian when the register requires a current key observation.</p><button disabled={working} onClick={()=>observation.current?.click()}>Select issuer Original</button><input ref={observation} type="file" hidden onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void run(async()=>{const device=await custody();device.selectIssuerObservation(file);if(alive.current)setMessage('Issuer Original selected for verification at signing.');});}}/></details>}
    {review&&<div className="gov-box"><h3>Review register change</h3><p>{review.decision.approved?'Decision approved':'Decision declined'}</p>
      {review.decision.office&&<p>{review.decision.office} · {review.decision.seated.join(', ')||'No seats awarded'}</p>}
      {review.decision.payment&&<><h4>Authorized installment</h4><PaymentFacts payment={review.decision.payment}/></>}
      <p className="gov-proof-id">{review.exactPlanDigest}</p><div className="gov-actions"><button className="gov-primary" disabled={working} onClick={()=>void run(execute)}>Confirm certification</button><button disabled={working} onClick={()=>setReview(null)}>Cancel</button></div></div>}
    {outcome&&<div className="gov-box" role="status"><h3>{outcome.status==='committed'?'Certified decision':outcome.status==='unknown'?'Awaiting execution evidence':outcome.status==='prepared'?'Signed on this device':'Register unchanged'}</h3><p className="gov-proof-id">{outcome.exactPlanDigest}</p>
      {outcome.reason&&<p>{outcome.reason}</p>}{outcome.status==='committed'&&outcome.decision&&<><p>{outcome.decision.approved?'Approved':'Declined'}</p>
        {outcome.decision.office&&<p>{outcome.decision.office} · {outcome.decision.seated.join(', ')||'No seats awarded'}</p>}{outcome.decision.payment&&<p>One treasury installment authorized. Settlement requires a separate receipt.</p>}</>}
      {outcome.status==='committed'&&<button disabled={working} onClick={()=>void run(download)}><Download size={15}/>Save register Original</button>}</div>}
    {custodian&&identity&&outcome?.status==='committed'&&outcome.decision?.payment&&<GovernanceTreasury identity={identity} proposal={proposal.digest} payment={outcome.decision.payment}/>}
    {message&&<p role="status">{message}</p>}</div>;
}
