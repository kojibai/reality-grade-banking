import {useEffect,useSyncExternalStore} from 'react';
import {fetchPublicQuotes,preparePublicQuotes,readRetainedPublicQuotes,subscribePublicQuotes} from './public-market';
/** Quote-only display observation. Proofs render independently, and inactive
 * Ledger views own no refresh interval or public request. */
export function usePublicQuotes(active=true):unknown{
 const observation=useSyncExternalStore(subscribePublicQuotes,readRetainedPublicQuotes,()=>null);
 useEffect(()=>{
  if(!active)return;
  const consumers=new Set<AbortController>();
  const read=(nonce?:string)=>{
   const controller=new AbortController();consumers.add(controller);
   void(nonce?fetchPublicQuotes(controller.signal,nonce):preparePublicQuotes(controller.signal)).catch(()=>{}).finally(()=>consumers.delete(controller));
  };
  const visible=()=>{if(document.visibilityState!=='hidden')read();};
  const changed=(event:Event)=>{const nonce=(event as CustomEvent<{clientNonce?:unknown}>).detail?.clientNonce;if(typeof nonce==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(nonce))read(nonce);};
  read();const timer=setInterval(visible,60_000);
  document.addEventListener('visibilitychange',visible);addEventListener('online',visible);addEventListener('bankeiz:market-shares-changed',changed);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visible);removeEventListener('online',visible);removeEventListener('bankeiz:market-shares-changed',changed);for(const controller of consumers)controller.abort();};
 },[active]);
 return observation?.snapshot;
}
