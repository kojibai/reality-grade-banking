import type {BankNoteInspection} from '../offline-notes';
import {createVaultStore,type VaultStore,type LockedVaultSummary} from './store';
import {createImageVault,openVaultCarrier,type VaultCarrier} from './carrier';
import {createVaultHeader,encryptVaultBytes,decryptVaultBytes,type VaultCredential,type VaultHeader} from './encryption';
import {registerVaultCredential,requestVaultPresence} from './presence';
import {openVaultImage,exportNoteVaultPrivateImage,rasterizeVaultArtwork,type VaultImagePorts} from './export';
import {vaultBytes,vaultCanonical,vaultDigest} from './encoding';
import {createVaultNoteSource,readVaultNoteSource,encodeVaultNoteSource,admitVaultNoteSource,appendVaultNote,appendVaultOriginal,type VaultNoteSource,type VaultNoteAdmission,type VaultNoteSourcePorts} from './note-source';
import type {VaultImage,VaultInteraction} from './manager';
import receiverBuild from '../../../public/native/receiver-verifier.v129.manifest.json';

export type NoteVaultSnapshot={id:string;name:string;ownerReceizId:string;protection:'image'|'passkey';readOnly:boolean;money:(BankNoteInspection&{sourceRef:string})[];originals:{id:string;title:string;mimeType:string;filename:string}[]};
export type NoteVaultSession={
 snapshot():Promise<NoteVaultSnapshot>;
 addNote(bytes:Uint8Array,filename?:string):Promise<void>;
 addOriginal(bytes:Uint8Array,filename:string):Promise<void>;
 exportPrivate():Promise<VaultImage>;
 exportRecovery():Promise<VaultImage>;
 exportOriginal(id:string):Promise<{bytes:Uint8Array;filename:string;mimeType:string}>;
 exportNote(noteId:string):Promise<{bytes:Uint8Array;filename:string;mimeType:string}>;
 lock():void;
};
export type NoteVaultManagerOptions={
 owner?:{keyId:string;receizId:string};
 images?:VaultImagePorts;
 store?:VaultStore;
 signal?:AbortSignal;
 admission?:VaultNoteSourcePorts;
 register?:(owner:{keyId:string;receizId:string},signal:AbortSignal)=>Promise<VaultCredential>;
 presence?:(header:VaultHeader,action:unknown,signal:AbortSignal)=>ReturnType<typeof requestVaultPresence>;
 kai?:()=>string;
};
export type NoteVaultManager={list():Promise<LockedVaultSummary[]>;create(input:{name:string;protection?:'image'|'passkey'},interaction:VaultInteraction):Promise<NoteVaultSession>;open(id:string,interaction:VaultInteraction):Promise<NoteVaultSession>;importPrivate(bytes:Uint8Array,interaction:VaultInteraction):Promise<NoteVaultSession>;dispose():void};

type Receiver={openReserveNoteImage(bytes:Uint8Array):Promise<unknown>;inspectReserveNote(handle:unknown):BankNoteInspection};
let receiver:Promise<Receiver>|undefined;
const loadReceiver=()=>receiver??=import(/* @vite-ignore */ new URL(`/native/receiver-verifier.v129.mjs?build=${receiverBuild.moduleSha256}`,location.origin).href).catch(error=>{receiver=undefined;throw error;});
/** The same read-only native receiver used by independent Note inspection.
 * Opening a collection performs no account discovery or financial operation. */
const defaultAdmission:VaultNoteSourcePorts={
 async inspectNote(bytes){
  const native=await(await import('../offline-notes')).loadBankNoteRuntime();
  if(await native.isBankConnectedNoteImage(bytes)||await native.isBankConnectedNoteSource(bytes)){
   const {openConnectedNoteDelivery}=await import('../note-delivery'),delivery=await openConnectedNoteDelivery({native,bytes}),note=delivery.source;
   if(note.kind==='funding'&&!delivery.noteIdentity)throw Error('BANK_NOTE_COMPLETE_DELIVERY_REQUIRED');
   return{noteId:note.noteId,rail:note.rail,amountUsdCents:note.amountUsdCents,amountPhiMicro:note.amountPhiMicro,...(note.fundingParts?{fundingParts:note.fundingParts}:{})};
  }
  const readonly=await loadReceiver();return readonly.inspectReserveNote(await readonly.openReserveNoteImage(bytes));
 },
};
const readonlyImages:VaultImagePorts={render:rasterizeVaultArtwork,seal:async()=>{throw Error('VAULT_NOTE_SEALER_REQUIRED');},verify:async bytes=>(await(await import('@receiz/sdk')).verifyReceizArtifact(bytes)).status==='verified-artifact'};
const locks=new Map<string,Promise<void>>();
async function exclusive<T>(key:string,run:()=>Promise<T>):Promise<T>{
 const before=locks.get(key)??Promise.resolve();let release!:()=>void;const tail=new Promise<void>(resolve=>{release=resolve;});locks.set(key,tail);await before;
 try{const browser=typeof navigator!=='undefined'?navigator.locks:undefined;return browser?await browser.request(key,run):await run();}finally{release();if(locks.get(key)===tail)locks.delete(key);}
}
/** A local collection of existing funded Notes and owned Originals. The carrier
 * adds no account, balance issuer, ownership transition or financial authority. */
