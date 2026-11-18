import {useEffect,useRef,useState} from 'react';
import type {OpenIdentity} from '../../receiz/native-identity';
import type {CharterPayment} from '../../receiz/governance-documents';
import type {GovernanceSettlementOutcome,GovernanceSettlementReview} from '../../receiz/governance-execution-settlement';
import {PaymentFacts} from './CharterExecutionFields';

export function GovernanceTreasury({identity,proposal,payment}:{identity:OpenIdentity;proposal:string;payment:CharterPayment}){
  const [review,setReview]=useState<GovernanceSettlementReview|null>(null),[result,setResult]=useState<GovernanceSettlementOutcome|null>(null);
  const [working,setWorking]=useState(false),[notice,setNotice]=useState('');
  const lock=useRef(false),alive=useRef(true),picker=useRef<HTMLInputElement>(null);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  async function open(){if(!identity.governanceExecution)throw Error('The custodian’s identity is required.');return identity.governanceExecution();}
  async function run(f:()=>Promise<void>){
    if(lock.current)return;lock.current=true;setWorking(true);setNotice('');
    try{await f();}catch(e){if(alive.current)setNotice(e instanceof Error?e.message:'The installment could not be verified.');}
    finally{lock.current=false;if(alive.current)setWorking(false);}
  }
  async function prepare(){const next=await (await open()).prepareSettlement(proposal);if(alive.current)setReview(next);}
  async function send(){
    if(!review)return;const next=await (await open()).executeSettlement(review,review.intentDigest);
    if(alive.current){setResult(next);setReview(null);}
  }
  async function reopen(){
    const next=await (await open()).reopenSettlement(proposal);
    if(alive.current){setResult(next);if(!next)setNotice('No payment receipt is held for this installment.');}
  }
  async function verify(file:File){const next=await (await open()).verifySettlement(proposal,file);if(alive.current)setResult(next);}
  return <section className="gov-box gov-stack"><h3>Treasury installment</h3><PaymentFacts payment={payment}/>
    <div className="gov-actions">{!review&&result?.status!=='settled'&&result?.status!=='recorded'&&<button disabled={working} onClick={()=>void run(prepare)}>Review installment</button>}
      <button disabled={working} onClick={()=>void run(reopen)}>Check held receipt</button></div>
    {review&&<div><p>Confirm a transfer of {payment.amountPhiMicro} micro-Φ to the exact recipient shown above.</p><p className="gov-proof-id">{review.intentDigest}</p><div className="gov-actions"><button disabled={working} className="gov-primary" onClick={()=>void run(send)}>Authorize payment</button><button disabled={working} onClick={()=>setReview(null)}>Cancel</button></div></div>}
    {result&&<div role="status"><h4>{{settled:'Settlement verified',recorded:'Native receipt recorded',unknown:'Payment outcome awaiting evidence','zero-write':'No transfer recorded'}[result.status]}</h4>
      {result.reason&&<p>{result.reason}</p>}{result.receiptDigest&&<p className="gov-proof-id">Receipt · {result.receiptDigest}</p>}
      {result.status==='recorded'&&<button disabled={working} onClick={()=>picker.current?.click()}>Verify sender and recipient recovery</button>}
      {result.status==='settled'&&<dl className="gov-facts"><div><dt>Sender head</dt><dd>{result.sourceHead}</dd></div><div><dt>Recipient head</dt><dd>{result.destinationHead}</dd></div></dl>}
    </div>}{notice&&<p role="status">{notice}</p>}
    <input hidden type="file" ref={picker} aria-label="Private Settlement recovery" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void run(()=>verify(f));}}/>
  </section>;
}
