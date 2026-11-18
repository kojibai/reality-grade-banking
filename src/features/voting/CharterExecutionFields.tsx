import {useRef,useState} from 'react';
import type {OpenIdentity} from '../../receiz/native-identity';
import type {CharterExecution,CharterPayment} from '../../receiz/governance-documents';

const paymentLabels:Record<keyof CharterPayment,string>={
  budgetId:'Budget ID',installment:'Installment ID',sourceProofObjectId:'Source Settlement proof object',
  sourceValueHead:'Source Settlement head',destinationSubjectId:'Recipient subject ID',expectedDestinationHead:'Recipient Settlement head',amountPhiMicro:'Amount in micro-Φ',
};
const initialPayment:CharterPayment={budgetId:'',installment:'',sourceProofObjectId:'',sourceValueHead:'',destinationSubjectId:'',expectedDestinationHead:'',amountPhiMicro:''};
export function PaymentFacts({payment}:{payment:CharterPayment}){
  return <dl className="gov-facts">{(Object.keys(paymentLabels) as (keyof CharterPayment)[]).map(k=><div key={k}><dt>{paymentLabels[k]}</dt><dd>{payment[k]}</dd></div>)}</dl>;
}
export function CharterExecutionFields({identity,owner,value,change}:{identity:OpenIdentity;owner:string;value:CharterExecution|undefined;change:(value:CharterExecution|undefined)=>void}){
  const picker=useRef<HTMLInputElement>(null),running=useRef(false);
  const [working,setWorking]=useState(false),[error,setError]=useState('');
  async function bind(file?:File){
    if(running.current||!value)return;
    running.current=true;setWorking(true);setError('');
    try{
      if(!identity.governanceExecution)throw Error('This identity cannot open a register.');
      const device=await identity.governanceExecution();
      const register=file?await device.selectRegister(file):await device.createRegister();
      change({...value,custodian:register.custodian,registerProofObjectId:register.registerProofObjectId,registerGenesisHead:register.registerGenesisHead});
    }catch(e){setError(e instanceof Error?e.message:'The register could not be opened.');}
    finally{running.current=false;setWorking(false);}
  }
  async function downloadRegister(){
    if(!identity.governanceExecution)return;
    setError('');
    try{
      const device=await identity.governanceExecution(),selected=await device.selectedRegister();
      if(!selected||selected.registerProofObjectId!==value?.registerProofObjectId)throw Error('Open this register Original on the device first.');
      const file=await device.exportSelectedRegister(),url=URL.createObjectURL(file),a=document.createElement('a');
      a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
    }catch(e){setError(e instanceof Error?e.message:'The selected register is unavailable.');}
  }
  return <fieldset disabled={working} className="gov-box gov-stack"><legend>Binding decisions</legend>
    <label className="gov-check"><input type="checkbox" checked={Boolean(value)} onChange={e=>change(e.target.checked?{rule:'unanimous-evidence-closure-v1',custodian:owner,registerProofObjectId:'',registerGenesisHead:'',treasury:null}:undefined)}/>Authorize certification on a governance register</label>
    {value&&<><p>After voting and appeals close, every voting member must sign the same evidence list. The custodian can then submit the decision against the named register.</p>
      <div className="gov-actions"><button type="button" onClick={()=>void bind()}>Create register Original</button><button type="button" onClick={()=>picker.current?.click()}>Open register file</button>{value.registerProofObjectId&&<button type="button" onClick={()=>void downloadRegister()}>Save register Original</button>}</div>
      <input hidden ref={picker} type="file" aria-label="Open register file" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void bind(f);}}/>
      {working&&<small role="status">Opening register…</small>}{error&&<p role="alert">{error}</p>}
      <label>Custodian Receiz owner ID<input required value={value.custodian} onChange={e=>change({...value,custodian:e.target.value.trim()})}/></label>
      <label>Register proof object ID<input required value={value.registerProofObjectId} onChange={e=>change({...value,registerProofObjectId:e.target.value.trim()})}/></label>
      <label>Register genesis history head<input required pattern="[a-f0-9]{64}" value={value.registerGenesisHead} onChange={e=>change({...value,registerGenesisHead:e.target.value.trim()})}/></label>
      <label className="gov-check"><input type="checkbox" checked={Boolean(value.treasury)} onChange={e=>change({...value,treasury:e.target.checked?initialPayment:null})}/>Authorize one Settlement installment</label>
      {value.treasury&&<div className="gov-fields">{(Object.keys(paymentLabels) as (keyof CharterPayment)[]).map(k=><label key={k}>{paymentLabels[k]}<input required value={value.treasury![k]} maxLength={256} pattern={k==='amountPhiMicro'?'[1-9][0-9]{0,17}':k.endsWith('Head')?'[a-f0-9]{64}':k==='destinationSubjectId'?'receiz:subject:[a-f0-9]{64}':undefined} onChange={e=>change({...value,treasury:{...value.treasury!,[k]:e.target.value.trim()}})}/></label>)}</div>}
    </>}
  </fieldset>;
}
