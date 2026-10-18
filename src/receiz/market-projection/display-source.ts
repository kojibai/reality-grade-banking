import {useSyncExternalStore} from 'react';
import type {MarketCapSource} from './source';
let source:MarketCapSource|null=null;
const listeners=new Set<()=>void>();
/** Share only the parsed public source already admitted by the existing reader.
 * No fetch, storage, artifact verification, or financial authority is introduced. */
export function publishMarketDisplaySource(next:MarketCapSource):void{
 if(source&&next.serverPulse<source.serverPulse||next===source)return;source=next;for(const listener of listeners)listener();
}
const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
export const retainedMarketDisplaySource=()=>source;
export function useMarketDisplaySource(){return useSyncExternalStore(subscribe,retainedMarketDisplaySource,()=>null);}
