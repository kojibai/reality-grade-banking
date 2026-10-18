import { useMemo, useState } from 'react';
import { ValueChart, Periods, type ChartPeriod } from '../../components/ValueChart';
import { formatMoney } from '../../core/money';
import { chartChange, chartPeriodBounds, chartDateLabel } from '../../core/chart-history';
import type { SharedWallet } from '../../receiz/shared-wallet';
import { selectBalanceChartPoints, type WalletPoint } from '../../receiz/wallet-series';
export function BalanceChart({ wallet, history = [], observedAt, completeHistory = true, period: selectedPeriod, onPeriodChange }: { wallet: SharedWallet | null; history?: WalletPoint[]; observedAt: string | null; completeHistory?:boolean; period?:ChartPeriod; onPeriodChange?:(period:ChartPeriod)=>void }) {
  const [rail, setRail] = useState<'total' | 'settlement' | 'reserve'>('total'), [localPeriod, setLocalPeriod] = useState<ChartPeriod>('ALL');
  const period = selectedPeriod ?? localPeriod;
  const selectPeriod = (next: ChartPeriod) => { setLocalPeriod(next); onPeriodChange?.(next); };
  const key = rail === 'total' ? 'totalUsdCents' : rail === 'reserve' ? 'reserveUsdCents' : 'settlementUsdCents';
  const points = useMemo(() => selectBalanceChartPoints(history, wallet, observedAt, period), [wallet, history, observedAt, period]);
  const timeRange=chartPeriodBounds(points,period);
  const change = points.length > 1 ? chartChange(points[0][key], points.at(-1)![key]) : null;
  const trendColor = change?.trend === 'up' ? 'green' : change?.trend === 'down' ? 'red' : rail === 'reserve' ? 'navy' : 'blue';
  return <div className="balance-chart-panel"><div className="balance-chart-rails" aria-label="Balance chart"><button aria-pressed={rail === 'total'} onClick={() => setRail('total')}>Total</button><button aria-pressed={rail === 'settlement'} onClick={() => setRail('settlement')}>Settlement</button><button aria-pressed={rail === 'reserve'} onClick={() => setRail('reserve')}>Reserve</button></div>
    {change && <div className={`chart-period-change ${change.trend === 'down' ? 'negative' : change.trend === 'up' ? 'positive' : 'muted'}`}><strong>{change.trend === 'up' ? '↗' : change.trend === 'down' ? '↘' : '→'} {BigInt(change.deltaCents) > 0n ? '+' : ''}{formatMoney(change.deltaCents)} {change.percent !== null && `(${change.percent > 0 ? '+' : ''}${change.percent.toFixed(2)}%)`}</strong><span>{period === 'ALL' ? completeHistory ? 'Available history' : 'Available observations' : period}</span></div>}
    <ValueChart key={`${rail}:${period}`} values={points.map(point => Number(point[key]) / 100)} times={points.map(point => Date.parse(point.at))} timeRange={timeRange} color={trendColor} label={`${rail} balance in dollars · ${period === 'ALL'?'All history':period}`} description={!completeHistory?'Available balance observations. Earlier complete account history is not held in this source.':points.some(point=>point.valuation==='legacy-model-v129')?'Recorded wallet Phi repriced at each Kai coordinate. History starts at the earliest reconciled balance observation; earlier ownership history remains separate.':points.some(point=>point.valuation==='deterministic-v129')?'Historical valuations recomputed from accepted holdings at each Kai coordinate. Actual transactions remain in your ledger.':undefined} tooltip={index => ({ value: formatMoney(points[index][key]), label: chartDateLabel(Date.parse(points[index].at),'1D',timeRange)+(points[index].valuation?' · Valuation':'') })} />
    <Periods value={period} onChange={selectPeriod} />{timeRange&&<div className="chart-date-range"><span>{chartDateLabel(timeRange.start,period,timeRange)}</span><span>{chartDateLabel(timeRange.end,period,timeRange)}</span></div>}{!completeHistory ? <p className="chart-observation-note">Earlier history needs its complete account source.</p> : points.length === 1 && <p className="chart-observation-note">Earlier account history is not available in this period.</p>}
  </div>;
}
