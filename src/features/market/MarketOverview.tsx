import { useState } from 'react';
import { ArrowRight, Info } from 'lucide-react';
import { ValueChart, Periods, type ChartPeriod } from '../../components/ValueChart';
import { formatMoney } from '../../core/money';
import { chartChange } from '../../core/chart-history';
import { useMarketCapitalization } from '../../receiz/market-projection/useMarketCapitalization';
export function MarketOverview({ active = true, onExplore }: { active?: boolean; onExplore: () => void }) {
  const [info, setInfo] = useState(false), [period, setPeriod] = useState<ChartPeriod>('ALL');
  const { source, points, status } = useMarketCapitalization(period, active);
  const change = points.length > 1 ? chartChange(points[0].usdCents, points.at(-1)!.usdCents) : null;
  return <div className="market-overview"><div className="market-overview-heading"><span>Total market capitalization</span><button className="icon-button" aria-label="About market capitalization" aria-expanded={info} onClick={() => setInfo(!info)}><Info size={17} /></button></div><strong className="market-cap-amount">{source ? formatMoney(String(Math.round(source.currentUsd * 100))) : '—'}</strong><p className="market-cap-subtitle">{source ? `${source.marketAssetsPriced.toLocaleString()} valued market assets · ${source.cardsInCirculation.toLocaleString()} sports cards` : 'Receiz public Proof Graph'}{source && status !== 'live' ? ' · retained source' : ''}</p>
    {info && <p className="market-cap-explanation">The same total as Receiz Proof Graph: public market assets and the sports economy. History applies the current public source’s deterministic value rules at earlier Kai pulses. It is projected value history, rather than a record of historic holdings or trades. Valuation does not measure cash backing or committed sale proceeds.{source && <> Source captured {new Date(source.generatedAt).toLocaleString()}.</>}</p>}
    {change && <div className={`chart-period-change ${change.trend === 'down' ? 'negative' : change.trend === 'up' ? 'positive' : 'muted'}`}><strong>{change.trend === 'up' ? '↗' : change.trend === 'down' ? '↘' : '→'} {BigInt(change.deltaCents) > 0n ? '+' : ''}{formatMoney(change.deltaCents)} {change.percent !== null && `(${change.percent > 0 ? '+' : ''}${change.percent.toFixed(2)}%)`}</strong><span>{period === 'ALL' ? 'Since first issuance' : period} · projected value</span></div>}
    <ValueChart key={period} times={points.map(point => Date.parse(point.at))} color={change?.trend === 'down' ? 'red' : change?.trend === 'up' ? 'green' : 'blue'} values={points.map(point => Number(point.usdCents) / 100)} label="Total market capitalization · projected value history" tooltip={index => ({ value: formatMoney(points[index].usdCents), label: `${new Date(points[index].at).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })} · Kai ${points[index].pulse.toLocaleString()}` })} />
    <Periods value={period} onChange={setPeriod} />
    {points.length > 0 && <div className="chart-date-range"><span>{new Date(points[0].at).toLocaleDateString()}</span><span>{new Date(points.at(-1)!.at).toLocaleDateString()}</span></div>}
    <button className="market-view-assets" onClick={onExplore}>View assets<ArrowRight size={16} /></button>
  </div>;
}
