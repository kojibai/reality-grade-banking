import {decryptVaultBytes,readEncryptedVault,type EncryptedVault} from './encryption';
import {vaultBase64,vaultBytes,vaultObject} from './encoding';

export type ImageVault={schema:'bank.vault.image-custody.v1';header:{purpose:'vault-private';id:string;owner:{keyId:string;receizId:string}};sourceB64u:string};
export type VaultCarrier=EncryptedVault|ImageVault;
/** Explicit bearer custody, selected by the owner. This is a PRIVATE original,
 * not encrypted protection: possession grants its isolated Vault authority.
 * Shared public records are a separate type and are never accepted here. */
export function createImageVault(source:Uint8Array,input:{id:string;owner:{keyId:string;receizId:string}}):ImageVault{
 const value={schema:'bank.vault.image-custody.v1',header:{purpose:'vault-private',id:input.id,owner:{...input.owner}},sourceB64u:vaultBase64(new Uint8Array(source))};
 return readVaultCarrier(value) as ImageVault;
}
export function readVaultCarrier(value:unknown):VaultCarrier{
 if((value as {schema?:unknown}|null)?.schema==='bank.vault.encrypted.v1')return readEncryptedVault(value);
 const v=vaultObject(value,['schema','header','sourceB64u']),h=vaultObject(v.header,['purpose','id','owner']),o=vaultObject(h.owner,['keyId','receizId']);
 if(v.schema!=='bank.vault.image-custody.v1'||h.purpose!=='vault-private'||typeof h.id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(h.id)||typeof o.keyId!=='string'||!o.keyId||o.keyId.length>160||typeof o.receizId!=='string'||!/^[-A-Za-z0-9_.@]{1,180}$/.test(o.receizId))throw Error('VAULT_FORMAT_INVALID');
 vaultBytes(v.sourceB64u,32*1024*1024);
 return{schema:'bank.vault.image-custody.v1',header:{purpose:'vault-private',id:h.id,owner:{keyId:o.keyId,receizId:o.receizId}},sourceB64u:v.sourceB64u as string};
}
export async function openVaultCarrier(value:unknown,unlock?:()=>Promise<Uint8Array>):Promise<Uint8Array>{
 const carrier=readVaultCarrier(value);
 if(carrier.schema==='bank.vault.image-custody.v1')return vaultBytes(carrier.sourceB64u,32*1024*1024);
 if(!unlock)throw Error('VAULT_PROTECTION_REQUIRED');
 const secret=await unlock();try{return await decryptVaultBytes(carrier,secret);}finally{secret.fill(0);}
}
