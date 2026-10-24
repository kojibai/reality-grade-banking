import {verifyReceizIdentityPublicKeyProjectionSignature,type ReceizIdentityLoginProof} from '@receiz/sdk';
import {vaultBase64,vaultCanonical,vaultDigest,vaultObject} from './encoding';

export type VaultPublicKind='money'|'asset'|'investment';
export type VaultPublicCustody={vaultId:string;applicationId:string;ownerReceizId:string;ownerAccountId:string;custodyAccountId:string;keyId:string;alg:'Ed25519'|'P-256';publicKeyRawB64u:string};
export type VaultPublicHolding={kind:VaultPublicKind;id:string;title:string;quantityMicro?:string;amountUsdCents?:string;amountPhiMicro?:string;sourceHead:string;atKaiUPulse:string};
export type VaultPublicPayload={schema:'receiz.bank.vault-public-record.v1';applicationId:string;vaultId:string;name:string;kaiUPulse:string;custodyWitness:unknown;holdings:{kind:VaultPublicKind;source:unknown}[]};
export type VaultPublicRecord=VaultPublicPayload&{holderProof:ReceizIdentityLoginProof};
export type VaultPublicNative={custody(source:unknown):Promise<VaultPublicCustody>;holding(kind:VaultPublicKind,source:unknown,custody:VaultPublicCustody):Promise<VaultPublicHolding>};
const bytes=(value:unknown)=>new TextEncoder().encode(vaultCanonical(value));
const hash=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
function noPrivate(value:unknown,depth=0):void{
 if(depth>40)throw Error('VAULT_PUBLIC_FORMAT_INVALID');
 if(!value||typeof value!=='object')return;
 for(const [key,v]of Object.entries(value)){
  if(['privateAccountOpening','keyFile','keyFileText','privateKeyPkcs8B64u','privateKeyRawB64u','passphrase','phrase','ciphertext','access_token','refresh_token','accessToken','refreshToken','identityOriginal','noteIdentityBytes','noteIdentityRef'].includes(key))throw Error('VAULT_PRIVATE_SOURCE_REFUSED');
  if(key==='schema'&&typeof v==='string'&&/vault\.(?:encrypted|private|identity-original)|vault-private|custody-source/.test(v))throw Error('VAULT_PRIVATE_SOURCE_REFUSED');
  noPrivate(v,depth+1);
 }
}
function payload(input:unknown):VaultPublicPayload{
 const text=vaultCanonical(input);if(bytes(input).length>8*1024*1024)throw Error('VAULT_PUBLIC_CAPACITY');
 const v=vaultObject(JSON.parse(text),['schema','applicationId','vaultId','name','kaiUPulse','custodyWitness','holdings']);noPrivate(v);
 if(v.schema!=='receiz.bank.vault-public-record.v1'||typeof v.applicationId!=='string'||!/^rc_[A-Za-z0-9_-]{1,128}$/.test(v.applicationId)||typeof v.vaultId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v.vaultId)||typeof v.name!=='string'||!v.name.trim()||v.name.length>80||/[\u0000-\u001f\u007f]/.test(v.name)||typeof v.kaiUPulse!=='string'||!/^[1-9]\d{0,29}$/.test(v.kaiUPulse)||!Array.isArray(v.holdings)||v.holdings.length>128)throw Error('VAULT_PUBLIC_FORMAT_INVALID');
 for(const item of v.holdings){const row=vaultObject(item,['kind','source']);if(!['money','asset','investment'].includes(String(row.kind)))throw Error('VAULT_PUBLIC_FORMAT_INVALID');}
 return v as VaultPublicPayload;
}
export async function vaultPublicChallenge(input:VaultPublicPayload):Promise<string>{
 const p=payload(input);return vaultBase64(bytes({schema:'receiz.bank.vault-public-consent.v1',vaultId:p.vaultId,applicationId:p.applicationId,recordSha256:await vaultDigest(bytes(p))}));
}
async function projection(p:VaultPublicPayload,native:VaultPublicNative){
 const custody=await native.custody(p.custodyWitness);
 if(custody.vaultId!==p.vaultId||custody.applicationId!==p.applicationId||!hash(custody.keyId))throw Error('VAULT_PUBLIC_CUSTODY_MISMATCH');
 const ids=new Set<string>(),holdings:VaultPublicHolding[]=[];
 for(const row of p.holdings){
  const held=await native.holding(row.kind,row.source,custody),id=row.kind+':'+held.id;
  if(held.kind!==row.kind||typeof held.id!=='string'||!held.id||typeof held.title!=='string'||!held.title||!hash(held.sourceHead)||!/^\d{1,30}$/.test(held.atKaiUPulse)||BigInt(held.atKaiUPulse)>BigInt(p.kaiUPulse))throw Error('VAULT_PUBLIC_COORDINATE_MISMATCH');
  if(ids.has(id))throw Error('VAULT_PUBLIC_DUPLICATE');ids.add(id);holdings.push(structuredClone(held));
 }
 return{custody,holdings};
}
/** A public record is a dedicated signed disclosure. It contains only native
 * public witnesses. It has no private opening, decryption key, reusable access
 * grant, current-unspentness claim or financial execution interface. */
export async function inspectVaultPublicRecord(input:unknown,native:VaultPublicNative){
 const v=vaultObject(input,['schema','applicationId','vaultId','name','kaiUPulse','custodyWitness','holdings','holderProof']),{holderProof,...raw}=v,p=payload(raw),proof=vaultObject(holderProof,['schema','keyId','alg','challengeB64Url','signatureB64Url']);
 const {custody,holdings}=await projection(p,native),challenge=await vaultPublicChallenge(p);
 if(proof.schema!=='receiz.identity.login_proof.v1'||proof.keyId!==custody.keyId||proof.alg!==custody.alg||proof.challengeB64Url!==challenge||typeof proof.signatureB64Url!=='string'||!await verifyReceizIdentityPublicKeyProjectionSignature({keyId:custody.keyId,alg:custody.alg,publicKeyRawB64u:custody.publicKeyRawB64u,challengeB64Url:challenge,signatureB64Url:proof.signatureB64Url}))throw Error('VAULT_PUBLIC_HOLDER_INVALID');
 const record={...p,holderProof:structuredClone(holderProof)} as VaultPublicRecord;
 return Object.freeze({record,recordSha256:await vaultDigest(bytes(record)),vaultId:p.vaultId,name:p.name,ownerReceizId:custody.ownerReceizId,holdings,sealedAtKaiUPulse:p.kaiUPulse,grantsAccess:false as const,currentUnspentness:false as const});
}
export async function createVaultPublicRecord(input:VaultPublicPayload,native:VaultPublicNative,sign:(challengeB64Url:string)=>Promise<ReceizIdentityLoginProof>):Promise<VaultPublicRecord>{
 const p=payload(input);await projection(p,native);const proof=await sign(await vaultPublicChallenge(p));
 return(await inspectVaultPublicRecord({...p,holderProof:proof},native)).record;
}
