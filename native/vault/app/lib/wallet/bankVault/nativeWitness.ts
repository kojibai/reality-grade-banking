import {readVerifiedReceizDocumentBytesCanonical} from '../../../../packages/receiz-sdk/src/verifier/canonical';
import {receizBase64UrlDecode,receizBase64UrlEncode,deriveReceizIdentityKeyIdFromPublicKeyRawB64u,verifyReceizIdentityPublicKeyProjectionSignature} from '../../../../packages/receiz-sdk/src/identity';
import type {ReceizSignatureV4RootPublicKey} from '../../../../packages/receiz-sdk/src/verifier/signatureV4';
import {custodyBytes,custodyCanonical,custodyExact,custodyHex} from './custody';
import {sha256Hex} from '../../../utils/sha256';
export type VaultNativeWitnessSource=Readonly<{filename:string;mimeType:'application/vnd.receiz.bundle+json';artifactSha256:string;exactBytesB64u:string}>;
export type VaultNativeWitnessHeader=Readonly<{issuerRootKid:string;issuedAtKaiUPulse:string;rootSignature:Readonly<{kid:string;alg:'Ed25519';sig:string}>}>;
export const vaultWitnessInteger=(v:unknown):v is string=>typeof v==='string'&&/^(0|[1-9][0-9]{0,39})$/u.test(v);
export const vaultWitnessText=(v:unknown,max=160):v is string=>typeof v==='string'&&v.length>0&&v.length<=max&&!/[\x00-\x1f\x7f]/u.test(v);
export const vaultWitnessUuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/u.test(v);
/** Shared mechanics only. Each caller must inspect its closed native schema.
 * The inner native issuer signature and the enclosing record must both verify. */
export async function openVaultNativeWitness(source:unknown,input:Readonly<{roots:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>;filename:string;domain:string}>){
 function fail():never{throw Error('VAULT_NATIVE_WITNESS_INVALID');}
 if(!custodyExact(source,['filename','mimeType','artifactSha256','exactBytesB64u'])||source.filename!==input.filename||source.mimeType!=='application/vnd.receiz.bundle+json'||!custodyHex(source.artifactSha256)||typeof source.exactBytesB64u!=='string'||source.exactBytesB64u.length>16*1024*1024)fail();
 const bytes=receizBase64UrlDecode(source.exactBytesB64u as string);if(receizBase64UrlEncode(bytes)!==source.exactBytesB64u||await sha256Hex(bytes)!==source.artifactSha256)fail();
 const opened=await readVerifiedReceizDocumentBytesCanonical({fileBytes:bytes,filename:input.filename,mime:'application/vnd.receiz.bundle+json',signatureV4RootPublicKeys:input.roots});if(!opened.ok||!opened.verification.integrity.ok||opened.payloadMimeType!=='application/json')fail();
 const raw=new TextDecoder('utf-8',{fatal:true}).decode(opened.payloadBytes),v=JSON.parse(raw);if(custodyCanonical(v)!==raw||!v||typeof v!=='object'||Array.isArray(v)||v.domain!==input.domain||!vaultWitnessInteger(v.issuedAtKaiUPulse)||!vaultWitnessText(v.issuerRootKid,256)||!custodyExact(v.rootSignature,['kid','alg','sig'])||v.rootSignature.kid!==v.issuerRootKid||v.rootSignature.alg!=='Ed25519'||typeof v.rootSignature.sig!=='string')fail();
 const root=input.roots.get(v.issuerRootKid),pulse=BigInt(v.issuedAtKaiUPulse)/1000000n;if(!root||root.alg!=='Ed25519'||root.status!=='active'&&root.status!=='retired'||root.activeFromPulse&&pulse<BigInt(root.activeFromPulse)||root.status==='retired'&&!root.retiredAtPulse||root.retiredAtPulse&&pulse>BigInt(root.retiredAtPulse)||String(opened.verification.bundle?.kaiPulseEternal)!==pulse.toString())fail();
 const {rootSignature,...payload}=v;if(!await verifyReceizIdentityPublicKeyProjectionSignature({keyId:await deriveReceizIdentityKeyIdFromPublicKeyRawB64u(root.publicKeyRawB64u,'Ed25519'),alg:'Ed25519',publicKeyRawB64u:root.publicKeyRawB64u,challengeB64Url:receizBase64UrlEncode(custodyBytes(payload)),signatureB64Url:rootSignature.sig}))fail();
 const record=opened.verification.bundle?.nativeRecordSeal as {ownerReceizId?:unknown;recordId?:unknown}|undefined;
 if(!record||record.recordId!==`record:${await sha256Hex(opened.payloadBytes)}`||!vaultWitnessText(record.ownerReceizId))fail();
 return {statement:v as Record<string,unknown>,source:structuredClone(source) as unknown as VaultNativeWitnessSource,recordOwner:record.ownerReceizId as string};
}
