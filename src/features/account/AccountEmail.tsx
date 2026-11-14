import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,Mail} from 'lucide-react';
import {CopyFeedbackIcon,useCopyFeedback} from '../../components/CopyFeedback';
import {accountEmailAddress} from '../../receiz/account-email';
import type {OpenIdentity} from '../../receiz/native-identity';
import './account-email.css';

/** This row reads held account presentation only. Expanding it never connects
 * an identity, changes a profile, or creates a mailbox. */
export function AccountEmail({identity}:{identity:OpenIdentity}){
 const [,refresh]=useState(0),[preparing,setPreparing]=useState<OpenIdentity|null>(null),[error,setError]=useState<{owner:OpenIdentity;message:string}|null>(null);
 const current=useRef<OpenIdentity|null>(identity),pending=useRef<OpenIdentity|null>(null);current.current=identity;
 const address=accountEmailAddress(identity.confirmedAccountUsername?.()),copy=useCopyFeedback(address??'');
 useEffect(()=>{current.current=identity;const updated=()=>refresh(value=>value+1);addEventListener('bankeiz:profile-updated',updated);return()=>{removeEventListener('bankeiz:profile-updated',updated);current.current=null;};},[identity]);
 async function prepare(){
  if(!identity.prepareReceivingUsername||pending.current===identity)return;
  pending.current=identity;setPreparing(identity);setError(null);
  try{await identity.prepareReceivingUsername();if(current.current!==identity)return;refresh(value=>value+1);if(!accountEmailAddress(identity.confirmedAccountUsername?.()))setError({owner:identity,message:'Your email is not ready to display. Your account is unchanged.'});}
  catch{if(current.current===identity)setError({owner:identity,message:'Your email could not be shown. Try again when your account connection is available.'});}
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
