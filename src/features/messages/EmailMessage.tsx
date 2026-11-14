import {emailReplyDisplay} from '../../receiz/email-reply-display';
import {useState} from 'react';
import type {ChatMessage} from '../../receiz/native-messaging';
/** Email is plain content, never executable HTML or a payment instruction. */
export function EmailMessage({message,download}:{message:ChatMessage;download:()=>Promise<void>}){
 message=emailReplyDisplay(message);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 if(message.senderKind!=='external-email')return <p>{message.body}</p>;
 const pieces=message.body.split(/(https?:\/\/[^\s<>"']+)/g);
 return <div className="bank-email-message"><small>{message.transport.fromEmail}</small><p>{pieces.map((piece,index)=>{
  if(!/^https?:\/\//.test(piece))return piece;
  try{const url=new URL(piece);if(url.username||url.password)return piece;return <a key={index} href={url.href} target="_blank" rel="noopener noreferrer">{piece}</a>;}catch{return piece;}
 })}</p>{message.sealedOriginalAvailable&&<button type="button" disabled={busy} onClick={()=>{setBusy(true);setError('');void download().catch(()=>setError('The original email is unavailable. Please try again.')).finally(()=>setBusy(false));}}>Open original email</button>}{error&&<small role="status">{error}</small>}</div>;
}
