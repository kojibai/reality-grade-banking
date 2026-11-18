import {useState} from 'react';
import {formatMoney} from '../core/money';
import type {walletActivity,WalletPoint} from './wallet';

const date=new Intl.DateTimeFormat('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'});
const number=new Intl.NumberFormat('en-US');
type Metric=Exclude<keyof WalletPoint,'at'>;
function seriesPath(points:WalletPoint[],metric:Metric,max:number){
  const first=points[0].at,span=Math.max(1,points.at(-1)!.at-first);
  return points.map((p,i)=>{const x=(100*(p.at-first)/span).toFixed(3),y=(46-44*Number(p[metric])/max).toFixed(3);return i?'H'+x+'V'+y:'M0,'+y;}).join('');
}
const count=(p:WalletPoint,k:Metric)=>k==='volume'?formatMoney(p.volume.toString()):number.format(Number(p[k]));
export function WalletGrowth({wallets}:{wallets:ReturnType<typeof walletActivity>}){
  const [picked,setPicked]=useState<number|null>(null);
  const points=wallets.timeline,first=points[0],last=points.at(-1),index=Math.min(picked??points.length-1,points.length-1),selected=points[index];
  const tiles:{key:Metric;title:string;value:string;caption:string;secondary?:Metric}[]=[
    {key:'addresses',title:'Participating addresses',value:number.format(wallets.addresses),caption:'Distinct public addresses seen in wallet activity'},
    {key:'transfers',title:'Transfers',value:number.format(wallets.transfers.length),caption:'Cumulative public wallet transfers'},
    {key:'volume',title:'Wallet transfer volume',value:wallets.volume===null?'—':formatMoney(wallets.volume),caption:'All time · '+number.format(wallets.pricedTransfers)+' transfers with recorded amounts'},
    {key:'mints',secondary:'claims',title:'Notes minted / claimed',value:number.format(wallets.mints)+' / '+number.format(wallets.claims),caption:'Cumulative public note events'},
  ];
  return <><div className="obs-audience-grid obs-wallet-grid">{tiles.map(tile=>{
    const max=last?Math.max(1,Number(last[tile.key]),tile.secondary?Number(last[tile.secondary]):0):1;
    const x=last&&first&&selected?100*(selected.at-first.at)/Math.max(1,last.at-first.at):0;
    return <div key={tile.key}><h3>{tile.title}</h3><strong>{tile.value}</strong><small>{tile.caption}</small>
    {last&&first&&selected&&<><svg className="obs-wallet-chart" viewBox="0 0 100 48" preserveAspectRatio="none" role="img" aria-label={tile.title+', '+date.format(first.at)+' through '+date.format(last.at)+'. Latest dated total '+count(last,tile.key)+(tile.secondary?' minted, '+count(last,tile.secondary)+' claimed':'')}>
      {[2,24,46].map(y=><line key={y} x1="0" x2="100" y1={y} y2={y}/>)}
      <path className="obs-wallet-area" d={seriesPath(points,tile.key,max)+' V48 H0 Z'}/><path className="obs-wallet-series" d={seriesPath(points,tile.key,max)}/>
      {tile.secondary&&<path className="obs-wallet-second" d={seriesPath(points,tile.secondary,max)}/>}
      {picked!==null&&<line className="obs-wallet-marker" x1={x} x2={x} y1="0" y2="48"/>}
    </svg>{tile.secondary&&<div className="obs-chart-legend"><span>Minted</span><span>Claimed</span></div>}
    {picked!==null&&<output>{count(selected,tile.key)}{tile.secondary?' / '+count(selected,tile.secondary):''} · {date.format(selected.at)}</output>}</>}</div>;
  })}</div>
  {last&&first&&selected&&<div className="obs-wallet-history-control"><label htmlFor="wallet-history-index">Inspect wallet history</label><input id="wallet-history-index" type="range" min={0} max={points.length-1} value={index} aria-valuetext={date.format(selected.at)} onChange={e=>setPicked(Number(e.target.value))}/><span>{date.format(first.at)} – {date.format(last.at)} UTC</span>{picked!==null&&<button onClick={()=>setPicked(null)}>Latest</button>}</div>}</>;
}
