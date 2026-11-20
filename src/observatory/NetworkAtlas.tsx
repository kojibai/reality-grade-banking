import {Fragment,memo,useMemo,useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {Pager} from './Pager';
import {formatMoney} from '../core/money';
import {marketContentLabel} from '../receiz/market-categories';
import {assetPagePath,retainPublicAsset} from '../receiz/public-asset-page';
import type {PublicRecord} from '../receiz/public-network';
import {AssetInspection} from './AssetInspection';
import {type Period,type TimedRecord,type MarketExecution} from './activity';
import {ActionGrowth} from './ActionGrowth';
import {NetworkTraffic} from './NetworkTraffic';
import {profilePagePath,profileUsername} from '../receiz/public-profile';
import type {PublicMarketCatalog} from '../receiz/public-market';
import {AudienceHistory,AudienceSpark,type useAudienceSeries} from './AudienceHistory';
import {CollectibleActivity} from './CollectibleActivity';
import {TradingActivity} from './TradingActivity';
import {WalletGrowth} from './WalletGrowth';
import {walletActivity} from './wallet';
import {growthSeries, type observeCatalog, type RankedProfile} from './catalog';

const number=new Intl.NumberFormat('en-US',{maximumFractionDigits:1});
const date=new Intl.DateTimeFormat('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'});
const monthLabel=new Intl.DateTimeFormat('en-US',{year:'numeric',month:'long',timeZone:'UTC'});
const show=(value:number|null)=>value===null?'—':number.format(value);
const hours=(seconds:number|null)=>seconds===null?'—':number.format(seconds/3600);
const pageSize=8;
const usd=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'});
type Overview=ReturnType<typeof observeCatalog>;
const rankLabels={followers:'Followers',following:'Following',signedOriginals:'Signed Originals',views:'Original views',plays:'Stream plays',seconds:'Witnessed hours',originals:'Public Originals',completion:'Completion rate',capitalization:'Collection capitalization'};
type Rank=keyof typeof rankLabels;

function Growth({series,label,unit}:{series:ReturnType<typeof growthSeries>;label:string;unit:string}){
  if(!series)return <div className="obs-growth"><h3>{label}</h3><p>No dated observations available</p></div>;
  const total=series.points.at(-1)!.count;
  const span=Math.max(1,series.last-series.first);
  const path=series.points.map((point,i)=>{
    const x=(600*(point.at-series.first)/span).toFixed(2);
    const y=(90-88*point.count/total).toFixed(2);
    return i?'H'+x+'V'+y:'M0,'+y;
  }).join('')+'H600';
  return <div className="obs-growth"><h3>{label}</h3><strong>{number.format(total)}</strong>
    <svg viewBox="0 0 600 94" preserveAspectRatio="none" role="img" aria-label={label+', cumulative by UTC day from '+date.format(series.first)+' through '+date.format(series.last)+', '+total+' dated entries'}>
      {[2,46,90].map(y=><line key={y} x1="0" x2="600" y1={y} y2={y}/>)}<path className="obs-area" d={path+' L600,94 L0,94 Z'}/><path className="obs-line" d={path}/></svg>
    <div><time>{date.format(series.first)}</time><time>{date.format(series.last)}</time></div>
    <details className="obs-month-counts"><summary>Monthly additions</summary>
      <table><caption>Months with new {unit} · UTC</caption><thead><tr><th scope="col">Month</th><th scope="col">Added</th></tr></thead>
        <tbody>{series.months.map(([month,count])=><tr key={month}><th scope="row"><time dateTime={month}>{monthLabel.format(Date.parse(month+'-01T00:00:00Z'))}</time></th><td>{number.format(count)}</td></tr>)}</tbody>
      </table>
    </details></div>;
}

function comparison(a:RankedProfile,b:RankedProfile,key:Rank){
  const x=key==='capitalization'?a.capitalization===null?null:BigInt(a.capitalization):a.stats[key]??null;
  const y=key==='capitalization'?b.capitalization===null?null:BigInt(b.capitalization):b.stats[key]??null;
  if(x===y)return a.username.localeCompare(b.username);
  if(x===null)return 1;
  if(y===null)return -1;
  return x>y?-1:1;
}

