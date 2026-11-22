import {loadReceiz} from './client';
import {pbiAccountRequest,type PbiRecoveryAssertion} from './pbi-account-inline';
import type {OpenIdentity} from './native-identity';
import {createVaultHeader,encryptVaultBytes,readEncryptedVault} from './vault/encryption';
import {vaultBase64,vaultBytes} from './vault/encoding';
import {encodeIdentityRecovery,openIdentityRecovery} from './vault/recovery';

const blockSize=1024*1024;
const maxBytes=44*blockSize;
const schema='receiz.pbi.identity-recovery.v1';
const digest=/^[a-f0-9]{64}$/;
const route='identity-recovery';
type Manifest={schema:typeof schema;accountUid:string;credentialId:string;keyId:string;ownerReceizId:string;recordSha256:string;parts:string[];byteLength:number;signatureB64Url:string};
type RecoveryAssertion=PbiRecoveryAssertion&{recoverySecret:Uint8Array};
const query=(assertion:PbiRecoveryAssertion,part?:string)=>route+'?'+new URLSearchParams({credentialId:assertion.credentialId,...(part?{part}:{})});
const text=new TextEncoder();
const decode=new TextDecoder('utf-8',{fatal:true});
const unsigned=(m:Omit<Manifest,'signatureB64Url'>)=>[m.schema,m.accountUid,m.credentialId,m.keyId,m.ownerReceizId,m.recordSha256,m.byteLength,m.parts];
const receiptKey=(assertion:PbiRecoveryAssertion,keyId:string)=>JSON.stringify([schema,assertion.accountUid,assertion.credentialId,keyId]);
const readyKey=(accountUid:string,keyId:string)=>JSON.stringify([schema,accountUid,keyId]);
export function hasPbiIdentityRecovery(accountUid:string,keyId:string):boolean{
  try{return localStorage.getItem(readyKey(accountUid,keyId))==='retained';}catch{return false;}
}
function markRetained(assertion:PbiRecoveryAssertion,keyId:string){
  try{localStorage.setItem(receiptKey(assertion,keyId),'retained');localStorage.setItem(readyKey(assertion.accountUid,keyId),'retained');}catch{/* Receipt is only a delivery hint. */}
}
async function hash(bytes:Uint8Array){return (await loadReceiz()).sha256ReceizBytes(bytes);}

function readManifest(value:unknown,assertion:PbiRecoveryAssertion):Manifest{
  const m=value as Manifest;
  if(!m||m.schema!==schema||m.accountUid!==assertion.accountUid||m.credentialId!==assertion.credentialId
    ||!digest.test(m.recordSha256)||!digest.test(m.keyId)||typeof m.ownerReceizId!=='string'
    ||!Number.isSafeInteger(m.byteLength)||m.byteLength<1||m.byteLength>maxBytes
    ||!Array.isArray(m.parts)||m.parts.length!==Math.ceil(m.byteLength/blockSize)
    ||m.parts.some(part=>!digest.test(part)))throw Error('PBI_RECOVERY_INVALID');
  return m;
}

/** The stored bytes cannot open an account. The passkey unlocks the exact
 * original and the same canonical restore independently admits its signer. */
export async function restorePbiIdentity(
  assertion:RecoveryAssertion,
  admit:(record:{bytes:Uint8Array;phrase:string;filename:string})=>Promise<OpenIdentity>,
):Promise<OpenIdentity|null>{
  // Only a fresh install reaches this optional lookup. On an unavailable
  // recovery service, continue the ordinary device-bound account entry.
  const stored=await pbiAccountRequest(query(assertion),undefined,AbortSignal.timeout(3000));
  if(stored.recovery===null)return null;
  const manifest=readManifest(stored.recovery,assertion);
  const bytes=new Uint8Array(manifest.byteLength);
  for(const [index,part] of manifest.parts.entries()){
    const result=manifest.parts.length===1?stored:await pbiAccountRequest(query(assertion,part));
    const data=vaultBytes(result.bytes,blockSize);
    if(data.length!==Math.min(blockSize,bytes.length-index*blockSize)||await hash(data)!==part)throw Error('PBI_RECOVERY_INVALID');
    bytes.set(data,index*blockSize);
  }
  const encrypted=readEncryptedVault(JSON.parse(decode.decode(bytes)));
  const {header}=encrypted;
  if(header.id!==assertion.accountUid||header.credential.id!==assertion.credentialId
    ||header.owner.keyId!==manifest.keyId||header.owner.receizId!==manifest.ownerReceizId)throw Error('PBI_RECOVERY_INVALID');
  const identity=await openIdentityRecovery(encrypted,assertion.recoverySecret,async record=>{
    if(await hash(record.bytes)!==manifest.recordSha256)throw Error('PBI_RECOVERY_INVALID');
    return admit(record);
  },AbortSignal.timeout(45000));
  markRetained(assertion,manifest.keyId);
  return identity;
}

