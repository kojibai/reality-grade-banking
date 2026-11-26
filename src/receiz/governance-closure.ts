import {N_DAY_MICRO} from '../../native/receiz/app/utils/kai_pulse';
import {charterElectorate,openGovernanceOriginal,type GovernanceOriginal,type GovernanceTerms} from './governance-documents';
import {ballotRegister,ofKind,voteEnds,type Row} from './governance-view';
import type {GovernanceRow} from './governance-directory';

export function closureOpens(proposal:Row<'proposal'>,charter:Row<'charter'>){
  const {voteDays,appealDays}=charter.document.terms.rules;
  return (BigInt(proposal.pulse)*1000000n+BigInt(voteDays+appealDays)*N_DAY_MICRO+999999n)/1000000n;
}
export function proposalEvidence(proposal:Row<'proposal'>,rows:readonly GovernanceRow[]){
  const t=proposal.document.terms;
  const ids=new Set([proposal.digest,t.charter,...(t.nominations??[])]);
  const charter=ofKind(rows,'charter').find(c=>c.digest===t.charter);
  if(!charter)return Array.from(ids).sort();
  const rules=charter.document.terms.rules,members=new Set(charterElectorate(rules));
  const ratifiedBy=new Set(rules.founders),start=BigInt(proposal.pulse),founded=BigInt(charter.pulse);
  const closes=voteEnds(proposal,charter),appealEnd=closureOpens(proposal,charter);
  for(const row of rows){
    const r=row.document.terms,when=BigInt(row.pulse),who=row.document.author;
    if(r.kind==='charter'||r.charter!==t.charter||when<founded)continue;
    if(r.kind==='ratification'&&ratifiedBy.has(who)&&when<=start||
       r.kind==='mandate'&&rules.allowMandates&&members.has(who)&&r.scope===t.decision&&when<=start||
       r.kind==='ballot'&&r.proposal===proposal.digest&&members.has(who)&&when>=start&&when<closes||
       r.kind==='challenge'&&r.proposal===proposal.digest&&members.has(who)&&when>=start&&when<appealEnd)ids.add(row.digest);
  }
  return Array.from(ids).sort();
}
export async function reviewClosure(terms:Extract<GovernanceTerms,{kind:'closure'}>,owner:string,pulse:string,read:(id:string)=>Promise<GovernanceOriginal>,rows:readonly GovernanceRow[]){
  const known=ofKind(rows,'proposal').find(r=>r.digest===terms.proposal);
  if(!known||JSON.stringify(proposalEvidence(known,rows))!==JSON.stringify(terms.evidence))throw Error('The available evidence changed. Review the current manifest.');
  const files:GovernanceRow[]=[];
  for(const digest of terms.evidence){
    const source=await openGovernanceOriginal((await read(digest)).file);
    if(source.digest!==digest)throw Error('An Original differs from the closure manifest.');
    files.push({digest,pulse:source.pulse,document:source.document,profileUid:null});
  }
  verifyManifest(terms,owner,pulse,files);
}
function verifyManifest(terms:Extract<GovernanceTerms,{kind:'closure'}>,owner:string,pulse:string,files:GovernanceRow[]){
  const proposal=ofKind(files,'proposal').find(r=>r.digest===terms.proposal);
  const charter=ofKind(files,'charter').find(r=>r.digest===terms.charter);
  if(!proposal||!charter||proposal.document.terms.charter!==charter.digest||charter.document.terms.rules.execution?.rule!=='unanimous-evidence-closure-v1'||
      !charterElectorate(charter.document.terms.rules).includes(owner))throw Error('This identity or charter cannot attest closure.');
  if(BigInt(pulse)<closureOpens(proposal,charter))throw Error('The charter’s vote and challenge periods are still open.');
  const termsOfProposal=proposal.document.terms;
  if(files.some(file=>{
    const t=file.document.terms;
    if(t.kind==='charter')return file.digest!==charter.digest;
    if(t.charter!==charter.digest)return true;
    switch(t.kind){
      case 'proposal':return file.digest!==proposal.digest;
      case 'candidacy':return !termsOfProposal.nominations?.includes(file.digest);
      case 'mandate':return t.scope!==termsOfProposal.decision;
      case 'ballot':case 'challenge':return t.proposal!==proposal.digest;
      case 'closure':case 'registration':return true;
      case 'ratification':return false;
    }
  }))throw Error('The manifest contains records from another decision.');

  const authority=charter.document.terms.rules.execution;
  const supported=(termsOfProposal.decision==='Election'&&termsOfProposal.office&&termsOfProposal.nominations?.length)||
    ((termsOfProposal.decision==='Policy'||termsOfProposal.decision==='Treasury'&&authority.treasury&&termsOfProposal.payment&&
       JSON.stringify(termsOfProposal.payment)===JSON.stringify(authority.treasury))&&JSON.stringify(termsOfProposal.choices)==='["Approve","Reject"]');
  if(!supported)throw Error('This proposal does not specify a binding action under the charter.');
  const tally=ballotRegister(proposal,charter,files);
  if(!tally.admitted||tally.disputed.size)throw Error('The proposal has missing or disputed voting evidence.');
  if(ofKind(files,'challenge').some(c=>charterElectorate(charter.document.terms.rules).includes(c.document.author)&&BigInt(c.pulse)>=BigInt(proposal.pulse)&&BigInt(c.pulse)<closureOpens(proposal,charter)))throw Error('Resolve the admitted challenge before closing this decision.');
}

