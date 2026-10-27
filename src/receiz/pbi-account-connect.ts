import type {OpenIdentity} from './native-identity';
import {loadReceiz} from './client';
import {runPbiAccountInlineConnection,closePbiAccount} from './pbi-account-inline';
import {signPbiProfile} from './pbi-profile-signing';
import {admitPbiAccountCredential} from './pbi-account-source';

/** Reuses held original custody. Its key signs the existing exact-account
 * switch before canonical enrollment; the private key stays on this device. */
export async function connectPbiToAccount(identity:Pick<OpenIdentity,'binding'|'backup'|'knownWallet'|'readWallet'>,assertCurrent:()=>void){
 try{
  assertCurrent();const sdk=await loadReceiz();
  // Explicit connection establishes this key's existing account binding before
  // the canonical session handoff. No discovery runs when Identity opens.
  const wallet=identity.knownWallet()?.wallet??await identity.readWallet();assertCurrent();
  const accountUid=wallet.userId;if(!accountUid||identity.knownWallet()?.wallet.userId!==accountUid)throw Error('PBI_ACCOUNT_MISMATCH');
  const held=identity.backup(),key=await sdk.readReceizIdentityArtifact(held.bytes);assertCurrent();
  if(key.keyId!==identity.binding.keyId||key.crypto.publicKeyRawB64u!==identity.binding.publicKeyRawB64u||key.owner.uid!==identity.binding.identityOwnerReceizId)throw Error('PBI_DEVICE_IDENTITY_MISMATCH');
  const device={keyId:key.keyId,alg:key.alg,publicKeyRawB64u:key.crypto.publicKeyRawB64u,localUid:key.owner.uid};
  const connected=await runPbiAccountInlineConnection(device,accountUid,async()=>{
   assertCurrent();const challengeB64Url=sdk.receizBase64UrlEncode(new TextEncoder().encode(['RECEIZ_DEVICE_SWITCH_V1',`keyId=${key.keyId}`,`localUid=${key.owner.uid}`,`targetUid=${accountUid}`,`issuedAtMs=${Date.now()}`,`nonce=${sdk.receizBase64UrlEncode(crypto.getRandomValues(new Uint8Array(32)))}`].join('\n')));
   const proof=await sdk.signReceizIdentityLoginProof({keyFile:key,passphrase:held.phrase,challengeB64Url});assertCurrent();return{challengeB64Url,signatureB64Url:proof.signatureB64Url};
  },assertCurrent);
  assertCurrent();const admitted=connected.sourceMode==='native-history'?await admitPbiAccountCredential(connected.sourceB64u,{accountUid,credentialId:connected.credentialId}):connected.sourceMode==='legacy-sql'?{accountUid,credentialId:connected.credentialId}:null;
  if(!admitted)throw Error('PBI_ACCOUNT_SOURCE_REQUIRED');
  assertCurrent();const signature=await signPbiProfile(device,accountUid,connected.credentialId,assertCurrent);assertCurrent();
  const {retainProfilePbiAuthorship}=await import('./public-profile');assertCurrent();retainProfilePbiAuthorship(accountUid,signature.pbiReceiptHash);
  if(typeof dispatchEvent==='function')dispatchEvent(new Event('bankeiz:profile-updated'));
  return {...admitted,signature};
 }finally{await closePbiAccount();}
}
