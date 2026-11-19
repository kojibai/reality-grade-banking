import {useEffect, useMemo, useRef, useState} from 'react';
import {ArrowUpRight, X} from 'lucide-react';
import {sampleChartIndices} from '../core/chart-history';
import {visibleHistory, type HistoryPoint} from './circulation-history';
import {periodBounds, periods, type Period} from './activity';

export const headlineNames = {
  cap: 'Global market cap',
  assets: 'Assets in circulation',
  hours: 'Witnessed hours',
  ledger: 'Public ledger records',
} as const;
const destinations = {
  cap: {label:'Open Global Market Cap', href:'/market-cap/'},
  assets: {label:'Explore assets', href:'/explore/'},
  hours: {label:'Open Audience', href:'#obs-audience'},
  ledger: {label:'Open Public Ledger', href:'/ledger/'},
} as const;
export type Headline = keyof typeof headlineNames;
export type {HistoryPoint} from './circulation-history';

const dates = new Intl.DateTimeFormat('en-US', {month:'short', day:'numeric', year:'numeric', timeZone:'UTC'});
const times = new Intl.DateTimeFormat('en-GB', {hour:'2-digit', minute:'2-digit', timeZone:'UTC'});
const units = new Intl.NumberFormat('en-US', {maximumFractionDigits:1});
const dollars = new Intl.NumberFormat('en-US', {style:'currency', currency:'USD'});
const emptyHistory:readonly HistoryPoint[]=[];
const notes: Record<Headline,string> = {
  cap: 'Public share capitalization at each recorded valuation.',
  assets: 'Dated issuance counts each asset and collectible once, on its recorded issue date.',
  hours: 'Combined viewing and streaming hours reported by public profiles.',
  ledger: 'Cumulative dated records across all public ledger sources, through each source’s observation time.',
};

