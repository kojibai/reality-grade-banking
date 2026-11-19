import {useMemo,useState,type ReactNode} from 'react';
import {Search} from 'lucide-react';
import {BankMark} from '../../components/BankMark';
import type {GovernanceRow} from '../../receiz/governance-directory';
import {governanceTitle} from '../../receiz/governance-view';

export function GovernanceHeading({title,eyebrow='Reality-grade governance',mark=true,children}:{title:string;eyebrow?:string;mark?:boolean;children?:ReactNode}){
  return <header className="gov-hero"><div className="gov-heading">
    {mark&&<a className="gov-home" href="/" aria-label="Bankeiz home"><BankMark/></a>}
    <div><small className="gov-kicker">{eyebrow}</small><h1>{title}</h1></div>
  </div>{children&&<div className="gov-actions">{children}</div>}</header>;
}
const tabs=['Charters','Proposals','Polls','Ballots','Mandates','Candidates','Challenges','Ratifications','Closures'] as const;
type Tab=typeof tabs[number];
function matches(row:GovernanceRow,tab:Tab){
  const t=row.document.terms;
  if(t.kind==='proposal')return t.decision==='Poll'?tab==='Polls':tab==='Proposals';
  return ({charter:'Charters',ballot:'Ballots',mandate:'Mandates',candidacy:'Candidates',challenge:'Challenges',ratification:'Ratifications',closure:'Closures'} as const)[t.kind]===tab;
}
export const governanceExamplePath='/vote/?example=harbor-tool-library';
export function GovernanceRegister({rows,network,go,path,member,children,personal=false,initialActivity=personal}:{rows:readonly GovernanceRow[];network:readonly GovernanceRow[];go:(digest:string)=>void;path:(row:GovernanceRow)=>string|null;member?:(id:string)=>string;children?:ReactNode;personal?:boolean;initialActivity?:boolean}){
  const [activityView,setActivityView]=useState(initialActivity),[tab,setTab]=useState<Tab|'All records'>('All records'),[query,setQuery]=useState(''),[limit,setLimit]=useState(24);
  const {byId,ballots,activity}=useMemo(()=>{
    const byId=new Map(network.map(r=>[r.digest,r])),ballots=new Map<string,number>(),activity=new Map<string,{proposals:number;polls:number}>();
    for(const r of network){const t=r.document.terms;if(t.kind==='proposal'){const count=activity.get(t.charter)??{proposals:0,polls:0};if(t.decision==='Poll')count.polls++;else count.proposals++;activity.set(t.charter,count);}
      if(t.kind==='ballot')ballots.set(t.proposal,(ballots.get(t.proposal)??0)+1);}
    return {byId,ballots,activity};
  },[network]);
  const needle=query.trim().toLowerCase();
  const selected=activityView?tab==='All records'?rows:rows.filter(r=>matches(r,tab)):rows.filter(r=>r.document.terms.kind==='charter');
  function parentTitle(r:GovernanceRow){
    const t=r.document.terms,ref='proposal' in t?t.proposal:'charter' in t?t.charter:null;
    const parent=ref&&byId.get(ref);
    return parent?governanceTitle(parent):'';
  }
  const filtered=needle?selected.filter(r=>[governanceTitle(r),parentTitle(r),member?.(r.document.author),r.document.author,r.digest,...('charter' in r.document.terms?[r.document.terms.charter]:[])].some(v=>v?.toLowerCase().includes(needle))):selected;
  const counts=rows.reduce((n,r)=>{const t=r.document.terms;if(t.kind==='proposal'&&t.decision==='Poll')n.poll++;else if(t.kind==='charter'||t.kind==='ballot'||t.kind==='proposal')n[t.kind]++;return n;},{charter:0,proposal:0,poll:0,ballot:0});
  return <>
    <div className="gov-overview" aria-label="Records in this view">{(['charter','proposal','poll','ballot'] as const).map(k=><span key={k}><b>{counts[k]}</b> {k}{counts[k]===1?'':'s'}</span>)}{children}</div>
    <div className="gov-register-nav"><nav className="gov-tabs" aria-label="Public voting data">{['Charters',personal?'Account activity':'Network activity'].map((name,i)=><button key={name} aria-current={activityView===Boolean(i)?'page':undefined} onClick={()=>{setActivityView(Boolean(i));setLimit(24);setQuery('');}}>{name}</button>)}</nav>
    {rows.length>0&&<label className="gov-search"><Search size={15}/><input aria-label="Find a record" type="search" value={query} onChange={e=>{setQuery(e.target.value);setLimit(24);}} placeholder={activityView?'Find a record':'Find a charter'}/></label>}</div>
    {activityView&&rows.length>0&&<label className="gov-filter"><select aria-label="Record type" value={tab} onChange={e=>{setTab(e.target.value as typeof tab);setLimit(24);}}>{['All records',...tabs].map(k=><option key={k}>{k}</option>)}</select></label>}
    {filtered.slice(0,limit).map(r=>{const t=r.document.terms,url=path(r),name=member?.(r.document.author)??r.document.author;
      const count=activity.get(r.digest),qty=(n:number,label:string)=>n+' '+label+(n===1?'':'s');
      return <div className="gov-list-item" key={r.digest}><button className="gov-row" onClick={()=>go(r.digest)}>
        {(activityView||t.kind!=='charter')&&<span className="gov-meta">{t.kind==='proposal'?t.decision:t.kind} {parentTitle(r)&&<>· {parentTitle(r)}</>}</span>}
        <span className="gov-row-title">{t.kind==='charter'&&t.logo&&<img className="gov-logo" alt="" src={t.logo}/>}<strong>{t.kind==='ballot'?(member?.(t.choice)??t.choice):governanceTitle(r)}</strong></span>
        {t.kind==='charter'&&<span className="gov-purpose">{t.rules.purpose}</span>}
        <small>{t.kind==='charter'?qty(count?.proposals??0,'proposal')+' · '+qty(count?.polls??0,'poll'):t.kind==='proposal'?qty(ballots.get(r.digest)??0,'ballot Original'):name}{!url?' · Held locally':''}</small>
      </button></div>;})}
    {!filtered.length&&<div className="gov-empty"><p>{needle?'No matching records.':(activityView?'No matching activity in the records held here.':'No charters in the records held here.')}</p></div>}
    {filtered.length>limit&&<button onClick={()=>setLimit(n=>n+24)}>Show more records</button>}
  </>;
}
