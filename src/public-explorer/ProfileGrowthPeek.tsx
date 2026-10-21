import {useState} from 'react';
import {Sheet} from '../components/Sheet';
import {Periods,ValueChart,type ChartPeriod} from '../components/ValueChart';
import {chartDateLabel,chartPeriodBounds} from '../core/chart-history';
import type {ProfileGrowthHistory} from '../receiz/market-projection/profile-growth';

const percent=(value:number)=>(value>0?'+':'')+value.toLocaleString(undefined,{maximumFractionDigits:2})+'%';
export function ProfileGrowthPeek({name,total,history,unavailable,onClose,active,initialPeriod='ALL'}:{name:string;total:number;history:ProfileGrowthHistory|null;unavailable:boolean;onClose():void;active:boolean;initialPeriod?:ChartPeriod}){
 const [period,setPeriod]=useState<ChartPeriod>(initialPeriod),points=history?.series[period],range=points?chartPeriodBounds(points,period):undefined,change=points?.at(-1)?.percent??total;
 return <Sheet title="Showcase history" onClose={onClose} active={active}><div className="profile-value-peek profile-growth-peek"><h3>{name}</h3><strong className={change<0?'negative':'positive'}>{percent(change)}</strong><span>{period==='ALL'?'Growth since creation':'Growth over the selected period'}</span>{points?<><ValueChart key={period} values={points.map(p=>p.percent)} times={points.map(p=>Date.parse(p.at))} timeRange={range} color={change<0?'red':'green'} label="Showcase growth in percent" description="The current collection's projected growth, weighted by each asset's opening value. New assets enter at their creation value." tooltip={index=>({value:percent(points[index].percent),label:new Date(points[index].at).toLocaleString()})}/><Periods value={period} onChange={setPeriod}/>{range&&<div className="chart-date-range"><span>{chartDateLabel(range.start,period,range)}</span><span>{chartDateLabel(range.end,period,range)}</span></div>}</>:<p className="body-copy small-copy" role="status">{unavailable?'This browser could not prepare the chart.':'Preparing the collection history…'}</p>}<p className="body-copy small-copy">Growth of the current public collection. Newly created assets enter at their starting value.</p></div></Sheet>;
}
