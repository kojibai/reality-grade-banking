import { useMemo, useState } from 'react';
import { ValueChart, Periods, type ChartPeriod } from '../../components/ValueChart';
import { formatMoney } from '../../core/money';
import { chartChange, chartPeriodPoints } from '../../core/chart-history';
import type { SharedWallet } from '../../receiz/shared-wallet';
import { appendWalletPoint, type WalletPoint } from '../../receiz/wallet-series';
export function BalanceChart({ wallet, history = [], observedAt }: { wallet: SharedWallet | null; history?: WalletPoint[]; observedAt: string | null }) {
  const [rail, setRail] = useState<'total' | 'settlement' | 'reserve'>('total'), [period, setPeriod] = useState<ChartPeriod>('ALL');
  const key = rail === 'total' ? 'totalUsdCents' : rail === 'reserve' ? 'reserveUsdCents' : 'settlementUsdCents';
  const full = useMemo(() => wallet && observedAt ? appendWalletPoint(history, wallet, observedAt, history.at(-1)?.kaiUPulse ?? null) : history, [wallet, history, observedAt]);
  const points = useMemo(() => chartPeriodPoints(full.filter(point => point.userId === wallet?.userId), period), [full, wallet?.userId, period]);
  const change = points.length > 1 ? chartChange(points[0][key], points.at(-1)![key]) : null;
  const trendColor = change?.trend === 'up' ? 'green' : change?.trend === 'down' ? 'red' : rail === 'reserve' ? 'navy' : 'blue';
  return <div className="balance-chart-panel"><div className="balance-chart-rails" aria-label="Balance chart"><button aria-pressed={rail === 'total'} onClick={() => setRail('total')}>Total</button><button aria-pressed={rail === 'settlement'} onClick={() => setRail('settlement')}>Settlement</button><button aria-pressed={rail === 'reserve'} onClick={() => setRail('reserve')}>Reserve</button></div>
    {change && <div className={`chart-period-change ${change.trend === 'down' ? 'negative' : change.trend === 'up' ? 'positive' : 'muted'}`}><strong>{change.trend === 'up' ? '↗' : change.trend === 'down' ? '↘' : '→'} {BigInt(change.deltaCents) > 0n ? '+' : ''}{formatMoney(change.deltaCents)} {change.percent !== null && `(${change.percent > 0 ? '+' : ''}${change.percent.toFixed(2)}%)`}</strong><span>{period === 'ALL' ? 'Available history' : period}</span></div>}
    <ValueChart values={points.map(point => Number(point[key]) / 100)} times={points.map(point => Date.parse(point.at))} color={trendColor} label={`${rail} balance in dollars`} tooltip={index => ({ value: formatMoney(points[index][key]), label: new Date(points[index].at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) })} />
    <Periods value={period} onChange={setPeriod} />{points.length === 1 && <p className="chart-observation-note">Earlier account history is not available yet.</p>}
  </div>;
}
