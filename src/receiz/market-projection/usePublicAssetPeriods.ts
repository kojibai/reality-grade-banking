import {useEffect,useMemo,useState} from 'react';
import {receizKaiNow} from '@receiz/sdk';
import type {PublicMarketItem} from '../public-market';
import {matchPublicAssetRow,projectPublicAssetPeriods} from './asset';
import {useMarketDisplaySource} from './display-source';
const samplePulse=()=>{try{return receizKaiNow().pulse;}catch{return 0;}};
/** A local display clock advances retained deterministic inputs; it creates no events or rights. */
export function usePublicAssetPeriods(item:PublicMarketItem){
 const source=useMarketDisplaySource(),[pulse,setPulse]=useState(samplePulse);
 const row=useMemo(()=>matchPublicAssetRow(item,source),[source,item.id,item.assetId,item.category,item.pulse]);
 useEffect(()=>{if(!row)return;const update=()=>{if(document.visibilityState==='visible')setPulse(previous=>Math.max(previous,samplePulse()));};update();const interval=setInterval(update,5000);document.addEventListener('visibilitychange',update);window.addEventListener('focus',update);window.addEventListener('pageshow',update);return()=>{clearInterval(interval);document.removeEventListener('visibilitychange',update);window.removeEventListener('focus',update);window.removeEventListener('pageshow',update);};},[row]);
 const end=Math.max(pulse,source?.serverPulse??0);
 return useMemo(()=>row?projectPublicAssetPeriods(item,source,end):null,[row,source,end,item.id,item.assetId,item.category,item.pulse]);
}
