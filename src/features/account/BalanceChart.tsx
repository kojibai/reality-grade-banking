import { useState } from 'react';
import { ValueChart, Periods, type ChartPeriod } from '../../components/ValueChart';
import { formatMoney } from '../../core/money';
import type { SharedWallet } from '../../receiz/shared-wallet';
import { appendWalletPoint, type WalletPoint } from '../../receiz/wallet-series';
export function BalanceChart({ wallet, history = [], observedAt }: { wallet: SharedWallet | null; history?: WalletPoint[]; observedAt: string | null }) {
  const [rail, setRail] = useState<'total' | 'settlement' | 'reserve'>('total'), [period, setPeriod] = useState<ChartPeriod>('ALL');
  const key = rail === 'total' ? 'totalUsdCents' : rail === 'reserve' ? 'reserveUsdCents' : 'settlementUsdCents';
  const full = wallet && observedAt ? appendWalletPoint(history, wallet, observedAt, history.at(-1)?.kaiUPulse ?? null) : history;
  const latest = full.at(-1), span = period === '1W' ? 7 : period === '1M' ? 31 : period === '1Y' ? 366 : null;
  const points = full.filter(point => point.userId === wallet?.userId && (!span || Date.parse(point.at) >= Date.parse(latest!.at) - span * 86_400_000));
  return <div className="balance-chart-panel"><div className="balance-chart-rails" aria-label="Balance chart"><button aria-pressed={rail === 'total'} onClick={() => setRail('total')}>Total</button><button aria-pressed={rail === 'settlement'} onClick={() => setRail('settlement')}>Settlement</button><button aria-pressed={rail === 'reserve'} onClick={() => setRail('reserve')}>Reserve</button></div>
    <ValueChart values={points.map(point => Number(point[key]) / 100)} color={rail === 'reserve' ? 'navy' : rail === 'settlement' ? 'green' : 'blue'} label={`${rail} balance in dollars`} tooltip={index => ({ value: formatMoney(points[index][key]), label: new Date(points[index].at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) })} />
    <Periods value={period} onChange={setPeriod} />{points.length === 1 && <p className="chart-observation-note">Your current balance. History builds from account observations.</p>}
  </div>;
}
