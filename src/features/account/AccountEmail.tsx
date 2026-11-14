import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,Mail} from 'lucide-react';
import {CopyFeedbackIcon,useCopyFeedback} from '../../components/CopyFeedback';
import {accountEmailAddress,accountEmailReceivingName,canonicalAccountEmailAddress,verifiedAccountEmailProfiles} from '../../receiz/account-email';
import {retainedPublicProfile} from '../../receiz/public-profile';
import type {OpenIdentity} from '../../receiz/native-identity';
import './account-email.css';

/** This row reads held account presentation only. Expanding it never connects
 * an identity, changes a profile, or creates a mailbox. */
export function AccountEmail({identity}:{identity:OpenIdentity}){
 const [,refresh]=useState(0),[preparing,setPreparing]=useState<OpenIdentity|null>(null),[error,setError]=useState<{owner:OpenIdentity;message:string}|null>(null);
 const current=useRef<OpenIdentity|null>(identity),pending=useRef<OpenIdentity|null>(null);current.current=identity;
 const [resolved,setResolved]=useState<{owner:OpenIdentity;uid:string;name:string;fullName:string;profile:unknown}|null>(null);
 const name=identity.confirmedAccountUsername?.()??null,uid=identity.walletReceivingAddress?.()??null;
 const profiles=(targetName=name,targetUid=uid)=>[identity.knownProfile?.(),...(targetName?[retainedPublicProfile(targetName)]:[]),...verifiedAccountEmailProfiles(identity.localHistory,targetUid)];
 const fullName=accountEmailReceivingName(name,uid,profiles()),qualified=resolved?.owner===identity&&resolved.uid===uid&&resolved.name===name?resolved:null;
 const address=accountEmailAddress(name)??canonicalAccountEmailAddress(fullName,uid,fullName?retainedPublicProfile(fullName):null)??canonicalAccountEmailAddress(qualified?.fullName??null,uid,qualified?.profile),copy=useCopyFeedback(address??'');
 useEffect(()=>{current.current=identity;const updated=()=>refresh(value=>value+1);addEventListener('bankeiz:profile-updated',updated);return()=>{removeEventListener('bankeiz:profile-updated',updated);current.current=null;};},[identity]);
 async function prepare(){
  if(!identity.prepareReceivingUsername||pending.current===identity)return;
  pending.current=identity;setPreparing(identity);setError(null);
  let selectedName=name,selectedUid=uid;
  const unchanged=()=>current.current===identity&&identity.confirmedAccountUsername?.()===selectedName&&identity.walletReceivingAddress?.()===selectedUid;
  try{
   await identity.prepareReceivingUsername();if(current.current!==identity)return;
   selectedName=identity.confirmedAccountUsername?.()??null;selectedUid=identity.walletReceivingAddress?.()??null;
   if(accountEmailAddress(selectedName)){refresh(value=>value+1);return;}
   if(!selectedName||!selectedUid||!/^receiz_[a-z0-9]{17}$/.test(selectedName))throw Error('ACCOUNT_EMAIL_NAME_REQUIRED');
   const read=async(target:string,view:'head'|'email')=>{const response=await fetch('/api/bank/public-profile/'+target+'?view='+view,{credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('ACCOUNT_EMAIL_UNAVAILABLE');const value=await response.json();if(value?.schema!=='bankeiz.public-profile.v1'||value.userId!==selectedUid)throw Error('ACCOUNT_EMAIL_OWNER_MISMATCH');return value;};
   let complete=accountEmailReceivingName(selectedName,selectedUid,profiles(selectedName,selectedUid));
   if(!complete)complete=accountEmailReceivingName(selectedName,selectedUid,[await read(selectedName,'head')]);
   if(!unchanged())return;if(!complete)throw Error('ACCOUNT_EMAIL_FULL_NAME_REQUIRED');
   const canonical=retainedPublicProfile(complete),profile=canonicalAccountEmailAddress(complete,selectedUid,canonical)?canonical:await read(complete,'email');
   if(!unchanged())return;if(!canonicalAccountEmailAddress(complete,selectedUid,profile))throw Error('ACCOUNT_EMAIL_CANONICAL_OWNER_REQUIRED');
   setResolved({owner:identity,uid:selectedUid,name:selectedName,fullName:complete,profile});
  }
  catch{if(unchanged())setError({owner:identity,message:'Your email could not be confirmed. Your account is unchanged. Try again when the address is available.'});}
  finally{if(pending.current===identity)pending.current=null;if(current.current===identity)setPreparing(null);}
 }
 async function copyAddress(){
  if(!address)return;
  try{await navigator.clipboard.writeText(address);if(current.current===identity){copy.confirm();setError(null);}}
  catch{if(current.current===identity){copy.clear();setError({owner:identity,message:'Select the address above to copy it.'});}}
 }
 return <details className="identity-import account-email"><summary><Mail size={14} aria-hidden="true"/><span>Your email</span></summary>
  {address?<div className="account-email-address"><code>{address}</code><button type="button" className="icon-button" aria-label={copy.copied?'Email address copied':'Copy email address'} data-copied={copy.copied} onClick={()=>void copyAddress()}><CopyFeedbackIcon copied={copy.copied} size={16}/></button></div>:<><p className="body-copy small-copy">Your email appears here when your account name is confirmed.</p>{identity.confirmedAccountUsername&&identity.prepareReceivingUsername&&<button type="button" className="text-button account-email-prepare" disabled={preparing===identity} onClick={()=>void prepare()}>{preparing===identity?'Showing your email…':'Show my email'}</button>}</>}
  <p className="body-copy small-copy account-email-note">Use your Receiz email to send, receive and sign up elsewhere. Incoming email appears in Messages, alongside your conversations.</p>
  {error?.owner===identity&&<p className="body-copy small-copy" role="status">{error.message}</p>}
  <a className="account-email-learn" href="/email/"><span>About your email</span><ArrowUpRight size={12} aria-hidden="true"/></a>
 </details>;
}
