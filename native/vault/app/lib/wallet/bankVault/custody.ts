import {canonicalizeReceizV122} from '../../../../packages/receiz-sdk/src/v122Canonical';
import {receizBase64UrlEncode,deriveReceizIdentityKeyIdFromPublicKeyRawB64u,verifyReceizIdentityPublicKeyProjectionSignature,type ReceizIdentityLoginProof} from '../../../../packages/receiz-sdk/src/identity';
import {sha256Hex as sha256ReceizBytes} from "../../../utils/sha256";
export type VaultCustodyKey=Readonly<{keyId:string;alg:'Ed25519'|'P-256';publicKeyRawB64u:string}>;
export type VaultCustodyRequest=Readonly<{schema:'receiz.bank.vault-custody-create.v1';applicationId:string;vaultId:string;ownerUserId:string;ownerReceizId:string;parentSourceSha256:string;parent:VaultCustodyKey;custody:VaultCustodyKey&Readonly<{accountId:string;localUid:string}>;createdAt:string}>;
export type VaultCustodySubmission=Readonly<{request:VaultCustodyRequest;parentProof:ReceizIdentityLoginProof;childProof:ReceizIdentityLoginProof}>;
export type VaultCustodySource=Readonly<{schema:'receiz.bank.vault-custody-source.v1';submission:VaultCustodySubmission;receivingAddress:string;parent:Readonly<{accountId:string;baselineSourceSha256:string;headSourceSha256:string}>;child:Readonly<{accountId:string;baselineSourceSha256:string;headSourceSha256:string}>;sources:readonly Readonly<{sha256:string;exactBytesB64u:string}>[]}>;
export const custodyCanonical=canonicalizeReceizV122;
export const custodyBytes=(v:unknown)=>new TextEncoder().encode(custodyCanonical(v));
export const custodyHex=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/u.test(v);
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u.test(v);
export const custodyExact=(v:unknown,keys:readonly string[]):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
export function vaultCustodyChallenge(request:VaultCustodyRequest){return receizBase64UrlEncode(custodyBytes(request));}
export async function deriveVaultCustodyAccountId(ownerUserId:string,vaultId:string){
 const hash=await sha256ReceizBytes(custodyBytes({schema:'receiz.bank.vault-custody-account-id.v1',ownerUserId,vaultId}));
 return `${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-8${hash.slice(17,20)}-${hash.slice(20,32)}`;
}
export const vaultCustodyReceivingAddress=(accountId:string)=>`vault-${accountId}.receiz.id`;
export async function inspectVaultCustodySubmission(input:unknown):Promise<VaultCustodySubmission>{
 function fail():never{throw Error('VAULT_CUSTODY_REQUEST_INVALID');}
 if(!custodyExact(input,['request','parentProof','childProof']))fail();
 const r=input.request;
 if(!custodyExact(r,['schema','applicationId','vaultId','ownerUserId','ownerReceizId','parentSourceSha256','parent','custody','createdAt'])||r.schema!=='receiz.bank.vault-custody-create.v1'||typeof r.applicationId!=='string'||!/^rc_[A-Za-z0-9_-]{1,128}$/u.test(r.applicationId)||typeof r.vaultId!=='string'||!/^[A-Za-z0-9._:-]{8,120}$/u.test(r.vaultId)||!uuid(r.ownerUserId)||typeof r.ownerReceizId!=='string'||!/^[a-z0-9_]{3,24}\.receiz\.id$/u.test(r.ownerReceizId)||!custodyHex(r.parentSourceSha256)||typeof r.createdAt!=='string'||!Number.isFinite(Date.parse(r.createdAt)))fail();
 if(!custodyExact(r.parent,['keyId','alg','publicKeyRawB64u'])||!custodyExact(r.custody,['accountId','keyId','alg','publicKeyRawB64u','localUid'])||!uuid(r.custody.accountId)||r.custody.accountId===r.ownerUserId||typeof r.custody.localUid!=='string'||!/^[A-Za-z0-9._:-]{8,160}$/u.test(r.custody.localUid)||r.custody.accountId!==await deriveVaultCustodyAccountId(r.ownerUserId as string,r.vaultId as string))fail();
 for(const key of [r.parent,r.custody]){
  if(!custodyHex(key.keyId)||!['Ed25519','P-256'].includes(String(key.alg))||typeof key.publicKeyRawB64u!=='string'||await deriveReceizIdentityKeyIdFromPublicKeyRawB64u(key.publicKeyRawB64u,key.alg as 'Ed25519'|'P-256')!==key.keyId)fail();
 }
 if(r.parent.keyId===r.custody.keyId)throw Error('VAULT_CUSTODY_KEY_ALREADY_BOUND');
 const request=structuredClone(r) as unknown as VaultCustodyRequest,challenge=vaultCustodyChallenge(request);
 for(const [proof,key]of [[input.parentProof,request.parent],[input.childProof,request.custody]] as const){
  if(!custodyExact(proof,['schema','keyId','alg','challengeB64Url','signatureB64Url'])||proof.schema!=='receiz.identity.login_proof.v1'||proof.keyId!==key.keyId||proof.alg!==key.alg||proof.challengeB64Url!==challenge||typeof proof.signatureB64Url!=='string'||!await verifyReceizIdentityPublicKeyProjectionSignature({keyId:key.keyId,alg:key.alg,publicKeyRawB64u:key.publicKeyRawB64u,challengeB64Url:challenge,signatureB64Url:proof.signatureB64Url}))throw Error('VAULT_CUSTODY_PROOF_INVALID');
 }
 return structuredClone(input) as unknown as VaultCustodySubmission;
}
/** No private key or reusable grant is accepted by this transport. The caller
 * retains the exact signed request inside its encrypted prepared Vault first. */
