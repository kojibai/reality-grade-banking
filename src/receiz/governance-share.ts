import type {GovernanceRow} from './governance-directory';
import type {GovernanceTerms} from './governance-documents';
export type GovernanceCard={title:string;kind:string;charter:string;description:string;digest:string;example:boolean};
const labels:Record<GovernanceTerms['kind'],string>={charter:'Charter',proposal:'Proposal',ballot:'Ballot',ratification:'Ratification',mandate:'Representation',challenge:'Challenge',candidacy:'Candidate statement',closure:'Elector closure',registration:'Voter registration'};
export function governanceCard(row:GovernanceRow,charterName='',example=false):GovernanceCard{
 const t=row.document.terms;
 let title:string,description:string;
 switch(t.kind){
   case 'charter':title=t.rules.name;description=t.rules.purpose;break;
   case 'proposal':title=t.title;description=t.text;break;
   case 'ballot':title='Ballot for '+t.choice;description='Public ballot by '+row.document.author;break;
   case 'mandate':title=t.delegate?'Representative mandate':'Mandate revocation';description=t.scope;break;
   case 'challenge':title='Public challenge';description=t.text;break;
   case 'candidacy':title='Candidate for '+t.office;description=t.statement;break;
   case 'ratification':title='Founding ratification';description='Charter ratification by '+row.document.author;break;
   case 'closure':title='Elector closure';description='Signed evidence manifest for a charter decision.';break;
   case 'registration':title='Voter registration';description='Signed request to join the voting roll for this proposal.';break;
 }
 return {title,description,kind:t.kind==='proposal'?t.decision:labels[t.kind],charter:charterName,digest:row.digest,example};
}
export const governanceCardImage=(path:string,digest:string)=>path.includes('?example=harbor-tool-library')?'/vote/example-images/'+digest+'.png':path.replace(/\/?$/,'/')+'og.png';
