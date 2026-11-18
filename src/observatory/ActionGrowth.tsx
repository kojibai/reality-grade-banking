import {useMemo,useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {cumulativeActions,periodBounds,periods,type Period,type TimedRecord} from './activity';

const featured=[
  ['receiz.seal.document','Documents sealed'],
  ['receiz.chat.message','Messages saved'],
  ['market.share.buy','Share purchases'],
  ['market.share.sell','Share sales'],
] as const;
const number=new Intl.NumberFormat('en-US');
const date=new Intl.DateTimeFormat('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'});
const time=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'});

export function ActionGrowth({actions,asOf,onInspect}:{actions:readonly TimedRecord[];asOf:number|null;onInspect:(kind:string,period:Period)=>void}){
  const [period,setPeriod]=useState<Period>('All');
  const [kind,setKind]=useState('');
  const byKind=useMemo(()=>{
    const groups=new Map<string,number[]>();
    if(asOf===null)return groups;
    for(const event of actions){
      if(event.time>asOf)break;
      const times=groups.get(event.record.kind);
      if(times)times.push(event.time);
      else groups.set(event.record.kind,[event.time]);
    }
    return groups;
  },[actions,asOf]);
  const kinds=useMemo(()=>Array.from(byKind.keys()).sort(),[byKind]);
  const services=useMemo(()=>{
    const groups=new Map<string,Map<string,number>>();
    if(asOf===null)return [];
    const {start}=periodBounds(actions[0]?.time,period,asOf);
    for(const event of actions){
      if(event.time<start)continue;
      if(event.time>asOf)break;
      const scope=event.record.details?.actionScope;
      const label=typeof scope==='string'&&scope?scope:'Unspecified service';
      let counts=groups.get(label);
      if(!counts){counts=new Map();groups.set(label,counts);}
      counts.set(event.record.kind,(counts.get(event.record.kind)??0)+1);
    }
    return [...groups].map(([name,counts])=>({name,counts:[...counts].sort((a,b)=>b[1]-a[1]),total:[...counts.values()].reduce((a,b)=>a+b,0)})).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name));
  },[actions,asOf,period]);
  if(asOf===null||!kinds.length)return null;
  const {start,end}=periodBounds(actions[0]?.time,period,asOf);
  const visible:readonly (readonly [string,string])[]=kind?[[kind,kind]]:featured.filter(([key])=>byKind.has(key));
  const axis=period==='1H'||period==='24H'?time:date;
  return <div className="obs-action-growth">
    <div className="obs-section-head"><h3>Recorded actions over time</h3></div>
    <div className="obs-filters"><label>Action type <select aria-label="Growth by action type" value={kind} onChange={e=>setKind(e.target.value)}>
      <option value="">Featured actions</option>
      {kinds.map(key=><option key={key} value={key}>{key}</option>)}
    </select></label></div>
    <div className="obs-cap-period" role="group" aria-label="Action growth range">{periods.map(p=><button key={p} aria-pressed={period===p} onClick={()=>setPeriod(p)}>{p}</button>)}</div>
    <div className="obs-growth-grid">{visible.map(([key,label])=>{
      const series=cumulativeActions(byKind.get(key)??[],start,end);
      const max=Math.max(1,series.total);
      const path=series.points.map((point,i)=>{
        const x=(600*i/(series.points.length-1)).toFixed(2),y=(90-88*point.count/max).toFixed(2);
        return i?'H'+x+'V'+y:'M0,'+y;
      }).join('');
      return <div className="obs-growth" key={key}>
        <button className="obs-growth-inspect" aria-label={'Inspect '+label+' in Network pulse'} onClick={()=>onInspect(key,period)}>{label}<ArrowUpRight size={15}/></button>
        <strong>{number.format(series.total)}</strong><small>+{number.format(series.added)} in range</small>
        <svg viewBox="0 0 600 94" preserveAspectRatio="none" role="img" aria-label={label+', '+series.added+' dated records in range, '+series.total+' cumulative'}>
          {[2,46,90].map(y=><line key={y} x1="0" x2="600" y1={y} y2={y}/>)}
          <path className="obs-area" d={path+' V94 H0 Z'}/><path className="obs-line" d={path}/>
        </svg><div><time>{axis.format(start)}</time><time>{axis.format(end)}</time></div>
      </div>;
    })}</div>
    <details className="obs-traffic-detail"><summary>Actions by Receiz service · {services.length} in range</summary><div className="obs-service-list">{services.map(group=><details key={group.name}><summary>{group.name} · {number.format(group.total)}</summary><ul>{group.counts.map(([action,count])=><li key={action}>{action}<b>{number.format(count)}</b></li>)}</ul></details>)}</div></details>
  </div>;
}