export function HeadlineHistory({metric, points, observations=emptyHistory, onClose}: {
  metric: Headline; points: readonly HistoryPoint[]; observations?:readonly HistoryPoint[]; onClose: ()=>void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [period,setPeriod] = useState<Period>('All');
  const [picked,setPicked] = useState<number|null>(null);
  useEffect(()=>{if (dialog.current && !dialog.current.open) dialog.current.showModal();},[]);
  const [selectedObservation,setSelectedObservation]=useState<HistoryPoint|null>(null);
  const history=points;
  const end=Math.max(observations.at(-1)?.at??0,history.at(-1)?.at??0);
  const first=Math.min(history[0]?.at??end,observations[0]?.at??end);
  const start=Math.max(first,periodBounds(first,period,end).start);
  const markers=useMemo(()=>observations.filter(p=>p.at>=start&&p.at<=end),[observations,start,end]);
  const rows = useMemo(()=>visibleHistory(history,start,end),[history,start,end]);
  const plot = useMemo(()=>{
    if (!rows.length && !markers.length) return null;
    const values=rows.map(p=>p.value);
    let low=values[0]??markers[0].value, high=low;
    for(const value of [...values,...markers.map(marker=>marker.value)]){low=Math.min(low,value); high=Math.max(high,value);}
    const x=(at:number)=>end===start?100:100*(at-start)/(end-start);
    const y=(v:number)=>high===low?50:92-84*(v-low)/(high-low);
    const step=metric!=='cap';
    const indices=metric==='assets'||metric==='hours'?rows.keys():sampleChartIndices(values,240,rows.map(p=>p.at));
    const parts:string[]=[];
    for(const i of indices){
      const px=x(rows[i].at).toFixed(3), py=y(values[i]).toFixed(3);
      parts.push(i===0?'M'+px+','+py:step?'H'+px+'V'+py:'L'+px+','+py);
    }
    const path=rows.length===1?'M0,'+y(values[0])+' H100':parts.join(' ');
    return {path,area:path+' V100 H0 Z',x,y,low,high};
  },[rows,start,end,metric,markers]);
  const i=picked===null?rows.length-1:Math.min(picked,rows.length-1);
  const point=selectedObservation??rows[i]??markers.at(-1);
  const observedAt=point?.observedAt??point?.at;
  const format=(value:number)=>metric==='cap'?dollars.format(value):units.format(value)+(metric==='hours'?' h':'');
  const label=(at:number)=>(end-start<86400000?times:dates).format(at);
  return <dialog className="obs-headline-dialog" aria-labelledby="obs-headline-title" ref={dialog} onClose={onClose}
    onClick={event=>{if(event.target===dialog.current){const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.current?.close();}}}>
    <div className="obs-headline-heading"><h2 id="obs-headline-title">{headlineNames[metric]}</h2>
      <button type="button" aria-label="Close chart" autoFocus onClick={()=>dialog.current?.close()}><X size={19} aria-hidden="true"/></button></div>
    {metric==='assets'&&<div className="obs-issuance-legend"><span>Dated issuance</span><span>Inventory observations</span></div>}
    {point&&plot&&observedAt!==undefined?<><output className="obs-headline-reading"><strong>{format(point.value)}</strong>{metric==='assets'&&<small>{selectedObservation||!rows.length?'Published inventory':'Dated issuance'}</small>}<time>{point.observedAt!==undefined?'Last recorded ':''}{dates.format(observedAt)} · {times.format(observedAt)} UTC</time></output>
      <div className="obs-headline-ranges" role="group" aria-label="History range">{periods.map(p=><button key={p} type="button" aria-pressed={period===p} onClick={()=>{setPeriod(p);setPicked(null);setSelectedObservation(null);}}>{p==='All'?'All time':p}</button>)}</div>
      <div className="obs-headline-scale"><span>Low {format(plot.low)}</span><span>High {format(plot.high)}</span></div>
      <div className="obs-headline-field" onPointerMove={event=>{
        if(rows.length<2||event.target instanceof Element&&event.target.closest('.obs-inventory-point'))return;
        setSelectedObservation(null);
        const r=event.currentTarget.getBoundingClientRect(),at=start+(end-start)*Math.max(0,Math.min(1,(event.clientX-r.left)/r.width));
        let lo=0,hi=rows.length-1;
        while(lo<hi){const mid=Math.floor((lo+hi)/2);if(rows[mid].at<at)lo=mid+1;else hi=mid;}
        const step=metric!=='cap';
        setPicked(lo>0&&at<rows[lo].at&&(step||at-rows[lo-1].at<rows[lo].at-at)?lo-1:lo);
      }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={headlineNames[metric]+' history, '+dates.format(start)+' to '+dates.format(end)}>
          {[8,50,92].map(y=><line key={y} x1="0" x2="100" y1={y} y2={y}/>)}
          {plot.path&&<><path className="obs-headline-area" d={plot.area}/><path className="obs-headline-line" d={plot.path}/></>}
        </svg>
        {markers.map(marker=><button className="obs-inventory-point" key={marker.at} type="button"
          style={{left:plot.x(marker.at)+'%',top:plot.y(marker.value)+'%'}} onClick={()=>setSelectedObservation(marker)}
          aria-label={'Inventory on '+dates.format(marker.at)+', '+format(marker.value)} title={dates.format(marker.at)+' · '+format(marker.value)}/>)}
        <i className="obs-headline-cursor" style={{left:plot.x(point.at)+'%'}}/><i className="obs-headline-dot" style={{left:plot.x(point.at)+'%',top:plot.y(point.value)+'%'}}/>
      </div>
      <div className="obs-headline-dates"><time>{label(start)}</time><time>{label(end)}</time></div>
      <input type="range" aria-label="Inspect historical reading" aria-valuetext={format(point.value)+', recorded '+dates.format(observedAt)+' '+times.format(observedAt)+' UTC'} min={0} max={Math.max(0,rows.length-1)} disabled={rows.length<2} value={Math.max(0,i)} onChange={e=>{setSelectedObservation(null);setPicked(Number(e.target.value));}}/>
      <p>{notes[metric]}</p></>:<p>No dated readings are available yet.</p>}
    <footer className="obs-headline-footer"><a href={destinations[metric].href} onClick={()=>dialog.current?.close()}>
      {destinations[metric].label}<ArrowUpRight size={16} aria-hidden="true"/>
    </a></footer>
  </dialog>;
}
