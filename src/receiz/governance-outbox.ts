import type {OpenIdentity} from './native-identity';
import {loadGovernanceOutbox,saveGovernanceOutbox,loadOfflineNoteBlob} from './identity-vault';
import {charterElectorate,openGovernanceOriginal,requireGovernanceOriginal,type GovernanceOriginal} from './governance-documents';
import type {GovernanceRow} from './governance-directory';
import {ofKind} from './governance-view';

export type PendingOriginal={digest:string;filename:string;mime:string;title:string;applicationProposal?:string};
const digestPattern=/^[a-f0-9]{64}$/u;
function pendingList(value:unknown):PendingOriginal[]{
  if(value==null)return [];
  if(!Array.isArray(value)||value.some(item=>!item||typeof item.digest!=='string'||!digestPattern.test(item.digest)
    ||typeof item.filename!=='string'||typeof item.mime!=='string'||typeof item.title!=='string'
    ||item.applicationProposal!==undefined&&(typeof item.applicationProposal!=='string'||!digestPattern.test(item.applicationProposal)))){
    throw Error('The saved governance outbox could not be read.');
  }
  return value;
}
export async function governanceOutbox(identity:OpenIdentity){return pendingList(await loadGovernanceOutbox(identity.binding));}
async function changeOutbox(identity:OpenIdentity,update:(items:PendingOriginal[])=>PendingOriginal[]){
  for(let attempt=0;attempt<5;attempt++){
    const prior=await loadGovernanceOutbox(identity.binding),items=pendingList(prior),next=update(items);
    if(next===items)return;
    try{await saveGovernanceOutbox(identity.binding,next,prior);return;}
    catch(e){if(attempt===4||!(e instanceof Error)||!['BANK_NOTE_INTENT_CHANGED','BANK_NOTE_IDENTITY_OR_INTENT_CHANGED'].includes(e.message))throw e;}
  }
}
export async function rememberGovernanceDelivery(identity:OpenIdentity,original:GovernanceOriginal,state:'held'|'delivered'|'applying'='held'){
  requireGovernanceOriginal(original);
  if(original.document.author!==identity.binding.artifactOwnerReceizId)throw Error('The selected identity changed.');
  const terms=original.document.terms;
  const entry:PendingOriginal={digest:original.digest,filename:original.file.name,mime:original.file.type,
    title:terms.kind==='charter'?terms.rules.name:terms.kind==='proposal'?terms.title:terms.kind};
  if(state==='applying'){
    if(terms.kind!=='closure'||original.document.visibility!=='public')throw Error('Select a public closure Original.');
    entry.applicationProposal=terms.proposal;
  }
  await changeOutbox(identity,items=>{
    const existing=items.find(item=>item.digest===entry.digest);
    if(state==='delivered')return existing?items.filter(item=>item!==existing):items;
    if(!existing)return [...items,entry];
    return entry.applicationProposal&&!existing.applicationProposal?items.map(item=>item===existing?entry:item):items;
  });
}

/** Publication of the exact author's closure is the trigger. An outbox
 * entry is only a transport reminder and never part of the vote proof. */
export async function deliverPendingCurrencyDecisions(identity:OpenIdentity,rows:readonly GovernanceRow[],read:(digest:string)=>Promise<GovernanceOriginal>){
  if(!identity.currencyGovernance)return false;
  const entries=(await governanceOutbox(identity)).filter(entry=>entry.applicationProposal);
  if(!entries.length)return false;
  const closures=ofKind(rows,'closure'),proposals=ofKind(rows,'proposal'),charters=ofKind(rows,'charter'),finished=new Set<string>();
  for(const entry of entries){
    const owned=closures.find(row=>row.digest===entry.digest&&row.document.author===identity.binding.artifactOwnerReceizId);
    if(!owned||owned.document.terms.proposal!==entry.applicationProposal)continue;
    const proposal=proposals.find(row=>row.digest===entry.applicationProposal&&row.document.terms.charter===owned.document.terms.charter);
    if(!proposal)continue;
    if(!proposal.document.terms.currencyChange){finished.add(entry.digest);continue;}
    const charter=charters.find(row=>row.digest===proposal.document.terms.charter);
    if(charter?.document.terms.rules.execution?.rule!=='unanimous-evidence-closure-v1')continue;
    const electorate=new Set(charterElectorate(charter.document.terms.rules));
    const signers=new Set(closures.filter(row=>row.document.terms.proposal===proposal.digest&&row.document.terms.charter===charter.digest
      &&electorate.has(row.document.author)).map(row=>row.document.author));
    if(signers.size!==electorate.size)continue;
    try{
      const {applyCurrencyDecision}=await import('./currency-governance');
      await applyCurrencyDecision(identity,proposal,rows,read);
      finished.add(entry.digest);
    }catch{/* The exact published closure remains queued for the next delivery attempt. */}
  }
  if(!finished.size)return false;
  await changeOutbox(identity,items=>items.some(entry=>entry.applicationProposal&&finished.has(entry.digest))
    ?items.filter(entry=>!entry.applicationProposal||!finished.has(entry.digest)):items);
  return true;
}
export async function reopenPendingGovernance(identity:OpenIdentity,entry:PendingOriginal){
  const bytes=await loadOfflineNoteBlob(identity.binding,entry.digest);
  const original=await openGovernanceOriginal(new File([new Uint8Array(bytes)],entry.filename,{type:entry.mime}));
  if(original.digest!==entry.digest||original.document.author!==identity.binding.artifactOwnerReceizId)throw Error('The Original does not match this identity and outbox entry.');
  return original;
}
