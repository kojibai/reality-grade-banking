import {receizKaiNow} from '@receiz/sdk';
import type {GovernanceRow} from '../../../receiz/governance-directory';
import {governanceSchema,readGovernanceTerms,type GovernanceTerms} from '../../../receiz/governance-documents';

export type PracticeTerms=Exclude<GovernanceTerms,{kind:'closure'}>;
export type PracticeRecord={id:string;author:string;pulse:string;terms:PracticeTerms};
export type PracticeSession={records:PracticeRecord[];actor:string};
const storageKey='bankeiz.vote.practice.harbor.v1';
const idPattern=/^[a-f0-9]{64}$/;
export function newPracticeRecord(author:string,terms:PracticeTerms):PracticeRecord{
  const id=(crypto.randomUUID()+crypto.randomUUID()).replaceAll('-','');
  return {id,author,pulse:String(receizKaiNow().pulse),terms};
}
export function restorePractice(defaultOwner:string,exampleRows:readonly GovernanceRow[]):PracticeSession{
  const result:PracticeSession={actor:defaultOwner,records:[]};
  try{
    const stored=JSON.parse(sessionStorage.getItem(storageKey)??'null');
    if(!stored)return result;
    if(Array.isArray(stored.records)){
      for(const record of stored.records){
        if(!record||!idPattern.test(record.id)||typeof record.author!=='string'||!/^\d+$/.test(record.pulse))continue;
        const terms=readGovernanceTerms(record.terms);
        if(terms.kind!=='closure')result.records.push({id:record.id,author:record.author,pulse:record.pulse,terms});
      }
      if(typeof stored.actor==='string')result.actor=stored.actor;
    }else{
      for(const [id,raw] of Object.entries(stored.drafts??{})){
        if(!idPattern.test(id))continue;
        const terms=readGovernanceTerms(raw);
        if(terms.kind==='charter'||terms.kind==='proposal')result.records.push({id,author:defaultOwner,pulse:'0',terms});
      }
      for(const [id,choice] of Object.entries(stored.ballots??{})){
        const proposal=result.records.find(r=>r.id===id)?.terms??exampleRows.find(r=>r.digest===id)?.document.terms;
        if(proposal?.kind==='proposal'&&typeof choice==='string'&&proposal.choices.includes(choice))result.records.push(newPracticeRecord(defaultOwner,{kind:'ballot',charter:proposal.charter,proposal:id,previous:null,choice}));
      }
    }
  }catch{/* Browser storage may be unavailable for this visit. */}
  return result;
}
export function savePractice(practice:PracticeSession){
  try{sessionStorage.setItem(storageKey,JSON.stringify(practice));}catch{/* Entries remain in memory for this visit. */}
}
// These projections are only used for local composition and practice eligibility.
export function practiceRows(records:readonly PracticeRecord[]):GovernanceRow[]{
  return records.map(({id,pulse,author,terms})=>({digest:id,pulse,profileUid:null,document:{terms,author,accountUid:null,schema:governanceSchema,visibility:'public'}}));
}
