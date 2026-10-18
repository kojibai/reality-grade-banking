import {canonicalizeReceizV122} from '@receiz/sdk';
import {receizBase64UrlEncode,deriveReceizIdentityKeyIdFromPublicKeyRawB64u,verifyReceizIdentityPublicKeyProjectionSignature} from '@receiz/sdk';
import {receizCurrentPinnedSignatureV4Roots} from '../../native/receiz/packages/receiz-sdk/src/verifier/roots';
import type {ReceizSignatureV4RootPublicKey} from '../../native/receiz/packages/receiz-sdk/src/verifier/signatureV4';
import {inspectNativeAssetReceipt,inspectNativeAssetRefusal} from './native-asset-protocol';
export async function verifyNativeAssetReceiptSignature(input:unknown,roots:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>=receizCurrentPinnedSignatureV4Roots()){
 try{const v=(input as {schema?:unknown})?.schema==='receiz.bank.native-asset-refusal.v1'?inspectNativeAssetRefusal(input):inspectNativeAssetReceipt(input);const {rootSignature,...payload}=v,root=roots.get(v.issuerRootKid),pulse=BigInt('issuedAtKaiUPulse' in v?v.issuedAtKaiUPulse:v.kaiUPulse)/1_000_000n;
  if(!root||root.kid!==v.issuerRootKid||root.alg!=='Ed25519'||rootSignature.kid!==root.kid||root.status!=='active'&&root.status!=='retired'||root.activeFromPulse&&pulse<BigInt(root.activeFromPulse)||root.status==='retired'&&!root.retiredAtPulse||root.retiredAtPulse&&pulse>BigInt(root.retiredAtPulse))return null;
  if(!await verifyReceizIdentityPublicKeyProjectionSignature({keyId:await deriveReceizIdentityKeyIdFromPublicKeyRawB64u(root.publicKeyRawB64u,'Ed25519'),alg:'Ed25519',publicKeyRawB64u:root.publicKeyRawB64u,challengeB64Url:receizBase64UrlEncode(new TextEncoder().encode(canonicalizeReceizV122(payload))),signatureB64Url:rootSignature.sig}))return null;return v;
 }catch{return null;}
}
