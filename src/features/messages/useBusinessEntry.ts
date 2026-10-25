import {useCallback,useEffect,useRef,useState} from 'react';
import type {OpenIdentity} from '../../receiz/native-identity';
export const BUSINESS_ENTRY_HASH='#account/messages/business';
export const BUSINESS_OPENING_MESSAGE='Show me how Business can help me get more done.';
export interface BusinessStart {title:string;question:string;hint:string;}
export const BUSINESS_FIRST_TASK:BusinessStart=Object.freeze({title:'Get the next piece of work off your list.',question:'Help me finish one useful piece of work today. Ask what I need to deliver and the background you need, then work with me on a draft I can review and use.',hint:'Bring a proposal, client reply, campaign or payment question you need to finish.'});
export interface BusinessAssistantRequest {id:string;owner:OpenIdentity;start:BusinessStart;}
// Public editorial intent only. It grants no account access or action authority.
function publicStart():BusinessStart|null{
 const raw=document.querySelector<HTMLElement>('#public-learn-root main[data-business-start]')?.dataset.businessStart;
 if(!raw||raw.length>1800)return null;
 try{const value=JSON.parse(raw);return value&&typeof value==='object'&&['title','question','hint'].every(key=>typeof value[key]==='string'&&value[key].trim().length>0&&value[key].length<=({title:180,question:600,hint:400} as Record<string,number>)[key])?{title:value.title,question:value.question,hint:value.hint}:null;}catch{return null;}
}
interface EntryAccount {identity:OpenIdentity|null;opening:boolean;busy:boolean;error:string|null;create(consent:boolean):Promise<void>;}
const requested=()=>location.pathname==='/'&&location.hash===BUSINESS_ENTRY_HASH;
type EntryRequest={id:string;owner:OpenIdentity|null;start:BusinessStart};
/** Explicit marketing intent composes the frozen local account entry. */
export function useBusinessEntry(account:EntryAccount,onBank:boolean){
 const [intent,setIntent]=useState<EntryRequest|null>(()=>requested()?{id:crypto.randomUUID(),owner:null,start:publicStart()??BUSINESS_FIRST_TASK}:null);
 const attempted=useRef(new Set<string>()),nextStart=useRef<{path:string;start:BusinessStart}|null>(null);
 useEffect(()=>{
  const click=(event:MouseEvent)=>{
   const link=event.target instanceof Element?event.target.closest<HTMLAnchorElement>('a[data-business-checkout]'):null;
   const root=document.getElementById('public-learn-root');
   if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.download||link.target&&link.target!=='_self'||!root||root.hidden||!root.contains(link))return;
   const url=new URL(link.href,location.href);if(url.origin===location.origin&&url.pathname==='/'&&!url.search&&url.hash===BUSINESS_ENTRY_HASH)nextStart.current={path:location.pathname,start:publicStart()??BUSINESS_FIRST_TASK};
  };
  const capture=()=>{
   const pending=nextStart.current;
   if(!requested()){if(pending&&location.pathname!==pending.path)nextStart.current=null;setIntent(null);return;}
   const start=pending?.start;
   setIntent(current=>current?(start?{...current,start}:current):{id:crypto.randomUUID(),owner:null,start:start??BUSINESS_FIRST_TASK});
  };
  document.addEventListener('click',click,true);
  const events=['popstate','hashchange','receiz-bank:surface'] as const;
  for(const event of events)addEventListener(event,capture);
  return()=>{document.removeEventListener('click',click,true);for(const event of events)removeEventListener(event,capture);};
 },[]);
 useEffect(()=>{
  if(!onBank||!intent)return;
  if(intent.owner&&intent.owner!==account.identity){
   nextStart.current=null;setIntent(null);
   // A delayed hash/surface event must not rebind the abandoned request to
   // another account while its original opening URL is still selected.
   if(requested())history.replaceState(history.state,'','#account');
   return;
  }
  if(account.identity){if(!intent.owner)setIntent({...intent,owner:account.identity});return;}
  // Failed restore never authorizes a replacement identity or a render retry.
  if(account.opening||account.busy||account.error||attempted.current.has(intent.id))return;
  attempted.current.add(intent.id);void account.create(true);
 },[onBank,intent,account.identity,account.opening,account.busy,account.error,account.create]);
 const consume=useCallback((id:string)=>{
  nextStart.current=null;
  setIntent(current=>current?.id===id?null:current);
  if(requested())history.replaceState({...history.state,panel:'account',sheet:{kind:'messages'}},'','#account/messages');
 },[]);
 return {request:onBank&&intent?.owner===account.identity&&intent.owner?intent as BusinessAssistantRequest:null,consume};
}
