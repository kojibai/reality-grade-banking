import {useEffect,useRef,useState} from 'react';
import {BankMark} from '../../components/BankMark';
import {AccountOpening} from '../identity/AccountOpening';
import {emailMeetingResumePath,openEmailMeeting,readEmailMeetingEntry} from '../../receiz/email-meeting-entry';
export function EmailMeetingEntry({onOpened}:{onOpened?:()=>void}={}){
 const [notice,setNotice]=useState(''),[error,setError]=useState(''),attempted=useRef(false);
 const open=async()=>{
  if(attempted.current)return;attempted.current=true;setError('');
  try{const value=await openEmailMeeting(),path=emailMeetingResumePath(value);if(onOpened){window.history.replaceState(null,'',path);onOpened();}else location.replace(path);}
  catch(cause){const message=cause instanceof Error?cause.message:'';setError(message.startsWith('This invitation could not be ')?message:'Your invitation could not be opened. Your saved accounts are preserved. Open the original invitation email and try again.');attempted.current=false;}
 };
 useEffect(()=>{let alive=true;void readEmailMeetingEntry().then(value=>{if(!alive)return;if('invitation'in value&&value.invitation===false||'pending'in value&&!value.autoContinue){setNotice('Open the invitation link in your email to continue.');return;}void open();}).catch(cause=>{if(alive)setError(cause instanceof Error?cause.message:'Your invitation could not be opened.');});return()=>{alive=false;};},[]);
 if(!error&&!notice)return <AccountOpening resuming/>;
 return <div className="console identity-entrance"><header className="app-header"><span className="bank-home-mark" role="img" aria-label="Bankeiz"><BankMark/></span></header><main className="entrance-content">{error?<p className="form-error" role="alert">{error}</p>:<p role="status">{notice}</p>}</main></div>;
}
