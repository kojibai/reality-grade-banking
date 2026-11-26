import {canonicalizeReceizV122} from '@receiz/sdk';
import {charterElectorate,checkCharterCurrencyChange} from './governance-documents';
import {closureOpens,proposalEvidence} from './governance-closure';
import {ofKind,ballotRegister,observedSeats} from './governance-view';
import type {GovernanceRow} from './governance-directory';
import type {GovernanceDecision} from './governance-execution-plan';

/** A read-only projection. Each caller independently admits its source files under its own trust context. */
export function projectClosedGovernanceDecision(proposal:string,inputRows:readonly GovernanceRow[]){
 const rows=[...inputRows].sort((a,b)=>a.digest.localeCompare(b.digest));
 const same=(a:unknown,b:unknown)=>canonicalizeReceizV122(a)===canonicalizeReceizV122(b);
 const p=ofKind(rows,'proposal').find(i=>i.digest===proposal),c=ofKind(rows,'charter').find(i=>i.digest===p?.document.terms.charter);
 const authority=c?.document.terms.rules.execution;
 if(!p||!c||!authority)throw Error('The proposal requires its charter and exact binding rules.');
 const rules=c.document.terms.rules, members=charterElectorate(rules), evidence=proposalEvidence(p,rows),closures=ofKind(rows,'closure');
 const ids=rows.filter(r=>r.document.terms.kind!=='closure').map(r=>r.digest);
 if(!same(evidence,ids)||new Set(rows.map(r=>r.digest)).size!==rows.length||closures.length!==members.length||
    new Set(closures.map(r=>r.document.author)).size!==members.length||
    closures.some(r=>r.document.terms.proposal!==p.digest||r.document.terms.charter!==c.digest||!members.includes(r.document.author)||
      BigInt(r.pulse)<closureOpens(p,c)||!same(r.document.terms.evidence,evidence)))throw Error('Each elector must close this same complete evidence set after the challenge period.');
 if(ofKind(rows,'challenge').some(r=>members.includes(r.document.author)&&BigInt(r.pulse)>=BigInt(p.pulse)&&BigInt(r.pulse)<closureOpens(p,c)))throw Error('The selected evidence carries an unresolved challenge.');
 const votes=ballotRegister(p,c,rows),terms=p.document.terms,kind=terms.decision;
 if(!votes.admitted||votes.disputed.size||kind!=='Policy'&&kind!=='Treasury'&&kind!=='Election')throw Error('The charter cannot certify this decision.');
 const threshold=(count:number)=>count>0&&count*100>=rules.minimumSupportPercent*members.length&&count*100>=rules.approvalPercent*(votes.effective.size+votes.represented.size);
 let approved:boolean,office:string|null=null,seated:string[]=[];
 if(kind==='Election'){
  office=terms.office??null;const rule=rules.offices?.find(o=>o.name===office);
  if(!rule||rule.selection!=='Election'||!terms.nominations?.length)throw Error('The proposal must name the charter office and admitted nominations.');
  const seats=observedSeats(votes.counts,rule.seats);if(seats.tied.length)throw Error('Tied seats require a new decision.');
  seated=seats.leading.filter(id=>threshold(votes.counts.get(id)??0));approved=seated.length>0;
 }else{
  if(!same(terms.choices,['Approve','Reject']))throw Error('Binding policy and treasury choices must be Approve and Reject.');
  const yes=votes.counts.get('Approve')??0;approved=yes>(votes.counts.get('Reject')??0)&&threshold(yes);
 }
 if(kind==='Treasury'&&(!terms.payment||!authority.treasury||!same(terms.payment,authority.treasury)))throw Error('The installment differs from the ratified treasury authority.');
 const closedAtKai=closures.reduce((last,row)=>BigInt(row.pulse)>last?BigInt(row.pulse):last,0n).toString();
 const currencyChange=terms.currencyChange&&checkCharterCurrencyChange(authority.currency,terms.currencyChange);
 const decision:GovernanceDecision={...(approved&&currencyChange?{currencyChange}:{}),closedAtKai,schema:'bankeiz.governance.decision.v1',charter:c.digest,proposal:p.digest,decision:kind,
  approved,office,seated,payment:kind==='Treasury'&&approved?terms.payment!:null,evidence,closures:closures.map(r=>r.digest),counts:[...votes.counts].map(([choice,count])=>({choice,count}))};
 return {decision,authority};
}
