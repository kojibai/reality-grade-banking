import {useEffect,useMemo,useState} from 'react';
import {periodBounds,periods,type Period} from './activity';
import archive from './audience-observations.json';
import {profilePagePath} from '../receiz/public-profile';
import type {observeCatalog} from './catalog';

const metrics={views:'Original views',plays:'Stream plays',seconds:'Witnessed hours'};
type Metric=keyof typeof metrics;
type Reading={value:number|null;covered:number};
type Observation={at:string;reported?:Partial<Record<Metric,Reading>>;intervals?:({from:string}&Partial<Record<Metric,Reading>>)[]}&Record<Metric,Reading>;
const number=new Intl.NumberFormat('en-US',{maximumFractionDigits:1});
const date=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
const shortTime=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'});
export function useAudienceSeries(overview:ReturnType<typeof observeCatalog>|null,observedAt:string|null){
  const [series,setSeries]=useState<Observation[]>(()=>{
    const last=archive[archive.length-1];
    if(!overview||!observedAt||!(Date.parse(observedAt)>Date.parse(last.at)))return archive;
    return [...archive,{at:observedAt,views:overview.views,plays:overview.plays,seconds:overview.seconds}];
  });
  useEffect(()=>{
    if(!overview||!overview.views.covered&&!overview.plays.covered&&!overview.seconds.covered)return;
    const {views,plays,seconds}=overview;
    const seen=Date.parse(observedAt??'');
    if(!Number.isFinite(seen)||seen>Date.now())return;
    setSeries(prior=>{
      const last=prior[prior.length-1];
      if(seen<=Date.parse(last.at))return prior;
      return [...prior,{at:new Date(seen).toISOString(),views,plays,seconds}];
    });
  },[overview,observedAt]);
  return series;
}
export function AudienceHistory({overview,series}:{overview:ReturnType<typeof observeCatalog>|null;series:Observation[]}){
  const [metric,setMetric]=useState<Metric>('views');
  const [mode,setMode]=useState<'profiles'|'history'>('history'),[focus,setFocus]=useState<number|null>(null),[page,setPage]=useState(0);
  const bands=useMemo(()=>{
    const starts=metric==='seconds'?[0,1/3600,1,10,100,1000]:[0,1,10,100,1000,10000];
    const labels=metric==='seconds'?['0 hours','Under 1 hour','1–<10 hours','10–<100 hours','100–<1k hours','1k+ hours']:['0','1–9','10–99','100–999','1k–9,999','10k+'];
    const groups=starts.map((_,i)=>({label:labels[i],profiles:[] as NonNullable<typeof overview>['profiles']}));
    for(const profile of overview?.profiles??[]){
      const reading=profile.stats[metric];if(reading===null)continue;
      const value=metric==='seconds'?reading/3600:reading;
      let i=starts.length-1;while(i>0&&value<starts[i])i--;
      groups[i].profiles.push(profile);
    }
    for(const group of groups)group.profiles.sort((a,b)=>b.stats[metric]!-a.stats[metric]!||a.username.localeCompare(b.username));
    return groups;
  },[metric,overview]);
  const chosen=focus===null?null:bands[focus],maxBand=Math.max(1,...bands.map(b=>b.profiles.length));
  const reading=overview?.[metric],current=reading?.value;
  return <div className="obs-audience-history"><div className="obs-section-head"><div><h3>Audience reach</h3><p>{current!=null?number.format(current/(metric==='seconds'?3600:1))+' '+metrics[metric].toLowerCase():'Measurement unavailable'} · {number.format(reading?.covered??0)} of {number.format(overview?.profiles.length??0)} public profiles reporting</p></div></div>
    <div className="obs-cap-period" aria-label="Audience metric">{(Object.keys(metrics) as Metric[]).map(key=><button key={key} aria-pressed={metric===key} onClick={()=>{setMetric(key);setFocus(null);setPage(0);}}>{metrics[key]}</button>)}</div>
    <div className="obs-mode" aria-label="Audience breakdown"><button aria-pressed={mode==='profiles'} onClick={()=>setMode('profiles')}>By profile</button><button aria-pressed={mode==='history'} onClick={()=>setMode('history')}>Totals over time</button></div>
    {mode==='profiles'?<><div className="obs-band-chart">{bands.map((band,i)=><button aria-pressed={focus===i} key={band.label} aria-label={band.label+' '+metrics[metric].toLowerCase()+', '+band.profiles.length+' profiles'} onClick={()=>{setFocus(focus===i?null:i);setPage(0);}}><span>{band.label}</span><i><b style={{width:(band.profiles.length/maxBand*100)+'%'}}/></i><strong>{number.format(band.profiles.length)} profiles</strong></button>)}</div>
    {chosen&&<div className="obs-band-members"><h4>{chosen.label} · {metrics[metric]}</h4>{chosen.profiles.slice(page*20,(page+1)*20).map(p=><a href={profilePagePath(p.username)} key={p.username}><span>@{p.username}</span><b>{number.format(p.stats[metric]!/(metric==='seconds'?3600:1))}</b></a>)}{!chosen.profiles.length&&<p>No reporting profiles in this range.</p>}{chosen.profiles.length>20&&<div className="obs-pager"><button disabled={!page} onClick={()=>setPage(n=>n-1)}>Previous</button><span>{page+1} / {Math.ceil(chosen.profiles.length/20)}</span><button disabled={(page+1)*20>=chosen.profiles.length} onClick={()=>setPage(n=>n+1)}>Next</button></div>}</div>}</>:<>
    <PublicationChart series={series} metric={metric}/></>}</div>;
}

