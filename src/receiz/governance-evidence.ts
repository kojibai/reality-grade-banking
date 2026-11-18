import {charterElectorate,openGovernanceOriginal,type GovernanceOriginal} from './governance-documents';
import type {GovernanceRow} from './governance-directory';
import {ballotRegister,ofKind} from './governance-view';

export type GovernanceEvidence={original:GovernanceOriginal;scope:string;references:readonly {digest:string;label:string}[]};
type ReadOriginal=(digest:string)=>Promise<GovernanceOriginal>;

/** Only reopened exact files supply facts. Directory rows enumerate available
 * evidence; a reader can disclose a missing dependency and still prove a seal. */
export async function verifyGovernanceEvidence(digest:string,read:ReadOriginal,index:readonly GovernanceRow[]):Promise<GovernanceEvidence>{
  const sources=new Map<string,GovernanceOriginal>(),references:{digest:string;label:string}[]=[];
  async function open(id:string,label:string){
    const known=sources.get(id);if(known)return known;
    const held=await read(id),source=await openGovernanceOriginal(held.file);
    if(source.digest!==id)throw Error('Referenced Original differs from the requested digest.');
    sources.set(id,source);if(id!==digest)references.push({digest:id,label});
    return source;
  }
  const original=await open(digest,'Selected Original'),terms=original.document.terms;
  const proof=(scope:string):GovernanceEvidence=>({original,scope,references});
  if(terms.kind==='charter')return proof('The issuer signed the full charter and is a named founder.');
  try{
    const charter=await open(terms.charter,'Charter');
    if(charter.document.terms.kind!=='charter')return proof('The referenced document is outside the charter format.');
    if(terms.kind==='ratification')return proof(charter.document.terms.rules.founders.includes(original.document.author)?'A named founder signed this ratification of the exact charter.':'The signer is outside the charter’s named founders.');
    if(terms.kind!=='ballot')return proof('The author signed these terms against the displayed charter Original.');
    const proposal=await open(terms.proposal,'Proposal');
    if(proposal.document.terms.kind!=='proposal'||proposal.document.terms.charter!==charter.digest)return proof('The proposal and ballot refer to different charters.');
    if(!charterElectorate(charter.document.terms.rules).includes(original.document.author)||!proposal.document.terms.choices.includes(terms.choice))return proof('This signed statement falls outside the eligible electorate or ballot choices.');
    const nominations=proposal.document.terms.nominations??[];
    for(const nomination of nominations)await open(nomination,'Candidate statement');
    const founders=new Set(charter.document.terms.rules.founders);
    for(const r of ofKind(index,'ratification')){
      if(r.document.terms.charter!==charter.digest||!founders.has(r.document.author))continue;
      const o=await open(r.digest,'Founder ratification'),t=o.document.terms;
      if(t.kind==='ratification'&&t.charter===charter.digest&&BigInt(o.pulse)<=BigInt(proposal.pulse)&&BigInt(o.pulse)>=BigInt(charter.pulse))founders.delete(o.document.author);
    }
    const actor=original.document.author;
    for(const r of ofKind(index,'ballot')){
      if(r.document.author===actor&&r.document.terms.proposal===proposal.digest&&r.document.terms.charter===charter.digest)await open(r.digest,'Ballot by this voter');
    }
    const rows:GovernanceRow[]=[...sources.values()].map(o=>({digest:o.digest,pulse:o.pulse,document:o.document,profileUid:null}));
    const result=ballotRegister(ofKind(rows,'proposal').find(r=>r.digest===proposal.digest)!,ofKind(rows,'charter').find(r=>r.digest===charter.digest)!,rows);
    if(!result.admitted)return proof('The proposal lacks sufficient verified charter, founding or candidate evidence.');
    if(result.excluded.some(b=>b.digest===digest))return proof('This ballot falls outside the charter’s voting window or eligibility rules.');
    if(result.disputed.has(actor))return proof('This voter has conflicting or incomplete ballot history in the available evidence.');
    return proof(result.effective.get(actor)?.digest===digest?'This is the counted direct ballot for this voter in the verified records held here.':'A verified successor replaces this ballot in the records held here.');
  }catch{
    return proof('The seal and signed terms verified. Supporting Originals are missing or could not be verified.');
  }
}

/** Rebuild the displayed tally from the exact available Originals. */
export async function verifyGovernanceTally(id:string,read:ReadOriginal,index:readonly GovernanceRow[]){
  const proposal=await openGovernanceOriginal((await read(id)).file),terms=proposal.document.terms;
  if(proposal.digest!==id||terms.kind!=='proposal')throw Error('Select an exact proposal Original.');
  const needed=new Set([id,terms.charter,...(terms.nominations??[])]);
  for(const r of index){
    const t=r.document.terms;
    if(t.kind==='charter'||t.charter!==terms.charter)continue;
    if(t.kind==='ratification'||t.kind==='mandate'&&t.scope===terms.decision||t.kind==='ballot'&&t.proposal===id)needed.add(r.digest);
  }
  const rows:GovernanceRow[]=[];
  for(const digest of needed){
    const o=digest===id?proposal:await openGovernanceOriginal((await read(digest)).file);
    if(o.digest!==digest)throw Error('An Original differs from the selected tally evidence.');
    rows.push({digest:o.digest,pulse:o.pulse,document:o.document,profileUid:null});
  }
  const charter=ofKind(rows,'charter').find(r=>r.digest===terms.charter);
  if(!charter)throw Error('The founding Original is missing.');
  const tally=ballotRegister(ofKind(rows,'proposal')[0],charter,rows);
  if(!tally.admitted)throw Error('The evidence is insufficient to establish the proposal under this charter.');
  return {tally,originalCount:rows.length};
}
