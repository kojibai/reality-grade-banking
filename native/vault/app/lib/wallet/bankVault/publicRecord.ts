import {receizBase64UrlEncode,verifyReceizIdentityPublicKeyProjectionSignature,type ReceizIdentityLoginProof} from '../../../../packages/receiz-sdk/src/identity';
import type {ReceizSignatureV4RootPublicKey} from '../../../../packages/receiz-sdk/src/verifier/signatureV4';
import {custodyBytes,custodyExact,custodyHex} from './custody';
import {sha256Hex} from '../../../utils/sha256';
import {verifyVaultCustodyWitness} from './custodyWitness';
import {verifyVaultAssetPublicWitness} from './assetSource';
import {verifyVaultMoneyPublicWitness} from './moneyPublic';
import {readNativeMarketSharePublicWitness} from '../../market/nativeMarketShare';
export type VaultPublicHolding=Readonly<{kind:'money'|'asset'|'investment';source:unknown}>;
export type VaultPublicRecordCore=Readonly<{schema:'receiz.bank.vault-public-record.v1';applicationId:string;vaultId:string;name:string;kaiUPulse:string;custodyWitness:unknown;holdings:readonly VaultPublicHolding[]}>;
export type VaultPublicRecord=VaultPublicRecordCore&Readonly<{holderProof:ReceizIdentityLoginProof}>;
function fail():never{throw Error('VAULT_PUBLIC_RECORD_INVALID');}
export function inspectVaultPublicRecordCore(input:unknown):VaultPublicRecordCore{
 if(!custodyExact(input,['schema','applicationId','vaultId','name','kaiUPulse','custodyWitness','holdings'])||input.schema!=='receiz.bank.vault-public-record.v1'||typeof input.applicationId!=='string'||!/^rc_[A-Za-z0-9_-]{1,128}$/u.test(input.applicationId)||typeof input.vaultId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iu.test(input.vaultId)||typeof input.name!=='string'||!input.name.trim()||input.name.length>80||/[\x00-\x1f\x7f]/u.test(input.name)||typeof input.kaiUPulse!=='string'||!/^[1-9][0-9]{0,29}$/u.test(input.kaiUPulse)||!Array.isArray(input.holdings)||input.holdings.length>128||custodyBytes(input).length>8*1024*1024)fail();
 for(const row of input.holdings)if(!custodyExact(row,['kind','source'])||!['money','asset','investment'].includes(String(row.kind)))fail();return structuredClone(input) as unknown as VaultPublicRecordCore;
}
export async function vaultPublicRecordChallenge(input:unknown){const p=inspectVaultPublicRecordCore(input);return receizBase64UrlEncode(custodyBytes({schema:'receiz.bank.vault-public-consent.v1',vaultId:p.vaultId,applicationId:p.applicationId,recordSha256:await sha256Hex(custodyBytes(p))}));}
/** Dedicated public disclosure only. Every decoded native payload has its own
 * closed public schema, so base64 cannot smuggle private originals/openings. */
export async function verifyVaultPublicRecord(input:unknown,options:Readonly<{roots:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>}>){
 if(!custodyExact(input,['schema','applicationId','vaultId','name','kaiUPulse','custodyWitness','holdings','holderProof']))fail();const {holderProof,...raw}=input,p=inspectVaultPublicRecordCore(raw),{witness:c}=await verifyVaultCustodyWitness(p.custodyWitness,options);
 if(c.vaultId!==p.vaultId||c.applicationId!==p.applicationId||BigInt(c.issuedAtKaiUPulse)>BigInt(p.kaiUPulse))fail();const ids=new Set<string>(),witnesses:unknown[]=[];
 function seen(kind:string,id:string){if(!id||ids.has(kind+':'+id))fail();ids.add(kind+':'+id);}
 function same(v:Record<string,unknown>,at:unknown){if(v.vaultId!==c.vaultId||v.applicationId!==c.applicationId||v.accountId!==c.accountId||v.keyId!==c.keyId||v.ownerReceizId!==c.ownerReceizId||typeof at!=='string'||!/^[0-9]{1,40}$/u.test(at)||BigInt(at)>BigInt(p.kaiUPulse))fail();}
 for(const row of p.holdings){
  if(row.kind==='money'){const {witness:w}=await verifyVaultMoneyPublicWitness(row.source,options);same(w,w.kaiUPulse);if(!Array.isArray(w.notes))fail();for(const n of w.notes){if(!n||typeof n!=='object')fail();seen('money',String(n.noteId));}if(w.nativeMoney!==null){if(!w.nativeMoney||typeof w.nativeMoney!=='object')fail();seen('money-native',String((w.nativeMoney as Record<string,unknown>).sourceSha256));}witnesses.push(w);}
  else if(row.kind==='asset'){const {witness:w}=await verifyVaultAssetPublicWitness(row.source,options);same(w as unknown as Record<string,unknown>,w.issuedAtKaiUPulse);seen('asset',w.asset.id);witnesses.push(w);}
  else{const w=await readNativeMarketSharePublicWitness(row.source,options);if(w.holderAccountId!==c.accountId||BigInt(w.recordedAtKaiUPulse)>BigInt(p.kaiUPulse)||w.holdings.some(h=>h.accountId!==c.accountId||h.ownerReceizId!==c.ownerReceizId))fail();seen('investment',w.lotId);witnesses.push(w);}
 }
 if(!custodyExact(holderProof,['schema','keyId','alg','challengeB64Url','signatureB64Url'])||holderProof.schema!=='receiz.identity.login_proof.v1'||holderProof.keyId!==c.keyId||holderProof.alg!==c.alg||holderProof.challengeB64Url!==await vaultPublicRecordChallenge(p)||typeof holderProof.signatureB64Url!=='string'||!await verifyReceizIdentityPublicKeyProjectionSignature({keyId:c.keyId,alg:c.alg,publicKeyRawB64u:c.publicKeyRawB64u,challengeB64Url:holderProof.challengeB64Url,signatureB64Url:holderProof.signatureB64Url}))fail();
 const record={...p,holderProof:structuredClone(holderProof)} as VaultPublicRecord,recordSha256=await sha256Hex(custodyBytes(record));if(!custodyHex(recordSha256))fail();return {record,recordSha256,custody:c,witnesses,grantsAccess:false as const,currentUnspentness:false as const};
}
