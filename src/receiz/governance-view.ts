import {N_DAY_MICRO} from '../../native/receiz/app/utils/kai_pulse';
import type {GovernanceRow} from './governance-directory';
import {charterAdmitsMember,type GovernanceTerms} from './governance-documents';
type Kind=GovernanceTerms['kind'];
export type Row<K extends Kind>=GovernanceRow&{document:{terms:Extract<GovernanceTerms,{kind:K}>}};
export function ofKind<K extends Kind>(rows:readonly GovernanceRow[],kind:K):Row<K>[]{
  return rows.filter((row):row is Row<K>=>row.document.terms.kind===kind);
}
const micro=(pulse:string)=>BigInt(pulse)*1000000n;
export function charterRatification(charter:Row<'charter'>,rows:readonly GovernanceRow[],by?:string){
  const founders=charter.document.terms.rules.founders;
  const approvals=ofKind(rows,'ratification').filter(item=>item.document.terms.charter===charter.digest&&founders.includes(item.document.author)&&BigInt(item.pulse)>=BigInt(charter.pulse)&&(!by||BigInt(item.pulse)<=BigInt(by)));
  const signed=new Set(approvals.map(item=>item.document.author));
  return {approvals,signed,complete:founders.every(founder=>signed.has(founder))};
}
export function voteEnds(proposal:Row<'proposal'>,charter:Row<'charter'>){
  return (micro(proposal.pulse)+BigInt(charter.document.terms.rules.voteDays)*N_DAY_MICRO+999999n)/1000000n;
}
export function eligibleCandidates(charter:Row<'charter'>,officeName:string,rows:readonly GovernanceRow[],by?:string){
  const rules=charter.document.terms.rules,office=rules.offices?.find(o=>o.name===officeName);
  return ofKind(rows,'candidacy').filter(r=>office?.selection==='Election'&&r.document.terms.charter===charter.digest&&r.document.terms.office===officeName&&BigInt(r.pulse)>=BigInt(charter.pulse)&&(!by||BigInt(r.pulse)<=BigInt(by))&&(office.eligibility==='Open'||charterAdmitsMember(rules,r.document.author)));
}
export function eligibleProposal(proposal:Row<'proposal'>,charter:Row<'charter'>,rows:readonly GovernanceRow[]){
  const t=proposal.document.terms;
  if(t.charter!==charter.digest||!charterAdmitsMember(charter.document.terms.rules,proposal.document.author)||!charterRatification(charter,rows,proposal.pulse).complete)return false;
  if(!t.office)return true;
  const nominations=new Map(eligibleCandidates(charter,t.office,rows,proposal.pulse).map(r=>[r.digest,r.document.author]));
  return Boolean(t.nominations?.length&&t.nominations.length===t.choices.length&&t.nominations.every((digest,i)=>nominations.get(digest)===t.choices[i]));
}
// A complete single path is required for a revisable statement. Directory order never breaks ties.
function latestStatement<T extends Row<'mandate'>|Row<'ballot'>>(group:T[]):T|null{
  const byDigest=new Map(group.map(row=>[row.digest,row])),parents=new Set(group.map(row=>row.document.terms.previous));
  const heads=[...byDigest.values()].filter(row=>!parents.has(row.digest));
  if(heads.length!==1)return null;
  const reached=new Set<string>();let row:T|undefined=heads[0];
  while(row&&!reached.has(row.digest)){
    reached.add(row.digest);const prior:string|null=row.document.terms.previous;
    if(prior===null)return reached.size===byDigest.size?heads[0]:null;
    const parent:T|undefined=byDigest.get(prior);
    if(!parent||BigInt(parent.pulse)>BigInt(row.pulse))return null;
    row=parent;
  }
  return null;
}
export function ballotRegister(proposal:Row<'proposal'>,charter:Row<'charter'>,rows:readonly GovernanceRow[]){
  const terms=proposal.document.terms,rules=charter.document.terms.rules,closes=voteEnds(proposal,charter);
  const admitted=eligibleProposal(proposal,charter,rows);
  const ballots=ofKind(rows,'ballot').filter(row=>row.document.terms.proposal===proposal.digest&&row.document.terms.charter===charter.digest);
  const groups=new Map<string,Row<'ballot'>[]>(),excluded:Row<'ballot'>[]=[];
  for(const row of ballots){
    if(!admitted||!charterAdmitsMember(rules,row.document.author)||!terms.choices.includes(row.document.terms.choice)||BigInt(row.pulse)<BigInt(proposal.pulse)||BigInt(row.pulse)>=closes){excluded.push(row);continue;}
    const group=groups.get(row.document.author)??[];group.push(row);groups.set(row.document.author,group);
  }
  const effective=new Map<string,Row<'ballot'>>(),disputed=new Set<string>();
  for(const [actor,group] of groups){const head=latestStatement(group);if(head)effective.set(actor,head);else disputed.add(actor);}
  const counts=new Map(terms.choices.map(choice=>[choice,0])),represented=new Map<string,{mandate:Row<'mandate'>;ballot:Row<'ballot'>}>();
  for(const row of effective.values())counts.set(row.document.terms.choice,counts.get(row.document.terms.choice)!+1);
  if(rules.allowMandates&&admitted){
    const scopes=new Map<string,Row<'mandate'>[]>();
    for(const r of ofKind(rows,'mandate')){
      const m=r.document.terms;
      if(m.charter!==charter.digest||m.scope!==terms.decision||!charterAdmitsMember(rules,r.document.author)||groups.has(r.document.author)||BigInt(r.pulse)>BigInt(proposal.pulse)||BigInt(r.pulse)<BigInt(charter.pulse))continue;
      const group=scopes.get(r.document.author)??[];group.push(r);scopes.set(r.document.author,group);
    }
    for(const [actor,history] of scopes){
      const mandate=latestStatement(history);
      if(!mandate){disputed.add(actor);continue;}
      const m=mandate.document.terms,ballot=m.delegate&&effective.get(m.delegate);
      if(!ballot||BigInt(m.untilKaiPulse)<=BigInt(ballot.pulse))continue;
      represented.set(actor,{mandate,ballot});counts.set(ballot.document.terms.choice,counts.get(ballot.document.terms.choice)!+1);
    }
  }
  return {ballots,effective,counts,represented,disputed,excluded,admitted,closes};
}
export function observedSeats(counts:ReadonlyMap<string,number>,seats:number){
  const ordered=[...counts].filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]);
  const cutoff=ordered[seats-1]?.[1],tied=cutoff!==undefined&&ordered[seats]?.[1]===cutoff;
  return {leading:ordered.slice(0,seats).filter(([,n])=>!tied||n>cutoff!).map(([candidate])=>candidate),
    tied:tied?ordered.filter(([,n])=>n===cutoff).map(([candidate])=>candidate):[]};
}
export function governanceTitle(row:GovernanceRow){
  const t=row.document.terms;
  switch(t.kind){
    case 'charter':return t.rules.name;
    case 'proposal':return t.title;
    case 'candidacy':return 'Candidate for '+t.office;
    case 'ratification':return 'Founder ratification';
    case 'ballot':return t.choice;
    case 'mandate':return t.delegate?'Representative mandate':'Mandate revocation';
    case 'closure':return 'Elector closure attestation';
    case 'challenge':return 'Public challenge';
  }
}
