import {createLocalPbiAuthorshipProof,type LocalPbiAuthorshipInput} from '../../native/receiz/packages/receiz-sdk/src/pbiLocalAuthorship';
import {verifyLocalPbiAssertion} from '../../native/receiz/packages/receiz-sdk/src/pbiLocalVerifier';
import type {PbiCredential} from './pbi-account-inline';
import {loadReceiz} from './client';
/** Existing PBI authorship, bound to the already sealed Original. No session,
 * account switch or publication is performed by the authenticator ceremony. */
export async function signAssetMarketPublication(input:LocalPbiAuthorshipInput,credential:PbiCredential,assertCurrent:()=>void){
 assertCurrent();const sdk=await loadReceiz();assertCurrent();
 return createLocalPbiAuthorshipProof({input,credential,dependencies:{
  performAssertion:async({challengeB64Url,credIdB64Url,pubKeyPem})=>{
   assertCurrent();let signed:PublicKeyCredential|null;
   try{signed=await navigator.credentials.get({publicKey:{rpId:'receiz.com',challenge:new Uint8Array(sdk.receizBase64UrlDecode(challengeB64Url)).buffer,allowCredentials:[{type:'public-key',id:new Uint8Array(sdk.receizBase64UrlDecode(credIdB64Url)).buffer}],userVerification:'required',timeout:60000}}) as PublicKeyCredential|null;}
   catch(error){if(error instanceof Error&&['NotAllowedError','AbortError'].includes(error.name))throw Error('passkey_cancelled');throw error;}
   assertCurrent();if(!signed||signed.type!=='public-key'||sdk.receizBase64UrlEncode(new Uint8Array(signed.rawId))!==credIdB64Url)throw Error('PBI_ASSET_CREDENTIAL_MISMATCH');
   const response=signed.response as AuthenticatorAssertionResponse;
   return{credIdB64Url,pubKeyPem,authenticatorDataB64Url:sdk.receizBase64UrlEncode(new Uint8Array(response.authenticatorData)),clientDataJSONB64Url:sdk.receizBase64UrlEncode(new Uint8Array(response.clientDataJSON)),signatureB64Url:sdk.receizBase64UrlEncode(new Uint8Array(response.signature))};
  },
  verifyAssertion:async args=>{assertCurrent();const result=await verifyLocalPbiAssertion({...args,policy:{rpId:'receiz.com',originAllowList:['https://bankeiz.com','https://www.bankeiz.com','https://bank.receiz.com'],requireUP:true,requireUV:true}});assertCurrent();return result;},
 }});
}
