/** Passive composition operands carried by the existing Wallet response.
 * This parser conveys no proof admission, ownership or spending authority. */
export type WalletCashBasis=Readonly<{schema:'receiz.wallet.cash-plus-originals.v1';phiOffsetMicro:string;usdOffsetCents:string;fromKaiUPulse:string;accountOnlyUsdRateMicrocents?:string}>;
export function readWalletCashBasis(value:unknown):WalletCashBasis|undefined{
 if(value==null)return;if(typeof value!=='object'||Array.isArray(value))throw Error('WALLET_CASH_BASIS_INVALID');
 const v=value as Record<string,unknown>,quoted=Object.hasOwn(v,'accountOnlyUsdRateMicrocents'),keys=['schema','phiOffsetMicro','usdOffsetCents','fromKaiUPulse',...(quoted?['accountOnlyUsdRateMicrocents']:[])].sort();
 if(Object.keys(v).sort().join(',')!==keys.join(',')||v.schema!=='receiz.wallet.cash-plus-originals.v1'||typeof v.phiOffsetMicro!=='string'||!/^(0|-?[1-9]\d{0,38})$/.test(v.phiOffsetMicro)
 ||typeof v.usdOffsetCents!=='string'||!/^(0|[1-9]\d{0,38})$/.test(v.usdOffsetCents)||typeof v.fromKaiUPulse!=='string'||!/^(0|[1-9]\d{0,38})$/.test(v.fromKaiUPulse)
 ||quoted&&(typeof v.accountOnlyUsdRateMicrocents!=='string'||!/^[1-9]\d{0,18}$/.test(v.accountOnlyUsdRateMicrocents)||BigInt(v.accountOnlyUsdRateMicrocents)>9223372036854775807n))throw Error('WALLET_CASH_BASIS_INVALID');
 return Object.freeze({...v}) as WalletCashBasis;
}
export type WalletCashComposition=Readonly<{cashBasis?:WalletCashBasis;cashBasisAccepted?:boolean}>;
/** A later ordinary read cannot erase a composition already carried by the
 * account. Completed financial results retain it as historical context. */
export function keepsWalletCashComposition(previous:readonly (WalletCashComposition|null|undefined)[],next:WalletCashComposition|undefined):boolean{
 for(const held of previous){if(!held?.cashBasis||!held.cashBasisAccepted)continue;if(!next?.cashBasis)return false;
  if(!next.cashBasisAccepted||(['schema','phiOffsetMicro','usdOffsetCents','fromKaiUPulse','accountOnlyUsdRateMicrocents'] as const).some(key=>held.cashBasis![key]!==next.cashBasis![key]))return false;
 }return true;
}
