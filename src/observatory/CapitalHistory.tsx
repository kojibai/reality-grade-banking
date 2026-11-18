import {ArrowUpRight} from 'lucide-react';
import {CHART_PERIODS,sampleChartIndices,type ChartPeriod} from '../core/chart-history';
import {formatMoney} from '../core/money';
import type {CapitalizationPoint} from '../receiz/market-projection/history';

const day=new Intl.DateTimeFormat('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'});
const clock=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'});
const abbreviated=new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2});
export function CapitalHistory({points,period,onPeriod}:{points:readonly CapitalizationPoint[];period:ChartPeriod;onPeriod:(period:ChartPeriod)=>void}){
  const start=Date.parse(points[0]?.at??''),end=Date.parse(points.at(-1)?.at??'');
  const values=points.map(p=>Number(p.usdCents)/100),min=Math.min(...values),max=Math.max(...values);
  const times=points.map(p=>Date.parse(p.at));
  const path=sampleChartIndices(values,180,times).map((i,j)=>(j?'L':'M')+(end===start?0:800*(times[i]-start)/(end-start))+','+(max===min?50:98-94*(values[i]-min)/(max-min))).join(' ');
  const label=(at:number)=>period==='1D'?clock.format(at)+' UTC':day.format(at);
  return <section className="obs-economy obs-inner" id="obs-economy"><div className="obs-section-head"><div><p className="obs-label">Economy</p><h2>Market capitalization</h2></div><a href="/market-cap/">Market Cap <ArrowUpRight/></a></div>
    <div className="obs-cap-period" aria-label="Market capitalization range">{[...CHART_PERIODS.slice(1),'ALL' as const].map(p=><button key={p} aria-pressed={period===p} onClick={()=>onPeriod(p)}>{p==='ALL'?'All time':p}</button>)}</div>
    {points.length>0?<div className="obs-cap-plot"><div><span>High ${abbreviated.format(max)}</span><span>Low ${abbreviated.format(min)}</span></div>
      <svg viewBox="0 0 800 100" preserveAspectRatio="none" role="img" aria-label={'Market capitalization from '+day.format(start)+' to '+day.format(end)+', closing at '+formatMoney(points.at(-1)!.usdCents)}>{[4,51,98].map(y=><line key={y} x1="0" x2="800" y1={y} y2={y}/>)}<path d={path}/></svg>
      <div><time>{label(start)}</time><time>{label(end)}</time></div></div>:<p>Market history is unavailable for this period.</p>}</section>;
}
