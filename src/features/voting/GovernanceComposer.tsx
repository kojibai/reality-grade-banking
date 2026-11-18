import {useState,type FormEvent} from 'react';
import {ArrowLeft,ArrowRight,Check} from 'lucide-react';
import type {GovernanceTerms,DecisionKind,CharterExecution} from '../../receiz/governance-documents';
import {readGovernanceTerms} from '../../receiz/governance-documents';
import {CharterExecutionFields,PaymentFacts} from './CharterExecutionFields';
import type {OpenIdentity} from '../../receiz/native-identity';
import {charterTemplates, proposalDraft, proposalTemplates, ruleLabels, scopedRepresentation} from './governance-templates';
import {CharterLogoPicker} from './GovernanceFiles';
import {CharterOffices} from './CharterOffices';
import type {GovernanceRow} from '../../receiz/governance-directory';
import {eligibleCandidates,type Row} from '../../receiz/governance-view';

type Props={member?:(id:string)=>string;identity?:OpenIdentity;mode:'charter'|'proposal';owner:string;rows:readonly GovernanceRow[];charter?:Row<'charter'>;charters:readonly Row<'charter'>[];onCharter:(id:string)=>void;onFound:()=>void;onReview:(terms:GovernanceTerms)=>void;onCancel:()=>void};
export function GovernanceComposer({member,identity,mode,owner,charter,charters,onCharter,onFound,rows,onReview,onCancel}:Props){
  const [logo,setLogo]=useState(''),[logoBusy,setLogoBusy]=useState(false);
  const [step,setStep]=useState(1),[organization,setOrganization]=useState(''),[founders,setFounders]=useState('');
  const [template,setTemplate]=useState('Member association');
  type CharterDraft = (typeof charterTemplates)[string];
  const [charterEdits,setCharterEdits]=useState<Record<string, Partial<CharterDraft>>>({});
  const rules={...charterTemplates[template],...charterEdits[template]};
  function editRules(change:Partial<CharterDraft>){
    setCharterEdits(all=>({...all,[template]:{...all[template],...change}}));
  }
  function setRepresentation(enabled:boolean){
    const generated=[charterTemplates['Member association'].representation,scopedRepresentation];
    const representation=generated.includes(rules.representation)?(enabled?scopedRepresentation:generated[0]):rules.representation;
    editRules({allowMandates:enabled,representation});
  }
  const [separate,setSeparate]=useState(false),[electorate,setElectorate]=useState('');
  const [executions,setExecutions]=useState<Record<string,CharterExecution|undefined>>({});
  const execution=executions[template];
  const [office,setOffice]=useState(''),[selected,setSelected]=useState<string[]>([]);
  const [decision,setDecision]=useState<DecisionKind>('Policy'),[error,setError]=useState('');
  const [startingPoints,setStartingPoints]=useState<Record<string,string>>({});
  const scope=JSON.stringify([charter?.digest,decision]);
  const startingPoint=startingPoints[scope]??Object.keys(proposalTemplates[decision])[0];
  const draftKey=JSON.stringify([charter?.digest,decision,startingPoint]);
  const [edits,setEdits]=useState<Record<string,Partial<{title:string;text:string;options:string}>>>({});
  const proposed=charter?proposalDraft(decision,startingPoint,charter.document.terms.rules,office):null;
  const changes=edits[draftKey];
  const title=changes?.title??proposed?.title??'',body=changes?.text??proposed?.text??'';
  const options=changes?.options??proposed?.choices.join('\n')??'';
  function editProposal(change:Partial<{title:string;text:string;options:string}>){
    setEdits(all=>({...all,[draftKey]:{...all[draftKey],...change}}));
  }
  const payment=charter?.document.terms.rules.execution?.treasury;
  const [budgetDrafts,setBudgetDrafts]=useState<Record<string,Record<string,string>>>({});
  const budget=budgetDrafts[draftKey]??{};
  const guidedBudget=mode==='proposal'&&decision==='Treasury'&&!payment&&startingPoint!=='Custom';
  const budgetFields=['Budget or project','Amount and currency','Recipient','Purpose and release conditions'] as const;
  function updateBudget(key:string,value:string){setBudgetDrafts(all=>({...all,[draftKey]:{...all[draftKey],[key]:value}}));}
  const candidates=charter&&office?eligibleCandidates(charter,office,rows):[];
  const electiveOffices=charter?.document.terms.rules.offices?.filter(o=>o.selection==='Election')??[];
  const election=mode==='proposal'&&decision==='Election';
  const bindingBinary=Boolean(charter?.document.terms.rules.execution&&(decision==='Policy'||decision==='Treasury'&&payment));
  function submit(e:FormEvent){
    e.preventDefault();setError('');
    if(mode==='proposal'&&!charter){setError('Choose a governing charter before writing a proposal.');return;}
    if(mode==='charter'&&step===1){setStep(2);return;}
    try{
      const policyText=Object.fromEntries((Object.keys(ruleLabels) as (keyof typeof ruleLabels)[]).map(k=>[k,rules[k].trim()]));
      const offices=rules.offices.map(o=>({...o,name:o.name.trim(),powers:o.powers.trim(),term:o.term.trim(),procedure:o.procedure.trim(),recall:o.recall.trim()}));
      const articles=rules.articles.map(a=>({title:a.title.trim(),text:a.text.trim()}));
      const text=guidedBudget?[body.trim(),...budgetFields.map(k=>k+' · '+(budget[k]??'').trim())].join('\n\n'):body.trim();
      if(guidedBudget&&budgetFields.some(k=>!budget[k]?.trim()))throw Error('Complete the budget, cost, recipient and conditions before review.');
      if(text.length>4000)throw Error('Shorten the proposal and budget details to fit 4,000 characters.');
      const terms=mode==='charter'?{kind:'charter',...(logo?{logo}:{}),rules:{...rules,...policyText,offices,articles,...(execution?{execution}:{}),...(separate?{electorate:electorate.split(/\r?\n/).map(v=>v.trim()).filter(Boolean)}:{}),name:organization.trim(),purpose:rules.purpose.trim(),founders:[...new Set([owner,...founders.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)])]}}:
        {kind:'proposal',charter:charter?.digest,title:title.trim(),text,decision,...(election?{office,nominations:selected,choices:selected.map(d=>candidates.find(c=>c.digest===d)?.document.author)}:{...(decision==='Treasury'&&payment?{payment}:{}),choices:bindingBinary?['Approve','Reject']:options.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)})};
      const reviewed=readGovernanceTerms(terms);
      if(reviewed.kind==='charter'&&!reviewed.rules.founders.includes(owner))throw Error('Include your own Receiz owner ID among the founders.');
      onReview(reviewed);
    }catch(e){setError(e instanceof Error?e.message:'Check the governance terms.');}
  }
  return <form className="gov-form" onSubmit={submit}>
    <button type="button" className="gov-link" onClick={()=>step===2?setStep(1):onCancel()}><ArrowLeft size={16}/>Back</button>
    <h2>{mode==='proposal'?'Create proposal':step===1?'Found an organization':'Set the charter rules'}</h2>
    {mode==='proposal'&&<><label>Governing charter<select required value={charter?.digest??''} onChange={e=>{setOffice('');setSelected([]);setError('');onCharter(e.target.value);}}><option value="">Choose a charter</option>{charters.map(c=><option key={c.digest} value={c.digest}>{c.document.terms.rules.name}</option>)}</select></label>
      {!charters.length&&<div><p>You can propose in a ratified charter that lists you as a voting member.</p><button type="button" onClick={onFound}>Create charter</button></div>}</>}
    {step===1&&(mode==='charter'||charter)&&<>
      {mode==='charter'?<label>Starting point<select value={template} onChange={e=>{setTemplate(e.target.value);setError('');}}>{Object.keys(charterTemplates).map(k=><option key={k}>{k}</option>)}</select></label>:
        <div className="gov-fields">
          <label>Decision type<select value={decision} onChange={e=>{setDecision(e.target.value as DecisionKind);setError('');}}>{Object.keys(proposalTemplates).map(d=><option key={d}>{d}</option>)}</select></label>
          <label>Proposal template<select value={startingPoint} onChange={e=>setStartingPoints({...startingPoints,[scope]:e.target.value})}>{[...Object.keys(proposalTemplates[decision]),'Custom'].map(t=><option key={t}>{t}</option>)}</select></label>
        </div>}
      <label>{mode==='charter'?'Organization name':'Proposal title'}<input required maxLength={mode==='charter'?120:160} value={mode==='charter'?organization:title} onChange={e=>mode==='charter'?setOrganization(e.target.value):editProposal({title:e.target.value})}/></label>
      <label>{mode==='charter'?'Purpose and scope':'What should members decide?'}<textarea required rows={4} maxLength={4000} value={mode==='charter'?rules.purpose:body} onChange={e=>mode==='charter'?editRules({purpose:e.target.value}):editProposal({text:e.target.value})}/></label>
      {mode==='charter'?<><CharterLogoPicker logo={logo} change={setLogo} busy={setLogoBusy}/><p>Founding member <strong>{member?.(owner)??owner}</strong></p><label>Additional founders <small>One Receiz owner ID per line. Each founder ratifies the charter.</small><textarea value={founders} onChange={e=>setFounders(e.target.value)}/></label>
        <label className="gov-check"><input type="checkbox" checked={separate} onChange={e=>setSeparate(e.target.checked)}/>Choose a separate voting membership</label>
        {separate&&<label>Voting members <small>One Receiz owner ID per line. Only these members may propose and vote.</small><textarea required value={electorate} onChange={e=>setElectorate(e.target.value)}/></label>}</>:<>
        {election?<><label>Office<select required value={office} onChange={e=>{setOffice(e.target.value);setSelected([]);}}><option value="">Choose an elected office</option>{electiveOffices.map(o=><option key={o.name}>{o.name}</option>)}</select></label>
          {!electiveOffices.length&&<p>This charter lists no elected offices. Its amendment procedure describes how members can propose one.</p>}
          <fieldset className="gov-box"><legend>Candidate statements</legend>{candidates.map(c=><label className="gov-check" key={c.digest}><input type="checkbox" checked={selected.includes(c.digest)} onChange={e=>setSelected(v=>e.target.checked?[...v.filter(d=>candidates.find(x=>x.digest===d)?.document.author!==c.document.author),c.digest]:v.filter(d=>d!==c.digest))}/>{member?.(c.document.author)??c.document.author} · {c.document.terms.statement}</label>)}{!candidates.length&&<p>Candidates can submit their own statements from the charter.</p>}</fieldset></>:bindingBinary?<p>Ballot choices · Approve / Reject</p>:<label>Ballot choices <small>One choice per line.</small><textarea required value={options} onChange={e=>editProposal({options:e.target.value})}/></label>}
        {decision==='Treasury'&&payment&&<PaymentFacts payment={payment}/>}
        {guidedBudget&&<fieldset className="gov-box gov-form"><legend>Budget request</legend>{budgetFields.map(k=><label key={k}>{k}<input required maxLength={360} value={budget[k]??''} onChange={e=>updateBudget(k,e.target.value)}/></label>)}</fieldset>}
        {decision==='Treasury'&&!payment&&<small>This charter can record a funding decision. A payment requires an authorized Settlement installment.</small>}
      </>}
    </>}
    {step===2&&<>
      <label className="gov-check"><input type="checkbox" checked={rules.allowMandates} onChange={e=>setRepresentation(e.target.checked)}/>Permit scoped representative mandates</label>
      {(Object.keys(ruleLabels) as (keyof typeof ruleLabels)[]).map(k=><label key={k}>{ruleLabels[k]}<textarea required maxLength={4000} value={rules[k]} onChange={e=>editRules({[k]:e.target.value})}/></label>)}
      {identity&&<CharterExecutionFields identity={identity} owner={owner} value={execution} change={v=>setExecutions(all=>({...all,[template]:v}))}/>}
      <CharterOffices offices={rules.offices} articles={rules.articles} setOffices={offices=>editRules({offices})} setArticles={articles=>editRules({articles})}/>
      <div className="gov-fields">{([['Approval threshold (%)','approvalPercent',50,100],['Minimum affirmative electorate (%)','minimumSupportPercent',0,100],['Voting period (days)','voteDays',1,365],['Challenge period (days)','appealDays',1,90]] as const).map(([label,key,min,max])=><label key={key}>{label}<input type="number" min={min} max={max} required value={rules[key]} onChange={e=>editRules({[key]:Number(e.target.value)})}/></label>)}</div>
    </>}
    {error&&<p role="alert">{error}</p>}
    <button className="gov-primary" type="submit" disabled={logoBusy||mode==='proposal'&&(!charter||election&&(!office||!selected.length))}>{mode==='charter'&&step===1?<><ArrowRight size={16}/>Continue</>:<><Check size={16}/>{identity?'Review Original':'Review draft'}</>}</button>
  </form>;
}
