import{useEffect,useRef,useState}from'react';import type{OpenIdentity}from'../../receiz/native-identity';import{readMeetingEntry,type MeetingEntry}from'../../receiz/meeting-invitation';
interface Account {identity:OpenIdentity|null;opening:boolean;busy:boolean;error:string|null;create(consent:boolean):Promise<void>}
/** Same explicit entry composition as Get Business. A failed held Identity
 * restore never authorizes replacement or repeated account creation. */
export function useMeetingEntry(account:Account,onBank:boolean){
 const [intent]=useState(()=>location.pathname==='/'?readMeetingEntry(location.search):null),attempted=useRef(false),owner=useRef<OpenIdentity|null>(null);
 useEffect(()=>{if(!intent||!onBank)return;if(account.identity){owner.current??=account.identity;return;}if(account.opening||account.busy||account.error||attempted.current||owner.current)return;attempted.current=true;void account.create(true);},[intent,onBank,account.identity,account.opening,account.busy,account.error,account.create]);
 return onBank&&intent&&account.identity&&(!owner.current||owner.current===account.identity)?intent as MeetingEntry:null;
}
