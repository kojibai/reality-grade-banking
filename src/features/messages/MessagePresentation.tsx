import {useEffect,useRef,type FormEvent} from 'react';
import {ArrowUp,DollarSign,FileText} from 'lucide-react';
import type {ChatPerson} from '../../receiz/native-messaging';
import {ReplyIdentity} from './ReplyIdentity';
import {MessageCreateMenu,type MessageCreateKind} from './MessageCreateMenu';
export function MessageComposer({draft,setDraft,submit,placeholder,busy,disabled,connected=true,maxLength,onSendMoney,onProposal,onCreate,onBlur,focusRequest}:{focusRequest?:number;onBlur?:()=>void;connected?:boolean;onSendMoney?:()=>void;onProposal?:()=>void;onCreate?:(kind:MessageCreateKind)=>void;draft:string;setDraft(value:string):void;submit(event:FormEvent):void;placeholder:string;busy:boolean;disabled?:boolean;maxLength:number}){
  const field=useRef<HTMLInputElement>(null);
  useEffect(()=>{if(focusRequest!==undefined)field.current?.focus({preventScroll:true});},[focusRequest]);
  return <form className="bank-message-composer" onSubmit={submit}>{onCreate?<MessageCreateMenu disabled={!connected||busy||disabled} onCreate={onCreate}/>:onProposal&&<button type="button" className="bank-message-proposal" aria-label="Create proposal" title="Create proposal or invoice" disabled={!connected||busy||disabled} onClick={onProposal}><FileText size={17} strokeWidth={1.7}/></button>}{onSendMoney&&<button type="button" className="bank-message-payment" aria-label="Send money" title="Send money" disabled={busy} onClick={onSendMoney}><DollarSign size={17} strokeWidth={1.7}/></button>}<input ref={field} aria-label={placeholder} placeholder={placeholder} value={draft} onChange={event=>setDraft(event.target.value)} maxLength={maxLength} disabled={disabled} onBlur={onBlur}/><button type="submit" disabled={!connected||disabled||busy||!draft.trim()} aria-label={placeholder==='Message…'?'Send message':'Ask your agent'}><ArrowUp size={19}/></button></form>;
}

export function TypingBubble({name,text,activity='responding',person,avatarUrl,status}:{name:string;text:string;activity?:'typing'|'responding'|'working';status?:string;person?:ChatPerson|null;avatarUrl?:string|null}){
  return <div className="bank-message-other bank-message-stream" aria-label={name+(activity==='typing'?' is typing':activity==='working'?' is working':' is responding')}><ReplyIdentity name={name} person={person} avatarUrl={avatarUrl}/>{text?<p>{text}<span className="bank-stream-cursor" aria-hidden="true"/></p>:<span className="bank-typing-dots" aria-hidden="true"><i/><i/><i/></span>}{status&&<small className="bank-agent-work-status" role="status">{status}</small>}</div>;
}
