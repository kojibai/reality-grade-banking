import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { formatMoney } from '../../core/money';
import { ledgerValueLabel, type LedgerValueDisplay } from '../../receiz/ledger-value';
import './ledger-value.css';

export function LedgerValue({ value, className = '' }: { value: LedgerValueDisplay; className?: string }) {
  const change = value.comparison, direction = change ? change.percent > 0 ? 'up' : change.percent < 0 ? 'down' : 'flat' : null;
  const label = ledgerValueLabel(value), coordinate = value.pulse ? ` · ☤KAI ${value.pulse}` : '',calculated=value.basis==='intrinsic-model'||value.basis==='card-model';
  return <span className={`ledger-value ${className}`} title={value.gap ?? `${label}${coordinate}${calculated ? ' · Display model, not a realized sale price.' : ''}`}>
    <strong>{value.amountUsdCents === null ? '—' : formatMoney(value.amountUsdCents)}</strong>
    {value.basis !== 'unavailable' && <small className="ledger-value-basis">{label}</small>}
    {calculated&&value.pulse&&<small className="ledger-value-coordinate">☤KAI {Number(value.pulse).toLocaleString()}</small>}
    {change && <small className={`ledger-value-change is-${direction}`} title={`Calculated value at ☤KAI ${value.pulse} compared with ☤KAI ${change.pulse}`} aria-label={`${change.percent > 0 ? 'Up' : change.percent < 0 ? 'Down' : 'Unchanged'} ${Math.abs(change.percent).toFixed(2)} percent since previous pulse`}>
      {direction === 'up' ? <ArrowUpRight size={12}/> : direction === 'down' ? <ArrowDownRight size={12}/> : <Minus size={11}/>}{Math.abs(change.percent).toFixed(2)}%<span className="ledger-value-period"> / pulse</span>
    </small>}
  </span>;
}
