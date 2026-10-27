import { useMemo, useState } from 'react';
import { ArrowRight, Info } from 'lucide-react';
import { ValueChart, Periods, type ChartPeriod } from '../../components/ValueChart';
import { formatMoney } from '../../core/money';
import { chartChange, chartPeriodBounds, chartDateLabel } from '../../core/chart-history';
import type { PublicMarketCatalog } from '../../receiz/public-market';
import {publicShareCapitalization} from '../../receiz/market-share-inventory';
import './share-inventory.css';
import { publicMarketCapitalization } from '../../receiz/market-capitalization';
import { useMarketCapitalization } from '../../receiz/market-projection/useMarketCapitalization';
type OverviewProps={catalog:PublicMarketCatalog|null;historyCatalog?:PublicMarketCatalog|null;active?:boolean;sourceActive?:boolean;onExplore():void};
export function MarketOverview({catalog,historyCatalog,active=true,sourceActive=active,onExplore}:OverviewProps){
 const [period,setPeriod]=useState<ChartPeriod>('ALL');
 const projection=useMarketCapitalization(period,active,historyCatalog??catalog,sourceActive);
 return <MarketOverviewView catalog={catalog} projection={projection} period={period} onPeriodChange={setPeriod} onExplore={onExplore}/>;
}
/** The same chart presentation, independent of account and discovery effects. */
export function MarketOverviewView({catalog,projection,period,onPeriodChange,onExplore}:{catalog:PublicMarketCatalog|null;projection:Pick<ReturnType<typeof useMarketCapitalization>,'source'|'points'|'status'>;period:ChartPeriod;onPeriodChange(value:ChartPeriod):void;onExplore():void}){
 const [info,setInfo]=useState(false);
 const {source,points,status}=projection;
  const counts = useMemo(() => publicMarketCapitalization(catalog), [catalog]),shareCap=useMemo(()=>publicShareCapitalization(catalog),[catalog]);
  const change = points.length > 1 ? chartChange(points[0].usdCents, points.at(-1)!.usdCents) : null;
  const timeRange=chartPeriodBounds(points,period);
  const unpricedCount=source?.unpricedSealedBirthCount??source?.unpricedSealedBirths?.length??0;
  return <div className="market-overview"><div className="market-overview-heading"><span>Global Market Cap</span><button className="icon-button" aria-label="About market capitalization" aria-expanded={info} onClick={() => setInfo(!info)}><Info size={17} /></button></div><strong className="market-cap-amount">{shareCap.covered?formatMoney(shareCap.usdCents):'—'}</strong><p className="market-cap-subtitle">{shareCap.covered.toLocaleString()} of {shareCap.listed.toLocaleString()} assets included · counted once</p><p className="market-cap-subtitle">{catalog ? <>{source ? (source.marketAssetsPriced + source.cardsInCirculation).toLocaleString() : '—'} assets in circulation · {counts.listed.toLocaleString()} assets listed</> : 'Receiz global proof economy'}{source && status !== 'live' ? ' · retained pricing source' : ''}</p>
    {source?.undatedHistory&&<p className="market-cap-history-coverage">{(source.undatedHistory.undatedRows??source.undatedHistory.rows)>0?'Partial seal-date history':'Sealed birth history'} · later aggregate pricing retained</p>}
    {info && <section className="market-cap-explanation" aria-label="Global proof economy methodology">
      <p><strong>Global value, grounded in source.</strong> Global Market Cap counts each asset once at its current unit value multiplied by outstanding shares plus remaining buying capacity. Available units already included in issued supply are counted once. Account and Vault holdings and live certificates are partitions of the same shares. Collectible circulation retains its existing per-copy accounting. Missing quantity or capacity records remain outside the total until their records are available. Proof-native assets carry their origin, ownership and causal history in sealed proof objects. Proof-backed funds carry the source evidence that establishes their funding.</p>
      <p><strong>A traceable basis of value.</strong> Native valuation starts with each proof’s recorded inputs and advances under its deterministic rules at each Kai pulse. The object, its source and the calculation remain connected, so the supported valuation can be independently reconstructed from its carried evidence.</p>
      <p><strong>Continuity through the economy.</strong> Assets enter the historical record at their recorded seal or issuance coordinate and opening value. Originals and editions participate in one economic record. Circulation counts individual assets; public listings may group several copies. Valuation, backing, available funds and completed transactions each retain their own source evidence.</p>
      <a className="market-cap-method-link" href="/learn/how-value-works/">Inspect the valuation method<ArrowRight size={13}/></a>
      <details><summary>Valuation protocol &amp; source accounting</summary>
        <p>Historical curves preserve opening values, dated valuation records and the current aggregate as exact anchors. Between those anchors, supported individual-object models supply deterministic projections. Aggregate observations remain at their recorded coordinates and are counted once. An opening value is retained where an individual pricing basis is unavailable.</p>
        {source?.sportsHistorySnapshot&&<><dl><div><dt>Valuation record</dt><dd>{new Date(source.sportsHistorySnapshot.at).toLocaleString()}</dd></div><div><dt>Individual object bases</dt><dd>{source.sportsHistorySnapshot.singleCopyGroups.toLocaleString()}</dd></div><div><dt>Aggregate valuation groups</dt><dd>{source.sportsHistorySnapshot.aggregateGroups.toLocaleString()}</dd></div>{source.sportsHistorySnapshot.evaluatedAt&&<div><dt>Coverage evaluation</dt><dd>{new Date(source.sportsHistorySnapshot.evaluatedAt).toLocaleString()}</dd></div>}</dl>{unpricedCount>0&&<p>{unpricedCount.toLocaleString()} sealed objects carry no supplied individual current quote. Their recorded opening values and the available aggregate pricing basis remain preserved.</p>}</>}
        {source?.undatedHistory&&<p>{(source.undatedHistory.undatedRows??source.undatedHistory.rows)>0&&<>Individual seal coordinates are unavailable for {(source.undatedHistory.undatedRows??source.undatedHistory.rows).toLocaleString()} pricing groups. </>}{!!source.undatedHistory.birthOnlyRows&&<>Exact opening values are carried for {source.undatedHistory.birthOnlyRows.toLocaleString()} groups without subsequent individual valuation records. </>}{!!source.undatedHistory.unpricedCopies&&<>{source.undatedHistory.unpricedCopies.toLocaleString()} additional sealed objects have no supplied current quote. </>}The remaining aggregate observation is retained at ☤KAI {source.undatedHistory.observationPulse.toLocaleString()}. Earlier intervals preserve the available seal coordinates and opening values.</p>}
        {source&&<p>Public source captured {new Date(source.generatedAt).toLocaleString()}. Supported valuation advances locally from the retained pricing basis. Collection refreshes establish membership and coverage independently of that deterministic valuation.</p>}
      </details>
    </section>}
    <div className="market-valuation-history-label"><span>Asset valuation history · unit-value basis</span><strong>{source?formatMoney(String(Math.round(source.currentUsd*100))):'—'}</strong></div>
    {change && <div className={`chart-period-change ${change.trend === 'down' ? 'negative' : change.trend === 'up' ? 'positive' : 'muted'}`}><strong>{change.trend === 'up' ? '↗' : change.trend === 'down' ? '↘' : '→'} {BigInt(change.deltaCents) > 0n ? '+' : ''}{formatMoney(change.deltaCents)} {change.percent !== null && `(${change.percent > 0 ? '+' : ''}${change.percent.toFixed(2)}%)`}</strong><span>{period === 'ALL' ? 'Since first issuance' : period} · projected value</span></div>}
    <ValueChart interpolation="step" key={period} times={points.map(point => Date.parse(point.at))} timeRange={timeRange} color={change?.trend === 'down' ? 'red' : change?.trend === 'up' ? 'green' : 'blue'} values={points.map(point => Number(point.usdCents) / 100)} label={`Asset valuation · projected unit-value history · ${period === 'ALL'?'All history':period}`} tooltip={index => ({ value: formatMoney(points[index].usdCents), label: `${new Date(points[index].at).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })} · ☤KAI ${points[index].pulse.toLocaleString()}` })} />
    <Periods value={period} onChange={onPeriodChange} />
    {timeRange && <div className="chart-date-range"><span>{chartDateLabel(timeRange.start,period)}</span><span>{chartDateLabel(timeRange.end,period)}</span></div>}
    <button className="market-view-assets" onClick={onExplore}>View assets<ArrowRight size={16} /></button>
  </div>;
}
