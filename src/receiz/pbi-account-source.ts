import {loadReceiz} from './client';
import type {PbiAccountBindRequest} from './pbi-account-bridge';
import {receizCurrentPinnedSignatureV4Roots} from '../../native/receiz/packages/receiz-sdk/src/verifier/roots';
import type {ReceizSignatureV4RootPublicKey} from '../../native/receiz/packages/receiz-sdk/src/verifier/signatureV4';

type Expected={accountUid:string;request:PbiAccountBindRequest};
const fields=['schema','domain','issuerRootKid','accountId','operation','acceptedInputSha256','predecessorSourceSha256','acceptedAtKaiPulse','admissionEvidenceSha256','effect','rootSignature'];
function record(input:unknown):input is Record<string,unknown>{return !!input&&typeof input==='object'&&!Array.isArray(input);}
function exact(input:Record<string,unknown>,names:readonly string[]){return Object.keys(input).length===names.length&&names.every(name=>Object.hasOwn(input,name));}
const digest=(input:unknown):input is string=>typeof input==='string'&&/^[a-f0-9]{64}$/.test(input);
async function verifyStatementRoot(input:Record<string,unknown>,roots:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>){
 if(typeof input.issuerRootKid!=='string'||typeof input.acceptedAtKaiPulse!=='string'||!record(input.rootSignature)||input.rootSignature.kid!==input.issuerRootKid||input.rootSignature.alg!=='Ed25519'||typeof input.rootSignature.sig!=='string')return false;
 const sdk=await loadReceiz(),root=roots.get(input.issuerRootKid),pulse=BigInt(input.acceptedAtKaiPulse);
 if(!root||root.alg!=='Ed25519'||root.status!=='active'&&root.status!=='retired'||root.activeFromPulse&&pulse<BigInt(root.activeFromPulse)||root.status==='retired'&&!root.retiredAtPulse||root.retiredAtPulse&&pulse>BigInt(root.retiredAtPulse))return false;
 const {rootSignature,...payload}=input;
 return sdk.verifyReceizIdentityPublicKeyProjectionSignature({keyId:await sdk.deriveReceizIdentityKeyIdFromPublicKeyRawB64u(root.publicKeyRawB64u,'Ed25519'),alg:'Ed25519',publicKeyRawB64u:root.publicKeyRawB64u,challengeB64Url:sdk.receizBase64UrlEncode(new TextEncoder().encode(sdk.canonicalizeReceizV122(payload))),signatureB64Url:(rootSignature as Record<string,string>).sig});
}

/** Projects the existing canonical account-device binding statement. This does
 * not replace its enclosing original source, current server admission or proof
 * of device possession. Production roots are the SDK's existing pinned roots. */
export async function verifyPbiAccountBindingStatement(input:unknown,expected:Expected,roots:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>=receizCurrentPinnedSignatureV4Roots()):Promise<Record<string,unknown>|null>{
 try{
  if(!record(input)||!exact(input,fields)||input.schema!=='receiz.account-device-binding.v1'||input.domain!=='receiz.account-device-binding.root-signature.v1'
   ||input.operation!=='identity.device.bind'||input.accountId!==expected.accountUid||typeof input.issuerRootKid!=='string'
   ||!digest(input.acceptedInputSha256)||!digest(input.predecessorSourceSha256)||typeof input.acceptedAtKaiPulse!=='string'||!/^(0|[1-9][0-9]{0,39})$/.test(input.acceptedAtKaiPulse)
   ||!Array.isArray(input.admissionEvidenceSha256)||input.admissionEvidenceSha256.length>64||!input.admissionEvidenceSha256.every(digest)||!input.admissionEvidenceSha256.includes(input.acceptedInputSha256)
   ||!record(input.rootSignature)||!exact(input.rootSignature,['kid','alg','sig'])||input.rootSignature.kid!==input.issuerRootKid||input.rootSignature.alg!=='Ed25519'||typeof input.rootSignature.sig!=='string'
   ||!record(input.effect)||!exact(input.effect,['id','keyId','localUid','publicKeyRawB64u','deviceName','boundAt','lastUsedAt','revokedAt','createdAt']))return null;
  const effect=input.effect,request=expected.request;
  if(effect.keyId!==request.keyId||effect.localUid!==request.localUid||effect.publicKeyRawB64u!==request.publicKeyRawB64u||effect.revokedAt!==null||effect.lastUsedAt===null)return null;
  const sdk=await loadReceiz();if(await sdk.digestReceizCanonicalV122(request)!==input.acceptedInputSha256||await sdk.deriveReceizIdentityKeyIdFromPublicKeyRawB64u(request.publicKeyRawB64u,request.alg as 'Ed25519'|'P-256')!==request.keyId)return null;
  if(!await verifyStatementRoot(input,roots))return null;
  return Object.freeze(structuredClone(input));
 }catch{return null;}
}

