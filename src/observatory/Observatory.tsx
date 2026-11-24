import {networkCollectibleSealTimes,datedIssuances} from './circulation-history';
import {useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore} from 'react';
import {ArrowDown, ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play} from 'lucide-react';
import {ObservatoryHeader} from './ObservatoryHeader';
import {ProfileFooter} from '../public-explorer/ProfileFooter';
import {formatMoney} from '../core/money';
import {PUBLIC_SOURCES, type PublicRecord, type PublicSource} from '../receiz/public-network';
import {documentSourceStates,type usePublicNetwork} from '../receiz/usePublicNetwork';
import {ledgerRecordTitle} from '../receiz/ledger-payment-records';
import {shippedMarketHistory, useMarketCapitalization} from '../receiz/market-projection/useMarketCapitalization';
import type {MarketHistorySnapshot} from '../receiz/market-projection/history';
import {usePublicMarket} from '../receiz/usePublicMarket';
import {useMarketDisplaySource} from '../receiz/market-projection/display-source';
import {publicCatalogAtPulse} from '../receiz/market-projection/catalog-prices';
import {activityTime, activityWindow, carriedActivityHistory, indexActivity, ledgerLink, periods, recentActivityRecord, sourceNames, type Period, type TimedRecord} from './activity';
import type {ChartPeriod} from '../core/chart-history';
import {HeadlineHistory, type Headline, type HistoryPoint} from './HeadlineHistory';
import {useAudienceSeries} from './AudienceHistory';
import {CapitalHistory} from './CapitalHistory';
import {NetworkAtlas} from './NetworkAtlas';
import {documentCatalog,observeCatalog} from './catalog';
import {shippedObservatoryDirectory} from './directory';
import {retainPublicProfileHeaders} from '../receiz/public-market';
import type {PublicNetworkCache} from '../receiz/public-network-cache';
import type {ObservatoryDirectory} from '../receiz/public-ledger-document-seed';
import {publicProfilesRevision,subscribePublicProfiles} from '../receiz/public-profile';
import {publishDiscoveredPublicCatalog,retainedDiscoveredPublicCatalog} from '../receiz/asset-publication-adoption';
import {restorePublicProfileDirectoryHeaders} from '../receiz/public-profile-directory-retention';
import {observePublicProfileDirectory,publicProfileDirectoryIsLive} from '../receiz/public-profile-directory';
import './observatory.css';

const num = new Intl.NumberFormat('en-US');
const compact = new Intl.NumberFormat('en-US', {notation: 'compact', maximumFractionDigits: 3});
const day = new Intl.DateTimeFormat('en-US', {month:'short', day:'numeric', timeZone:'UTC'});
const fullDate = new Intl.DateTimeFormat('en-US', {month:'short', day:'numeric', year:'numeric', timeZone:'UTC'});
const clock = new Intl.DateTimeFormat('en-GB', {hour:'2-digit',minute:'2-digit',timeZone:'UTC'});
type Network = ReturnType<typeof usePublicNetwork>;

const noSubscription=()=>()=>{};
function MarketReadings({source,onOpen}: {onOpen:(metric:Headline)=>void;source:ReturnType<typeof useMarketCapitalization>['source']}) {
  const cap = source?.shareCapitalization;
  const priced = cap && (cap.covered > 0 || cap.complete && cap.listed === 0);
  return <>
    <button type="button" className="obs-reading" aria-haspopup="dialog" onClick={()=>onOpen('cap')}><span>Global market cap <ArrowUpRight/></span>
      <strong title={priced ? formatMoney(cap.usdCents) : undefined}>{priced ? '$' + compact.format(BigInt(cap.usdCents) / 100n) : '—'}</strong></button>
    <button type="button" className="obs-reading" aria-haspopup="dialog" onClick={()=>onOpen('assets')}><span>Assets <ArrowUpRight/></span>
      <strong>{source ? num.format(source.marketAssetsPriced + source.cardsInCirculation) : '—'}</strong></button>
  </>;
}

