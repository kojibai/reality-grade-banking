import {loadReceiz} from './client';
import {withDeviceIdentityEntry} from './device-identity-entry';
import {runPbiAccountBridge} from './pbi-account-bridge';
import {admitPbiAccountBinding} from './pbi-account-source';
import {openCanonicalIdentity,type OpenIdentity} from './native-identity';
import {loadBankProofResources} from './proof-resource-continuity';
import {certificateTimeSafeStore,certificateTimeSafeFetch} from './device-signer-time';
import {nativeFetch} from './native-transport';
import {unprotectIdentityKeyFile} from './identity-protection';

/** Explicit PBI entry only. The canonical ceremony proves the recovered
 * account and appends this new device key through the existing native binding.
 * No failed assertion, session JSON or account UID creates a Bank account. */
export async function openPbiAccount(popup:Window,consentApproved:boolean):Promise<OpenIdentity>{
 try{
  if(!consentApproved)throw Error('Approve account access before continuing with PBI.');
  return await withDeviceIdentityEntry(async()=>{
   const sdk=await loadReceiz(),resources=await loadBankProofResources(fetch);
   const {createReceizOfflineSealer,createReceizIndexedDbSealStore}=await import('@receiz/sdk/offline');
   const store=certificateTimeSafeStore(createReceizIndexedDbSealStore('receiz-bank-canonical-device-signer'));
   const sealer=createReceizOfflineSealer({store,resources,fetch:certificateTimeSafeFetch(nativeFetch)});
   await sealer.enroll();
   const secret=sdk.receizBase64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
   const protectedSeal=await sealer.createIdentity({passphrase:secret});
   const verification=await sdk.verifyReceizArtifact(protectedSeal.artifactBytes);
   if(verification.status!=='verified-artifact')throw Error('PBI_DEVICE_IDENTITY_INVALID');
   const admission=await sdk.createReceizArtifactAdmissionEngine()(verification,{profile:'identity',identityPassphrase:secret});
   if(admission.verdict!=='canonical-identity'||!sdk.isSdkIssuedReceizArtifactAdmission(admission))throw Error('PBI_DEVICE_IDENTITY_INVALID');
   const binding=await sdk.readReceizIdentityPublicBinding(admission),key=await sdk.readReceizIdentityArtifact(protectedSeal.artifactBytes);
   const device={keyId:key.keyId,alg:key.alg,publicKeyRawB64u:key.crypto.publicKeyRawB64u,localUid:key.owner.uid};
   const recovered=await runPbiAccountBridge(popup,device,async accountUid=>{
    const challengeB64Url=sdk.receizBase64UrlEncode(new TextEncoder().encode(['RECEIZ_DEVICE_BIND_V1',`keyId=${key.keyId}`,`localUid=${key.owner.uid}`,`sessionUid=${accountUid}`,`issuedAtMs=${Date.now()}`,`nonce=${sdk.receizBase64UrlEncode(crypto.getRandomValues(new Uint8Array(32)))}`].join('\n')));
    const signed=await sdk.signReceizIdentityLoginProof({keyFile:key,passphrase:secret,challengeB64Url});
    return {challengeB64Url,signatureB64Url:signed.signatureB64Url};
   });
   const source=await admitPbiAccountBinding(recovered.sourceB64u,recovered);
   // Account selection is carried by the same device key. The actual binding
   // original remains embedded; no wallet amount or fabricated genesis exists.
   const selected=await sdk.appendReceizIdentityPortableState({keyFile:key,passphrase:secret,schema:'receiz.account.state.v3',exportedAt:new Date().toISOString(),snapshot:{schema:'receiz.account.state.v3',account:{userId:source.accountUid},pbiAccountBinding:{sourceB64u:source.sourceB64u,sourceDigest:source.sourceDigest}}});
   const portable=await unprotectIdentityKeyFile(selected,secret);
   const owned=createReceizOfflineSealer({ownerIdentityAdmission:admission,store,resources,fetch:certificateTimeSafeFetch(nativeFetch)});
   const sealed=await owned.seal({bytes:new TextEncoder().encode(sdk.serializeReceizIdentityArtifact(portable)),filename:'identity.receizkey',mimeType:'application/json'});
   const identity=await openCanonicalIdentity(sealed.artifactBytes,'',sealed.filename,true,{bytes:new Uint8Array(protectedSeal.artifactBytes),phrase:secret},true);
   try{
    if(identity.binding.keyId!==binding.keyId||identity.binding.artifactOwnerReceizId!==binding.artifactOwnerReceizId)throw Error('PBI_DEVICE_IDENTITY_MISMATCH');
    const view=await identity.prepareAccountView();if(view.wallet.userId!==source.accountUid)throw Error('PBI_ACCOUNT_MISMATCH');
    await identity.persistDeviceCustody(true);return identity;
   }catch(error){identity.dispose();throw error;}
  });
 }finally{try{if(!popup.closed)popup.close();}catch{/* The ceremony window may already be closed. */}}
}