export async function verifyPbiAccountCredentialStatement(input:unknown,expected:{accountUid:string;credentialId:string},roots:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>=receizCurrentPinnedSignatureV4Roots()):Promise<Record<string,unknown>|null>{
 try{
  if(!record(input)||!exact(input,fields)||input.schema!=='receiz.account-credential.v1'||input.domain!=='receiz.account-credential.root-signature.v1'
   ||!['identity.credential.register','identity.credential.pbi-upsert','identity.credential.use','identity.credential.counter','identity.credential.counter-observation'].includes(String(input.operation))||input.accountId!==expected.accountUid||!digest(input.acceptedInputSha256)||!digest(input.predecessorSourceSha256)
   ||typeof input.acceptedAtKaiPulse!=='string'||!/^(0|[1-9][0-9]{0,39})$/.test(input.acceptedAtKaiPulse)||!Array.isArray(input.admissionEvidenceSha256)||input.admissionEvidenceSha256.length>64||!input.admissionEvidenceSha256.every(digest)||!input.admissionEvidenceSha256.includes(input.acceptedInputSha256)
   ||!record(input.effect)||!exact(input.effect,['id','credentialId','publicKeyPem','legacyCredentialId','createdAt','lastUsedAt','signCount','signCountUpdatedAt','cloneDetectedAt'])
   ||input.effect.credentialId!==expected.credentialId||input.effect.cloneDetectedAt!==null||typeof input.effect.publicKeyPem!=='string'||!input.effect.publicKeyPem.includes('BEGIN PUBLIC KEY')
   ||!record(input.rootSignature)||!exact(input.rootSignature,['kid','alg','sig'])||!await verifyStatementRoot(input,roots))return null;
  return Object.freeze(structuredClone(input));
 }catch{return null;}
}

/** A connected status is projected only from the current canonical
 * credential lifecycle's original source for the already active account. */
export async function admitPbiAccountCredential(sourceB64u:string,expected:{accountUid:string;credentialId:string}){
 const sdk=await loadReceiz();if(!/^[A-Za-z0-9_-]+$/.test(sourceB64u)||sourceB64u.length>8*1024*1024)throw Error('PBI_ACCOUNT_SOURCE_REQUIRED');
 const bytes=sdk.receizBase64UrlDecode(sourceB64u);if(sdk.receizBase64UrlEncode(bytes)!==sourceB64u)throw Error('PBI_ACCOUNT_SOURCE_INVALID');
 const opened=await sdk.createReceizClient().artifacts.verifyAndOpen(new File([new Uint8Array(bytes)],'account-credential.receizbundle',{type:'application/vnd.receiz.bundle+json'}));
 const raw=new TextDecoder('utf-8',{fatal:true}).decode(opened.verifiedPayload.bytes),statement=await verifyPbiAccountCredentialStatement(JSON.parse(raw),expected);
 if(!statement||sdk.canonicalizeReceizV122(statement)!==raw||opened.verifiedPayload.mimeType!=='application/json'||opened.sealedArtifact.kind!=='receiz.native-record-seal'||String(opened.verification.bundle?.kaiPulseEternal)!==statement.acceptedAtKaiPulse)throw Error('PBI_ACCOUNT_SOURCE_INVALID');
 return Object.freeze({...expected,sourceB64u,sourceDigest:opened.sealedArtifact.artifactSha256});
}

/** Canonical enclosing source first; JSON/session fields cannot admit an
 * account. Only the original native bind source for this fresh request can. */
export async function admitPbiAccountBinding(sourceB64u:string,expected:Expected){
 const sdk=await loadReceiz();if(!/^[A-Za-z0-9_-]+$/.test(sourceB64u)||sourceB64u.length>8*1024*1024)throw Error('PBI_ACCOUNT_SOURCE_REQUIRED');
 const bytes=sdk.receizBase64UrlDecode(sourceB64u);if(sdk.receizBase64UrlEncode(bytes)!==sourceB64u)throw Error('PBI_ACCOUNT_SOURCE_INVALID');
 const opened=await sdk.createReceizClient().artifacts.verifyAndOpen(new File([new Uint8Array(bytes)],'account-binding.receizbundle',{type:'application/vnd.receiz.bundle+json'}));
 const raw=new TextDecoder('utf-8',{fatal:true}).decode(opened.verifiedPayload.bytes);
 const statement=await verifyPbiAccountBindingStatement(JSON.parse(raw),expected);
 if(!statement||sdk.canonicalizeReceizV122(statement)!==raw||opened.verifiedPayload.mimeType!=='application/json'
  ||opened.sealedArtifact.kind!=='receiz.native-record-seal'||opened.sealedArtifact.continuity.signatureVersion!==4
  ||String(opened.verification.bundle?.kaiPulseEternal)!==statement.acceptedAtKaiPulse)throw Error('PBI_ACCOUNT_SOURCE_INVALID');
 return Object.freeze({accountUid:expected.accountUid,sourceB64u,sourceDigest:opened.sealedArtifact.artifactSha256,statement});
}
