import {useEffect,useId,useMemo,useState} from 'react';
import type {OpenIdentity} from '../../receiz/native-identity';
import type {ChatPerson,NativeMessaging} from '../../receiz/native-messaging';
import {conversationPeople,peopleSearchQuery,peopleSuggestions} from '../../receiz/people-search';
import {ProfileAvatar} from '../../components/ProfileAvatar';
import './recipient-input.css';

export function RecipientInput({identity,value,onChange,onSelect}:{identity?:OpenIdentity;value:string;onChange(value:string):void;onSelect(person:{userId:string;username:string}):void}){
 const id=useId(),[focused,setFocused]=useState(false),[started,setStarted]=useState(false),[highlight,setHighlight]=useState(-1);
 const [connection,setConnection]=useState<{identity:OpenIdentity;api:NativeMessaging;contacts:ChatPerson[]}|null>(null);
 const [result,setResult]=useState<{api:NativeMessaging;query:string;people:ChatPerson[]}|null>(null),[searching,setSearching]=useState(false);
 const api=connection&&connection.identity===identity?connection.api:null,q=peopleSearchQuery(value);
 useEffect(()=>{
  if(!identity||!started||!identity.messaging)return;
  const pending=new AbortController();
  void identity.messaging().then(next=>{
   if(pending.signal.aborted)return;
   const known=next.knownConversations();setConnection({identity,api:next,contacts:conversationPeople(known,next.accountUid)});
   if(!known.length)void next.conversations(pending.signal).then(rows=>{if(!pending.signal.aborted)setConnection({identity,api:next,contacts:conversationPeople(rows,next.accountUid)});}).catch(()=>{});
  }).catch(()=>{}); // Directory access never blocks a manually entered recipient.
  return()=>pending.abort();
 },[identity,started]);
 useEffect(()=>{
  if(!focused||!api||!q){setSearching(false);return;}
  const pending=new AbortController();setSearching(true);
  const timer=window.setTimeout(()=>{void api.search(q,pending.signal).then(people=>{if(!pending.signal.aborted)setResult({api,query:q,people});}).catch(()=>{}).finally(()=>{if(!pending.signal.aborted)setSearching(false);});},300);
  return()=>{window.clearTimeout(timer);pending.abort();};
 },[focused,api,q]);
 const people=useMemo(()=>api?peopleSuggestions(connection!.contacts,result?.api===api&&result.query===q?result.people:[],value,api.accountUid):[],[api,connection,result,q,value]);
 const visible=focused&&(people.length>0||searching);
 const choose=(person:ChatPerson)=>{onSelect({userId:person.userId,username:person.username!});setFocused(false);setHighlight(-1);};
 return <div className="bank-recipient"><label className="form-field" htmlFor={id}><span>Recipient</span><input id={id} role="combobox" aria-autocomplete="list" aria-expanded={visible} aria-controls={visible?id+'-options':undefined} aria-activedescendant={visible&&highlight>=0&&people[highlight]?id+'-'+highlight:undefined} value={value} onFocus={()=>{setFocused(true);setStarted(true);}} onBlur={()=>setFocused(false)} onChange={event=>{setFocused(true);setHighlight(-1);onChange(event.target.value);}} onKeyDown={event=>{if(event.key==='Escape'){setFocused(false);setHighlight(-1);}else if(event.key==='ArrowDown'&&people.length){event.preventDefault();setFocused(true);setHighlight(index=>(index+1)%people.length);}else if(event.key==='ArrowUp'&&people.length){event.preventDefault();setHighlight(index=>(index<=0?people.length:index)-1);}else if(event.key==='Enter'&&visible&&highlight>=0&&people[highlight]){event.preventDefault();choose(people[highlight]);}}} placeholder="Receiz ID or public username" autoComplete="off" spellCheck={false} maxLength={160}/></label>
 {visible&&<div className="bank-recipient-options"><span className="bank-recipient-caption">{q?'People':'Recent contacts'}</span><ul role="listbox" id={id+'-options'} aria-label="Recipient suggestions">{people.map((person,index)=><li key={person.userId} id={id+'-'+index} role="option" aria-selected={highlight===index} onPointerDown={event=>event.preventDefault()} onClick={()=>choose(person)}><ProfileAvatar className="bank-recipient-avatar" src={person.avatarUrl} name={person.displayName||person.username||'Receiz account'}/><span><strong>{person.displayName||person.username}</strong><small>@{person.username}</small></span></li>)}</ul>{searching&&<span className="bank-recipient-caption" role="status">Finding people…</span>}</div>}
 </div>;
}
