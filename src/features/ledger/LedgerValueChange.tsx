import {ArrowDownRight,ArrowUpRight,Minus} from 'lucide-react';
import type {LedgerValueDisplay} from '../../receiz/ledger-value';
import {formatMoney} from '../../core/money';

/** Exact integer cents; percentage rounded to two decimals, half away from
 * zero. A zero basis has no percentage return and never becomes infinity. */
export function ledgerValueChange(before:LedgerValueDisplay,now:LedgerValueDisplay){
 if(!['card-snapshot','card-model','intrinsic-model'].includes(before.basis)||now.basis!=='live-model'||before.amountUsdCents===null||now.amountUsdCents===null||!before.pulse||!now.pulse||BigInt(now.pulse)<BigInt(before.pulse))return null;
 const base=BigInt(before.amountUsdCents),delta=BigInt(now.amountUsdCents)-base,absolute=delta<0n?-delta:delta;
 const hundredths=base>0n?(absolute*10000n+base/2n)/base:null;
 return {direction:delta>0n?'up' as const:delta<0n?'down' as const:'flat' as const,deltaUsdCents:delta.toString(),percent:hundredths===null?null:`${delta<0n?'−':delta>0n?'+':''}${(hundredths/100n).toLocaleString('en-US')}.${String(hundredths%100n).padStart(2,'0')}%`};
}
export function LedgerValueChange({value,currentValue}:{value:LedgerValueDisplay;currentValue?:LedgerValueDisplay|null}){
 const change=currentValue?ledgerValueChange(value,currentValue):null;if(!change)return null;
 const Icon=change.direction==='up'?ArrowUpRight:change.direction==='down'?ArrowDownRight:Minus;
 return <div className={`ledger-transfer-return is-${change.direction}`} aria-label={`${change.direction==='up'?'Increase':change.direction==='down'?'Decrease':'Unchanged'} since transfer`}><span>Since transfer</span><strong><Icon size={19} strokeWidth={1.6} aria-hidden="true"/>{change.percent??'No percentage basis'}</strong><small>{change.direction==='up'?'+':change.direction==='down'?'−':''}{formatMoney(change.deltaUsdCents.replace('-',''))} · change in asset value</small></div>;
}
