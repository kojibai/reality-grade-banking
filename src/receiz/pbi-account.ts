import {loadReceiz} from './client';
import {withDeviceIdentityEntry} from './device-identity-entry';
import {runPbiAccountInline,recoverPbiAccountInline,closePbiAccount} from './pbi-account-inline';
import {admitPbiAccountBinding} from './pbi-account-source';
import {openCanonicalIdentity,restoreNativeIdentity,type OpenIdentity} from './native-identity';
import {loadBankProofResources} from './proof-resource-continuity';
import {certificateTimeSafeStore,certificateTimeSafeFetch} from './device-signer-time';
import {nativeFetch} from './native-transport';
import {unprotectIdentityKeyFile} from './identity-protection';

/** Explicit PBI entry only. The canonical ceremony proves the recovered
 * account and appends this new device key through the existing native binding.
 * No failed assertion, session JSON or account UID creates a Bank account. */
export async function openPbiAccount(consentApproved:boolean,onIdentityPrepared?:()=>void):Promise<OpenIdentity>{
 try{
  if(!consentApproved)throw Error('Approve account access before continuing with PBI.');
  return await withDeviceIdentityEntry(async()=>{
   return createRecoveredAccountDevice(recoverPbiAccountInline(),onIdentityPrepared);
  });
 }finally{await closePbiAccount();}
}

/** Email possession has already been consumed and checked against the exact
 * committed recipient by the closed server transport. Canonical device bind
 * still verifies that session; a UID alone cannot select a different account. */
export async function openVerifiedEmailAccount(accountUid:string,onIdentityPrepared?:()=>void):Promise<OpenIdentity>{
 try{return await withDeviceIdentityEntry(async()=>{
  const saved=await(await import('./identity-vault')).loadDeviceIdentity();
  if(saved){
   const held=await restoreNativeIdentity();
   if(!held)throw Error('EMAIL_PAYMENT_SAVED_ACCOUNT_REQUIRED');
   try{const view=await held.prepareAccountView();if(view.wallet.userId!==accountUid)throw Error('EMAIL_PAYMENT_DIFFERENT_ACCOUNT');onIdentityPrepared?.();return held;}
   catch(error){held.dispose();throw error;}
  }
  return createRecoveredAccountDevice(Promise.resolve({accountUid}),onIdentityPrepared);
 });}finally{await closePbiAccount();}
}

/** Invitation-only account selection after the closed transport has consumed
 * recipient-specific email proof and checked the exact invitation. Every
 * selected record still passes canonical SDK/host account admission. */
export async function openVerifiedInvitationAccount(accountUid:string,onIdentityPrepared?:()=>void):Promise<OpenIdentity>{
 try{return await withDeviceIdentityEntry(async()=>{
  const custody=await import('./identity-vault'),saved=await custody.loadDeviceIdentity();
  let previous:{accountUid:string;artifactSha256:string}|null=null;
  if(saved){
   const held=await restoreNativeIdentity();
   if(!held)throw Error('EMAIL_PAYMENT_SAVED_ACCOUNT_REQUIRED');
   try{
    const view=await held.prepareAccountView();
    if(view.wallet.userId===accountUid){onIdentityPrepared?.();return held;}
    previous={accountUid:view.wallet.userId,artifactSha256:held.binding.artifactSha256};
   }catch(error){held.dispose();throw error;}
   held.dispose();
  }
  const selection=await custody.prepareVerifiedEmailAccountSelection(previous,accountUid);
  if(selection.saved){
   const retained=selection.saved;
   const identity=await openCanonicalIdentity(retained.bytes,retained.phrase,retained.filename,true,retained.protectedTransport);
   try{
    onIdentityPrepared?.();const view=await identity.prepareAccountView();
    if(view.wallet.userId!==accountUid)throw Error('PBI_ACCOUNT_MISMATCH');
    await selection.activateRetained();return identity;
   }catch(error){identity.dispose();throw error;}
  }
  return createRecoveredAccountDevice(Promise.resolve({accountUid}),onIdentityPrepared,async(identity,protectedTransport)=>{
   const backup=identity.backup();
   await selection.retainRecovered({...backup,readConsent:true,protectedTransport});
  });
 });}finally{await closePbiAccount();}
}

