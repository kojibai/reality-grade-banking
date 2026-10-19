import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { formatMoney } from '../../core/money';
import { ledgerValueLabel, type LedgerValueDisplay } from '../../receiz/ledger-value';
import {ledgerValueChange} from './LedgerValueChange';
import './ledger-value.css';

export function LedgerValue({ value, className = '',currentValue,inlineChange=false }: { value: LedgerValueDisplay; className?: string;currentValue?:LedgerValueDisplay|null;inlineChange?:boolean }) {
  const eventChange=currentValue?ledgerValueChange(value,currentValue):null;
  const change = value.comparison, direction = eventChange?.direction??(change ? change.percent > 0 ? 'up' : change.percent < 0 ? 'down' : 'flat' : null);
  const label = ledgerValueLabel(value), coordinate = value.pulse ? ` · ☤KAI ${value.pulse}` : '',calculated=value.basis==='intrinsic-model'||value.basis==='card-model'||value.basis==='live-model';
  const changeLabel=eventChange?.percent??(change?`${change.percent>0?'+':change.percent<0?'−':''}${Math.abs(change.percent).toFixed(2)}%`:null);
  return <span className={`ledger-value ${inlineChange?'ledger-value-inline':''} ${className}`} title={value.gap ?? `${label}${coordinate}${calculated ? ' · Display model, not a realized sale price.' : ''}`}>
    <strong>{value.amountUsdCents === null ? '—' : formatMoney(value.amountUsdCents)}</strong>
    {value.basis !== 'unavailable' && <small className="ledger-value-basis">{label}</small>}
    {calculated&&value.pulse&&<small className="ledger-value-coordinate">☤KAI {Number(value.pulse).toLocaleString()}</small>}
    {changeLabel && <small className={`ledger-value-change is-${direction}`} title={eventChange?`Asset value at ☤KAI ${currentValue!.pulse} compared with transfer at ☤KAI ${value.pulse}`:`Calculated value at ☤KAI ${value.pulse} compared with ☤KAI ${change!.pulse}`} aria-label={`${direction==='up'?'Up':direction==='down'?'Down':'Unchanged'} ${changeLabel.replace(/^[+−]/,'')} ${eventChange?'since transfer':'since previous pulse'}`}>
      {direction === 'up' ? <ArrowUpRight size={12} aria-hidden="true"/> : direction === 'down' ? <ArrowDownRight size={12} aria-hidden="true"/> : <Minus size={11} aria-hidden="true"/>}{changeLabel}{!inlineChange&&<span className="ledger-value-period">{eventChange?' since transfer':' / pulse'}</span>}
    </small>}
  </span>;
}
