import {useCallback,useEffect,useRef,useState} from 'react';
import type {OpenIdentity} from '../../receiz/native-identity';
export const BUSINESS_ENTRY_HASH='#account/messages/business';
export const BUSINESS_OPENING_MESSAGE='Show me how Business can help me get more done.';
export interface BusinessAssistantRequest {id:string;owner:OpenIdentity;}
interface EntryAccount {identity:OpenIdentity|null;opening:boolean;busy:boolean;error:string|null;create(consent:boolean):Promise<void>;}
const requested=()=>location.pathname==='/'&&location.hash===BUSINESS_ENTRY_HASH;
type EntryRequest={id:string;owner:OpenIdentity|null};
/** Explicit marketing intent composes the frozen local account entry. */
export function useBusinessEntry(account:EntryAccount,onBank:boolean){
 const [intent,setIntent]=useState<EntryRequest|null>(()=>requested()?{id:crypto.randomUUID(),owner:null}:null);
 const attempted=useRef(new Set<string>());
 useEffect(()=>{
  const capture=()=>setIntent(current=>requested()?current??{id:crypto.randomUUID(),owner:null}:null);
  const events=['popstate','hashchange','receiz-bank:surface'] as const;
  for(const event of events)addEventListener(event,capture);
  return()=>{for(const event of events)removeEventListener(event,capture);};
 },[]);
 useEffect(()=>{
  if(!onBank||!intent)return;
  if(intent.owner&&intent.owner!==account.identity){setIntent(null);return;}
  if(account.identity){if(!intent.owner)setIntent({...intent,owner:account.identity});return;}
  // Failed restore never authorizes a replacement identity or a render retry.
  if(account.opening||account.busy||account.error||attempted.current.has(intent.id))return;
  attempted.current.add(intent.id);void account.create(true);
 },[onBank,intent,account.identity,account.opening,account.busy,account.error,account.create]);
 const consume=useCallback((id:string)=>{
  setIntent(current=>current?.id===id?null:current);
  if(requested())history.replaceState({...history.state,panel:'account',sheet:{kind:'messages'}},'','#account/messages');
 },[]);
 return {request:onBank&&intent?.owner===account.identity&&intent.owner?intent as BusinessAssistantRequest:null,consume};
}
