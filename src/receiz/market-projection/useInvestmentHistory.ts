import {useEffect,useMemo,useRef,useState} from 'react';
import type {MarketPortfolio} from '../market-portfolio';
import type {PublicMarketItem} from '../public-market';
import type {MarketCapSource} from './source';
import {investmentHistoryRows,type InvestmentHistory} from './investment-history';
export function useInvestmentHistory(portfolio:MarketPortfolio|null,items:PublicMarketItem[],source:MarketCapSource|null,pulse:number,active:boolean,visible:boolean){
 // Pricing seeds and position records are stable between live display ticks.
 const rows=useMemo(()=>investmentHistoryRows(portfolio,items,source,pulse),[portfolio,items,source]);
 const [view,setView]=useState<{rows:typeof rows;history:InvestmentHistory}|null>(null),job=useRef(0),send=useRef<(pulse:number)=>void>(()=>{}),latest=useRef(pulse);latest.current=pulse;
 useEffect(()=>{if(!active||!rows||typeof Worker==='undefined')return;let instance:Worker;try{instance=new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});}catch{return;}let busy=false,queued:number|null=latest.current,alive=true,started=false,lastSent=-1;
  const dispatch=(next?:number)=>{if(next!==undefined)queued=next;if(busy||queued===null||!alive)return;busy=true;const at=queued;queued=null;if(at===lastSent){busy=false;return;}lastSent=at;instance.postMessage({id:++job.current,...(started?{investmentTick:true}:{investmentRows:rows}),pulse:at});started=true;};send.current=dispatch;
  instance.onmessage=event=>{if(!alive||event.data.id!==job.current)return;busy=false;if(event.data.investments)setView({rows,history:event.data.investments});dispatch();};instance.onerror=()=>{instance.terminate();alive=false;send.current=()=>{};};dispatch();
  return()=>{alive=false;instance.terminate();send.current=()=>{};++job.current;};
 },[rows,active]);
 useEffect(()=>{if(active&&visible)send.current(pulse);},[active,visible,pulse,rows]);
 return view?.rows===rows?view.history:null;
}
