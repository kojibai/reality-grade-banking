import {useEffect,useMemo,useRef,useState} from 'react';
import {receizKaiNow} from '@receiz/sdk';
import type {PublicMarketItem} from '../public-market';
import {publicAssetPulseSeed,projectPublicAssetPeriods,type PublicAssetPeriods} from './asset';
import {prepareMarketDisplaySource,useMarketDisplaySource} from './display-source';
const samplePulse=()=>{try{return receizKaiNow().pulse;}catch{return 0;}};
/** A local display clock advances retained deterministic inputs; it creates no events or rights. */
export function usePublicAssetPeriods(item:PublicMarketItem){
 const source=useMarketDisplaySource(),[pulse,setPulse]=useState(samplePulse);
 const held=useRef<PublicAssetPeriods|null>(null);
 const row=useMemo(()=>publicAssetPulseSeed(item,source),[source,item.id,item.assetId,item.category,item.pulse,item.livePulseSeed,item.valuationBinding]);
 const supported=!!row;
 useEffect(()=>{if(supported||item.category!=='proof'||!item.pulse||!/^\d{1,10}$/.test(item.pulse))return;const read=()=>{void prepareMarketDisplaySource(true);};read();window.addEventListener('online',read);return()=>window.removeEventListener('online',read);},[supported,item.id,item.assetId,item.category,item.pulse]);
 useEffect(()=>{if(!row)return;const update=()=>{if(document.visibilityState==='visible')setPulse(previous=>Math.max(previous,samplePulse()));};update();const interval=setInterval(update,1000);document.addEventListener('visibilitychange',update);window.addEventListener('focus',update);window.addEventListener('pageshow',update);return()=>{clearInterval(interval);document.removeEventListener('visibilitychange',update);window.removeEventListener('focus',update);window.removeEventListener('pageshow',update);};},[row]);
 const end=Math.max(pulse,source?.serverPulse??0);
 return useMemo(()=>{const next=row?projectPublicAssetPeriods(item,source,end,held.current):null;held.current=next;return next;},[row,source,end,item.id,item.assetId,item.category,item.pulse,item.livePulseSeed,item.valuationBinding]);
}