export function createNoteVaultManager(options:NoteVaultManagerOptions={}):NoteVaultManager{
 const store=options.store??createVaultStore('bank-note-vaults-v1'),images=options.images??readonlyImages,lifetime=new AbortController(),sessions=new Set<NoteVaultSession>();
 const sourcePorts=options.admission??defaultAdmission;let visit=new AbortController();
 function suspend(){visit.abort(Error('VAULT_CLOSED'));visit=new AbortController();for(const session of [...sessions])session.lock();}
 function alive(){lifetime.signal.throwIfAborted();}
 function caller(interaction:VaultInteraction){alive();interaction.signal?.throwIfAborted();return AbortSignal.any([lifetime.signal,visit.signal,...(interaction.signal?[interaction.signal]:[])]);}
 async function coordinate(){return options.kai?options.kai():String((await import('@receiz/sdk')).receizKaiNow().uPulse);}
 async function approval(interaction:VaultInteraction,signal:AbortSignal,kind:'create',vaultId:string,intent:unknown){signal.throwIfAborted();if(await interaction.review({kind,vaultId,intent,digest:await vaultDigest(new TextEncoder().encode(vaultCanonical(intent)))})!==true)throw Error('VAULT_REVIEW_CANCELLED');signal.throwIfAborted();}
 async function openCarrier(initial:VaultCarrier,interaction:VaultInteraction,initialDigest:string,savedImage?:VaultImage,held?:{source:VaultNoteSource;projection:VaultNoteAdmission;key?:Uint8Array;readOnly?:boolean}):Promise<NoteVaultSession>{
  const signal=caller(interaction);let closed=false,envelope=initial,digest=initialDigest,source:VaultNoteSource,projection:VaultNoteAdmission,image=savedImage,sessionKey=held?.key?.slice(),exporting:{head:string;promise:Promise<VaultImage>}|undefined;
  function live(){signal.throwIfAborted();if(closed)throw Error('VAULT_CLOSED');}
  async function secret(action:unknown){if(envelope.schema!=='bank.vault.encrypted.v1')throw Error('VAULT_PROTECTION_REQUIRED');if(sessionKey)return sessionKey.slice();const result=await(options.presence??requestVaultPresence)(envelope.header,action,signal);try{live();sessionKey=result.secret.slice();return result.secret;}catch(error){result.secret.fill(0);throw error;}}
  const ports:VaultNoteSourcePorts={...sourcePorts,assertOpen:live};
  try{if(held){source=held.source;projection=held.projection;}else{const clear=await openVaultCarrier(envelope,envelope.schema==='bank.vault.encrypted.v1'?()=>secret({kind:'open'}):undefined);live();try{source=await readVaultNoteSource(clear);live();}finally{clear.fill(0);}}
   if(source.id!==envelope.header.id||source.owner.keyId!==envelope.header.owner.keyId||source.owner.receizId!==envelope.header.owner.receizId)throw Error('VAULT_OWNER_MISMATCH');
   if(!held)projection=await admitVaultNoteSource(source,ports);live();
  }catch(error){sessionKey?.fill(0);throw error;}
  // The store performs the single atomic expected-digest check on write. A
  // held source is not loaded or rehashed again before its accepted append.
  async function save(next:VaultNoteSource){live();if(next===source)return;const admitted=await admitVaultNoteSource(next,ports);live();const bytes=encodeVaultNoteSource(next);let carrier:VaultCarrier;
   try{if(envelope.schema==='bank.vault.image-custody.v1')carrier=createImageVault(bytes,envelope.header);else{const key=await secret({kind:'save',sourceDigest:await vaultDigest(bytes)});try{carrier=await encryptVaultBytes(bytes,envelope.header,key);}finally{key.fill(0);}}}finally{bytes.fill(0);}
   live();const saved=await store.save(next.owner.keyId,next.name,carrier,digest);live();envelope=carrier;digest=saved.digest;source=next;projection=admitted;image=undefined;
  }
  async function mutation<T>(work:()=>Promise<T>){live();if(held?.readOnly)throw Error('VAULT_READ_ONLY');return exclusive(`bank-note-vault:${source.owner.keyId}:${source.id}`,()=>{live();return work();});}
  async function appendNote(bytes:Uint8Array,filename:string){const next=await appendVaultNote(source,{bytes:bytes.slice(),filename});live();await save(next);}
  const session:NoteVaultSession={
   async snapshot(){live();return{id:source.id,name:source.name,ownerReceizId:source.owner.receizId,protection:envelope.schema==='bank.vault.encrypted.v1'?'passkey':'image',readOnly:held?.readOnly===true,money:projection.notes.map(({digest:sourceRef,filename:_filename,...note})=>({...note,sourceRef})),originals:projection.originals.map(original=>({id:original.digest,title:original.title,filename:original.filename,mimeType:'application/octet-stream'}))};},
   addNote:(bytes,filename='note.png')=>{const exact=bytes.slice();return mutation(()=>appendNote(exact,filename));},
   addOriginal:(bytes,filename)=>{const exact=bytes.slice();return mutation(async()=>{const next=await appendVaultOriginal(source,{bytes:exact,filename});await save(next);});},
   async exportPrivate(){live();if(image)return{...image,bytes:image.bytes.slice()};if(!exporting||exporting.head!==digest){const captured=envelope,head=digest,details={name:source.name,holdings:source.originals.sources.length+projection.notes.length},pending={head,promise:undefined as unknown as Promise<VaultImage>};pending.promise=(async()=>{const sealed=await exportNoteVaultPrivateImage(captured,{...details,kaiUPulse:await coordinate()},images);live();const result:VaultImage={bytes:sealed.bytes.slice(),filename:sealed.filename,mimeType:'image/png',digest:sealed.digest};if(digest===head)image=result;return result;})();exporting=pending;void pending.promise.finally(()=>{if(exporting===pending)exporting=undefined;}).catch(()=>{});}const result=await exporting.promise;live();return{...result,bytes:result.bytes.slice()};},
   exportRecovery:()=>mutation(async()=>{await approval(interaction,signal,'create',source.id,{kind:'export-recovery-original',name:source.name,protection:'image',privateCopy:true});const recovery=createImageVault(encodeVaultNoteSource(source),{id:source.id,owner:source.owner}),sealed=await exportNoteVaultPrivateImage(recovery,{name:source.name,kaiUPulse:await coordinate(),holdings:source.originals.sources.length+projection.notes.length},images);live();return{bytes:sealed.bytes.slice(),filename:`vault-${source.id}.recovery.private.png`,mimeType:'image/png',digest:sealed.digest};}),
   async exportOriginal(id){live();const row=source.originals.sources.find(row=>row.sha256===id);if(!row)throw Error('VAULT_NOTE_SOURCE_REQUIRED');return{bytes:vaultBytes(row.bytesB64u,32*1024*1024),filename:row.filename,mimeType:'application/octet-stream'};},
   async exportNote(noteId){live();const note=projection.notes.find(note=>note.noteId===noteId);if(!note)throw Error('VAULT_NOTE_SOURCE_REQUIRED');const row=source.notes.find(row=>row.sha256===note.digest)!;return{bytes:vaultBytes(row.bytesB64u,32*1024*1024),filename:row.filename,mimeType:'image/png'};},
   lock(){if(closed)return;closed=true;sessionKey?.fill(0);sessionKey=undefined;source=undefined as unknown as VaultNoteSource;projection=undefined as unknown as VaultNoteAdmission;image=undefined;sessions.delete(session);signal.removeEventListener('abort',session.lock);},
  };
  sessions.add(session);signal.addEventListener('abort',session.lock,{once:true});return session;
 }
 const manager:NoteVaultManager={
  async list(){alive();return options.owner?store.list(options.owner.keyId):[];},
  async create(input,interaction){const signal=caller(interaction);if(!options.owner)throw Error('VAULT_OWNER_REQUIRED');const id=crypto.randomUUID(),name=input.name.trim(),protection=input.protection??'image';if(!['image','passkey'].includes(protection))throw Error('VAULT_PROTECTION_REQUIRED');const source=createVaultNoteSource({id,name,owner:options.owner});await approval(interaction,signal,'create',id,{name,protection});
   const bytes=encodeVaultNoteSource(source);let carrier:VaultCarrier,key:Uint8Array|undefined;
   try{if(protection==='image')carrier=createImageVault(bytes,{id,owner:options.owner});else{const header=createVaultHeader({purpose:'vault-private',id,owner:options.owner,credential:await(options.register??registerVaultCredential)(options.owner,signal)}),p=await(options.presence??requestVaultPresence)(header,{kind:'create',vaultId:id},signal);try{key=p.secret.slice();carrier=await encryptVaultBytes(bytes,header,p.secret);const reopened=await decryptVaultBytes(carrier,p.secret);try{if(reopened.length!==bytes.length||reopened.some((value,index)=>value!==bytes[index]))throw Error('VAULT_SOURCE_CHANGED');}finally{reopened.fill(0);}}finally{p.secret.fill(0);}}}catch(error){key?.fill(0);throw error;}finally{bytes.fill(0);}
   try{signal.throwIfAborted();const stored=await store.save(options.owner.keyId,name,carrier,null);signal.throwIfAborted();return await openCarrier(carrier,{...interaction,signal},stored.digest,undefined,{source,projection:await admitVaultNoteSource(source,sourcePorts),key});}finally{key?.fill(0);}
  },
  async open(id,interaction){const signal=caller(interaction);if(!options.owner)throw Error('VAULT_OWNER_REQUIRED');const saved=await store.load(options.owner.keyId,id);if(!saved)throw Error('VAULT_ORIGINAL_REQUIRED');return openCarrier(saved.envelope,{...interaction,signal},saved.summary.digest);},
  async importPrivate(input,interaction){const signal=caller(interaction),exact=input.slice(),opened=await openVaultImage(exact,images.verify);signal.throwIfAborted();if(opened.kind!=='note-private')throw Error('VAULT_NOTE_FORMAT_REQUIRED');const value=opened.value as VaultCarrier;
   let key:Uint8Array|undefined;
   try{const sourceBytes=await openVaultCarrier(value,value.schema==='bank.vault.encrypted.v1'?async()=>{const p=await(options.presence??requestVaultPresence)(value.header,{kind:'import'},signal);key=p.secret.slice();return p.secret;}:undefined);let parsed:VaultNoteSource,admitted:VaultNoteAdmission;
    try{parsed=await readVaultNoteSource(sourceBytes);admitted=await admitVaultNoteSource(parsed,{...sourcePorts,assertOpen:()=>signal.throwIfAborted()});}finally{sourceBytes.fill(0);}
    signal.throwIfAborted();if(parsed.id!==value.header.id||parsed.owner.keyId!==value.header.owner.keyId||parsed.owner.receizId!==value.header.owner.receizId)throw Error('VAULT_OWNER_MISMATCH');const prior=await store.load(parsed.owner.keyId,parsed.id),expected=await vaultDigest(new TextEncoder().encode(vaultCanonical(value)));signal.throwIfAborted();
    // A selected recovery or older copy can always be read independently. It
    // never replaces the device's distinct current carrier or gains append rights.
    const readOnly=!!prior&&prior.summary.digest!==expected;
    const digest=readOnly?expected:(prior?.summary??await store.save(parsed.owner.keyId,parsed.name,value,null)).digest;return await openCarrier(value,{...interaction,signal},digest,{bytes:exact,filename:`vault-${parsed.id}.private.png`,mimeType:'image/png',digest:await vaultDigest(exact)},{source:parsed,projection:admitted,key,readOnly});
   }finally{key?.fill(0);}
  },
  dispose(){if(lifetime.signal.aborted)return;lifetime.abort(Error('VAULT_CLOSED'));options.signal?.removeEventListener('abort',manager.dispose);if(typeof window!=='undefined')window.removeEventListener('pagehide',suspend);},
 };
 if(options.signal?.aborted)lifetime.abort(options.signal.reason);else options.signal?.addEventListener('abort',manager.dispose,{once:true});if(typeof window!=='undefined')window.addEventListener('pagehide',suspend);
 return Object.freeze(manager);
}
export async function openNoteVaultPrivateOriginal(bytes:Uint8Array,interaction:VaultInteraction,options:NoteVaultManagerOptions={}):Promise<NoteVaultSession>{const manager=createNoteVaultManager(options);try{const session=await manager.importPrivate(bytes,interaction),lock=session.lock;session.lock=()=>{try{lock();}finally{manager.dispose();}};return session;}catch(error){manager.dispose();throw error;}}
