import type {OpenIdentity} from './native-identity';
import {loadGovernanceOutbox,saveGovernanceOutbox,loadOfflineNoteBlob} from './identity-vault';
import {openGovernanceOriginal,requireGovernanceOriginal,type GovernanceOriginal} from './governance-documents';

export type PendingOriginal={digest:string;filename:string;mime:string;title:string};
function pendingList(value:unknown):PendingOriginal[]{
  if(value==null)return [];
  if(!Array.isArray(value)||value.some(item=>!item||! /^[a-f0-9]{64}$/.test(item.digest)||typeof item.filename!=='string'||typeof item.mime!=='string'||typeof item.title!=='string'))throw Error('The saved governance outbox could not be read.');
  return value;
}
export async function governanceOutbox(identity:OpenIdentity){return pendingList(await loadGovernanceOutbox(identity.binding));}
export async function rememberGovernanceDelivery(identity:OpenIdentity,original:GovernanceOriginal,delivered=false){
  requireGovernanceOriginal(original);
  if(original.document.author!==identity.binding.artifactOwnerReceizId)throw Error('The selected identity changed.');
  const terms=original.document.terms;
  const entry={digest:original.digest,filename:original.file.name,mime:original.file.type,title:terms.kind==='charter'?terms.rules.name:terms.kind==='proposal'?terms.title:terms.kind};
  for(let attempt=0;attempt<5;attempt++){
    const prior=await loadGovernanceOutbox(identity.binding),list=pendingList(prior),found=list.some(row=>row.digest===entry.digest);
    if(found===!delivered)return;
    try{await saveGovernanceOutbox(identity.binding,delivered?list.filter(row=>row.digest!==entry.digest):[...list,entry],prior);return;}
    catch(e){if(attempt===4||!(e instanceof Error)||!['BANK_NOTE_INTENT_CHANGED','BANK_NOTE_IDENTITY_OR_INTENT_CHANGED'].includes(e.message))throw e;}
  }
}
export async function reopenPendingGovernance(identity:OpenIdentity,entry:PendingOriginal){
  const bytes=await loadOfflineNoteBlob(identity.binding,entry.digest);
  const original=await openGovernanceOriginal(new File([new Uint8Array(bytes)],entry.filename,{type:entry.mime}));
  if(original.digest!==entry.digest||original.document.author!==identity.binding.artifactOwnerReceizId)throw Error('The Original does not match this identity and outbox entry.');
  return original;
}