const carriedReferences = [
  ['entryHash','Entry hash'], ['prevHash','Previous entry hash'], ['artifactDigest','Original digest'],
  ['proofHead','Proof head'], ['transferId','Transfer reference'], ['claimHash','Claim hash'],
  ['bundleHash','Proof bundle hash'], ['capsuleHash','Capsule hash'], ['objectId','Object reference'],
] as const;
function CarriedActivityHistory({buckets,total,actions}:{buckets:readonly (readonly PublicRecord[])[];total:number;actions:readonly TimedRecord[]}) {
  const [cursor,setCursor]=useState<{index:number;id:string}|null>(null);
  const touch=useRef<{x:number;y:number}|null>(null);
  let index=Math.min(cursor?.index??0,total-1);
  if(cursor&&recentActivityRecord(buckets,index)?.id!==cursor.id){
    let offset=0;
    for(let i=buckets.length-1;i>=0;i--){
      const row=buckets[i].findIndex(record=>record.id===cursor.id);
      if(row>=0){index=offset+row;break;}
      offset+=buckets[i].length;
    }
  }
  const record=recentActivityRecord(buckets,index)!;
  const history=useMemo(()=>carriedActivityHistory(record),[record]);
  const choose=(next:number)=>{
    const nextRecord=recentActivityRecord(buckets,next);
    if(nextRecord)setCursor({index:next,id:nextRecord.id});
  };
  const previous=useMemo(()=>{
    const hash=record.evidence.prevHash;
    if(record.source!=='actions'||!/^[a-f0-9]{64}$/i.test(hash??'')||hash===record.evidence.entryHash)return;
    for(let i=actions.length-1;i>=0;i--)if(actions[i].record.evidence.entryHash===hash)return actions[i].record;
  },[actions,record]);
  return <section className="obs-history obs-inner" id="obs-history" aria-label="Carried history" tabIndex={0}
    onKeyDown={event=>{if(event.target!==event.currentTarget)return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();choose(index+(event.key==='ArrowLeft'?-1:1));}}}
    onTouchStart={event=>{touch.current=event.touches.length===1&&!(event.target instanceof Element&&event.target.closest('a,button,select'))?{x:event.touches[0].clientX,y:event.touches[0].clientY}:null;}}
    onTouchCancel={()=>{touch.current=null;}}
    onTouchEnd={event=>{const start=touch.current,end=event.changedTouches[0];touch.current=null;if(!start||!end||event.touches.length)return;
      const x=end.clientX-start.x,y=end.clientY-start.y;if(Math.abs(x)>45&&Math.abs(x)>Math.abs(y)*1.5)choose(index+(x<0?1:-1));}}>
    <div className="obs-section-head"><div><p className="obs-label">Carried history</p><h2>{ledgerRecordTitle(record)}</h2></div><a href={ledgerLink(record)}>Inspect in Ledger <ArrowUpRight/></a></div>
    {total>1&&<div className="obs-timeline-nav" aria-label="Carried history navigation">
      <button type="button" aria-label="Previous history event" disabled={index===0} onClick={()=>choose(index-1)}><ChevronLeft/> Newer</button>
      <output aria-live="polite">Record {num.format(index+1)} of {num.format(total)}</output>
      <button type="button" aria-label="Next history event" disabled={index===total-1} onClick={()=>choose(index+1)}>Older <ChevronRight/></button>
    </div>}
    <ol>{history?.steps.length?history.steps.map(step=><li key={step.id}><strong>{step.label}</strong>{step.occurredAt&&<time dateTime={step.occurredAt}>{fullDate.format(Date.parse(step.occurredAt))} · {clock.format(Date.parse(step.occurredAt))} UTC</time>}{step.detail&&<p>{step.detail}</p>}</li>):
      <>{previous&&<li><a href={ledgerLink(previous)}>Previous entry · {ledgerRecordTitle(previous)}</a></li>}
      <li><strong>Recorded event</strong><time dateTime={new Date(activityTime(record)).toISOString()}>{fullDate.format(activityTime(record))} · {clock.format(activityTime(record))} UTC</time>{record.detail&&<p>{record.detail}</p>}</li></>}
    </ol>
    {carriedReferences.some(([key])=>record.evidence[key])&&<dl className="obs-carried-references">{carriedReferences.map(([key,label])=>record.evidence[key]&&<div key={key}><dt>{label}</dt><dd>{record.evidence[key]}</dd></div>)}</dl>}
    {record.sourceUrl&&<a href={record.sourceUrl}>Open public source <ArrowUpRight size={14}/></a>}
    {!!history?.missingParentHashes?.length&&<p>{history.missingParentHashes.length} referenced predecessors are outside this carried history.</p>}
    {history?.fundingIncomplete&&<p>The record references funding history beyond the steps shown.</p>}
  </section>;
}

