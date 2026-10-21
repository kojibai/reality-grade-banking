import {useEffect,useState} from 'react';
import type {OpenIdentity} from './native-identity';
import type {MarketPortfolio} from './market-portfolio';
import {publishOpenPortfolio} from './market-portfolio-presentation';
export function useMarketPortfolio(identity:OpenIdentity|null,active:boolean){
 const [view,setView]=useState<{owner:OpenIdentity;data:MarketPortfolio|null;busy:boolean;error:boolean}|null>(null);
 useEffect(()=>{if(!identity)return;const owner=identity.binding.artifactSha256;return()=>publishOpenPortfolio(owner,null);},[identity]);
 useEffect(()=>{
  if(!identity||!active||!identity.marketPortfolio)return;let alive=true,unsubscribe:undefined|(()=>void);const owner=identity.binding.artifactSha256;
  const publish=(data:MarketPortfolio|null,busy=false,error=false)=>{if(alive){setView({owner:identity,data,busy,error});publishOpenPortfolio(owner,data);}};
  publish(identity.knownMarketPortfolio?.()??null,true);
  let refresh:()=>void=()=>{};
  void identity.marketPortfolio().then(api=>{if(!alive)return;unsubscribe=api.subscribe(()=>publish(api.known()));refresh=()=>{void api.refresh().then(()=>publish(api.known()),()=>publish(api.known(),false,true));};publish(api.known(),true);refresh();},()=>publish(identity.knownMarketPortfolio?.()??null,false,true));
  const wake=()=>{if(document.visibilityState==='visible')refresh();};addEventListener('online',wake);addEventListener('focus',wake);document.addEventListener('visibilitychange',wake);
  return()=>{alive=false;unsubscribe?.();removeEventListener('online',wake);removeEventListener('focus',wake);document.removeEventListener('visibilitychange',wake);};
 },[identity,active]);
 return view?.owner===identity?view:{data:identity?.knownMarketPortfolio?.()??null,busy:!!identity,error:false};
}
