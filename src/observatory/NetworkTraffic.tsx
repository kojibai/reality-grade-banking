import {useMemo,useState} from 'react';
import {useNetworkTraffic,type AppContribution,type TrafficObservation} from './network-traffic';

const number=new Intl.NumberFormat('en-US');
const date=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
const stamp=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'UTC'});
const dayMs=86_400_000;
const ranges={'7D':7,'30D':30,'90D':90,'1Y':365,All:Infinity};
const actionLabels=['Authorizations issued','Authorizations exchanged','Consents','Refresh tokens issued','Proof grants','Agent tokens issued','Published objects'];
const total=(values:number[])=>values.reduce((sum,n)=>sum+n,0);
const formatDay=(iso:string)=>date.format(Date.parse(iso));

function TrafficChart({days,observedAt}:{days:TrafficObservation['days'];observedAt:string}){
  const [range,setRange]=useState<keyof typeof ranges>('All');
  const [route,setRoute]=useState(''),[picked,setPicked]=useState<string|null>(null);
  const series=useMemo(()=>{
    if(!days.length)return null;
    const end=Date.parse(new Date(observedAt).toISOString().slice(0,10));
    const start=Math.max(Date.parse(days[0].day),end-(ranges[range]-1)*dayMs);
    const byDay=new Map(days.map(row=>[row.day,row.routes]));
    const routes=new Map<string,number>();
    const points=[];
    for(let at=start;at<=end;at+=dayMs){
      const day=new Date(at).toISOString().slice(0,10),counts=byDay.get(day);
      if(counts)for(const [key,value] of Object.entries(counts))routes.set(key,(routes.get(key)??0)+value);
      points.push({day,value:counts?(route?counts[route]??0:total(Object.values(counts))):0});
    }
    return {points,routes:[...routes].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))};
  },[days,observedAt,range,route]);
  const allRoutes=useMemo(()=>[...new Set(days.flatMap(row=>Object.keys(row.routes)))].sort(),[days]);
  if(!series?.points.length)return <p>Daily traffic observations are unavailable.</p>;
  const {points}=series,index=points.findIndex(p=>p.day===picked),selected=index>=0?index:points.length-1;
  const scale=Math.max(1,...points.map(p=>p.value));
  const x=(i:number)=>600*(i+.5)/points.length;
  const y=(n:number)=>88-84*n/scale;
  const inspect=(i:number)=>setPicked(points[Math.max(0,Math.min(points.length-1,i))].day);
  return <div className="obs-traffic-block">
    <div className="obs-section-head"><div><h3>Web traffic</h3><p>Receiz web · Recorded page renders</p></div><strong>{number.format(total(points.map(p=>p.value)))}</strong></div>
    <div className="obs-traffic-tools"><div className="obs-cap-period" role="group" aria-label="Web traffic range">{(Object.keys(ranges) as (keyof typeof ranges)[]).map(r=><button key={r} aria-pressed={r===range} onClick={()=>{setRange(r);setPicked(null);}}>{r}</button>)}</div>
      <div className="obs-filters"><label>Page group <select aria-label="Traffic page group" value={route} onChange={e=>{setRoute(e.target.value);setPicked(null);}}><option value="">All routes</option>{allRoutes.map(name=><option key={name}>{name}</option>)}</select></label></div></div>
    <div className="obs-traffic-plot"><div className="obs-traffic-axis"><span>{number.format(scale)}</span><span>0</span></div>
      <svg viewBox="0 0 600 90" preserveAspectRatio="none" role="img" aria-label={'Daily recorded page renders for '+(route||'all Receiz routes')+', '+formatDay(points[0].day)+' through '+formatDay(points.at(-1)!.day)}
        onPointerMove={e=>{if(e.pointerType!=='mouse')return;const box=e.currentTarget.getBoundingClientRect();inspect(Math.floor((e.clientX-box.left)*points.length/box.width));}}
        onClick={e=>{const box=e.currentTarget.getBoundingClientRect();inspect(Math.floor((e.clientX-box.left)*points.length/box.width));}}>
        {[4,46,88].map(t=><line key={t} x1="0" x2="600" y1={t} y2={t}/>)}
        {points.map((p,i)=><rect key={p.day} x={600*i/points.length} y={y(p.value)} width={600/points.length*.89} height={88-y(p.value)} className={i===selected?'selected':''}/>)}
        <line className="marker" x1={x(selected)} x2={x(selected)} y1="1" y2="89"/>
      </svg></div>
    <div className="obs-traffic-dates"><time>{formatDay(points[0].day)}</time><time>{formatDay(points.at(-1)!.day)}</time></div>
    <div className="obs-traffic-inspect"><label htmlFor="traffic-day">Inspect day</label><input id="traffic-day" type="range" min={0} max={points.length-1} value={selected} aria-valuetext={formatDay(points[selected].day)} onChange={e=>inspect(Number(e.target.value))}/>
      <output>{formatDay(points[selected].day)} · {number.format(points[selected].value)} renders</output></div>
    <details className="obs-traffic-detail"><summary>Page groups by traffic</summary><div className="obs-table-scroll"><table><thead><tr><th>Page group</th><th>Renders in range</th></tr></thead><tbody>{series.routes.map(([name,value])=><tr key={name}><th scope="row"><button className="obs-link-button" onClick={()=>{setRoute(name);setPicked(null);}}>{name}</button></th><td>{number.format(value)}</td></tr>)}</tbody></table></div></details>
    <p className="obs-source-note">One recorded browser render on entry or navigation. External app visits have no shared pageview count. Updated {stamp.format(Date.parse(observedAt))} UTC.</p>
  </div>;
}