export async function createVaultCustodyClient(input:Readonly<{endpoint:string;accessToken:()=>Promise<string>;fetch?:typeof fetch}>,submission:VaultCustodySubmission,signal?:AbortSignal):Promise<VaultCustodySource>{
 const captured=await inspectVaultCustodySubmission(submission),url=new URL(input.endpoint);url.searchParams.set('applicationId',captured.request.applicationId);
 const result=await(input.fetch??fetch)(url,{method:'POST',credentials:'omit',headers:{Authorization:`Bearer ${await input.accessToken()}`,'Content-Type':'application/json'},body:JSON.stringify({operation:'create',submission:captured}),signal});
 if(!result.ok)throw Error('VAULT_CUSTODY_OUTCOME_UNKNOWN');
 return result.json();
}

export const VAULT_CUSTODY_SCOPE='receiz:vault.custody';
export const VAULT_CHILD_SCOPES=['receiz:wallet.read','receiz:reserve.read','receiz:reserve.write','receiz:settlement.read','receiz:settlement.write','receiz:domains.read'] as const;
export type VaultCustodyExchangeRequest=Readonly<{schema:'receiz.bank.vault-custody-exchange.v1';applicationId:string;vaultId:string;ownerUserId:string;accountId:string;keyId:string;nonce:string;issuedAtMs:number}>;
export type VaultCustodyExchangeSubmission=Readonly<{request:VaultCustodyExchangeRequest;proof:ReceizIdentityLoginProof}>;
export const vaultCustodyExchangeChallenge=(request:VaultCustodyExchangeRequest)=>receizBase64UrlEncode(custodyBytes(request));
export type VaultCustodyPrincipal=Readonly<{userId:string;keyId:string;applicationId:string;receizId:string;vaultId:string}>;
export type VaultCustodyAccess=Readonly<{access_token:string;token_type:'Bearer';expires_in:number;scope:string;custody:VaultCustodyPrincipal}>;
/** Ephemeral access belongs only to the unlocked context's memory. This client
 * neither writes identity state nor persists/refreshes a child bearer. */
export async function exchangeVaultCustodyClient(input:Readonly<{endpoint:string;accessToken:()=>Promise<string>;fetch?:typeof fetch}>,submission:VaultCustodyExchangeSubmission,signal?:AbortSignal):Promise<VaultCustodyAccess>{
 const url=new URL(input.endpoint);url.searchParams.set('applicationId',submission.request.applicationId);
 const result=await(input.fetch??fetch)(url,{method:'POST',credentials:'omit',headers:{Authorization:`Bearer ${await input.accessToken()}`,'Content-Type':'application/json'},body:JSON.stringify({operation:'exchange',submission}),signal});
 if(!result.ok)throw Error('VAULT_CUSTODY_EXCHANGE_UNAVAILABLE');return result.json();
}

export type VaultCustodyOwnerSource=Readonly<{schema:'receiz.bank.vault-owner-source.v1';owner:VaultCustodyKey&Readonly<{userId:string;receizId:string}>;account:VaultCustodySource['parent'];sources:VaultCustodySource['sources']}>;
export type VaultCustodyOwnerBinding=Readonly<{schema:'receiz.bank.vault-owner-binding.v1';owner:VaultCustodyOwnerSource['owner'];parentSourceSha256:string}>;
/** Preparation coordinate only. The returned head/public binding grants no
 * source admission; verify the complete final custody Source before funding. */
export async function readVaultCustodyOwnerClient(input:Readonly<{endpoint:string;applicationId:string;accessToken:()=>Promise<string>;fetch?:typeof fetch}>,signal?:AbortSignal):Promise<VaultCustodyOwnerBinding>{
 const url=new URL(input.endpoint);url.searchParams.set('applicationId',input.applicationId);const response=await(input.fetch??fetch)(url,{method:'POST',credentials:'omit',headers:{Authorization:`Bearer ${await input.accessToken()}`,'Content-Type':'application/json'},body:JSON.stringify({operation:'prepare-owner',submission:{}}),signal});if(!response.ok)throw Error('VAULT_CUSTODY_OWNER_BINDING_UNAVAILABLE');return response.json();
}

/** Image-only private custody opening: no parent bearer, cookie, ordinary
 * Identity Record, passkey or PBI is required. The unlocked private original
 * signs with its isolated child key; returned access stays in memory. */
export async function openVaultCustodyClient(input:Readonly<{endpoint:string;fetch?:typeof fetch}>,submission:VaultCustodyExchangeSubmission,signal?:AbortSignal):Promise<VaultCustodyAccess>{
 const url=new URL(input.endpoint);url.searchParams.set('applicationId',submission.request.applicationId);const result=await(input.fetch??fetch)(url,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'open',submission}),signal});if(!result.ok)throw Error('VAULT_CUSTODY_EXCHANGE_UNAVAILABLE');return result.json();
}