function ActivityPlot({plot, selection, onSelect, period}: {plot:ReturnType<typeof activityWindow>; selection:number; onSelect:(i:number)=>void; period:Period}) {
  const max = Math.max(1, ...plot.buckets.map(bucket=>bucket.length));
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const top = ([1,2,4,5,8,10].find(candidate=>candidate*magnitude>=max) ?? 10)*magnitude;
  const ticks = [...new Set([0,1,2,3,4].map(n=>Math.round(top * n / 4)))];
  const densityMax = Math.max(1,...plot.density);
  const interval = plot.width < 3_600_000 ? num.format(plot.width / 60_000) + ' min' : plot.width < 86_400_000 ? num.format(plot.width / 3_600_000) + ' hours' : num.format(plot.width / 86_400_000) + ' days';
  const describe = (i:number) => day.format(Math.min(plot.end,plot.start+i*plot.width))+' '+clock.format(Math.min(plot.end,plot.start+i*plot.width))+' UTC · '+num.format(plot.buckets[i].length)+(plot.buckets[i].length===1?' record':' records');
  return <div className="obs-plot">
    <div className="obs-axis-caption"><span>Records per {interval}</span><output>{describe(selection)}</output></div>
    <div className="obs-plot-grid"><div className="obs-axis">{ticks.map(t=><span key={t} style={{bottom:(t/top*100)+'%'}}>{num.format(t)}</span>)}</div>
      <div className="obs-field" role="slider" aria-label="Activity interval" tabIndex={0} aria-valuemin={1} aria-valuemax={plot.buckets.length} aria-valuenow={selection+1} aria-valuetext={describe(selection)}
        onKeyDown={event=>{const moves:Record<string,number>={ArrowLeft:selection-1,ArrowRight:selection+1,End:plot.buckets.length-1,Home:0};if(event.key in moves){event.preventDefault();onSelect(Math.max(0,Math.min(plot.buckets.length-1,moves[event.key])));}}}
        onPointerDown={event=>{const bounds=event.currentTarget.getBoundingClientRect();event.currentTarget.focus();onSelect(Math.max(0,Math.min(plot.buckets.length-1,Math.floor((event.clientX-bounds.left)/bounds.width*plot.buckets.length))));}}>
        {ticks.map(t=><i className="obs-rule" key={t} style={{bottom:(t/top*100)+'%'}}/>)}
        <div className="obs-bars" aria-hidden="true">{plot.buckets.map((bucket,i)=><span key={plot.start+i*plot.width} className={i===selection?'selected':''} data-occupied={bucket.length?true:undefined}><i style={{height:(bucket.length/top*100)+'%'}}/></span>)}</div>
      </div>
    </div>
    <div className="obs-ticks">{Array.from({length:5},(_,i)=>{
      const at=plot.start+i*(plot.end-plot.start)/4;
      return <span key={i}>{(period==='24H'||period==='1H'?clock:day).format(at)}</span>;
    })}</div>
    <div className="obs-density"><span>Activity density</span><div aria-hidden="true">{plot.density.map((v,i)=><i key={i} style={{opacity:v ? 0.2+0.8*Math.sqrt(v/densityMax) : 0}}/>)}</div></div>
  </div>;
}

