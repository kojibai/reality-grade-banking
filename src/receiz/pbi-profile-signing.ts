import {verifyLocalPbiAssertion} from '../../native/receiz/packages/receiz-sdk/src/pbiLocalVerifier';
import {loadReceiz} from './client';
import {pbiAccountRequest} from './pbi-account-inline';
import type {PbiAccountDevice} from './pbi-account-bridge';
/** Actual profile authorship uses the same identity-key action and PBI
 * verifier as Receiz. Credential enrollment alone never creates a badge. */
export async function signPbiProfile(device:PbiAccountDevice,accountUid:string,credentialId:string,assertCurrent:()=>void){
 assertCurrent();const sdk=await loadReceiz();
 const publicKeySha256=await sdk.sha256ReceizBytes(sdk.receizBase64UrlDecode(device.publicKeyRawB64u));
 const actionHash=await sdk.sha256ReceizBytes(new TextEncoder().encode(['RECEIZ_IDENTITY_KEY_ENROLLMENT_V1',`userUid=${accountUid.trim().toLowerCase()}`,`keyId=${device.keyId.trim().toLowerCase()}`,`publicKeySha256Hex=${publicKeySha256}`,'scope=IDENTITY_KEY_ENROLLMENT'].join('\n')));
 const stored=await pbiAccountRequest(`credential?${new URLSearchParams({credentialId})}`);assertCurrent();const credential=stored.credential;
 if(credential?.credIdB64Url!==credentialId||typeof credential.pubKeyPem!=='string'||!credential.pubKeyPem.includes('BEGIN PUBLIC KEY'))throw Error('PBI_ACCOUNT_CREDENTIAL_REQUIRED');
 const input={keyId:device.keyId,alg:device.alg,publicKeyRawB64u:device.publicKeyRawB64u};
 const response=await pbiAccountRequest('presence-challenge',input);assertCurrent();const challenge=response.challenge;
 if(!challenge||typeof challenge.id!=='string'||!challenge.id||challenge.actionHashHex!==actionHash||typeof challenge.challengeB64Url!=='string')throw Error('PBI_ACCOUNT_MISMATCH');
 let signed:PublicKeyCredential|null;
 try{signed=await navigator.credentials.get({publicKey:{rpId:'receiz.com',challenge:new Uint8Array(sdk.receizBase64UrlDecode(challenge.challengeB64Url)).buffer,allowCredentials:[{type:'public-key',id:new Uint8Array(sdk.receizBase64UrlDecode(credentialId)).buffer}],userVerification:'required',timeout:60000}}) as PublicKeyCredential|null;}catch(error){if(error instanceof Error&&['NotAllowedError','AbortError'].includes(error.name))throw Error('passkey_cancelled');throw error;}
 assertCurrent();if(!signed||signed.type!=='public-key'||sdk.receizBase64UrlEncode(new Uint8Array(signed.rawId))!==credentialId)throw Error('PBI_ACCOUNT_MISMATCH');
 const proof=signed.response as AuthenticatorAssertionResponse;
 const assertion={credIdB64Url:credentialId,pubKeyPem:credential.pubKeyPem,authenticatorDataB64Url:sdk.receizBase64UrlEncode(new Uint8Array(proof.authenticatorData)),clientDataJSONB64Url:sdk.receizBase64UrlEncode(new Uint8Array(proof.clientDataJSON)),signatureB64Url:sdk.receizBase64UrlEncode(new Uint8Array(proof.signature))};
 const verified=await verifyLocalPbiAssertion({challengeB64Url:challenge.challengeB64Url,assertion,policy:{rpId:'receiz.com',originAllowList:[location.origin],requireUP:true,requireUV:true}});assertCurrent();
 if(!verified.ok)throw Error('PBI_PROFILE_ASSERTION_INVALID');
 const result=await pbiAccountRequest('presence-enroll',{...input,challengeId:challenge.id,actionHashHex:actionHash,assertion});assertCurrent();const key=result.key;
 if(result.ok!==true||key?.keyId!==device.keyId||key.pbiDecision!=='PBI_VERIFIED'||key.pbiChallengeId!==challenge.id||typeof key.pbiReceiptHash!=='string'||!/^[a-f0-9]{64}$/.test(key.pbiReceiptHash)||typeof key.attestedAt!=='string'||!Number.isFinite(Date.parse(key.attestedAt)))throw Error('PBI_PROFILE_SIGNING_UNCONFIRMED');
 return {keyId:device.keyId,pbiReceiptHash:key.pbiReceiptHash,pbiChallengeId:challenge.id,attestedAt:key.attestedAt};
}
