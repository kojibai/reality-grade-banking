import {closureOpens,proposalEvidence} from '../../receiz/governance-closure';
import {CurrencyDecisionApplication} from './CurrencyDecisionApplication';
import type {CurrencyVotingContext} from './VotingBoard';
import {GovernanceCertification} from './GovernanceCertification';
import type {OpenIdentity} from '../../receiz/native-identity';
import {PaymentFacts} from './CharterExecutionFields';
import {GovernanceLink} from './GovernanceLink';
import {verifyGovernanceTally} from '../../receiz/governance-evidence';
import {GovernanceProof} from './GovernanceProof';
import type {GovernanceOriginal} from '../../receiz/governance-documents';
import {receizKaiNow} from '@receiz/sdk';
import {charterAdmitsMember,charterElectorate} from '../../receiz/governance-documents';
import {useEffect,useState,type ReactNode} from 'react';
import {ArrowLeft,FileCheck2,Vote} from 'lucide-react';
import type {GovernanceRow} from '../../receiz/governance-directory';
import type {GovernanceTerms} from '../../receiz/governance-documents';
import {ballotRegister,charterRatification,governanceTitle,ofKind,observedSeats} from '../../receiz/governance-view';

import {GovernanceFileList} from './GovernanceFiles';

import {GovernanceTime,votingTimeLeft} from './GovernanceTime';

function ProposalText({text}:{text:string}){
  return <div className="gov-motion-text">{text.split(/\n\s*\n/).map((paragraph,i)=>
    <p key={i}>{paragraph.split(/(\b[a-f0-9]{64}\b)/i).map((part,j)=>
      j%2?<code key={j}>{part}</code>:part)}</p>)}</div>;
}

