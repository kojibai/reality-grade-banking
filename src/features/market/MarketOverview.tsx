import { useMemo, useState } from 'react';
import { ArrowRight, Info } from 'lucide-react';
import { ValueChart, Periods, type ChartPeriod } from '../../components/ValueChart';
import { formatMoney } from '../../core/money';
import { chartChange, chartPeriodBounds, chartDateLabel } from '../../core/chart-history';
import type { PublicMarketCatalog } from '../../receiz/public-market';
import { publicMarketCapitalization } from '../../receiz/market-capitalization';
import { useMarketCapitalization } from '../../receiz/market-projection/useMarketCapitalization';
export function MarketOverview({ catalog, active = true, onExplore }: { catalog: PublicMarketCatalog | null; active?: boolean; onExplore: () => void }) {
  const [info, setInfo] = useState(false), [period, setPeriod] = useState<ChartPeriod>('ALL');
  const { source, points, status, historyUpdating } = useMarketCapitalization(period, active,catalog);
  const counts = useMemo(() => publicMarketCapitalization(catalog), [catalog]);
  const change = points.length > 1 ? chartChange(points[0].usdCents, points.at(-1)!.usdCents) : null;
  const timeRange=chartPeriodBounds(points,period);
  return <div className="market-overview"><div className="market-overview-heading"><span>Total market capitalization</span><button className="icon-button" aria-label="About market capitalization" aria-expanded={info} onClick={() => setInfo(!info)}><Info size={17} /></button></div><strong className="market-cap-amount">{source ? formatMoney(String(Math.round(source.currentUsd * 100))) : '—'}</strong><p className="market-cap-subtitle">{catalog ? <>{source ? (source.marketAssetsPriced + source.cardsInCirculation).toLocaleString() : '—'} valued · {counts.listed.toLocaleString()} listed<span className="market-inventory-detail">{counts.proofs.toLocaleString()} proof objects{counts.cardAssets > 0 && <> · {counts.cardAssets.toLocaleString()} card groups included</>}</span></> : 'Receiz public Proof Graph'}{source && status !== 'live' ? ' · retained pricing source' : ''}</p>
    {info && <p className="market-cap-explanation">Capitalization combines the current public collection with the sports economy, using the existing deterministic pricing rules. History applies the current public source’s deterministic value rules at earlier Kai pulses. It is projected value history, rather than a record of historic holdings or trades. Valuation does not measure cash backing or committed sale proceeds.{source && <> Public collection captured {new Date(source.generatedAt).toLocaleString()}. This source prices {source.marketAssetsPriced.toLocaleString()} market assets and {source.sportsCardsPriced.toLocaleString()} card groups; Valued counts the Proof Graph asset universe, including issued card copies. Listed counts the distinct assets visible in this Market; values advance locally at the current Kai pulse. New public objects enter through collection updates.</>}</p>}
    {change && <div className={`chart-period-change ${change.trend === 'down' ? 'negative' : change.trend === 'up' ? 'positive' : 'muted'}`}><strong>{change.trend === 'up' ? '↗' : change.trend === 'down' ? '↘' : '→'} {BigInt(change.deltaCents) > 0n ? '+' : ''}{formatMoney(change.deltaCents)} {change.percent !== null && `(${change.percent > 0 ? '+' : ''}${change.percent.toFixed(2)}%)`}</strong><span>{period === 'ALL' ? 'Since first issuance' : period} · projected value{historyUpdating ? ' · retained chart' : ''}</span></div>}
    <ValueChart key={period} times={points.map(point => Date.parse(point.at))} timeRange={timeRange} color={change?.trend === 'down' ? 'red' : change?.trend === 'up' ? 'green' : 'blue'} values={points.map(point => Number(point.usdCents) / 100)} label={`Total market capitalization · projected value history · ${period === 'ALL'?'All history':period}`} tooltip={index => ({ value: formatMoney(points[index].usdCents), label: `${new Date(points[index].at).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })} · Kai ${points[index].pulse.toLocaleString()}` })} />
    <Periods value={period} onChange={setPeriod} />
    {timeRange && <div className="chart-date-range"><span>{chartDateLabel(timeRange.start,period)}</span><span>{chartDateLabel(timeRange.end,period)}</span></div>}
    <button className="market-view-assets" onClick={onExplore}>View assets<ArrowRight size={16} /></button>
  </div>;
}
