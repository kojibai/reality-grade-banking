import type {OpenIdentity} from './native-identity';
import {loadReceiz} from './client';
import {runPbiAccountConnection} from './pbi-account-bridge';
import {admitPbiAccountCredential} from './pbi-account-source';

/** Reuses held original custody. Its key signs the existing exact-account
 * switch before canonical enrollment; no private key crosses the popup. */
export async function connectPbiToAccount(identity:OpenIdentity,popup:Window,assertCurrent:()=>void){
 try{
  assertCurrent();const sdk=await loadReceiz();
  // Explicit connection establishes this key's existing account binding before
  // the canonical session handoff. No discovery runs when Identity opens.
  const wallet=await identity.readWallet();assertCurrent();
  const accountUid=wallet.userId;if(!accountUid||identity.knownWallet()?.wallet.userId!==accountUid)throw Error('PBI_ACCOUNT_MISMATCH');
  const held=identity.backup(),key=await sdk.readReceizIdentityArtifact(held.bytes);assertCurrent();
  if(key.keyId!==identity.binding.keyId||key.crypto.publicKeyRawB64u!==identity.binding.publicKeyRawB64u||key.owner.uid!==identity.binding.identityOwnerReceizId)throw Error('PBI_DEVICE_IDENTITY_MISMATCH');
  const device={keyId:key.keyId,alg:key.alg,publicKeyRawB64u:key.crypto.publicKeyRawB64u,localUid:key.owner.uid};
  const connected=await runPbiAccountConnection(popup,device,accountUid,async()=>{
   assertCurrent();const challengeB64Url=sdk.receizBase64UrlEncode(new TextEncoder().encode(['RECEIZ_DEVICE_SWITCH_V1',`keyId=${key.keyId}`,`localUid=${key.owner.uid}`,`targetUid=${accountUid}`,`issuedAtMs=${Date.now()}`,`nonce=${sdk.receizBase64UrlEncode(crypto.getRandomValues(new Uint8Array(32)))}`].join('\n')));
   const proof=await sdk.signReceizIdentityLoginProof({keyFile:key,passphrase:held.phrase,challengeB64Url});assertCurrent();return{challengeB64Url,signatureB64Url:proof.signatureB64Url};
  });
  assertCurrent();const admitted=await admitPbiAccountCredential(connected.sourceB64u,{accountUid,credentialId:connected.credentialId});assertCurrent();return admitted;
 }finally{try{if(!popup.closed)popup.close();}catch{/* Closed. */}}
}
