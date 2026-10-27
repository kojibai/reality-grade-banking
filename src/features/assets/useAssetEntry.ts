import {useEffect,useReducer,useRef} from 'react';
import type {OpenIdentity} from '../../receiz/native-identity';
interface AssetEntryAccount {identity:OpenIdentity|null;opening:boolean;busy:boolean;error:string|null;create(consent:boolean):Promise<void>;}
/** Explicit Create asset intent composes the existing account entry. Known
 * identity restoration always completes first; a failed restore cannot create
 * a replacement identity. Ordinary account entry is unchanged. */
export function useAssetEntry(account:AssetEntryAccount,onBank:boolean){
 const [,changed]=useReducer(n=>n+1,0),attempted=useRef(false),owner=useRef<OpenIdentity|null>(null);
 const requested=location.pathname==='/'&&location.hash==='#account/currency';
 useEffect(()=>{const update=()=>changed();const events=['popstate','hashchange','receiz-bank:surface'];for(const event of events)addEventListener(event,update);return()=>{for(const event of events)removeEventListener(event,update);};},[]);
 useEffect(()=>{
  if(!requested){attempted.current=false;owner.current=null;return;}
  if(!onBank||owner.current)return;
  if(account.identity){owner.current=account.identity;return;}
  if(account.opening||account.busy||account.error||attempted.current)return;
  attempted.current=true;void account.create(true);
 },[requested,onBank,account.identity,account.opening,account.busy,account.error,account.create]);
}
