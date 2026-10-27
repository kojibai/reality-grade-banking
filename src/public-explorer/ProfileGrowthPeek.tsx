import {useMemo,useState} from 'react';
import {Sheet} from '../components/Sheet';
import {Periods,ValueChart,type ChartPeriod} from '../components/ValueChart';
import {chartDateLabel,chartPeriodBounds} from '../core/chart-history';
import type {ProfileGrowthHistory} from '../receiz/market-projection/profile-growth';
import type {ProfileGrowthRow} from '../receiz/market-projection/profile-growth';
import type {PublicMarketItem} from '../receiz/public-market';
import {ProfileCalculationDetails} from './ProfileCalculationDetails';
import {formatMoney} from '../core/money';

const percent=(value:number)=>(value>0?'+':'')+value.toLocaleString(undefined,{maximumFractionDigits:2})+'%';
const money=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2});
export function ProfileGrowthPeek({name,total,currentValue=null,history,calculationRows,originals,unavailable,onClose,active,initialPeriod='ALL'}:{name:string;total:number|null;currentValue?:number|null;history:ProfileGrowthHistory|null;calculationRows?:ProfileGrowthRow[]|null;originals?:Pick<PublicMarketItem,'id'|'assetId'|'title'|'originalDigest'>[];unavailable:boolean;onClose():void;active:boolean;initialPeriod?:ChartPeriod}){
 const [period,setPeriod]=useState<ChartPeriod>(initialPeriod),[measure,setMeasure]=useState<'originals'|'capitalization'>('originals'),points=history?.series[period];
 const chart=useMemo(()=>{
  if(!points?.length)return null;
  if(measure==='capitalization'&&points.some(point=>point.capitalizationUsdCents===null||point.capitalizationUsdCents===undefined))return null;
  return {values:points.map(point=>measure==='originals'?point.usd:Number(point.capitalizationUsdCents)/100),times:points.map(point=>Date.parse(point.at)),range:chartPeriodBounds(points,period)};
 },[points,period,measure]);
 const last=points?.at(-1),cap=last?.capitalizationUsdCents,amount=measure==='originals'?(last?.usd??currentValue):cap===null||cap===undefined?null:Number(cap)/100;
 const change=measure==='originals'?(last?.percent??total):chart&&chart.values[0]>0?(chart.values.at(-1)!/chart.values[0]-1)*100:null;
 const label=measure==='originals'?'Originals value':'Market capitalization';
 return <Sheet title="Profile value" onClose={onClose} active={active}><div className="profile-value-peek profile-growth-peek">
  <h3>{name}</h3><div className="profile-history-switch" aria-label="Profile value measure"><button aria-pressed={measure==='originals'} onClick={()=>setMeasure('originals')}>Originals</button><button aria-pressed={measure==='capitalization'} onClick={()=>setMeasure('capitalization')}>Market cap</button></div>
  <strong className="profile-history-amount">{amount===null?'—':measure==='capitalization'?formatMoney(cap!):money.format(amount)}</strong>
  <span className="profile-history-caption">{label}</span>
  {change!==null&&<div className={'profile-history-change '+(change<0?'negative':'positive')}>{percent(change)}<span>{measure==='originals'?(period==='ALL'?'appreciation since creation':'appreciation over this period'):'over this period'}</span></div>}
  {chart?<ValueChart key={measure+period} values={chart.values} times={chart.times} timeRange={chart.range} color={change!==null&&change<0?'red':'green'} label={label} description={measure==='originals'?'Value of the displayed signed originals at each Kai pulse.':'Capitalization of the displayed signed originals, using their recorded share capacity at each Kai pulse.'} tooltip={index=>({value:measure==='originals'?money.format(points![index].usd):formatMoney(points![index].capitalizationUsdCents!),label:new Date(points![index].at).toLocaleString()})}/>:<p className="profile-history-empty" role="status">{history&&measure==='capitalization'?'Share history is not included in this saved view.':unavailable?'History is not included in this saved view.':'Preparing the collection history…'}</p>}
  <Periods value={period} onChange={setPeriod}/>{chart?.range&&<div className="chart-date-range"><span>{chartDateLabel(chart.range.start,period,chart.range)}</span><span>{chartDateLabel(chart.range.end,period,chart.range)}</span></div>}
  <details key={measure} className="profile-history-basis"><summary>{measure==='originals'?'Originals value · calculation':'Market cap · calculation'}</summary>
   {measure==='originals'?<><p>Originals value adds the current value of every displayed signed original. Appreciation compares that total with their combined starting values.</p><p>{period==='ALL'?'Each original enters the starting total at its creation value.':'Originals already present use their value at the start of the period. Originals created later enter at their creation value.'}</p>{last?.basisUsd!==undefined&&<dl><div><dt>{period==='ALL'?'Combined creation values':'Starting values'}</dt><dd>{money.format(last.basisUsd)}</dd></div><div><dt>Current originals value</dt><dd>{money.format(last.usd)}</dd></div><div><dt>Appreciation</dt><dd>{percent(last.percent)}</dd></div></dl>}<p className="profile-history-formula">(Current value ÷ starting values − 1) × 100</p></>:<><p>For each original: (outstanding shares + remaining buying capacity) × current unit value. Market cap adds those individual totals.</p><p>For native assets, issued shares are counted once. Shares already offered for resale remain part of that same supply.</p>{chart&&points&&<dl><div><dt>Displayed originals</dt><dd>{last!.assets.toLocaleString()}</dd></div><div><dt>Period opening cap</dt><dd>{formatMoney(points[0].capitalizationUsdCents!)}</dd></div><div><dt>Current Market cap</dt><dd>{formatMoney(cap!)}</dd></div>{change!==null&&<div><dt>Change over this period</dt><dd>{percent(change)}</dd></div>}</dl>}<p className="profile-history-formula">Change = (current cap ÷ period opening cap − 1) × 100</p></>}
   {history?.calculation&&calculationRows&&originals&&<ProfileCalculationDetails key={period+measure} history={history} rows={calculationRows} originals={originals} period={period} measure={measure} change={change}/>}
  </details>
 </div></Sheet>;
}