export function Observatory({network:heldNetwork,active,initialDirectory,initialSnapshot,initialMarketHistory}: {network:Network;active:boolean;initialDirectory?:ObservatoryDirectory;initialSnapshot?:PublicNetworkCache;initialMarketHistory?:MarketHistorySnapshot}) {
  // Hydrate the exact HTML observation, then display any newer held head immediately.
  const hydrating=useSyncExternalStore(noSubscription,()=>false,()=>true);
  const documentSources=useMemo(()=>documentSourceStates(initialSnapshot),[initialSnapshot]);
  const network=hydrating&&initialSnapshot?{...heldNetwork,records:initialSnapshot.records,sources:documentSources,capturedAt:initialSnapshot.capturedAt,bootstrap:false}:heldNetwork;
  // The atlas reads held history. Its live capitalization already has its own clock.
  const market=usePublicMarket(active,false);
  const directory=shippedObservatoryDirectory();
  const carried=useMemo(()=>{
    const prepared=documentCatalog(initialSnapshot,initialDirectory??directory);
    return prepared?retainPublicProfileHeaders(prepared,directory):directory;
  },[initialSnapshot,initialDirectory,directory]);
  const liveCatalog=market.historyCatalog;
  // Suspension stops the readers without replacing the selected Atlas operands.
  const catalog=useMemo(()=>!hydrating&&liveCatalog&&(liveCatalog.complete||!carried.complete)?retainPublicProfileHeaders(liveCatalog,carried):carried,[hydrating,liveCatalog,carried]);
  const [capPeriod,setCapPeriod]=useState<ChartPeriod>('ALL');
  // Use Market's existing valuation clock and accepted pricing coverage.
  // An independently refreshing collectible feed cannot suspend held pricing.
  const valuation=useMarketCapitalization(capPeriod,active,liveCatalog,active,initialMarketHistory);
  const displaySource=useMarketDisplaySource();
  const directoryAssets=useMemo(()=>hydrating?catalog.items:publicCatalogAtPulse(catalog,displaySource,valuation.pulse).items,
    [catalog,displaySource,hydrating,valuation.pulse]);
  const carriedHistory=initialMarketHistory??shippedMarketHistory();
  const pricing=useSyncExternalStore(noSubscription,()=>valuation.source,()=>carriedHistory.summary);
  const points=useSyncExternalStore(noSubscription,()=>valuation.points,()=>carriedHistory.series[capPeriod]);
  const directoryRestored=useRef(false);
  const selectedCatalog=useRef(liveCatalog);selectedCatalog.current=liveCatalog;
  useEffect(()=>{
    if(!active||!liveCatalog?.complete)return;
    if(!directoryRestored.current && initialDirectory?.publicProfileHeadsRevision){
      directoryRestored.current=true;
      const current=retainedDiscoveredPublicCatalog()??selectedCatalog.current;
      if(current?.complete){
        const held=new Set(current.publicProfileHeads?.map(head=>head.profile.userId));
        const cards=carried.publicProfileHeads?.filter(head=>!held.has(head.profile.userId));
        const next=restorePublicProfileDirectoryHeaders({transport:{publicProfileHeads:cards}},initialDirectory.publicProfileHeadsRevision,current);
        if(next!==current)publishDiscoveredPublicCatalog(next,undefined,current);
      }
    }
    const refresh=()=>{if(document.visibilityState==='visible')void observePublicProfileDirectory().catch(()=>{});};
    const timer=setInterval(()=>{if(!publicProfileDirectoryIsLive())refresh();},60_000);
    window.addEventListener('online',refresh);
    return()=>{clearInterval(timer);window.removeEventListener('online',refresh);};
  },[active,liveCatalog?.complete,initialDirectory,carried]);
  const profileRevision=useSyncExternalStore(subscribePublicProfiles,publicProfilesRevision,()=>0);
  const audience=initialDirectory?.audience??directory.audience;
  const overview=useMemo(()=>observeCatalog(catalog,audience,carried),[catalog,profileRevision,audience,carried]);
  const audienceSeries=useAudienceSeries(overview,overview?.observedAt??null);
  const [headline,setHeadline]=useState<Headline|null>(null);
  const index=useMemo(()=>indexActivity(network.records),[network.records]);
  const [source,setSource]=useState<PublicSource>('actions'), [period,setPeriod]=useState<Period>('7D');
  const [paused,setPaused]=useState<number|null>(null), [picked,setPicked]=useState<number|null>(null), [limit,setLimit]=useState(8);
  const [online,setOnline]=useState(true), [historyOpen,setHistoryOpen]=useState(false);
  useEffect(()=>{const change=()=>setOnline(navigator.onLine);change();window.addEventListener('offline',change);window.addEventListener('online',change);return()=>{window.removeEventListener('offline',change);window.removeEventListener('online',change);};},[]);
  const [filter,setFilter]=useState('');
  const inspectAction=useCallback((kind:string,range:Period)=>{
    setSource('actions');setFilter(kind);setPeriod(range);setPaused(null);setPicked(null);setLimit(8);
    document.getElementById('obs-pulse')?.scrollIntoView();
  },[]);
  const state=network.sources[source], sourceStream=index.streams[source];
  const kinds=useMemo(()=>{
    const counts=new Map<string,number>();
    for(const event of sourceStream)counts.set(event.record.kind,(counts.get(event.record.kind)??0)+1);
    return [...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  },[sourceStream]);
  const stream=useMemo(()=>filter?sourceStream.filter(event=>event.record.kind===filter):sourceStream,[sourceStream,filter]);
  const capture=Date.parse(network.capturedAt??'');
  const inventoryTotal=pricing?pricing.marketAssetsPriced+pricing.cardsInCirculation:undefined;
  const inventoryTime=Date.parse(pricing?.generatedAt??catalog.observedAt??'');
  const inventoryThrough=Number.isFinite(inventoryTime)?inventoryTime:undefined;
  const headlinePoints=useMemo(():HistoryPoint[]=>{
    if(headline==='cap')return valuation.allTimePoints.map(p=>({at:Date.parse(p.at),value:Number(p.usdCents)/100}));
    if(headline==='hours')return audienceSeries.seconds;
    if(headline==='assets'&&inventoryThrough!==undefined){
      const seals=catalog.sportsCoverage==='complete'&&catalog.sportsSealedBirthsObservedAt
        ?networkCollectibleSealTimes(catalog):initialDirectory?.collectibleSealTimes??networkCollectibleSealTimes(catalog);
      return datedIssuances(catalog,seals,inventoryThrough);
    }
    if(headline==='ledger'){
      const counts=new Map<number,number>();
      for(const source of PUBLIC_SOURCES){
        const cutoff=network.sources[source].observedAt??capture;
        for(const {time} of index.streams[source])if(time<=cutoff)counts.set(time,(counts.get(time)??0)+1);
      }
      let value=0;
      return [...counts].sort(([a],[b])=>a-b).map(([at,count])=>{
        value+=count;
        return {at,value};
      });
    }
    return [];
  },[headline,valuation.allTimePoints,audienceSeries,catalog,initialDirectory,inventoryThrough,index,network.sources,capture]);
  const asOf=state.observedAt??(Number.isFinite(capture)?capture:null);
  const future=useMemo(()=>asOf===null?[]:stream.filter(point=>point.time>asOf),[asOf,stream]);
  const anchor=paused??asOf;
  const plot=useMemo(()=>activityWindow(stream,period,anchor??0),[stream,period,anchor]);
  const newest=plot.buckets.reduce((latest,bucket,i)=>bucket.length ? i : latest,-1);
  const focus=picked===null ? (newest<0?plot.buckets.length-1:newest) : Math.min(plot.buckets.length-1,Math.max(0,Math.floor((picked-plot.start)/plot.width)));
  const selected=plot.buckets[focus], start=Math.min(plot.end,plot.start+focus*plot.width);
  const total=PUBLIC_SOURCES.reduce((n,s)=>n+index.counts[s],0);
  const covered=PUBLIC_SOURCES.filter(s=>index.counts[s]>0 || network.sources[s].complete).length;
  const pick=(i:number)=>{setPaused(anchor);setPicked(plot.start+i*plot.width);setLimit(8);};
  const moveWindow=(direction:number)=>{
    if(!asOf || anchor===null || period==='All')return;
    const next=anchor+direction*(plot.end-plot.start+1);
    setPaused(next>=asOf?null:next);setPicked(null);setLimit(8);
  };
  const following=paused===null, showingRecords=index.counts[source]>0;
  const status=showingRecords?'Showing public records'
    :!online?'Offline'
    :state.error?'Public records couldn’t load'
    :network.bootstrap?'Opening public history'
    :'No public records available';
  const historyBucket=picked===null?null:focus;
  const historyTotal=historyBucket===null?plot.total:selected.length;
  const hasHistory=historyTotal>0;
  return <div className="observatory"><ObservatoryHeader active={active}/>
    <main><section className="obs-engine"><div className="obs-inner">
      <div className="obs-title"><h1>Analytics</h1><span className={'obs-status'+(showingRecords?' has-records':'')}><i aria-hidden="true"/><span className="obs-status-full">{status}</span><span className="obs-status-small">{status}</span></span></div>
      <div className="obs-readings"><MarketReadings source={pricing} onOpen={setHeadline}/><button type="button" className="obs-reading" aria-haspopup="dialog" onClick={()=>setHeadline('hours')}><span>Witnessed hours <ArrowUpRight/></span><strong>{overview?.seconds.value!=null?new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(overview.seconds.value/3600):'—'}</strong></button><button type="button" className="obs-reading" aria-haspopup="dialog" onClick={()=>setHeadline('ledger')}><span>Public records <ArrowUpRight/></span><strong>{covered?num.format(total):'—'}</strong></button></div>
      {active&&headline&&<HeadlineHistory key={headline} metric={headline} detail={headline==='cap'
        ? (pricing?.shareCapitalization ? num.format(pricing.shareCapitalization.covered)+' of '+num.format(pricing.shareCapitalization.listed)+' assets included'+(valuation.status==='live'?'':' · retained pricing') : 'Pricing unavailable')
        : headline==='assets'&&pricing ? num.format(pricing.marketAssetsPriced)+' priced assets · '+num.format(pricing.cardsInCirculation)+' circulating collectibles'
        : headline==='ledger' ? covered+' of '+PUBLIC_SOURCES.length+' sources represented' : undefined} points={headlinePoints} through={headline==='assets'?inventoryThrough:undefined} inventoryTotal={inventoryTotal} onClose={()=>setHeadline(null)}/>}
      <div className="obs-chart-head" id="obs-pulse"><div><h2>Network pulse</h2><p>{anchor ? <><b>{num.format(plot.total)}</b> {source==='actions'?(plot.total===1?'public action':'public actions'):(plot.total===1?'public record':'public records')} · {day.format(plot.start)} – {fullDate.format(anchor)} · UTC</> : 'Awaiting dated public records'}</p></div>
        <div className="obs-controls"><div className="obs-period" aria-label="Chart range">{periods.map(p=><button key={p} aria-pressed={period===p} onClick={()=>{setPeriod(p);setPaused(null);setPicked(null);setLimit(8);}}>{p}</button>)}</div>
        <button className="obs-follow" aria-pressed={following} onClick={()=>{setPaused(following?anchor:null);setPicked(null);setLimit(8);}} disabled={!anchor}>{following?<Pause/>:<Play/>}{following?'Following latest':'Follow latest'}</button></div></div>
      <div className="obs-streams" role="group" aria-label="Chart source">{PUBLIC_SOURCES.map(s=><button key={s} aria-pressed={s===source} onClick={()=>{setSource(s);setFilter('');setPaused(null);setPicked(null);setLimit(8);}}>{sourceNames[s]}</button>)}</div>
      {anchor ? <ActivityPlot plot={plot} period={period} selection={focus} onSelect={pick}/> : <p className="obs-empty">This source has no dated observations to chart.</p>}
      <div className="obs-timeline-nav"><button aria-label="Previous time window" disabled={period==='All'||!stream.length||plot.start<=stream[0].time} onClick={()=>moveWindow(-1)}><ChevronLeft/> Earlier</button><select aria-label="Filter by record type" value={filter} onChange={e=>{setFilter(e.target.value);setPicked(null);setLimit(8);}}><option value="">All record types</option>{kinds.map(([kind,count])=><option key={kind} value={kind}>{kind} ({num.format(count)})</option>)}</select><button aria-label="Next time window" disabled={period==='All'||following||anchor===asOf} onClick={()=>moveWindow(1)}>Later <ChevronRight/></button></div>
      <div className="obs-coverage"><span>{state.complete?'Source history loaded':'Partial source coverage'}{index.counts[source]>sourceStream.length?' · '+num.format(index.counts[source]-sourceStream.length)+' undated records excluded':''}</span><span>{state.observedAt ? 'Source observed '+fullDate.format(state.observedAt)+' · '+clock.format(state.observedAt)+' UTC' : 'Source observation time unavailable'}</span></div>
    </div></section>
    <section className="obs-details obs-inner"><div><p className="obs-label">Selected interval</p><h3>{anchor?day.format(start)+' · '+clock.format(start)+'–'+(day.format(start)!==day.format(Math.min(plot.end,start+plot.width))?day.format(Math.min(plot.end,start+plot.width))+' · ':'')+clock.format(Math.min(plot.end,start+plot.width))+' UTC':'No interval selected'}</h3><p>{num.format(selected.length)} {source==='actions'?'public actions':source==='proofs'?'Showcase records':sourceNames[source].toLowerCase()+' records'} in this interval</p>
      <a href="#observatory-records">Inspect records <ArrowDown/></a></div>
      <div><p className="obs-label">Continuity</p><h3>Carried history</h3><p>{hasHistory?'Inspect the records and evidence carried in this '+(historyBucket===null?'range.':'interval.'):'Choose an interval with recorded activity.'}</p>{hasHistory?<button type="button" className="obs-detail-action" aria-expanded={historyOpen} aria-controls="obs-history" onClick={()=>setHistoryOpen(open=>!open)}>{historyOpen?'Close history':'Open history'} <ArrowDown/></button>:<a href="/ledger/">Open Ledger <ArrowUpRight/></a>}</div></section>
    {historyOpen&&hasHistory&&<CarriedActivityHistory key={source+':'+filter+':'+period+':'+(picked??'range')+':'+(paused??'live')} buckets={historyBucket===null?plot.buckets:[selected]} total={historyTotal} actions={index.streams.actions}/>}
    <NetworkAtlas active={active} audienceSeries={audienceSeries} catalog={catalog} directoryAssets={directoryAssets} data={overview} records={network.records} executions={index.executions} actions={index.streams.actions}
      actionsAsOf={network.sources.actions.observedAt??(Number.isFinite(capture)?capture:null)} onInspectAction={inspectAction}/>
    <CapitalHistory points={points} period={capPeriod} onPeriod={setCapPeriod}/>
    <section className="obs-composition obs-inner" aria-label="Public source coverage"><div className="obs-section-head"><div><p className="obs-label">Public Ledger</p><h2>Network health</h2></div><a href="/ledger/">Explore Ledger <ArrowUpRight/></a></div>
      <div className="obs-source-strip" aria-hidden="true">{PUBLIC_SOURCES.map(s=><i key={s} data-source={s} style={{flexGrow:index.counts[s]}}/>)}</div>
      <div className="obs-breakdown">{PUBLIC_SOURCES.map(s=><button key={s} aria-pressed={source===s} onClick={()=>{setSource(s);setFilter('');setPaused(null);setPicked(null);setLimit(8);document.getElementById('obs-pulse')?.scrollIntoView();}}><i data-source={s}/><span>{sourceNames[s]}</span><strong>{network.sources[s].complete||index.counts[s]?num.format(index.counts[s]):'—'}</strong></button>)}</div>
      <div className="obs-table-scroll" tabIndex={0} aria-label="Public source health"><table><thead><tr>{['Source','History coverage','Connection','Latest dated activity (UTC)','Observed (UTC)'].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{PUBLIC_SOURCES.map(s=>{
        const reading=network.sources[s],cutoff=reading.observedAt;
        const dated=index.streams[s];let i=dated.length-1;while(i>=0&&(cutoff===undefined||dated[i].time>cutoff))i--;const recent=dated[i];
        const stamp=(at:number|undefined)=>at===undefined?'—':fullDate.format(at)+' · '+clock.format(at);
        return <tr key={s}><th scope="row">{sourceNames[s]}</th><td>{reading.complete?'Complete':'Partial'}</td><td>{!online?'Offline':reading.error?'Source unavailable':reading.status==='live'?'Connected':reading.status==='loading'?'Opening':'Saved observation'}</td><td>{stamp(recent?.time)}</td><td>{stamp(cutoff)}</td></tr>;
      })}</tbody></table></div></section>
    <section id="observatory-records" className="obs-records obs-inner"><h2>Interval records</h2>{selected.slice(0,limit).map(record=><a className="obs-row" key={record.id} href={ledgerLink(record)}><time>{clock.format(activityTime(record))} UTC</time><strong>{ledgerRecordTitle(record)}</strong><span>{record.pulse?'☤KAI '+record.pulse:sourceNames[source]}</span><ChevronRight/></a>)}
      {!selected.length&&<p>No dated records in the held interval.</p>}{selected.length>limit&&<button className="obs-more" onClick={()=>setLimit(n=>n+24)}>Show more records</button>}{!state.complete&&state.cursor&&!state.error&&<button className="obs-more" disabled={state.busy} onClick={()=>void network.loadMore()}>Read earlier public history</button>}</section>
    {future.length>0&&<details className="obs-future obs-inner"><summary>{num.format(future.length)} {future.length===1?'record dated':'records dated'} after the source observation</summary>{future.map(({record,time})=><a className="obs-row" key={record.id} href={ledgerLink(record)}><time>{fullDate.format(time)}</time><strong>{ledgerRecordTitle(record)}</strong><ChevronRight/></a>)}</details>}
    </main><div className="obs-inner"><ProfileFooter navigationLabel="Analytics footer" resource="conformance"/></div></div>;
}