function PublicationChart({series,metric}:{series:Observation[];metric:Metric}){
  const [period,setPeriod]=useState<Period>('All');
  const [picked,setPicked]=useState<string|null>(null);
  const published=series.filter(p=>p[metric].value!==null);
  if(!published.length)return <p>No published readings for this metric.</p>;
  const last=Date.parse(published.at(-1)!.at);
  const {start:first}=periodBounds(Date.parse(published[0].at),period,last);
  const rows=published.filter(p=>Date.parse(p.at)>=first);
  const values=rows.map(p=>p[metric].value!/(metric==='seconds'?3600:1));
  const high=Math.max(...values,1);
  const selectedIndex=rows.findIndex(p=>p.at===picked);
  const selection=selectedIndex<0?rows.length-1:selectedIndex;
  const selected=rows[selection];
  const coordinates=rows.map((p,i)=>({x:100*(Date.parse(p.at)-first)/Math.max(1,last-first),y:93-86*values[i]/high}));
  const line=coordinates.map(({x,y},i)=>(i?'L':'M')+x.toFixed(3)+','+y.toFixed(3)).join(' ');
  const tick=period==='1H'||period==='24H'?shortTime:date;
  return <>
    <p>The line combines each public profile’s latest reported total. Each point marks a publication. Activity between readings has no finer public timestamp.</p>
    <div className="obs-cap-period" role="group" aria-label="Audience history range">
      {periods.map(p=><button key={p} aria-pressed={period===p} onClick={()=>{setPeriod(p);setPicked(null);}}>{p}</button>)}
    </div>
    <div className="obs-observation-plot" aria-label={metrics[metric]+' publication history'}>
      <div className="obs-observation-y"><span>{number.format(high)}</span><span>0</span></div>
      <div className="obs-observation-field"><svg className="obs-published-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d={line}/></svg>{rows.map((p,i)=><button type="button" key={p.at} aria-pressed={i===selection}
        aria-label={p.at+' · '+number.format(values[i])+' '+metrics[metric].toLowerCase()+' · '+p[metric].covered+' profiles'}
        onClick={()=>setPicked(p.at)} style={{left:((Date.parse(p.at)-first)/Math.max(1,last-first)*100)+'%',bottom:(values[i]/high*86+7)+'%'}}/>)}</div>
    </div>
    <div className="obs-observation-dates"><time>{tick.format(first)}</time><time>{tick.format(last)}</time></div>
    <div className="obs-audience-inspect">
      <label htmlFor="obs-publication-index">Inspect publication</label>
      <input id="obs-publication-index" type="range" min={0} max={rows.length-1} value={selection} disabled={rows.length<2} aria-valuetext={selected.at} onChange={e=>setPicked(rows[Number(e.target.value)].at)}/>
      <output>{selected.at.slice(0,16).replace('T',' ')} UTC · <b>{number.format(values[selection])}</b> {metrics[metric].toLowerCase()} · {number.format(selected[metric].covered)} {selected[metric].covered===1?'profile':'profiles'}</output>
    </div>
    {selected.intervals?.some(interval=>interval[metric]?.covered)&&<details><summary>Changes among returning profiles</summary>
      <div className="obs-table-scroll"><table><thead><tr><th>Previous reading (UTC)</th><th>Profiles compared</th><th>Net change</th></tr></thead>
      <tbody>{selected.intervals.filter(interval=>interval[metric]?.covered).map(interval=>{
        const delta=interval[metric]!,change=(delta.value??0)/(metric==='seconds'?3600:1);
        return <tr key={interval.from}><td>{interval.from.slice(0,16).replace('T',' ')}</td><td>{delta.covered}</td><td>{change>0?'+':''}{number.format(change)}</td></tr>;
      })}</tbody></table></div></details>}
    <details><summary>{number.format(rows.length)} published {rows.length===1?'reading':'readings'}</summary>
      <div className="obs-table-scroll"><table><thead><tr><th>Observed (UTC)</th><th>{metrics[metric]}</th><th>Profiles included</th><th>Profiles in this release</th></tr></thead>
      <tbody>{rows.map((p,i)=><tr key={p.at}><td>{p.at.slice(0,16).replace('T',' ')}</td><td>{number.format(values[i])}</td><td>{p[metric].covered}</td><td>{p.reported?.[metric]?.covered??'—'}</td></tr>)}</tbody></table></div>
    </details>
  </>;
}

export function AudienceSpark({points,label,publications=false}:{points:readonly {at:number;value:number}[];label:string;publications?:boolean}){
  if(!points.length)return null;
  const first=points[0],last=points[points.length-1],min=Math.min(...points.map(p=>p.value)),max=Math.max(...points.map(p=>p.value));
  const path=points.map((p,i)=>{const x=100*(p.at-first.at)/Math.max(1,last.at-first.at),y=max===min?22:39-35*(p.value-min)/(max-min);return i?(publications?'L'+x.toFixed(2)+','+y.toFixed(2):'H'+x.toFixed(2)+'V'+y.toFixed(2)):'M0,'+y.toFixed(2);}).join('');
  return <div className="obs-audience-spark"><svg viewBox="0 0 100 42" preserveAspectRatio="none" role="img" aria-label={label+' from '+date.format(first.at)+' to '+date.format(last.at)+', '+number.format(first.value)+' to '+number.format(last.value)}>
    <path className="obs-wallet-area" d={path+' V42 H0 Z'}/><path className="obs-wallet-series" d={path}/></svg><small>{publications&&'Published · '}{date.format(first.at)} – {date.format(last.at)}</small></div>;
}