export async function retainPbiIdentity(identity:Pick<OpenIdentity,'backup'|'binding'>,assertion:RecoveryAssertion,assertCurrent=()=>{}):Promise<void>{
  assertCurrent();
  // A receipt for this exact key and credential avoids any restore traffic on
  // the held path. Its loss only retries delivery of the original.
  try{if(localStorage.getItem(receiptKey(assertion,identity.binding.keyId))==='retained')return;}catch{/* Exact custody remains available. */}
  const existing=await pbiAccountRequest(query(assertion));
  assertCurrent();
  if(existing.recovery!==null){
    const manifest=readManifest(existing.recovery,assertion);
    if(manifest.keyId!==identity.binding.keyId||manifest.ownerReceizId!==identity.binding.identityOwnerReceizId)throw Error('PBI_RECOVERY_SIGNER_MISMATCH');
    markRetained(assertion,identity.binding.keyId);
    return;
  }
  const sdk=await loadReceiz();
  const {credential}=await pbiAccountRequest('credential?'+new URLSearchParams({credentialId:assertion.credentialId}));
  if(credential?.credIdB64Url!==assertion.credentialId||typeof credential.pubKeyPem!=='string')throw Error('PBI_ACCOUNT_CREDENTIAL_REQUIRED');
  const spki=Uint8Array.from(atob(credential.pubKeyPem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g,'')),c=>c.charCodeAt(0));
  const header=createVaultHeader({purpose:'identity-recovery',id:assertion.accountUid,
    owner:{keyId:identity.binding.keyId,receizId:identity.binding.identityOwnerReceizId},
    credential:{id:assertion.credentialId,publicKeySpki:vaultBase64(spki),rpId:'receiz.com',origin:'https://receiz.com'}});
  const original=identity.backup();
  let payload:Uint8Array|undefined;
  try{
    payload=encodeIdentityRecovery(original);
    const encrypted=await encryptVaultBytes(payload,header,assertion.recoverySecret);
    const exact=text.encode(JSON.stringify(encrypted));
    if(exact.length>maxBytes)throw Error('PBI_RECOVERY_CAPACITY');
    const blocks=Array.from({length:Math.ceil(exact.length/blockSize)},(_,index)=>exact.subarray(index*blockSize,(index+1)*blockSize));
    const fields:Omit<Manifest,'signatureB64Url'>={schema,accountUid:assertion.accountUid,credentialId:assertion.credentialId,keyId:header.owner.keyId,
      ownerReceizId:header.owner.receizId,recordSha256:await hash(original.bytes),parts:await Promise.all(blocks.map(hash)),byteLength:exact.length};
    const keyFile=await sdk.readReceizIdentityArtifact(original.bytes);
    if(keyFile.keyId!==fields.keyId||keyFile.owner.uid!==fields.ownerReceizId)throw Error('PBI_RECOVERY_SIGNER_MISMATCH');
    const proof=await sdk.signReceizIdentityLoginProof({keyFile,passphrase:original.phrase,challengeB64Url:vaultBase64(text.encode(JSON.stringify(unsigned(fields))))});
    const manifest={...fields,signatureB64Url:proof.signatureB64Url};
    for(const [index,block] of blocks.entries()){
      assertCurrent();
      await pbiAccountRequest(route,{manifest,index,bytes:vaultBase64(block)});
    }
    assertCurrent();
    if(blocks.length>1)await pbiAccountRequest(route,{manifest});
    markRetained(assertion,identity.binding.keyId);
  }finally{
    payload?.fill(0);
    original.bytes.fill(0);
  }
}
