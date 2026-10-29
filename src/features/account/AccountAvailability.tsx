import {ChevronRight} from 'lucide-react';
import {formatMoney} from '../../core/money';
import type {SharedWallet} from '../../receiz/shared-wallet';
import type {WalletPoint} from '../../receiz/wallet-series';
import {currentAvailabilityDifference} from '../../receiz/wallet-availability';
import './account-availability.css';

export function AccountAvailability({wallet,history,observedAt,ready,onOpen}:{wallet:SharedWallet|null;history:readonly WalletPoint[];observedAt:string|null;ready:boolean;onOpen():void}){
 const difference=currentAvailabilityDifference(wallet,history,observedAt);if(difference===null)return null;
 return <button type="button" className="account-availability" disabled={!ready} onClick={onOpen}><span>{formatMoney(difference)} until funds are available</span><ChevronRight size={13} strokeWidth={1.6} aria-hidden="true"/></button>;
}
export function AvailabilityCalculation({difference}:{difference:string}){
 return <div className="account-availability-body"><p>Your current Original value is below the value already used. Sale proceeds, received funds and value changes update this difference.</p><dl><div><dt>Before availability floor</dt><dd>−{formatMoney(difference)}</dd></div><div><dt>Available funds</dt><dd>$0.00</dd></div></dl><p>At current values, {formatMoney(String(BigInt(difference)+1n))} in net credits would bring your available balance above zero. The source calculation below shows every contributing amount.</p></div>;
}