export const NetworkAtlas=memo(function NetworkAtlas({active,catalog,data,audienceSeries,records,actions,executions,actionsAsOf,onInspectAction}:{active:boolean;executions:readonly MarketExecution[];audienceSeries:ReturnType<typeof useAudienceSeries>;actions:readonly TimedRecord[];actionsAsOf:number|null;onInspectAction:(kind:string,period:Period)=>void;catalog:PublicMarketCatalog|null;data:Overview|null;records:readonly PublicRecord[]}){
  const [rank,setRank]=useState<Rank>('seconds'),[person,setPerson]=useState(''),[profilePage,setProfilePage]=useState(0);
  const [query,setQuery]=useState(''),[filter,setFilter]=useState('All'),[assetPage,setAssetPage]=useState(0),[order,setOrder]=useState('recent');
  const profiles=useMemo(()=>data?.profiles.filter(p=>(p.name+' '+p.username).toLowerCase().includes(person.trim().replace(/^@/,'').toLowerCase())).sort((a,b)=>comparison(a,b,rank))??[],[data,person,rank]);
  const types=useMemo(()=>[...new Set(catalog?.items.map(marketContentLabel))].sort(),[catalog]);
  const assets=useMemo(()=>{
    const search=query.trim().replace(/^@/,'').toLowerCase();
    const rows=(catalog?.items??[]).filter(item=>(filter==='All'||marketContentLabel(item)===filter)&&(!search||[item.title,item.assetId,item.id,item.ownerUsername].some(value=>value?.toLowerCase().includes(search))));
    return rows.sort((a,b)=>order==='value'?(b.priceUsd??-1)-(a.priceUsd??-1)||a.id.localeCompare(b.id):(Date.parse(b.sealedAt??'')||0)-(Date.parse(a.sealedAt??'')||0)||a.id.localeCompare(b.id));
  },[catalog,filter,query,order]);
  const [inspected,setInspected]=useState<string|null>(null);
  const wallets=useMemo(()=>walletActivity(records),[records]);
  const [profileSize,setProfileSize]=useState(pageSize);
  const profileGrowth=useMemo(()=>growthSeries(data?.profiles.map(p=>p.createdAt)??[]),[data]);
  const profileSeries=useMemo(()=>profileGrowth?.points.map(p=>({at:p.at,value:p.count}))??[],[profileGrowth]);
  const trends=[profileSeries,audienceSeries.views,audienceSeries.plays,audienceSeries.seconds];
  const sealGrowth=useMemo(()=>growthSeries(catalog?.items.filter(item=>item.category==='proof').map(item=>item.sealedAt)??[]),[catalog]);
  const pp=Math.min(profilePage,Math.max(0,Math.ceil(profiles.length/profileSize)-1)),ap=Math.min(assetPage,Math.max(0,Math.ceil(assets.length/pageSize)-1));
  return <div className="obs-atlas obs-inner">
    <nav className="obs-sections" aria-label="Analytics sections"><a href="#obs-audience">Audience</a><a href="#obs-growth">Growth</a><a href="#obs-profiles">Profiles</a><a href="#obs-assets">Assets</a><a href="#obs-trading">Trading</a><a href="#obs-wallets">Wallets</a><a href="#obs-economy">Economy</a><a href="#observatory-records">Records</a></nav>
    <section id="obs-audience"><div className="obs-section-head"><div><p className="obs-label">Public Showcase</p><h2>Audience</h2></div></div>
      <div className="obs-audience-grid">{([
        ['Public profiles',data?number.format(data.profiles.length):'—','Public headers and bound asset owners'],
        ['Original views',show(data?.views.value??null),(data?.views.covered??0)+' profiles reporting views'],
        ['Stream plays',show(data?.plays.value??null),(data?.plays.covered??0)+' profiles reporting plays'],
        ['Witnessed hours',hours(data?.seconds.value??null),'Viewing and streaming time combined'],
      ] as const).map(([label,value,caption],i)=><div key={label}><h3>{label}</h3><strong>{value}</strong><small>{caption}</small><AudienceSpark points={trends[i]} label={label} publications={i>0}/></div>)}</div><AudienceHistory overview={data} series={audienceSeries}/></section>
    <section id="obs-growth"><div className="obs-section-head"><div><p className="obs-label">Receiz network</p><h2>Network growth</h2></div></div><NetworkTraffic active={active}/><div className="obs-growth-grid"><Growth label="Profiles by creation date" series={profileGrowth} unit="public profiles"/><Growth label="Originals by seal date" series={sealGrowth} unit="Originals"/></div><ActionGrowth actions={actions} asOf={actionsAsOf} onInspect={onInspectAction}/></section>
    <TradingActivity executions={executions} asOf={actionsAsOf}/>
    <section id="obs-wallets"><div className="obs-section-head"><div><p className="obs-label">Public wallet ledger</p><h2>Wallet activity</h2></div><a href="/ledger/">Ledger <ArrowUpRight/></a></div>
      <WalletGrowth wallets={wallets}/></section>
    <CollectibleActivity records={records}/>
    <section id="obs-profiles"><div className="obs-section-head"><div><p className="obs-label">Public identities</p><h2>Profile rankings</h2></div><a href="/discover/">Discover <ArrowUpRight/></a></div>
      <div className="obs-filters"><input type="search" aria-label="Search public profiles" placeholder="Find a name or handle" value={person} onChange={e=>{setPerson(e.target.value);setProfilePage(0);}}/><label>Rank by <select value={rank} onChange={e=>{setRank(e.target.value as Rank);setProfilePage(0);}}>{Object.entries(rankLabels).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></label></div>
      <div className="obs-table-scroll" tabIndex={0} aria-label="Scrollable profile rankings"><table><thead><tr>{['Rank','Profile','Original views','Stream plays','Witnessed hours','Completion','Followers','Following','Originals','Signed Originals','Collection cap'].map(s=><th key={s} scope="col">{s}</th>)}</tr></thead><tbody>
        {profiles.slice(pp*profileSize,(pp+1)*profileSize).map((p,i)=><tr key={p.username}><td>{pp*profileSize+i+1}</td><th scope="row"><a href={profilePagePath(p.username)}><span className="obs-profile-name">{p.name}</span><small>@{p.username}</small></a></th><td>{show(p.stats.views)}</td><td>{show(p.stats.plays)}</td><td>{hours(p.stats.seconds)}</td><td>{p.stats.completion===null?'—':number.format(p.stats.completion)+'%'}</td><td>{show(p.stats.followers??null)}</td><td>{show(p.stats.following??null)}</td><td>{show(p.stats.originals)}</td><td>{show(p.stats.signedOriginals??null)}</td><td title={p.capitalizationPartial?'Includes assets with public share pricing':undefined}>{p.capitalization===null?'—':formatMoney(p.capitalization)}</td></tr>)}</tbody></table></div>
      <div className="obs-page-options"><label>Profiles per page <select value={profileSize} onChange={e=>{setProfileSize(Number(e.target.value));setProfilePage(0);}}>{[8,25,50,100].map(n=><option key={n}>{n}</option>)}</select></label><Pager count={profiles.length} page={pp} onPage={setProfilePage} size={profileSize}/></div></section>
    <section id="obs-assets"><div className="obs-section-head"><div><p className="obs-label">Public inventory</p><h2>Asset directory</h2></div><div className="obs-asset-links"><a href="#obs-collectibles">Collectible activity</a><a href="/explore/">Explore <ArrowUpRight/></a></div></div>
      <div className="obs-filters"><input type="search" value={query} aria-label="Search public assets" placeholder="Search title, owner or asset ID" onChange={e=>{setQuery(e.target.value);setAssetPage(0);}}/><label>Type <select value={filter} onChange={e=>{setFilter(e.target.value);setAssetPage(0);}}><option>All</option>{types.map(type=><option key={type}>{type}</option>)}</select></label><label>Order <select value={order} onChange={e=>{setOrder(e.target.value);setAssetPage(0);}}><option value="recent">Latest seal</option><option value="value">Highest price</option></select></label></div>
      <div className="obs-table-scroll" tabIndex={0} aria-label="Scrollable asset directory"><table><thead><tr>{['Asset','Type','Owner','Seal date (UTC)','Public price','History'].map(s=><th key={s} scope="col">{s}</th>)}</tr></thead><tbody>{assets.slice(ap*pageSize,(ap+1)*pageSize).map(item=><Fragment key={item.id}><tr><th scope="row"><a href={assetPagePath(item.id)} onClick={()=>retainPublicAsset(item)}>{item.title}</a></th><td>{marketContentLabel(item)}</td><td>{item.ownerUsername&&profileUsername(item.ownerUsername)?<a href={profilePagePath(item.ownerUsername)}>@{item.ownerUsername}</a>:'—'}</td><td>{Number.isFinite(Date.parse(item.sealedAt??''))?date.format(Date.parse(item.sealedAt!)):'—'}</td><td>{item.priceUsd===null?'—':usd.format(item.priceUsd)}</td><td><button className="obs-link-button" aria-label={'Inspect history for '+item.title} aria-expanded={inspected===item.id} aria-controls={inspected===item.id?'obs-asset-details':undefined} onClick={()=>setInspected(inspected===item.id?null:item.id)}>{inspected===item.id?'Close':'Inspect'}</button></td></tr>
        {inspected===item.id&&<tr id="obs-asset-details"><td colSpan={6}><AssetInspection item={item} records={records}/></td></tr>}</Fragment>)}</tbody></table></div>
      <Pager count={assets.length} page={ap} onPage={setAssetPage}/>
    </section>
  </div>;
});
