import {readVaultJournal,type VaultJournal} from './journal';
import {vaultBytes,vaultCanonical,vaultDigest,vaultObject} from './encoding';

export type VaultSourceBlock={sha256:string;exactBytesB64u:string};
export type VaultPrivateSource={
 schema:'bank.vault.private-source.v1';vaultId:string;name:string;
 owner:{accountId:string;keyId:string;receizId:string};
 custody:{accountId:string;keyId:string;keyFileText:string;passphrase:string;submissionRef:string;sourceRef:string|null};
 journal:VaultJournal;workflows:{money:unknown;assets:unknown;market:unknown};blocks:VaultSourceBlock[];
};
export type VaultAdmittedCustody={vaultId:string;ownerAccountId:string;ownerKeyId:string;ownerReceizId:string;custodyAccountId:string;custodyKeyId:string};
export type VaultSourceAdmission<T>={
 custody(bytes:Uint8Array):Promise<VaultAdmittedCustody>;
 key(text:string,phrase:string):Promise<{keyId:string;accountId:string}>;
 workflows(source:VaultPrivateSource,original:(ref:string)=>Uint8Array):Promise<T>;
};
const encoder=new TextEncoder(),MAX=32*1024*1024;
const hash=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
function rejectAccess(value:unknown,depth=0):void{
 if(depth>48)throw Error('VAULT_FORMAT_INVALID');
 if(!value||typeof value!=='object')return;
 for(const [key,item]of Object.entries(value)){
  if(['access_token','refresh_token','accessToken','refreshToken','bearerToken','sessionToken'].includes(key))throw Error('VAULT_EPHEMERAL_ACCESS');
  rejectAccess(item,depth+1);
 }
}
export function encodeVaultPrivateSource(source:VaultPrivateSource):Uint8Array{
 const bytes=encoder.encode(vaultCanonical(source));if(!bytes.length||bytes.length>MAX)throw Error('VAULT_ORIGINAL_CAPACITY');return bytes;
}
/** Closed private transport. Parsing and content addressing establish exact
 * retention only. Actual identity, custody and money/ownership admissions below
 * are required before any contained source is presented as held value. */
export async function readVaultPrivateSource(input:Uint8Array):Promise<VaultPrivateSource>{
 if(!(input instanceof Uint8Array)||!input.length||input.length>MAX)throw Error('VAULT_ORIGINAL_CAPACITY');
 const captured=new Uint8Array(input),v=vaultObject(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(captured)),['schema','vaultId','name','owner','custody','journal','workflows','blocks']);
 rejectAccess(v);
 const owner=vaultObject(v.owner,['accountId','keyId','receizId']),custody=vaultObject(v.custody,['accountId','keyId','keyFileText','passphrase','submissionRef','sourceRef']),workflows=vaultObject(v.workflows,['money','assets','market']),journal=readVaultJournal(v.journal);
 if(v.schema!=='bank.vault.private-source.v1'||!uuid(v.vaultId)||typeof v.name!=='string'||!v.name.trim()||v.name.length>80||/[\u0000-\u001f\u007f]/.test(v.name)||!uuid(owner.accountId)||!hash(owner.keyId)||typeof owner.receizId!=='string'||!/^[-A-Za-z0-9_.@]{1,180}$/.test(owner.receizId)||!uuid(custody.accountId)||custody.accountId===owner.accountId||!hash(custody.keyId)||custody.keyId===owner.keyId||typeof custody.keyFileText!=='string'||!custody.keyFileText.length||custody.keyFileText.length>2*1024*1024||typeof custody.passphrase!=='string'||custody.passphrase.length>4096||!hash(custody.submissionRef)||custody.sourceRef!==null&&!hash(custody.sourceRef)||journal.vaultId!==v.vaultId||journal.ownerKeyId!==owner.keyId||!Array.isArray(v.blocks)||v.blocks.length>4096)throw Error('VAULT_FORMAT_INVALID');
 const seen=new Set<string>(),blocks:VaultSourceBlock[]=[];
 for(const raw of v.blocks){
  const block=vaultObject(raw,['sha256','exactBytesB64u']);if(!hash(block.sha256))throw Error('VAULT_FORMAT_INVALID');
  if(seen.has(block.sha256))throw Error('VAULT_SOURCE_DUPLICATE');seen.add(block.sha256);
  const bytes=vaultBytes(block.exactBytesB64u,23*1024*1024);if(await vaultDigest(bytes)!==block.sha256)throw Error('VAULT_SOURCE_CHANGED');
  blocks.push({sha256:block.sha256,exactBytesB64u:block.exactBytesB64u as string});
 }
 for(const ref of [custody.submissionRef,custody.sourceRef,...journal.entries.flatMap(e=>[e.requestRef,e.outcomeRef])])if(ref!==null&&!seen.has(ref as string))throw Error('VAULT_SOURCE_REQUIRED');
 if(custody.sourceRef===null&&Object.values(workflows).some(v=>v!==null))throw Error('VAULT_CUSTODY_REQUIRED');
 return{schema:v.schema,vaultId:v.vaultId,name:v.name,owner:owner as VaultPrivateSource['owner'],custody:custody as VaultPrivateSource['custody'],journal,workflows,blocks} as VaultPrivateSource;
}
/** Source admission is deliberately independent of encryption and file artwork.
 * A decryptable file, saved journal or self-hash cannot create financial title. */
export async function admitVaultPrivateSource<T>(value:VaultPrivateSource,ports:VaultSourceAdmission<T>):Promise<{source:VaultPrivateSource;projection:T}>{
 const source=await readVaultPrivateSource(encodeVaultPrivateSource(value));
 const originals=new Map(source.blocks.map(b=>[b.sha256,b.exactBytesB64u]));
 const original=(ref:string)=>{const bytes=originals.get(ref);if(!bytes)throw Error('VAULT_SOURCE_REQUIRED');return vaultBytes(bytes,23*1024*1024);};
 if(!source.custody.sourceRef)throw Error('VAULT_CUSTODY_REQUIRED');
 const custody=await ports.custody(original(source.custody.sourceRef));
 if(custody.vaultId!==source.vaultId||custody.ownerAccountId!==source.owner.accountId||custody.ownerKeyId!==source.owner.keyId||custody.ownerReceizId!==source.owner.receizId||custody.custodyAccountId!==source.custody.accountId||custody.custodyKeyId!==source.custody.keyId)throw Error('VAULT_CUSTODY_MISMATCH');
 const key=await ports.key(source.custody.keyFileText,source.custody.passphrase);
 if(key.keyId!==source.custody.keyId||key.accountId!==source.custody.accountId)throw Error('VAULT_CUSTODY_MISMATCH');
 return{source,projection:await ports.workflows(source,original)};
}
