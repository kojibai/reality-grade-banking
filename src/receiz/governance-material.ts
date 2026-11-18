import type {OpenIdentity} from './native-identity';
import type {GovernanceAttachment} from './governance-documents';
import {prepareProofMaterial,publishProofMaterial} from './proof-material-sharing';

const prepared=new WeakMap<OpenIdentity,WeakMap<File,Promise<GovernanceAttachment>>>();

export async function holdGovernanceFiles(identity:OpenIdentity,files:readonly File[]){
  if(!identity.sealRecordExport)throw Error('Open the issuing identity to attach documents.');
  let held=prepared.get(identity);
  if(!held){held=new WeakMap();prepared.set(identity,held);}
  const documents=new Map<string,GovernanceAttachment>();
  for(const file of files){
    let work=held.get(file);
    if(!work){
      if(!file.size||file.size>32*1024*1024)throw Error('Choose a nonempty file within the 32 MB Original limit.');
      work=(async()=>{
        const original=await identity.sealRecordExport!({filename:file.name,mimeType:file.type||'application/octet-stream',bytes:new Uint8Array(await file.arrayBuffer())});
        return {name:file.name,source:(await prepareProofMaterial(original)).headUrl};
      })();
      held.set(file,work);
    }
    try{const attachment=await work;documents.set(attachment.source,attachment);}
    catch(error){held.delete(file);throw error;}
  }
  return [...documents.values()];
}

export async function publishGovernanceFiles(files:readonly GovernanceAttachment[],check:()=>void){
  for(const file of files){check();await publishProofMaterial(file.source,check);}
}
