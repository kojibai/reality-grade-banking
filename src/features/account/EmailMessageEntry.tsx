import {useEffect,useRef,useState} from 'react';
import {BankMark} from '../../components/BankMark';
import {AccountOpening} from '../identity/AccountOpening';
import {emailMessageResumePath,openEmailMessage,readEmailMessageEntry,type EmailMessageObservation} from '../../receiz/email-message-entry';
function entryError(cause:unknown){const message=cause instanceof Error?cause.message:'';return message.startsWith('This message could not be ')?message:'Your message could not be opened. Your saved accounts are preserved. Open the original message email and try again.';}
export function EmailMessageEntry({onOpened}:{onOpened:(entry:EmailMessageObservation)=>void}){
 const [notice,setNotice]=useState(''),[error,setError]=useState(''),attempted=useRef(false);
 useEffect(()=>{
  let alive=true;
  const open=async()=>{
   if(attempted.current)return;attempted.current=true;
   try{const value=await openEmailMessage();if(alive){window.history.replaceState(null,'',emailMessageResumePath(value));onOpened(value);}}
   catch(cause){if(alive){setError(entryError(cause));attempted.current=false;}}
  };
  void readEmailMessageEntry().then(value=>{
   if(!alive)return;
   if('invitation'in value&&value.invitation===false||'pending'in value&&!value.autoContinue){setNotice('Open the message link in your email to continue.');return;}
   void open();
  }).catch(cause=>{if(alive)setError(entryError(cause));});
  return()=>{alive=false;};
 },[onOpened]);
 if(!error&&!notice)return <AccountOpening resuming/>;
 return <div className="console identity-entrance"><header className="app-header"><span className="bank-home-mark" role="img" aria-label="Bankeiz"><BankMark/></span></header><main className="entrance-content">{error?<p className="form-error" role="alert">{error}</p>:<p role="status">{notice}</p>}</main></div>;
}