type RecoveredCustodyCommit=(identity:OpenIdentity,protectedTransport:import('./identity-vault').ProtectedIdentityTransport)=>Promise<void>;
async function createRecoveredAccountDevice(recovery:Promise<{accountUid:string;credentialId?:string}>,onIdentityPrepared?:()=>void,retainCustody?:RecoveredCustodyCommit):Promise<OpenIdentity>{
   void recovery.catch(()=>{});
   const [sdk,resources,{createReceizOfflineSealer,createReceizIndexedDbSealStore}]=await Promise.all([loadReceiz(),loadBankProofResources(fetch),import('@receiz/sdk/offline')]);
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
   const recovered=await runPbiAccountInline(device,async accountUid=>{
    const challengeB64Url=sdk.receizBase64UrlEncode(new TextEncoder().encode(['RECEIZ_DEVICE_BIND_V1',`keyId=${key.keyId}`,`localUid=${key.owner.uid}`,`sessionUid=${accountUid}`,`issuedAtMs=${Date.now()}`,`nonce=${sdk.receizBase64UrlEncode(crypto.getRandomValues(new Uint8Array(32)))}`].join('\n')));
    const signed=await sdk.signReceizIdentityLoginProof({keyFile:key,passphrase:secret,challengeB64Url});
    return {challengeB64Url,signatureB64Url:signed.signatureB64Url};
   },recovery);
   const source=recovered.sourceMode==='native-history'?await admitPbiAccountBinding(recovered.sourceB64u,recovered):recovered.sourceMode==='legacy-sql'?{accountUid:recovered.accountUid}:null;
   if(!source)throw Error('PBI_ACCOUNT_SOURCE_REQUIRED');
   // Account selection is carried by the same device key. Any native binding
   // original remains embedded; no wallet amount or fabricated genesis exists.
   const selected=await sdk.appendReceizIdentityPortableState({keyFile:key,passphrase:secret,schema:'receiz.account.state.v3',exportedAt:new Date().toISOString(),snapshot:{schema:'receiz.account.state.v3',account:{userId:source.accountUid},...('sourceB64u' in source?{pbiAccountBinding:{sourceB64u:source.sourceB64u,sourceDigest:source.sourceDigest}}:{pbiAccountRecovery:{sourceMode:'legacy-sql',request:recovered.request}})}});
   const portable=await unprotectIdentityKeyFile(selected,secret);
   const owned=createReceizOfflineSealer({ownerIdentityAdmission:admission,store,resources,fetch:certificateTimeSafeFetch(nativeFetch)});
   const sealed=await owned.seal({bytes:new TextEncoder().encode(sdk.serializeReceizIdentityArtifact(portable)),filename:'identity.receizkey',mimeType:'application/json'});
   const identity=await openCanonicalIdentity(sealed.artifactBytes,'',sealed.filename,true,{bytes:new Uint8Array(protectedSeal.artifactBytes),phrase:secret},true);
   try{
    if(identity.binding.keyId!==binding.keyId||identity.binding.artifactOwnerReceizId!==binding.artifactOwnerReceizId)throw Error('PBI_DEVICE_IDENTITY_MISMATCH');
    onIdentityPrepared?.();
    const view=await identity.prepareAccountView();if(view.wallet.userId!==source.accountUid)throw Error('PBI_ACCOUNT_MISMATCH');
    if(retainCustody)await retainCustody(identity,{bytes:new Uint8Array(protectedSeal.artifactBytes),phrase:secret});
    else await identity.persistDeviceCustody(true);
    return identity;
   }catch(error){identity.dispose();throw error;}
}
