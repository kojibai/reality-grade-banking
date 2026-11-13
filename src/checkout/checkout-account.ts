import {withDeviceIdentityEntry} from '../receiz/device-identity-entry';
import {openCanonicalIdentity,type OpenIdentity} from '../receiz/native-identity';
import {prepareVerifiedEmailAccountSelection} from '../receiz/identity-vault';

/** Paid-account selection preserves the current complete guest record before
 * selecting an independently SDK-admitted Identity Record and its real account.
 * Neither the typed contact email nor a filename establishes account access. */
export function importCheckoutIdentityRecord(previous:OpenIdentity,file:File,phrase:string,expectedEmail:string):Promise<OpenIdentity>{
 return withDeviceIdentityEntry(async()=>{
  if(!file.size||file.size>32*1024*1024)throw Error('CHECKOUT_IDENTITY_RECORD_INVALID');
  const next=await openCanonicalIdentity(new Uint8Array(await file.arrayBuffer()),phrase,file.name,true);
  try{
   if(!expectedEmail||!await next.matchesAccountEmail?.(expectedEmail))throw Error('CHECKOUT_IDENTITY_ACCOUNT_MISMATCH');
   const currentUid=previous.knownWallet?.()?.wallet.userId??(await previous.prepareAccountView()).wallet.userId;
   const targetUid=(await next.prepareAccountView()).wallet.userId;
   if(!await next.matchesAccountEmail?.(expectedEmail,targetUid))throw Error('CHECKOUT_IDENTITY_ACCOUNT_MISMATCH');
   if(targetUid===currentUid)throw Error('CHECKOUT_USE_EXISTING_ACCOUNT_RECORD');
   const selection=await prepareVerifiedEmailAccountSelection({accountUid:currentUid,artifactSha256:previous.binding.artifactSha256},targetUid);
   if(selection.saved){
    const saved=selection.saved,retained=await openCanonicalIdentity(saved.bytes,saved.phrase,saved.filename,true,saved.protectedTransport);
    try{if(!await retained.matchesAccountEmail?.(expectedEmail,targetUid)||(await retained.prepareAccountView()).wallet.userId!==targetUid)throw Error('CHECKOUT_IDENTITY_ACCOUNT_MISMATCH');await selection.activateRetained();next.dispose();return retained;}catch(error){retained.dispose();throw error;}
   }
   await selection.retainRecovered({...next.backup(),readConsent:true});
   await next.persistDeviceCustody();return next;
  }catch(error){next.dispose();throw error;}
 });
}