function AppDirectory({data}:{data:TrafficObservation}){
  const [sort,setSort]=useState<'identities'|'firstIdentities'|'actions'>('identities');
  const [selected,setSelected]=useState<AppContribution|null>(null);
  const rows=useMemo(()=>data.apps.map((app,index)=>{
    const kinds=actionLabels.map((_,i)=>total(app.days.map(d=>Number(d[i+1]))));
    return {app,index,kinds,actions:total(kinds)};
  }).sort((a,b)=>(sort==='actions'?b.actions-a.actions:b.app[sort]-a.app[sort])||a.app.name.localeCompare(b.app.name)||a.index-b.index),[data,sort]);
  const selectedRow=selected&&rows.find(r=>r.app===selected||r.app.name===selected.name&&r.app.registered===selected.registered&&data.apps.filter(a=>a.name===selected.name&&a.registered===selected.registered).length===1);
  const tied=data.identities-total(rows.map(r=>r.app.firstIdentities));
  const connectedMax=Math.max(1,...rows.map(row=>row.app.identities));
  return <div className="obs-traffic-block"><div className="obs-section-head"><div><h3>Developer network</h3><p>{number.format(rows.length)} app registrations · {number.format(rows.filter(r=>r.app.active).length)} active</p></div></div>
    <div className="obs-app-metrics"><div><span>Distinct connected identities</span><strong>{number.format(data.identities)}</strong></div><div><span>App-attributed records</span><strong>{number.format(total(rows.map(r=>r.actions)))}</strong></div></div>
    <p className="obs-source-note">An identity can appear under several apps and counts once across the network. First seen credits the earliest dated app connection in the available records. The account’s creation app is unreported.{tied>0&&' '+number.format(tied)+' identities share an earliest date across apps.'}</p>
    <div className="obs-filters"><label>Rank apps by <select value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="identities">Connected identities</option><option value="firstIdentities">First seen</option><option value="actions">Activity records</option></select></label></div>
    <div className="obs-table-scroll obs-app-table" tabIndex={0} aria-label="Registered app contributions"><table><thead><tr><th>App registration</th><th>Connected</th><th>First seen</th><th>Records</th></tr></thead><tbody>{rows.map(row=><tr key={row.index}><th scope="row"><button className="obs-app-select" aria-expanded={selectedRow===row} aria-controls="app-contribution-detail" onClick={()=>setSelected(selectedRow===row?null:row.app)}>{row.app.name}<small>Registered {formatDay(row.app.registered)}</small></button></th><td>{number.format(row.app.identities)}<i className="obs-identity-share" style={{width:100*row.app.identities/connectedMax+'%'}}/></td><td>{number.format(row.app.firstIdentities)}</td><td>{number.format(row.actions)}</td></tr>)}</tbody></table></div>
    {selectedRow&&<div id="app-contribution-detail" className="obs-app-inspector"><h4>{selectedRow.app.name} · Recorded activity</h4>
      <AppActivityChart app={selectedRow.app} observedAt={data.observedAt}/>
      <div className="obs-app-kinds">{actionLabels.map((name,i)=><span key={name}>{name}<b>{number.format(selectedRow.kinds[i])}</b></span>)}</div>
      {selectedRow.app.days.length>0&&<details className="obs-traffic-detail"><summary>Daily actions · UTC</summary><div className="obs-table-scroll"><table><thead><tr><th>Date</th>{actionLabels.map(name=><th key={name}>{name}</th>)}</tr></thead><tbody>{selectedRow.app.days.slice().reverse().map(([day,...counts])=><tr key={day}><th scope="row">{formatDay(day)}</th>{counts.map((n,k)=><td key={k}>{number.format(n)}</td>)}</tr>)}</tbody></table></div></details>}</div>}
    <p className="obs-source-note">Counts cover retained authorization records and verified app publications. {number.format(data.unattributedPublications)} published objects have no matching registered app.</p>
  </div>;
}

function AppActivityChart({app,observedAt}:{app:AppContribution;observedAt:string}){
  if(!app.days.length)return <p className="obs-source-note">No app-attributed records in this observation.</p>;
  const first=Date.parse(app.registered),last=Date.parse(observedAt.slice(0,10));
  const start=Math.min(first,Date.parse(app.days[0][0])),span=Math.max(1,last-start);
  let n=0;
  const points=app.days.map(([day,...counts])=>({x:600*(Date.parse(day)-start)/span,count:n+=total(counts)}));
  const path='M0,64'+points.map(p=>'H'+p.x.toFixed(2)+'V'+(64-60*p.count/n).toFixed(2)).join('')+'H600';
  return <><svg className="obs-app-chart" viewBox="0 0 600 68" preserveAspectRatio="none" role="img" aria-label={app.name+', '+number.format(n)+' cumulative app-attributed records'}>
    <path className="obs-wallet-area" d={path+'V68H0Z'}/><path className="obs-wallet-series" d={path}/></svg>
    <div className="obs-traffic-dates"><time>{date.format(start)}</time><time>{date.format(last)}</time></div></>;
}

export function NetworkTraffic(){
  const data=useNetworkTraffic();
  return <><TrafficChart days={data.days} observedAt={data.observedAt}/><AppDirectory data={data}/></>;
}
