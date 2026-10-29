import type {SharedWallet} from './shared-wallet';
import type {WalletPoint} from './wallet-series';
/** The current projection already did the arithmetic. Read only its matching
 * endpoint: no revaluation, request, execution authority or future sell quote. */
export function currentAvailabilityDifference(wallet:SharedWallet|null,history:readonly WalletPoint[],observedAt:string|null):string|null{
 const point=history.at(-1);
 if(!wallet||wallet.totalUsdCents!=='0'||!point||!observedAt||point.at!==observedAt||point.userId!==wallet.userId||point.totalUsdCents!==wallet.totalUsdCents||point.reserveUsdCents!==wallet.reserveUsdCents||point.settlementUsdCents!==wallet.settlementUsdCents||point.valuation!=='portfolio-model-v129')return null;
 const amount=point.availabilityGapUsdCents;
 return typeof amount==='string'&&/^[1-9]\d{0,39}$/.test(amount)?amount:null;
}
