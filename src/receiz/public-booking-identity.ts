import {loadReceiz} from './client';
import type {OpenIdentity} from './native-identity';
import {identityProfileName} from './profile-avatar';

import type {BookingIdentityHeaders} from './booking-identity-headers';
export type {BookingIdentityHeaders} from './booking-identity-headers';
export interface PublicBookingIdentity {
 warm():Promise<void>;scope?():string|null;sign(path:string,bodyText:string):Promise<BookingIdentityHeaders>|null;dispose():void;
}
const bookingPath=(path:string)=>/^\/api\/bank\/booking\/[a-z0-9_]{3,24}\/conversation(?:\?[^#]*)?$/.test(path);

/** Restore only existing SDK-admitted custody after paint. Send never waits for
 * this work and never creates an account or establishes remote authorization. */
export function createPublicBookingIdentity({restore=async()=>(await import('./native-identity')).restoreNativeIdentity()}:{restore?:()=>Promise<OpenIdentity|null>}={}):PublicBookingIdentity{
 let readyScope:string|null=null;
 let closed=false,identity:OpenIdentity|null=null,warming:Promise<void>|undefined,signer:((path:string,bodyText:string)=>Promise<BookingIdentityHeaders>)|null=null;
 return{
  warm(){return warming??=(async()=>{
   const next=await restore();if(!next)return;if(closed){next.dispose();return;}identity=next;
   const sdk=await loadReceiz(),held=next.backup(),key=await sdk.readReceizIdentityArtifact(held.bytes);
   if(closed)return;
   if(key.keyId!==next.binding.keyId||key.crypto.publicKeyRawB64u!==next.binding.publicKeyRawB64u||key.owner.uid!==next.binding.identityOwnerReceizId)throw Error('BOOKING_IDENTITY_MISMATCH');
   const profile=next.knownProfile?.(),account=next.localHistory?.portableStateVerified===true?(next.localHistory.verifiedState as {account?:{userId?:unknown}}|null)?.account:null;
   const uid=profile?.userId??(typeof account?.userId==='string'?account.userId:undefined)??next.knownWallet?.()?.wallet.userId??key.owner.uid;
   const displayName=profile?.displayName??(next.localHistory?.portableStateVerified===true?identityProfileName(next):key.owner.displayName??null),username=profile?.username??next.accountUsername?.()??key.owner.username??null;
   readyScope=uid;
   signer=async(path,bodyText)=>{
    if(closed)throw Error('BOOKING_IDENTITY_CLOSED');
    const actionId=await sdk.sha256ReceizBytes(new TextEncoder().encode(JSON.stringify([path,bodyText])));
    const challengeText=sdk.canonicalizeReceizConstitution({schema:'receiz.local.signed-action.v1',actionId,actionKind:'world.profile.booking',scope:'world:booking',createdAt:'',actor:{uid,localUid:key.owner.uid,email:null,username,displayName,receizKeyId:key.keyId,publicKeyRawB64u:key.crypto.publicKeyRawB64u},request:{method:'POST',path,contentType:'application/json',bodyHashHex:await sdk.sha256ReceizBytes(new TextEncoder().encode(bodyText)),bodyReplayText:null,replayable:false}});
    const proof=await sdk.signReceizIdentityLoginProof({keyFile:key,passphrase:held.phrase,challengeText});
    if(closed)throw Error('BOOKING_IDENTITY_CLOSED');
    return{'x-receiz-local-action-id':actionId,'x-receiz-local-action-key-id':key.keyId,'x-receiz-local-action-public-key':key.crypto.publicKeyRawB64u,'x-receiz-local-action-challenge':proof.challengeB64Url,'x-receiz-local-action-signature':proof.signatureB64Url};
   };
  })().catch(()=>{signer=null;identity?.dispose();identity=null;});},
  scope:()=>closed?null:readyScope,
  sign(path,bodyText){return !closed&&signer&&bookingPath(path)?signer(path,bodyText):null;},
  dispose(){if(closed)return;closed=true;readyScope=null;signer=null;identity?.dispose();identity=null;},
 };
}
