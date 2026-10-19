import {useState} from 'react';
import {ValueChart,Periods,type ChartPeriod} from '../../components/ValueChart';
import {chartChange,chartDateLabel,chartPeriodBounds} from '../../core/chart-history';
import {formatMoney} from '../../core/money';
import type {PublicAssetPeriods} from '../../receiz/market-projection/asset';
import './public-asset-chart.css';

/** Shared Market/Ledger presentation. All values arrive from the existing
 * local projector; expanding or changing a period performs no source read. */
export function PublicAssetChart({periods,fallback=[]}:{periods:PublicAssetPeriods|null;fallback?:number[]}){
 const [period,setPeriod]=useState<ChartPeriod>('ALL'),points=periods?.[period],range=points?chartPeriodBounds(points,period):undefined,change=points&&points.length>1?chartChange(points[0].usdCents,points.at(-1)!.usdCents):null;
 if(!points)return fallback.length>1?<ValueChart values={fallback} label="Public Market value in dollars"/>:null;
 return <div className="asset-chart">{change&&<div className={`chart-period-change ${change.trend==='down'?'negative':change.trend==='up'?'positive':'muted'}`}><strong>{BigInt(change.deltaCents)>0n?'+':''}{formatMoney(change.deltaCents)}{change.percent!==null&&` (${change.percent>0?'+':''}${change.percent.toFixed(2)}%)`}</strong><span>projected value</span></div>}<ValueChart key={period} values={points.map(point=>Number(point.usdCents)/100)} times={points.map(point=>Date.parse(point.at))} timeRange={range} color={change?.trend==='down'?'red':change?.trend==='up'?'green':'blue'} label={`Public object projected value · ${period==='ALL'?'All history':period}`} description="Calculated from the retained public object's pricing inputs. This is projected value, not a record of trades or ownership." tooltip={index=>({value:formatMoney(points[index].usdCents),label:`${new Date(points[index].at).toLocaleString()} · ☤KAI ${points[index].pulse.toLocaleString()}`})}/><Periods value={period} onChange={setPeriod}/>{range&&<div className="chart-date-range"><span>{chartDateLabel(range.start,period,range)}</span><span>{chartDateLabel(range.end,period,range)}</span></div>}</div>;
}
