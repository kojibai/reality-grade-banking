import {useMemo,useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {formatMoney} from '../core/money';
import {periods,type MarketExecution,type Period} from './activity';
import {TradeTape} from './TradeTape';
import {tradingWindow} from './market-trades';

const sides=['buy','sell'] as const;
const names={buy:'Buy',sell:'Sell'};
const dollars=(v:bigint)=>formatMoney(v.toString());
const date=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
const clock=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'});

type Window=ReturnType<typeof tradingWindow>;
type Metric='volume'|'count'|'price';

function TradingPlot({view,metric,selected,onSelect}:{view:Window;metric:Metric;selected:number|null;onSelect:(index:number|null)=>void}){
  const {buckets}=view;
  const geometry=useMemo(()=>{
    const paths={buy:'',sell:''},candles={up:'',down:''},n=buckets.length;
    const value=(i:number,side:typeof sides[number])=>metric==='volume'?buckets[i][side].volume:BigInt(buckets[i][side].count);
    let peak=0n,low:bigint|undefined,high:bigint|undefined;
    for(const [i,b] of buckets.entries()){
      for(const side of sides)if(value(i,side)>peak)peak=value(i,side);
      if(b.candle){if(low===undefined||b.candle.low<low)low=b.candle.low;if(high===undefined||b.candle.high>high)high=b.candle.high;}
    }
    const w=600/n,priceY=(p:bigint)=>high===low?46:86-80*Number(p-low!)/Number(high!-low!);
    for(const [i,b] of buckets.entries()){
      if(metric==='price'){
        const c=b.candle;if(!c)continue;
        const x=(i+.5)*w,yo=priceY(c.open),yc=priceY(c.close),half=w*.3;
        candles[c.close>=c.open?'up':'down']+='M'+x.toFixed(2)+' '+priceY(c.high).toFixed(2)+'V'+priceY(c.low).toFixed(2)+'M'+(x-half).toFixed(2)+' '+Math.min(yo,yc).toFixed(2)+'h'+(2*half).toFixed(2)+'v'+Math.max(.7,Math.abs(yc-yo)).toFixed(2)+'h-'+(2*half).toFixed(2)+'Z';
      }else{
        for(const side of sides){
          const v=value(i,side);if(v===0n)continue;
          const height=Math.max(.7,82*Number(v)/Number(peak));
          paths[side]+='M'+((i+(side==='buy'?.1:.51))*w).toFixed(2)+' 89v-'+height.toFixed(2)+'h'+(w*.39).toFixed(2)+'v'+height.toFixed(2)+'Z';
        }
      }
    }
    return {paths,candles,peak,low,high};
  },[buckets,metric]);
  const heading=metric==='price'?'Execution price':metric==='volume'?'Trading volume':'Executed trades';
  const point=selected===null?null:buckets[selected];
  const at=selected===null?null:Math.min(view.end,view.start+selected*view.width);
  const format=metric==='volume'?dollars:(v:bigint)=>v.toLocaleString('en-US');
  const unavailable=metric==='price'&&geometry.low===undefined;
  return <div className="obs-trading-plot">
    <div className="obs-trading-title"><h3>{heading}</h3><span>{metric==='price'?'USD / share':metric==='volume'?'USD before fees':'Trade count'}</span></div>
    <div className="obs-trading-field" role="slider" tabIndex={0} aria-label={'Inspect '+heading.toLowerCase()} aria-valuemin={1} aria-valuemax={buckets.length} aria-valuenow={(selected??buckets.length-1)+1}
      aria-valuetext={at===null?'Full period':date.format(at)+' '+clock.format(at)+' UTC'}
      onPointerMove={event=>{if(event.pointerType==='mouse'){const rect=event.currentTarget.getBoundingClientRect();onSelect(Math.max(0,Math.min(buckets.length-1,Math.floor((event.clientX-rect.left)/rect.width*buckets.length))));}}}
      onPointerDown={event=>{const rect=event.currentTarget.getBoundingClientRect();onSelect(Math.max(0,Math.min(buckets.length-1,Math.floor((event.clientX-rect.left)/rect.width*buckets.length))));}}
      onKeyDown={event=>{const i=selected??buckets.length-1;if(['ArrowLeft','ArrowRight','Home','End','Escape'].includes(event.key)){event.preventDefault();onSelect(event.key==='Escape'?null:event.key==='Home'?0:event.key==='End'?buckets.length-1:Math.max(0,Math.min(buckets.length-1,i+(event.key==='ArrowLeft'?-1:1))));}}}>
      <svg viewBox="0 0 600 94" preserveAspectRatio="none" role="img" aria-label={heading+' by interval'}>
        {[6,47,89].map(y=><line key={y} x1="0" x2="600" y1={y} y2={y} className="obs-trading-rule"/>)}
        {metric==='price'?(['up','down'] as const).map(k=><path key={k} className={'obs-candle '+k} d={geometry.candles[k]}/>):sides.map(s=><path key={s} className={'obs-trade-'+s} d={geometry.paths[s]}/>)}
        {selected!==null&&<line className="obs-trading-cursor" x1={(selected+.5)*600/buckets.length} x2={(selected+.5)*600/buckets.length} y1="0" y2="94"/>}
      </svg>
      {unavailable&&<small>No execution prices in this period</small>}
    </div>
    <div className="obs-trading-axis"><span>{view.end-view.start<=86400000?clock.format(view.start):date.format(view.start)}</span><span>{metric==='price'?geometry.low!==undefined&&geometry.high!==undefined?dollars(geometry.low)+' – '+dollars(geometry.high):'—':'Peak '+format(geometry.peak)}</span><span>{view.end-view.start<=86400000?clock.format(view.end):date.format(view.end)}</span></div>
    {point&&<output>{metric==='price'?point.candle?['open','high','low','close'].map(k=>k.charAt(0).toUpperCase()+' '+dollars(point.candle![k as keyof typeof point.candle])).join(' · '):'No price in interval':sides.map(s=>names[s]+' '+(metric==='volume'?(point[s].count&&!point[s].priced?'—':dollars(point[s].volume)):point[s].count.toLocaleString('en-US'))).join(' · ')}</output>}
  </div>;
}

export function TradingActivity({executions,asOf}:{executions:readonly MarketExecution[];asOf:number|null}){
  const [asset,setAsset]=useState(''),[period,setPeriod]=useState<Period>('All'),[picked,setPicked]=useState<number|null>(null);
  const markets=useMemo(()=>{
    const names=new Map<string,string>();
    for(const {trade,time} of executions)if(asOf!==null&&time<=asOf&&trade?.marketItemId)names.set(trade.marketItemId,trade.title||trade.marketItemId);
    return [...names].sort((a,b)=>a[1].localeCompare(b[1],'en')||a[0].localeCompare(b[0],'en'));
  },[executions,asOf]);
  const view=useMemo(()=>tradingWindow(executions,asset,period,asOf??0),[executions,asset,period,asOf]);
  if(asOf===null)return null;
  const reset=()=>setPicked(null);
  const select=setPicked;
  const current=picked===null?view.executions:view.buckets[picked].executions;
  const volume=view.totals.buy.volume+view.totals.sell.volume;
  const priced=view.totals.buy.priced+view.totals.sell.priced;
  const inspectedAt=picked===null?null:Math.min(view.end,view.start+picked*view.width);
  return <section id="obs-trading"><div className="obs-section-head"><div><p className="obs-label">Public market</p><h2>Trading activity</h2></div><a href="/ledger/">Ledger <ArrowUpRight/></a></div>
    <div className="obs-trading-desk">
      <div className="obs-trading-controls"><select aria-label="Trading asset" value={asset} onChange={e=>{setAsset(e.target.value);reset();}}><option value="">All assets</option>{markets.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select>
        <div role="group" aria-label="Trading range">{periods.map(p=><button type="button" key={p} aria-pressed={period===p} onClick={()=>{setPeriod(p);reset();}}>{p==='All'?'All time':p}</button>)}</div></div>
      <div className="obs-trading-summary"><div><h3>Total trading volume</h3><strong>{!priced&&view.executions.length?'—':dollars(volume)}</strong><small>{priced.toLocaleString('en-US')} valued executions · USD before fees</small></div>{view.vwap!==null&&<div><h3><abbr title="Volume-weighted average execution price">VWAP</abbr></h3><b>{dollars(view.vwap)}</b><small>Per share</small></div>}</div>
      <div className="obs-trading-totals">{sides.map(s=>{const side=view.totals[s];return <div key={s}><h3><i className={'obs-trade-'+s}/>{names[s]} volume</h3><strong>{side.count&&!side.priced?'—':dollars(side.volume)}</strong><small>{side.count.toLocaleString('en-US')} {s==='buy'?'buys':'sales'}{volume>0n?' · '+(Number((side.volume*1000n+volume/2n)/volume)/10).toFixed(1)+'% of volume':''}{side.priced<side.count?' · '+side.priced+' with recorded value':''}</small></div>;})}</div>
      <TradingPlot metric={asset?'price':'count'} view={view} selected={picked} onSelect={select}/>
      <TradingPlot metric="volume" view={view} selected={picked} onSelect={select}/>
      <div className="obs-trading-asof"><span>{inspectedAt===null?'Through':'Interval starting'} {date.format(inspectedAt??asOf)} · {clock.format(inspectedAt??asOf)} UTC</span>{picked!==null&&<button onClick={()=>select(null)}>Show full period</button>}</div>
    </div>
    <TradeTape key={asset+'|'+period+'|'+(picked??'all')} executions={current}/>
  </section>;
}
