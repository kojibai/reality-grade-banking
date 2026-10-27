import type {AccountStatement} from './account-proof-statement';
import type {SharedWallet} from './shared-wallet';
import type {WalletObservation} from './wallet-observation';
import type {WalletRateCalculation} from './historical-wallet';
export type NativeBalanceCalculation=Readonly<{
 kind:'native';userId:string;kaiUPulse:string;source:'verified-account-checkpoint'|'local-known-valuation';sourceDigest?:string;
 reserveUsdCents:string;settlementPhiMicro:string;balancePhiMicro:string;rateMicrocents:string|null;output:SharedWallet;rateCalculation?:WalletRateCalculation;statement?:Pick<AccountStatement,'checkpoint'|'transactions'|'sourceFrontier'|'components'>;
}>;
// Read-only diagnostic attachment to the exact frame actually produced by the
// existing calculator. No financial consumer accepts this as authority.
const native=new WeakMap<WalletObservation,NativeBalanceCalculation>();
export function rememberNativeBalanceCalculation(frame:WalletObservation,value:NativeBalanceCalculation){native.set(frame,Object.freeze({...value,output:Object.freeze({...value.output})}));}
export function knownNativeBalanceCalculation(frame:WalletObservation){return native.get(frame)??null;}