export function GovernanceFacts({terms,practice=false,member=(id)=>id}:{terms:GovernanceTerms;practice?:boolean;member?:(id:string)=>string}){
  let facts:[string,string][]=[];
  switch(terms.kind){
    case 'charter':{const r=terms.rules;facts=[['Organization',r.name],['Purpose',r.purpose],['Founders',r.founders.map(member).join('\n')],['Voting membership',r.participation?'Open registration for advisory votes':charterElectorate(r).map(member).join('\n')],['Membership',r.membership],['Decisions',r.decisions],['Threshold',r.approvalPercent+'% approval · '+r.minimumSupportPercent+'% minimum affirmative electorate'],['Voting period',r.voteDays+' days'],['Representation',r.representation],['Scoped mandates',r.allowMandates?'Permitted':'Disabled'],['Amendments',r.amendments],['Appeals',r.appeals],['Challenge period',r.appealDays+' days'],['Treasury',r.treasury]];
      if(r.execution)facts.push(['Binding closure','Every voting member attests the same evidence after the appeal deadline.'],['Custodian',member(r.execution.custodian)],['Governance register',r.execution.registerProofObjectId],['Register genesis head',r.execution.registerGenesisHead]);
      const scope=r.execution?.currency;
      if(scope)facts.push(['Currency',scope.assetId],['Purchase price range (USD cents)',scope.maximumPriceUsdCents
        ?scope.minimumPriceUsdCents+'–'+scope.maximumPriceUsdCents:scope.minimumPriceUsdCents+' minimum'],
        ['Votes can change new sales',scope.allowSalesPause?'Yes':'No']);
      if(scope?.servicePricing)facts.push(
        ['Pricing','Verified venue observations'],
        ['Benchmark (USD cents per thousand)',scope.servicePricing.benchmarkUsdCentsPerThousandImpressions],
        ['Credit cost per placement',scope.servicePricing.unitsPerPlacement],
        ['Visibility budget per placement',scope.servicePricing.viewsPerPlacement],
        ['Audience capacity (basis points)',scope.servicePricing.capacityBasisPoints],
        ['Booking window',scope.servicePricing.bookingWindowDays+' days'],
        ['New issuance',scope.servicePricing.automaticIssuance?'Automatic within verified available capacity':'Fixed supply'],
        ['Observation window',scope.servicePricing.windowLengthKai+' Kai pulses'],
        ['Maximum observation age',scope.servicePricing.maximumAgeKai+' Kai pulses'],
        ['Venue observers',scope.servicePricing.venues.map(venue=>venue.id+' · '+member(venue.observerReceizId)+' · '+venue.dailyEligibleViewsLimit+' eligible views per day').join('\n')],
      );
      for(const o of r.offices??[])facts.push([o.name,o.seats+' seat(s) · '+o.selection+' · '+(o.eligibility==='Open'?'Open eligibility':'Voting members')+'\n'+[o.powers,o.term,o.procedure,o.recall].join('\n')]);
      for(const a of r.articles??[])facts.push([a.title,a.text]);break;}
    case 'proposal': {
      facts=[['Decision',terms.decision],['Title',terms.title],['Text',terms.text],['Choices',terms.choices.map(member).join(' / ')]];
      const change=terms.currencyChange;
      if(change){
        facts.push(['Currency',change.assetId],['Settings source',change.expectedHead]);
        if(change.changes.priceUsdCentsPerUnit!==undefined)facts.push(['Purchase price (USD cents)',change.changes.priceUsdCentsPerUnit]);
        if(change.changes.salesPaused!==undefined)facts.push(['New sales',change.changes.salesPaused?'Paused':'Open']);
      }
      if(terms.office)facts.push(['Office',terms.office]);
      break;
    }
    case 'candidacy':facts=[['Office',terms.office],['Candidate statement',terms.statement],['Charter Original',terms.charter]];break;
    case 'closure':facts=[['Attestation','I have reviewed the complete list of evidence below for this decision.'],['Charter Original',terms.charter],['Proposal Original',terms.proposal],['Evidence manifest',terms.evidence.join('\n')]];break;
    case 'ballot':facts=[['Choice',member(terms.choice)],['Proposal Original',terms.proposal],['Charter Original',terms.charter],['Previous ballot',terms.previous??'First ballot']];break;
    case 'ratification':facts=[['Statement','I ratify the exact founding charter identified below.'],['Charter Original',terms.charter]];break;
    case 'mandate':facts=[['Representative',terms.delegate?member(terms.delegate):'Revoked'],['Scope',terms.scope],['Expires at Kai pulse',terms.untilKaiPulse],['Charter Original',terms.charter],['Previous mandate',terms.previous??'First mandate']];break;
    case 'challenge':facts=[['Objection and requested remedy',terms.text],['Proposal Original',terms.proposal],['Charter Original',terms.charter]];break;
  }
  const payment=terms.kind==='charter'?terms.rules.execution?.treasury:terms.kind==='proposal'?terms.payment:null;
  return <>{terms.kind==='charter'&&terms.logo&&<img className="gov-logo" src={terms.logo} alt="Charter logo"/>}{terms.attachments?.length?<GovernanceFileList files={terms.attachments}/>:null}<dl className="gov-facts gov-document-facts">{facts.map(([label,text],i)=><div key={i}><dt>{practice&&label==='Charter Original'?'Governing charter':practice&&label==='Candidate Originals'?'Candidate statements':label}</dt><dd>{text}</dd></div>)}</dl>{payment&&<PaymentFacts payment={payment}/>}</>;
}
type ExampleRecord={member:(owner:string)=>string;path:(row:GovernanceRow)=>string;file:(digest:string)=>string|null};
type Props={onCurrencyApplied?:CurrencyVotingContext['onApplied'];memberName?:(owner:string)=>string;practicePanel?:(panel:'People'|'Charter rules'|'Decisions'|'Proposal')=>ReactNode;allowEntry?:boolean;identity?:OpenIdentity|null;example?:ExampleRecord;published:boolean;read?:(digest:string)=>Promise<GovernanceOriginal>;row:GovernanceRow;rows:readonly GovernanceRow[];actor:string|null;go:(digest:string)=>void;back:()=>void;review:(terms:GovernanceTerms)=>void;compose?:(charter:string)=>void;download:(row:GovernanceRow)=>void};
export function GovernanceDetail({onCurrencyApplied,row,rows,actor,go,back,review,compose,download,read,published,example,memberName,practicePanel,identity=null,allowEntry=false}:Props){
  const [choice,setChoice]=useState(''),[text,setText]=useState(''),[delegate,setDelegate]=useState(''),[scope,setScope]=useState(''),[expiry,setExpiry]=useState(''),[officeName,setOfficeName]=useState(''),[statement,setStatement]=useState('');
  const [charterTab,setCharterTab]=useState<'Decisions'|'People'|'Charter rules'>('Decisions');
  const [audit,setAudit]=useState<{at:readonly GovernanceRow[];message:string}|null>(null),[checking,setChecking]=useState(false);
  async function verifyTally(){
    if(!read)return;setChecking(true);setAudit(null);
    try{const result=await verifyGovernanceTally(row.digest,read,rows),r=result.tally;
      setAudit({at:rows,message:'Recounted '+result.originalCount+' exact Originals. '+[...r.counts].map(([choice,n])=>choice+' '+n).join(' · ')+'. '+r.disputed.size+' disputed histories.'});
    }catch(e){setAudit({at:rows,message:e instanceof Error?e.message:'The recount could not verify its supporting Originals.'});}
    finally{setChecking(false);}
  }
  const terms=row.document.terms,charter=ofKind(rows,'charter').find(item=>item.digest===(terms.kind==='charter'?row.digest:terms.charter)),ratified=charter?charterRatification(charter,rows):null;
  const authorized=Boolean(actor&&charter&&charterAdmitsMember(charter.document.terms.rules,actor)),proposal=ofKind([row],'proposal')[0];
  const register=proposal&&charter?ballotRegister(proposal,charter,rows):null;
  const founder=Boolean(actor&&charter?.document.terms.rules.founders.includes(actor));
  const offices=charter?.document.terms.rules.offices??[],candidateOffices=offices.filter(o=>o.selection==='Election'&&(o.eligibility==='Open'||authorized));
  const election=proposal&&offices.find(o=>o.name===proposal.document.terms.office);
  const seats=election&&register?observedSeats(register.counts,election.seats):null;
  const [now,setNow]=useState(()=>BigInt(receizKaiNow().pulse));
  const deadline=register?.closes;
  useEffect(()=>{
    if(deadline===undefined)return;
    const refresh=()=>setNow(BigInt(receizKaiNow().pulse));
    refresh();
    const interval=window.setInterval(refresh,15000);
    document.addEventListener('visibilitychange',refresh);
    return()=>{window.clearInterval(interval);document.removeEventListener('visibilitychange',refresh);};
  },[deadline]);
  const closed=deadline!==undefined&&now>=deadline;
  const member=(id:string)=>example?.member(id)??memberName?.(id)??id;
  const related=terms.kind==='charter'?rows.filter(r=>r.document.terms.kind!=='charter'&&r.document.terms.charter===row.digest):rows.filter(r=>'proposal' in r.document.terms&&r.document.terms.proposal===row.digest);
  const decisions=ofKind(related,'proposal');
  const history=terms.kind==='charter'?[]:related.filter(r=>r.document.terms.kind!=='challenge');
  const recordLink=(item:GovernanceRow)=><button className="gov-row" key={item.digest} onClick={()=>go(item.digest)}><strong>{item.document.terms.kind==='ballot'?member(item.document.terms.choice):governanceTitle(item)}</strong><small>{item.document.terms.kind} · {member(item.document.author)}</small><GovernanceTime pulse={item.pulse}/></button>;
  const mandateRows=ofKind(rows,'mandate').filter(r=>r.document.author===actor&&r.document.terms.charter===charter?.digest&&r.document.terms.scope===scope.trim());
  const priorMandates=new Set(mandateRows.map(r=>r.document.terms.previous)),mandateHeads=mandateRows.filter(r=>!priorMandates.has(r.digest));
  return <section className="gov-stack">
    <button className="gov-link" onClick={back}><ArrowLeft size={16}/>Back</button>
    <div className="gov-record-heading"><small className="gov-kicker">{terms.kind}</small><div className="gov-detail-title"><h2>{terms.kind==='ballot'?member(terms.choice):governanceTitle(row)}</h2>{(published||example)&&<GovernanceLink row={row} path={example?.path(row)}/>}</div><small className="gov-meta">By {member(row.document.author)}</small><GovernanceTime pulse={row.pulse} label={proposal?'Proposed':'Sealed'}/></div>
    {terms.kind==='charter'&&<>{terms.logo&&charterTab!=='Charter rules'&&<img className="gov-logo" src={terms.logo} alt="Charter logo"/>}<p>{terms.rules.purpose}</p><nav className="gov-tabs" aria-label="Charter sections">{(['Decisions','People','Charter rules'] as const).map(name=><button key={name} aria-current={charterTab===name?'page':undefined} onClick={()=>setCharterTab(name)}>{name}</button>)}</nav></>}
    {terms.kind==='charter'&&practicePanel?.(charterTab)}
    {terms.kind==='charter'&&charterTab==='Decisions'&&<section className="gov-charter-decisions">
      {compose&&ratified?.complete&&(authorized||!actor&&allowEntry)&&<button className="gov-primary" onClick={()=>compose(row.digest)}>Create proposal</button>}
      {(['Proposals','Polls'] as const).map(group=>{const list=decisions.filter(r=>(r.document.terms.decision==='Poll')===(group==='Polls'));return <section key={group}><div className="gov-section-heading"><h3>{group}</h3><small>{list.length}</small></div>
        {list.length?list.map(item=><div className="gov-list-item" key={item.digest}><button className="gov-row" onClick={()=>go(item.digest)}><span className="gov-meta">{item.document.terms.decision}</span><strong>{governanceTitle(item)}</strong><GovernanceTime pulse={item.pulse} label="Proposed"/></button></div>):<p>No {group.toLowerCase()} held for this charter.</p>}</section>;})}
    </section>}
    {terms.kind==='charter'&&(charterTab==='Charter rules'||!ratified?.complete&&charterTab==='Decisions')&&charter&&ratified&&<section className="gov-box"><h3>Founding ratification</h3><p>{ratified.signed.size} of {charter.document.terms.rules.founders.length} named founders have ratified this exact Original.</p>
      {founder&&!ratified.signed.has(actor!)&&<button className="gov-primary" onClick={()=>review({kind:'ratification',charter:row.digest})}><FileCheck2/>Review ratification</button>}
      {ratified.approvals.map(recordLink)}
    </section>}
    {terms.kind==='charter'&&charterTab==='People'&&<><section><h3>Voting members</h3>{terms.rules.participation&&<p>Anyone with a Receiz identity may participate. Each binding decision has its own registered voter roll.</p>}<ul className="gov-members">{charterElectorate(terms.rules).map(id=><li key={id}>{member(id)}</li>)}</ul></section>
      <section><h3>Offices</h3>{offices.length?offices.map(o=><div key={o.name}><strong>{o.name}</strong><p>{o.seats} {o.seats===1?'seat':'seats'} · {o.selection} · {o.term}</p></div>):<p>This charter has no offices.</p>}</section>
      {ofKind(related,'mandate').length>0&&<section><h3>Public mandates</h3>{ofKind(related,'mandate').map(recordLink)}</section>}
      {ofKind(related,'candidacy').length>0&&<section><h3>Candidate statements</h3>{ofKind(related,'candidacy').map(recordLink)}</section>}
    </>}
    {terms.kind==='charter'&&charterTab==='People'&&actor&&ratified?.complete&&candidateOffices.length>0&&<details><summary>Stand for an office</summary><form className="gov-form" onSubmit={e=>{e.preventDefault();review({kind:'candidacy',charter:row.digest,office:officeName,statement:statement.trim()});}}>
      <label>Office<select required value={officeName} onChange={e=>setOfficeName(e.target.value)}><option value="">Choose an office</option>{candidateOffices.map(o=><option key={o.name}>{o.name}</option>)}</select></label>
      <label>Your public candidate statement<textarea required maxLength={4000} value={statement} onChange={e=>setStatement(e.target.value)}/></label><button>Review candidacy</button></form></details>}
    {terms.kind==='charter'?(charterTab==='Charter rules'&&<GovernanceFacts member={member} terms={terms}/>):
      terms.kind==='proposal'?<><ProposalText text={terms.text}/><details><summary>Proposal terms</summary><GovernanceFacts member={member} terms={terms}/></details></>:<GovernanceFacts member={member} terms={terms}/>}
    {terms.kind==='ballot'&&<div className="gov-actions"><button onClick={()=>go(terms.proposal)}>Open proposal and tally</button>{terms.previous&&<button onClick={()=>go(terms.previous!)}>Previous ballot</button>}</div>}
    {charter&&terms.kind!=='charter'&&<button className="gov-link" onClick={()=>go(charter.digest)}>Read governing charter · {charter.document.terms.rules.name}</button>}
    {proposal?.document.terms.nominations&&<details><summary>Candidates ({proposal.document.terms.nominations.length})</summary>{proposal.document.terms.nominations.map(id=>{const candidate=rows.find(r=>r.digest===id);return candidate?recordLink(candidate):<button key={id} onClick={()=>go(id)}>Open candidate Original</button>;})}</details>}
    {proposal&&register&&<section className="gov-box"><div className="gov-voting-period"><strong>{votingTimeLeft(now,register.closes)}</strong><GovernanceTime pulse={register.closes} label={closed?undefined:'Closes'}/></div><h3>Observed public ballots</h3><ul className="gov-bars">{[...register.counts].map(([key,n])=><li key={key}><span>{member(key)}</span><strong>{n}</strong><meter aria-label={member(key)} min={0} max={Math.max(1,register.effective.size+register.represented.size)} value={n}/></li>)}</ul>
      <p>{register.effective.size} direct · {register.represented.size} represented · {charter!.document.terms.rules.participation?'open participation':charterElectorate(charter!.document.terms.rules).length+' eligible'}.</p>
      {!example&&<button disabled={checking} onClick={()=>void verifyTally()}><FileCheck2 size={16}/>{checking?'Recounting…':'Verify tally'}</button>}
      {audit&&<p role="status">{audit.message}{audit.at!==rows?' New records may be available.':''}</p>}
      {!register.admitted&&<p>The charter, ratification or candidate evidence required for this proposal is incomplete.</p>}
      {seats&&<div><h3>Seat count</h3><p>{election!.seats} available · {seats.leading.length?seats.leading.map(member).join(', ')+' currently leading':'No uncontested leads'}</p>{seats.tied.length>0&&<p>Tied at the seat boundary · {seats.tied.map(member).join(', ')}</p>}</div>}
      {register.effective.size>0&&<details><summary>Counted direct ballots ({register.effective.size})</summary>{[...register.effective.values()].map(b=><button key={b.digest} className="gov-row" onClick={()=>go(b.digest)}><strong>{member(b.document.terms.choice)}</strong><small>{member(b.document.author)}</small><GovernanceTime pulse={b.pulse}/></button>)}</details>}
      {[...register.represented].map(([voter,via])=><p key={voter}>{member(voter)} · <button className="gov-link" onClick={()=>go(via.mandate.digest)}>Mandate</button><button className="gov-link" onClick={()=>go(via.ballot.digest)}>Representative ballot</button></p>)}
      <small>Observed totals from the Originals held here. Office appointments, binding decisions and spending require independent authority.</small>
      {register.disputed.size>0&&<p role="status">{register.disputed.size} conflicting or incomplete ballot histories await resolution.</p>}
      {register.excluded.length>0&&<p>{register.excluded.length} statements fall outside the founding electorate or ballot choices.</p>}
      {authorized&&ratified?.complete&&register.admitted&&!closed&&!register.disputed.has(actor!)&&<form className="gov-form" onSubmit={e=>{e.preventDefault();review({kind:'ballot',proposal:row.digest,charter:proposal.document.terms.charter,choice,previous:register.effective.get(actor!)?.digest??null});}}>
        <label>Your public ballot<select required value={choice} onChange={e=>setChoice(e.target.value)}><option value="">Choose a response</option>{proposal.document.terms.choices.map(v=><option key={v} value={v}>{member(v)}</option>)}</select></label><button className="gov-primary"><Vote size={16}/>Review ballot</button>
      </form>}
    </section>}
    {proposal&&['Policy','Treasury','Election'].includes(proposal.document.terms.decision)&&charter?.document.terms.rules.execution&&register&&<section className="gov-box gov-stack"><h3>Binding closure</h3>
      <p>All {charterElectorate(charter.document.terms.rules).length} voters must attest to the same evidence.</p><GovernanceTime pulse={closureOpens(proposal,charter)} label="Challenge period ends"/>
      {ofKind(related,'closure').length>0&&<details><summary>Closure Originals</summary>{ofKind(related,'closure').map(recordLink)}</details>}
      {read&&(proposal.document.terms.currencyChange?<CurrencyDecisionApplication key={proposal.digest+actor} {...{proposal,charter,rows,read,identity}} onApplied={onCurrencyApplied}/>
        :<GovernanceCertification key={proposal.digest+actor} {...{proposal,charter,rows,read,identity}}/>)}
      {authorized&&!ofKind(related,'closure').some(r=>r.document.author===actor)&&now>=closureOpens(proposal,charter)&&<button onClick={()=>review({kind:'closure',charter:charter.digest,proposal:proposal.digest,evidence:proposalEvidence(proposal,rows)})}>Review evidence for closure</button>}
    </section>}
    {proposal&&practicePanel?.('Proposal')}
    {proposal&&ofKind(related,'challenge').length>0&&<section><h3>Challenges</h3>{ofKind(related,'challenge').map(recordLink)}</section>}
    {terms.kind==='proposal'&&actor&&<details><summary>Challenge this decision</summary><form className="gov-form" onSubmit={e=>{e.preventDefault();review({kind:'challenge',charter:terms.charter,proposal:row.digest,text:text.trim()});}}><label>Public evidence and requested remedy<textarea required maxLength={4000} value={text} onChange={e=>setText(e.target.value)}/></label><button>Review challenge</button></form></details>}
    {terms.kind==='charter'&&charterTab==='People'&&terms.rules.allowMandates&&authorized&&ratified?.complete&&<details><summary>Manage representation</summary><form className="gov-form" onSubmit={e=>{e.preventDefault();review({kind:'mandate',charter:row.digest,delegate:delegate||null,scope:scope.trim(),untilKaiPulse:expiry,previous:mandateHeads[0]?.digest??null});}}>
      <label>Representative{terms.rules.participation?<input value={delegate} placeholder="Receiz owner ID" onChange={e=>setDelegate(e.target.value.trim())}/>:<select value={delegate} onChange={e=>setDelegate(e.target.value)}><option value="">Revoke this scope</option>{charterElectorate(terms.rules).filter(id=>id!==actor).map(id=><option key={id} value={id}>{member(id)}</option>)}</select>}</label><label>Decision scope<select required value={scope} onChange={e=>setScope(e.target.value)}><option value="">Choose a scope</option>{['Policy','Poll','Treasury','Election','Amendment'].map(v=><option key={v} value={v}>{member(v)}</option>)}</select></label><small>A mandate applies to proposals opened after it is issued. A direct ballot overrides representation.</small>
      <label>Expiry in Kai pulses<input required pattern="[1-9][0-9]{0,24}" value={expiry} onChange={e=>setExpiry(e.target.value)}/></label><button disabled={mandateHeads.length>1||(!delegate&&!mandateHeads.length)}>Review mandate</button></form></details>}
    {(terms.kind!=='charter'||charterTab==='Charter rules')&&(example?<section className="gov-box"><h3>Example Original</h3><p>Issued under the example’s test root. Each download contains the complete sealed record.</p><dl className="gov-facts"><div><dt>Signing owner</dt><dd>{member(row.document.author)}</dd></div><div><dt>Original SHA-256</dt><dd className="gov-proof-id">{row.digest}</dd></div></dl>{example.file(row.digest)&&<a href={example.file(row.digest)!} download={'governance-'+terms.kind+'.receized.json'}>Download example Original</a>}</section>:read&&<GovernanceProof {...{row,rows,go,download,read}}/>)}
    {history.length>0&&<details><summary>Public history ({history.length})</summary>{history.map(recordLink)}</details>}
  </section>;
}
