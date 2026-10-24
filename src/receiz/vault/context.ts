import {decryptVaultBytes,encryptVaultBytes} from './encryption';
import {createImageVault,readVaultCarrier,type VaultCarrier} from './carrier';
import {encodeVaultPrivateSource,readVaultPrivateSource,type VaultPrivateSource} from './source';
import {vaultBase64,vaultBytes,vaultCanonical,vaultDigest} from './encoding';

type Workflow=keyof VaultPrivateSource['workflows'];
const bytes=(value:unknown)=>new TextEncoder().encode(vaultCanonical(value));
/** One explicit unlocked lifetime. No key/grant enters ordinary account stores.
 * All writes contain the complete selected private carrier and use durable CAS.
 * Native controllers remain responsible for financial admission and once-only
 * execution; this context only provides protected exact-original retention. */
export function createVaultContext<T>(ports:{
 envelope:VaultCarrier;expectedDigest:string;
 presence?(action:unknown,signal:AbortSignal):Promise<Uint8Array>;
 admit(source:VaultPrivateSource):Promise<T>;
 persist(envelope:VaultCarrier,expectedDigest:string):Promise<string>;
}){
 let envelope=readVaultCarrier(ports.envelope),digest=ports.expectedDigest,source:VaultPrivateSource|null=null,projection:T|null=null,secret:Uint8Array|null=null,opening:Promise<T>|null=null,backupDigest:string|null=null;
 const lifetime=new AbortController();let queue=Promise.resolve();
 function assertOpen(){if(lifetime.signal.aborted)throw Error('VAULT_CLOSED');if(!source||envelope.schema==='bank.vault.encrypted.v1'&&!secret)throw Error('VAULT_LOCKED');}
 function assertLive(){if(lifetime.signal.aborted)throw Error('VAULT_CLOSED');}
 async function serial<R>(work:()=>Promise<R>):Promise<R>{const previous=queue;let release!:()=>void;queue=new Promise(resolve=>{release=resolve;});await previous;try{assertOpen();return await work();}finally{release();}}
 async function retain(next:VaultPrivateSource){
  assertOpen();const encoded=encodeVaultPrivateSource(next),captured=await readVaultPrivateSource(encoded);assertOpen();
  let sealed:VaultCarrier;try{sealed=envelope.schema==='bank.vault.image-custody.v1'?createImageVault(encoded,envelope.header):await encryptVaultBytes(encoded,envelope.header,secret!);}finally{encoded.fill(0);}
  assertOpen();const nextDigest=await vaultDigest(bytes(sealed));assertOpen();const saved=await ports.persist(sealed,digest);assertOpen();
  if(saved!==nextDigest)throw Error('VAULT_STORAGE_CONFLICT');
  source=captured;envelope=sealed;digest=saved;backupDigest=null;
 }
 const api={
  signal:lifetime.signal,assertOpen,
  async open():Promise<T>{
   assertLive();if(source)return projection!;if(opening)return opening;
   opening=(async()=>{
    if(envelope.header.purpose!=='vault-private'||await vaultDigest(bytes(envelope))!==digest)throw Error('VAULT_STORAGE_CONFLICT');
    assertLive();
    if(envelope.schema==='bank.vault.encrypted.v1'&&!ports.presence)throw Error('VAULT_PROTECTION_REQUIRED');
    const supplied=envelope.schema==='bank.vault.encrypted.v1'?await ports.presence!({kind:'open',vaultId:envelope.header.id,originalDigest:digest},lifetime.signal):null;
    try{
     assertLive();if(envelope.schema==='bank.vault.encrypted.v1'&&(!(supplied instanceof Uint8Array)||supplied.length!==32))throw Error('VAULT_PRESENCE_SECRET_REQUIRED');
     const clear=envelope.schema==='bank.vault.image-custody.v1'?vaultBytes(envelope.sourceB64u,32*1024*1024):await decryptVaultBytes(envelope,supplied!);let admitted:VaultPrivateSource;
     try{admitted=await readVaultPrivateSource(clear);}finally{clear.fill(0);}
     assertLive();if(admitted.vaultId!==envelope.header.id||admitted.owner.keyId!==envelope.header.owner.keyId||admitted.owner.receizId!==envelope.header.owner.receizId)throw Error('VAULT_OWNER_MISMATCH');
     const verified=await ports.admit(admitted);assertLive();secret=supplied?new Uint8Array(supplied):null;source=admitted;projection=verified;return verified;
    }finally{supplied?.fill(0);}
   })().finally(()=>{opening=null;});return opening;
  },
  snapshot(){assertOpen();return structuredClone(source!);},
  async read(workflow:Workflow){assertOpen();return structuredClone(source!.workflows[workflow]);},
  write:(workflow:Workflow,next:unknown,expected:unknown)=>serial(async()=>{
   if(vaultCanonical(source!.workflows[workflow])!==vaultCanonical(expected))throw Error('VAULT_STORAGE_CONFLICT');
   await retain({...source!,workflows:{...source!.workflows,[workflow]:structuredClone(next)}});
  }),
  writeJournal:(next:VaultPrivateSource['journal'],expected:VaultPrivateSource['journal'])=>serial(async()=>{
   if(vaultCanonical(source!.journal)!==vaultCanonical(expected))throw Error('VAULT_STORAGE_CONFLICT');
   await retain({...source!,journal:structuredClone(next)});
  }),
  retain:(input:Uint8Array)=>{
   const original=new Uint8Array(input);
   return serial(async()=>{try{
    const ref=await vaultDigest(original);assertOpen();const held=source!.blocks.find(b=>b.sha256===ref);
    if(held){if(vaultCanonical(vaultBytes(held.exactBytesB64u,23*1024*1024))!==vaultCanonical(original))throw Error('VAULT_SOURCE_CHANGED');return ref;}
    await retain({...source!,blocks:[...source!.blocks,{sha256:ref,exactBytesB64u:vaultBase64(original)}]});return ref;
   }finally{original.fill(0);}});
  },
  async restore(ref:string){assertOpen();const held=source!.blocks.find(b=>b.sha256===ref);if(!held)throw Error('VAULT_SOURCE_REQUIRED');return vaultBytes(held.exactBytesB64u,23*1024*1024);},
  exportPrivate(){assertOpen();return{bytes:bytes(envelope),filename:`vault-${envelope.header.id}.private-vault.json`,digest};},
  async reopenPrepared(input:Uint8Array){
   assertOpen();const selected=readVaultCarrier(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(input))));
   if(await vaultDigest(bytes(selected))!==digest)throw Error('VAULT_EXACT_ORIGINAL_REQUIRED');assertOpen();
   const clear=selected.schema==='bank.vault.image-custody.v1'?vaultBytes(selected.sourceB64u,32*1024*1024):await decryptVaultBytes(selected,secret!);
   try{const reopened=await readVaultPrivateSource(clear);assertOpen();if(vaultCanonical(reopened)!==vaultCanonical(source))throw Error('VAULT_EXACT_ORIGINAL_REQUIRED');backupDigest=digest;}
   finally{clear.fill(0);}
  },
  hasReopenedPrepared(){assertOpen();return backupDigest===digest;},
  async authorize(action:unknown){
   assertOpen();if(envelope.schema==='bank.vault.image-custody.v1')return;
   if(!ports.presence)throw Error('VAULT_PROTECTION_REQUIRED');
   const selectedDigest=digest,supplied=await ports.presence(action,lifetime.signal);
   try{assertOpen();if(selectedDigest!==digest)throw Error('VAULT_STORAGE_CONFLICT');const clear=await decryptVaultBytes(envelope,supplied);try{await readVaultPrivateSource(clear);assertOpen();if(selectedDigest!==digest)throw Error('VAULT_STORAGE_CONFLICT');}finally{clear.fill(0);}}
   finally{supplied.fill(0);}
  },
  lock(){if(!lifetime.signal.aborted)lifetime.abort();secret?.fill(0);secret=null;source=null;projection=null;backupDigest=null;},
 };
 return Object.freeze(api);
}
export type VaultContext=ReturnType<typeof createVaultContext>;