export async function collectClosedEvidence(proposal:Row<'proposal'>,rows:readonly GovernanceRow[],read:(id:string)=>Promise<GovernanceOriginal>){
  const charter=ofKind(rows,'charter').find(r=>r.digest===proposal.document.terms.charter);
  if(charter?.document.terms.rules.execution?.rule!=='unanimous-evidence-closure-v1')throw Error('Open the charter that authorizes elector closure.');
  let manifest:readonly string[]|undefined;
  const members=new Set(charterElectorate(charter.document.terms.rules));
  const proofs=ofKind(rows,'closure').filter(r=>r.document.terms.charter===charter.digest&&r.document.terms.proposal===proposal.digest&&members.has(r.document.author));
  const sources=new Map<string,GovernanceOriginal>();
  async function open(id:string){
    const held=sources.get(id);
    if(held)return held;
    const original=await openGovernanceOriginal((await read(id)).file);
    if(original.digest!==id)throw Error('A closure source differs from the requested Original.');
    sources.set(id,original);
    return original;
  }
  // Reopen the complete statement of each elector. A directory projection cannot
  // substitute for a signature or suppress a conflicting closure in this view.
  const closedBy=new Map<string,string>();
  for(const row of proofs){
    const proof=await open(row.digest),t=proof.document.terms;
    if(t.kind==='closure'&&!manifest)manifest=t.evidence;
    if(t.kind!=='closure'||proof.document.author!==row.document.author||t.charter!==charter.digest||t.proposal!==proposal.digest||
        BigInt(proof.pulse)<closureOpens(proposal,charter)||JSON.stringify(t.evidence)!==JSON.stringify(manifest))throw Error('The signed closure manifests disagree or fall outside the permitted window.');
    const prior=closedBy.get(proof.document.author);
    if(!prior||proof.digest<prior)closedBy.set(proof.document.author,proof.digest);
  }
  if(!manifest||closedBy.size!==members.size)throw Error('Every voting member must attest the same evidence manifest.');
  const first=sources.get(closedBy.values().next().value!)!;
  const originals:GovernanceOriginal[]=[];
  for(const id of manifest)originals.push(await open(id));
  const verifiedRows=originals.map(o=>({digest:o.digest,document:o.document,pulse:o.pulse,profileUid:null}));
  verifyManifest(first.document.terms as Extract<GovernanceTerms,{kind:'closure'}>,first.document.author,first.pulse,verifiedRows);
  const sealedProposal=ofKind(verifiedRows,'proposal').find(r=>r.digest===proposal.digest)!;
  const signedCharter=ofKind(verifiedRows,'charter').find(r=>r.digest===sealedProposal.document.terms.charter)!;
  const electorate=charterElectorate(signedCharter.document.terms.rules),appealEnd=closureOpens(sealedProposal,signedCharter);
  if([...closedBy.values()].some(id=>BigInt(sources.get(id)!.pulse)<appealEnd))throw Error('A closure was signed before the challenge period ended.');
  if(electorate.length!==closedBy.size||electorate.some(id=>!closedBy.has(id)))throw Error('The signed charter requires different electors.');
  for(const id of Array.from(closedBy.values()).sort())originals.push(await open(id));
  return originals;
}
