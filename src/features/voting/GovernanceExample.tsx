import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import {ArrowLeft,BookOpen,Vote} from 'lucide-react';
import {GovernanceRegister,GovernanceHeading,governanceExamplePath} from './GovernanceRegister';
import {GovernanceDetail,GovernanceFacts} from './GovernanceDetail';
import {GovernanceComposer} from './GovernanceComposer';
import {PracticeActions} from './PracticeActions';
import {governanceExampleRows as rows,governanceExampleName,exampleMemberName,exampleOriginalUrl} from './example/governance-example';
import {newPracticeRecord,practiceRows,restorePractice,savePractice,type PracticeTerms,type PracticeSession} from './example/practice-state';
import type {GovernanceRow} from '../../receiz/governance-directory';
import {charterElectorate,readGovernanceTerms,type GovernanceTerms} from '../../receiz/governance-documents';
import {charterRatification,governanceTitle,ofKind} from '../../receiz/governance-view';

const path=(row:GovernanceRow)=>governanceExamplePath+'&record='+row.digest;
const example={member:exampleMemberName,path,file:exampleOriginalUrl};
const sampleCharter=ofKind(rows,'charter')[0],firstFounder=sampleCharter.document.terms.rules.founders[0];
const readLocation=()=>{const q=new URL(location.href).searchParams;return q.get('record')??q.get('draft')??'';};
type DraftTerms=Extract<GovernanceTerms,{kind:'charter'|'proposal'}>;
const GovernanceQualification=lazy(()=>import('./GovernanceQualification').then(m=>({default:m.GovernanceQualification})));
export function GovernanceExample({onExit}:{onExit?:()=>void}={}){
  const trail=useRef<string[]>([]);
  const [qualification,setQualification]=useState<'election'|'treasury'|null>(null);
  const [selected,setSelected]=useState(()=>onExit?'':readLocation()),[practice,setPractice]=useState(()=>restorePractice(firstFounder,rows));
  const [mode,setMode]=useState<'charter'|'proposal'|null>(null),[parent,setParent]=useState(''),[review,setReview]=useState<DraftTerms|null>(null),[choice,setChoice]=useState('');
  const [draftTab,setDraftTab]=useState<'People'|'Charter rules'|'Decisions'>('Decisions');
  const row=rows.find(r=>r.digest===selected),local=practiceRows(practice.records),drafts=local.filter(r=>r.document.terms.kind==='charter'||r.document.terms.kind==='proposal');
  const draft=drafts.find(r=>r.digest===selected),terms=(draft??row)?.document.terms,choices=[sampleCharter,...ofKind(local,'charter')];
  const owners=[...new Set(choices.flatMap(c=>[...c.document.terms.rules.founders,...charterElectorate(c.document.terms.rules)]))];
  const owner=owners.includes(practice.actor)?practice.actor:firstFounder;
  const context=[...rows,...local],available=choices.filter(c=>charterElectorate(c.document.terms.rules).includes(owner)&&charterRatification(c,context).complete);
  const charter=available.find(c=>c.digest===parent),currentCharter=choices.find(c=>c.digest===(terms?.kind==='charter'?selected:terms?.charter));
  const proposal=ofKind(draft?[draft]:row?[row]:[],'proposal')[0];
  const children=ofKind(local,'proposal').filter(p=>p.document.terms.charter===selected);
  const previousBallot=ofKind(local,'ballot').filter(r=>r.document.terms.proposal===selected&&r.document.author===owner).at(-1);
  const canVote=currentCharter&&charterElectorate(currentCharter.document.terms.rules).includes(owner)&&charterRatification(currentCharter,context).complete;
  function save(next:PracticeSession){setPractice(next);savePractice(next);}
  function record(input:PracticeTerms){
    const checked=readGovernanceTerms(input);
    if(checked.kind==='closure')throw Error('This statement is unavailable in practice.');
    const entry=newPracticeRecord(owner,checked);save({...practice,records:[...practice.records,entry]});return entry.id;
  }
  function reset(){setMode(null);setReview(null);setChoice('');setDraftTab('Decisions');}
  useEffect(()=>{if(onExit)return;const pop=()=>{setSelected(readLocation());reset();};window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop);},[onExit]);
  function open(id:string){
    const localDraft=drafts.some(d=>d.digest===id);
    if(!localDraft&&!rows.some(r=>r.digest===id))return;
    visit(id,localDraft);
  }
  function visit(id:string,localDraft:boolean){
    if(onExit)trail.current.push(selected);
    else history.pushState({votingExample:true},'',governanceExamplePath+(localDraft?'&draft=':'&record=')+id);
    setSelected(id);reset();
  }
  function back(){if(onExit)setSelected(trail.current.pop()??'');else if(history.state?.votingExample)history.back();else{history.replaceState(null,'',governanceExamplePath);setSelected('');}reset();}
  function begin(next:'charter'|'proposal',scope?:string){setParent(scope??currentCharter?.digest??'');setReview(null);setMode(next);}
  function add(){
    if(!review||review.kind==='proposal'&&!available.some(c=>c.digest===review.charter))return;
    visit(record(review),true);
  }
  const draftLinks=(list:readonly GovernanceRow[])=><section><h3>Your practice drafts</h3>{list.map(r=><button className="gov-row" key={r.digest} onClick={()=>open(r.digest)}><small>{r.document.terms.kind==='proposal'?r.document.terms.decision:'Charter'} draft</small><strong>{governanceTitle(r)}</strong></button>)}</section>;
  const actions=(panel:'People'|'Charter rules'|'Decisions'|'Proposal')=>currentCharter&&<PracticeActions key={selected+owner+panel} {...{panel,proposal}} actor={owner} charter={currentCharter} practice={local} examples={rows} save={record} compose={()=>begin('proposal',currentCharter.digest)}/>;
  const title=draft?governanceTitle(draft):row?governanceTitle(row):governanceExampleName;
  useEffect(()=>{if(!onExit)document.title=title+' · Governance example';},[onExit,title]);
  if(onExit&&qualification)return <Suspense fallback={<p role="status">Opening evidence…</p>}><GovernanceQualification key={qualification} name={qualification} onBack={()=>setQualification(null)} onSelect={setQualification}/></Suspense>;
  return <div className="voting-board"><GovernanceHeading mark={!onExit} title="Public voting">{!mode&&!terms&&<button className="gov-primary" onClick={()=>begin('charter')}><BookOpen size={16}/>Create charter</button>}</GovernanceHeading>
    <div className="gov-example-note"><span><b>Practice workspace</b> · {governanceExampleName}</span>{onExit?<button className="gov-link" onClick={onExit}>Back to voting</button>:<a href="/vote/">Live register</a>}</div>
    {!mode&&terms&&<label className="gov-practice-member">Practice member<select value={owner} onChange={e=>{save({...practice,actor:e.target.value});setChoice('');}}>{owners.map(v=><option key={v} value={v}>{exampleMemberName(v)}</option>)}</select></label>}
    {mode?<>
      <div hidden={Boolean(review)}><GovernanceComposer key={mode} charters={available} onCharter={setParent} onFound={()=>begin('charter')} mode={mode} owner={owner} rows={context} charter={charter} onCancel={()=>setMode(null)} onReview={t=>{if(t.kind==='charter'||t.kind==='proposal')setReview(t);}}/></div>
      {review&&<div className="gov-stack"><h2>Review practice {review.kind}</h2><p>This draft stays in this browser tab.</p><GovernanceFacts practice terms={review}/><div className="gov-actions"><button onClick={()=>setReview(null)}>Edit draft</button><button className="gov-primary" onClick={add}>Add practice {review.kind}</button></div></div>}</>:
      <>{draft&&terms?<section className="gov-stack"><button className="gov-link" onClick={back}><ArrowLeft size={16}/>Back</button><div><small className="gov-kicker">Practice draft · only in this tab</small><h2>{title}</h2></div>
          {terms.kind==='charter'?<><p>{terms.rules.purpose}</p><nav className="gov-tabs" aria-label="Charter sections">{(['Decisions','People','Charter rules'] as const).map(tab=><button key={tab} aria-current={draftTab===tab?'page':undefined} onClick={()=>setDraftTab(tab)}>{tab}</button>)}</nav>
            {actions(draftTab)}{draftTab==='Decisions'&&children.length>0&&draftLinks(children)}{draftTab==='People'&&<section><h3>Voting members</h3><ul className="gov-members">{charterElectorate(terms.rules).map(id=><li key={id}>{exampleMemberName(id)}</li>)}</ul></section>}{draftTab==='Charter rules'&&<GovernanceFacts terms={terms} practice/>}</>:
            terms.kind==='proposal'&&<><button className="gov-link" onClick={()=>open(terms.charter)}>Open governing charter</button><GovernanceFacts terms={terms} practice/>{actions('Proposal')}</>}</section>:
        row?<GovernanceDetail key={row.digest} published={false} row={row} rows={rows} actor={null} go={open} back={back} example={example} practicePanel={actions} review={()=>{}} compose={id=>begin('proposal',id)} download={()=>{}}/>:
        <GovernanceRegister rows={rows} network={rows} go={open} member={exampleMemberName} path={path} example/>}
      {proposal&&canVote&&<form className="gov-box gov-form" onSubmit={e=>{e.preventDefault();if(proposal.document.terms.choices.includes(choice))record({kind:'ballot',charter:proposal.document.terms.charter,proposal:selected,choice,previous:previousBallot?.digest??null});}}>
        <h3>Try a ballot</h3><label>Your practice choice<select required value={choice} onChange={e=>setChoice(e.target.value)}><option value="">Choose a response</option>{proposal.document.terms.choices.map(c=><option key={c} value={c}>{exampleMemberName(c)}</option>)}</select></label>
        <button className="gov-primary"><Vote size={16}/>{previousBallot?'Update practice ballot':'Cast practice ballot'}</button>
        {previousBallot&&<p role="status">Your practice ballot · {exampleMemberName(previousBallot.document.terms.choice)}.{row?' The public tally uses the sealed example ballots.':''}</p>}</form>}
      {proposal&&!canVote&&previousBallot&&<p role="status">Your saved practice ballot · {exampleMemberName(previousBallot.document.terms.choice)}.</p>}
      {row&&terms?.kind==='charter'&&children.length>0&&draftLinks(children)}
      {!terms&&drafts.length>0&&draftLinks(drafts)}
      {!terms&&<p>{onExit?<button className="gov-link" onClick={()=>setQualification('election')}>Execution examples</button>:<a href="/vote/?qualification=election">Execution examples</a>}</p>}
      </>}
  </div>;
}
