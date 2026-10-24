import {vaultBase64,vaultBytes,vaultCanonical,vaultObject} from './encoding';

export type VaultCredential={id:string;publicKeySpki:string;rpId:string;origin:string};
export type VaultOwner={keyId:string;receizId:string};
export type VaultHeader={purpose:'vault-private'|'identity-recovery';id:string;owner:VaultOwner;credential:VaultCredential;prfSalt:string};
export type EncryptedVault={schema:'bank.vault.encrypted.v1';header:VaultHeader;iv:string;ciphertext:string};
const MAX=32*1024*1024;
const encoder=new TextEncoder();

export function readVaultCredential(input:unknown):VaultCredential{
 const c=vaultObject(input,['id','publicKeySpki','rpId','origin']);
 vaultBytes(c.id,1024);vaultBytes(c.publicKeySpki,512);
 if(typeof c.rpId!=='string'||typeof c.origin!=='string')throw Error('VAULT_CREDENTIAL_INVALID');
 const origin=new URL(c.origin);
 const local=['localhost','127.0.0.1','[::1]'].includes(origin.hostname);
 if(origin.origin!==c.origin||origin.protocol!=='https:'&&!(local&&origin.protocol==='http:')||origin.hostname!==c.rpId&&!origin.hostname.endsWith('.'+c.rpId)||c.rpId.length<3||!/^[a-z0-9.:[\]-]+$/.test(c.rpId))throw Error('VAULT_CREDENTIAL_INVALID');
 return {id:c.id as string,publicKeySpki:c.publicKeySpki as string,rpId:c.rpId,origin:c.origin};
}
export function readVaultHeader(input:unknown):VaultHeader{
 const h=vaultObject(input,['purpose','id','owner','credential','prfSalt']),owner=vaultObject(h.owner,['keyId','receizId']);
 if(!['vault-private','identity-recovery'].includes(String(h.purpose))||typeof h.id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(h.id)||typeof owner.keyId!=='string'||!owner.keyId.length||owner.keyId.length>160||typeof owner.receizId!=='string'||!/^[-A-Za-z0-9_.@]{1,180}$/.test(owner.receizId)||vaultBytes(h.prfSalt,32).length!==32)throw Error('VAULT_HEADER_INVALID');
 return{purpose:h.purpose as VaultHeader['purpose'],id:h.id,owner:{keyId:owner.keyId,receizId:owner.receizId},credential:readVaultCredential(h.credential),prfSalt:h.prfSalt as string};
}
export function createVaultHeader(input:Omit<VaultHeader,'prfSalt'>):VaultHeader{return readVaultHeader({...input,prfSalt:vaultBase64(crypto.getRandomValues(new Uint8Array(32)))});}
export function readEncryptedVault(value:unknown):EncryptedVault{
 const v=vaultObject(value,['schema','header','iv','ciphertext']);
 if(v.schema!=='bank.vault.encrypted.v1'||vaultBytes(v.iv,12).length!==12||vaultBytes(v.ciphertext,MAX+16).length<17)throw Error('VAULT_FORMAT_INVALID');
 return{schema:v.schema,header:readVaultHeader(v.header),iv:v.iv as string,ciphertext:v.ciphertext as string};
}
async function encryptionKey(header:VaultHeader,secret:Uint8Array){
 if(!(secret instanceof Uint8Array)||secret.length!==32)throw Error('VAULT_PRESENCE_SECRET_REQUIRED');
 const material=await crypto.subtle.importKey('raw',new Uint8Array(secret),'HKDF',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:vaultBytes(header.prfSalt,32),info:encoder.encode('bank.vault.encrypted.v1\0'+vaultCanonical(header))},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
/** Private carrier encryption only. Financial authority is independently
 * admitted from the original contained sources after decryption. */
export async function encryptVaultBytes(input:Uint8Array,metadata:VaultHeader,prfSecret:Uint8Array):Promise<EncryptedVault>{
 if(!(input instanceof Uint8Array)||!input.length||input.length>MAX)throw Error('VAULT_ORIGINAL_CAPACITY');
 const header=readVaultHeader(metadata),iv=crypto.getRandomValues(new Uint8Array(12)),key=await encryptionKey(header,prfSecret);
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(vaultCanonical(header)),tagLength:128},key,new Uint8Array(input));
 return{schema:'bank.vault.encrypted.v1',header,iv:vaultBase64(iv),ciphertext:vaultBase64(new Uint8Array(ciphertext))};
}
export async function decryptVaultBytes(value:unknown,prfSecret:Uint8Array):Promise<Uint8Array<ArrayBuffer>>{
 const v=readEncryptedVault(value),key=await encryptionKey(v.header,prfSecret);
 try{return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:vaultBytes(v.iv,12),additionalData:encoder.encode(vaultCanonical(v.header)),tagLength:128},key,vaultBytes(v.ciphertext,MAX+16)));}
 catch{throw Error('VAULT_UNLOCK_FAILED');}
}
