import {useState} from 'react';
import {receizKaiNow} from '@receiz/sdk';
import {charterElectorate,type GovernanceTerms} from '../../receiz/governance-documents';
import {charterRatification,ofKind,type Row} from '../../receiz/governance-view';
import type {GovernanceRow} from '../../receiz/governance-directory';
import {exampleMemberName as member} from './example/governance-example';
import type {PracticeTerms} from './example/practice-state';

type Props={panel:'People'|'Charter rules'|'Decisions'|'Proposal';charter:Row<'charter'>;proposal?:Row<'proposal'>;actor:string;practice:readonly GovernanceRow[];examples:readonly GovernanceRow[];save:(terms:PracticeTerms)=>void;compose:()=>void};
export function PracticeActions({panel,charter,proposal,actor,practice,examples,save,compose}:Props){
  const [scope,setScope]=useState('Policy'),[delegate,setDelegate]=useState(''),[expiry,setExpiry]=useState('');
  const [office,setOffice]=useState(''),[statement,setStatement]=useState(''),[text,setText]=useState(''),[error,setError]=useState('');
  const context=[...examples,...practice],rules=charter.document.terms.rules,id=charter.digest;
  const voters=charterElectorate(rules),eligible=voters.includes(actor),founding=charterRatification(charter,context);
  const local=practice.filter(r=>r.document.terms.kind!=='charter'&&r.document.terms.charter===id);
  const offices=(rules.offices??[]).filter(o=>o.selection==='Election'&&(o.eligibility==='Open'||eligible));
  function submit(terms:Exclude<GovernanceTerms,{kind:'closure'}>){try{save(terms);setError('');}catch(e){setError(e instanceof Error?e.message:'Check this practice statement.');}}
  if(panel==='Decisions'||panel==='Charter rules'){
    const inPractice=!examples.some(r=>r.digest===id);
    return <>{inPractice&&<section className="gov-box"><h3>Practice founding ratification</h3><p>{founding.signed.size} of {rules.founders.length} named founders have ratified this draft.</p>
      {rules.founders.includes(actor)&&!founding.signed.has(actor)&&<button className="gov-primary" onClick={()=>submit({kind:'ratification',charter:id})}>Ratify practice charter</button>}
      {!founding.complete&&!rules.founders.includes(actor)&&<p>Choose a named founder to ratify this charter.</p>}</section>}
      {panel==='Decisions'&&founding.complete&&eligible&&<button className="gov-primary" onClick={compose}>Create proposal</button>}{error&&<p role="alert">{error}</p>}</>;
  }
  if(panel==='Proposal'&&proposal){
    const challenges=ofKind(local,'challenge').filter(r=>r.document.terms.proposal===proposal.digest);
    return <details><summary>Challenge this decision in practice</summary><form className="gov-form" onSubmit={e=>{e.preventDefault();submit({kind:'challenge',charter:id,proposal:proposal.digest,text:text.trim()});setText('');}}>
      <label>Practice evidence and requested remedy<textarea placeholder="Which evidence is disputed, and what should the reviewers do?" required maxLength={4000} value={text} onChange={e=>setText(e.target.value)}/></label><button>Save practice challenge</button></form>
      {challenges.map(r=><p key={r.digest}>{member(r.document.author)} · {r.document.terms.text}</p>)}{error&&<p role="alert">{error}</p>}</details>;
  }
  if(panel!=='People'||!founding.complete)return null;
  const mandates=ofKind(context,'mandate').filter(r=>r.document.author===actor&&r.document.terms.charter===id&&r.document.terms.scope===scope);
  const previous=new Set(mandates.map(r=>r.document.terms.previous)),heads=mandates.filter(r=>!previous.has(r.digest));
  const head=heads.length===1?heads[0]:null,otherVoters=voters.filter(v=>v!==actor);
  const candidacies=ofKind(local,'candidacy');
  return <>{offices.length>0&&<details><summary>Stand for an office in practice</summary><form className="gov-form" onSubmit={e=>{e.preventDefault();if(offices.some(o=>o.name===office)){submit({kind:'candidacy',charter:id,office,statement:statement.trim()});setStatement('');}}}>
    <label>Practice office<select required value={office} onChange={e=>setOffice(e.target.value)}><option value="">Choose an office</option>{offices.map(o=><option key={o.name}>{o.name}</option>)}</select></label>
    <label>Practice candidate statement<textarea placeholder="Describe the work you would take on during this term." required maxLength={4000} value={statement} onChange={e=>setStatement(e.target.value)}/></label><button>Save practice candidacy</button></form>
    {candidacies.map(r=><p key={r.digest}>{member(r.document.author)} · {r.document.terms.office} · {r.document.terms.statement}</p>)}</details>}
    {rules.allowMandates&&eligible&&otherVoters.length>0&&<details><summary>Manage practice representation</summary><form className="gov-form" onSubmit={e=>{e.preventDefault();if(!otherVoters.includes(delegate)||heads.length>1)return;
      if(BigInt(expiry)<=BigInt(receizKaiNow().pulse)){setError('Choose an expiry after the current Kai pulse.');return;}
      submit({kind:'mandate',charter:id,scope,delegate,untilKaiPulse:expiry,previous:head?.digest??null});}}>
      <label>Practice decision scope<select value={scope} onChange={e=>{setScope(e.target.value);setError('');}}>{['Policy','Poll','Treasury','Election','Amendment'].map(kind=><option key={kind}>{kind}</option>)}</select></label>
      <label>Practice representative<select required value={delegate} onChange={e=>setDelegate(e.target.value)}><option value="">Choose a member</option>{otherVoters.map(v=><option key={v} value={v}>{member(v)}</option>)}</select></label>
      <label>Practice mandate expiry in Kai pulses<input required pattern="[1-9][0-9]{0,24}" value={expiry} onChange={e=>setExpiry(e.target.value)}/><small>Current Kai pulse {String(receizKaiNow().pulse)}.</small></label>
      <button disabled={heads.length>1}>Grant practice mandate</button></form>
      {head&&<p role="status">{scope} · {head.document.terms.delegate?'Representative · '+member(head.document.terms.delegate):'Mandate revoked'}</p>}
      {head?.document.terms.delegate&&<button onClick={()=>submit({kind:'mandate',charter:id,scope,delegate:null,untilKaiPulse:head.document.terms.untilKaiPulse,previous:head.digest})}>Revoke practice mandate</button>}
      {heads.length>1&&<p>Conflicting mandate histories require review.</p>}</details>}{error&&<p role="alert">{error}</p>}</>;
}
