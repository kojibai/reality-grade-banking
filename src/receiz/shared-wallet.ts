import {readCurrentBalanceSource,type CurrentBalanceSource} from './current-balance-source';
import {readBalanceOriginalProofReferences,readReserveFundingSource,type BalanceOriginalProofReference,type ReserveFundingSource} from './balance-source-references';
export interface SharedWallet {
  currentBalanceSource?:CurrentBalanceSource;balanceSourceSha256?:string;
  originalProofReferences?:Readonly<Record<string,BalanceOriginalProofReference>>;reserveFundingSource?:ReserveFundingSource;
  userId: string; totalUsdCents: string; reserveUsdCents: string; settlementUsdCents: string; balancePhiMicro: string;
  settlementPhiMicro?: string | null; reservePhiMicro?: string | null;
  portfolioUsdCents: string | null; pnlUsdCents: string | null; withdrawableUsdCents: string | null;
  projectionComplete: boolean; accountOnlyComplete?:true; pulse: string | null; kaiUpulse: string | null;
}
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Receiz wallet response is unavailable.'); return value as Record<string, unknown>; }
function exact(value: unknown): string { if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value) || value.length > 40) throw new Error('Receiz wallet returned an unsupported amount.'); return value; }
function nullable(value: unknown): string | null { return value === null || value === undefined ? null : exact(value); }
function nullableSigned(value: unknown): string | null { if (value === null || value === undefined) return null; if (typeof value !== 'string' || !/^-?(0|[1-9]\d*)$/.test(value) || value.length > 40) throw new Error('Receiz wallet returned unsupported profit data.'); return value; }
function usdCents(value: unknown): string { if (typeof value !== 'string' || !/^(0|[1-9]\d*)\.\d{2}$/.test(value) || value.length > 40) throw new Error('Receiz wallet total is unavailable.'); const [dollars, cents] = value.split('.'); return (BigInt(dollars) * 100n + BigInt(cents)).toString(); }
/** Native buildWalletValueStatesFromBalanceCents floors the Settlement display
 * separately. Recorded Reserve can exceed the net total after a source-value
 * decline. This read-only relation neither changes totals nor admits spending. */
export function hasNativeWalletUsdComposition(value:Pick<SharedWallet,'totalUsdCents'|'reserveUsdCents'|'settlementUsdCents'>):boolean{
 const total=BigInt(value.totalUsdCents),reserve=BigInt(value.reserveUsdCents);
 return BigInt(value.settlementUsdCents)===(total>reserve?total-reserve:0n);
}
/** Optional display operands beneath this same wallet. Local native movement
 * projection is newer than top-level snapshot fields and must win. Missing or
 * inconsistent operands never invalidate the known dollar/total observation. */
export function readWalletPhiSplit(input:unknown,balancePhiMicro:string):Pick<SharedWallet,'reservePhiMicro'|'settlementPhiMicro'>{
 const value=input as Record<string,unknown>|null;
 if(!value||typeof value!=='object')return {};
 const uint=(v:unknown):v is string=>typeof v==='string'&&/^(0|[1-9]\d{0,39})$/.test(v);
 const unknown={reservePhiMicro:null,settlementPhiMicro:null};
 const projection=value.bankNoteValueProjection as Record<string,unknown>|null;
 if(value.bankNoteValueProjection!==undefined){
  if(!projection||projection.schema!=='receiz.bank.local-rail-value.v1'||!uint(projection.reserveBackingPhiMicro)||!uint(projection.settlementPhiMicro)
   ||BigInt(projection.reserveBackingPhiMicro)+BigInt(projection.settlementPhiMicro)!==BigInt(balancePhiMicro))return unknown;
  return {reservePhiMicro:projection.reserveBackingPhiMicro,settlementPhiMicro:projection.settlementPhiMicro};
 }
 if(value.reservePhiMicro===undefined&&value.settlementPhiMicro===undefined)return {};
 const reserve=uint(value.reservePhiMicro)?value.reservePhiMicro:null,settlement=uint(value.settlementPhiMicro)?value.settlementPhiMicro:null,total=BigInt(balancePhiMicro);
 if(reserve!==null&&BigInt(reserve)>total||settlement!==null&&BigInt(settlement)>total||reserve!==null&&settlement!==null&&BigInt(reserve)+BigInt(settlement)!==total)return unknown;
 return {reservePhiMicro:reserve,settlementPhiMicro:settlement};
}
/** The same retained source is only repriced, not funded again. Preserve its
 * exact fixed backing units; an altered backing claim needs new source units. */
export function projectUnchangedWalletPhiSplit(previous:SharedWallet,next:SharedWallet):Pick<SharedWallet,'reservePhiMicro'|'settlementPhiMicro'>{
 const split=readWalletPhiSplit(previous,previous.balancePhiMicro);if(!Object.keys(split).length)return {};
 if(previous.userId!==next.userId||previous.reserveUsdCents!==next.reserveUsdCents)return {reservePhiMicro:null,settlementPhiMicro:null};
 if(previous.balancePhiMicro===next.balancePhiMicro)return split;
 if(split.reservePhiMicro===null||split.reservePhiMicro===undefined||split.settlementPhiMicro===null||split.settlementPhiMicro===undefined||BigInt(split.reservePhiMicro)>BigInt(next.balancePhiMicro))return {reservePhiMicro:null,settlementPhiMicro:null};
 return {reservePhiMicro:split.reservePhiMicro,settlementPhiMicro:(BigInt(next.balancePhiMicro)-BigInt(split.reservePhiMicro)).toString()};
}
// Read-only presentation of loadWalletSummaryForUser, also used by Receiz's wallet.
// It is never a new balance authority and never feeds the demo reducer.
export function parseSharedWallet(input: unknown, expectedUserId: string): SharedWallet {
  const envelope = object(input), wallet = object(envelope.wallet), value = object(wallet.valueStates);
  if (envelope.ok !== true || !expectedUserId || wallet.userId !== expectedUserId) throw new Error('This wallet does not belong to the connected Receiz ID.');
  const reserveUsdCents = exact(value.settledBalanceUsdCents), settlementUsdCents = exact(value.ecosystemBalanceUsdCents), totalUsdCents = usdCents(wallet.balanceUsd);
  if (!hasNativeWalletUsdComposition({reserveUsdCents,settlementUsdCents,totalUsdCents})) throw new Error('Receiz wallet value states are inconsistent. Refresh to retrieve the current source.');
  const currentBalanceSource=readCurrentBalanceSource(wallet.currentBalanceSource,expectedUserId);
  const sync = object(wallet.sync), rollup = object(wallet.rollup),originalProofReferences=readBalanceOriginalProofReferences(wallet.originalProofReferences),reserveFundingSource=readReserveFundingSource(wallet.reserveFundingSource,expectedUserId,reserveUsdCents);
  return { userId: expectedUserId,...(currentBalanceSource?{currentBalanceSource}:{}),...(originalProofReferences?{originalProofReferences}:{}),...(reserveFundingSource?{reserveFundingSource}:{}), reserveUsdCents, settlementUsdCents, totalUsdCents, balancePhiMicro: exact(wallet.balancePhiMicro), ...readWalletPhiSplit(wallet,exact(wallet.balancePhiMicro)),
    portfolioUsdCents: nullable(value.livePortfolioValueUsdCents), pnlUsdCents: nullableSigned(value.unrealizedPnlUsdCents), withdrawableUsdCents: nullable(value.withdrawableNowUsdCents),
    projectionComplete: sync.projectionComplete === true, ...(wallet.creationSigilEntitlementEnabled===false&&sync.source==='account_only'&&sync.lawfulActionProjectionAvailable===true?{accountOnlyComplete:true as const}:{}), pulse: nullable(rollup.lastEntryKaiPulse), kaiUpulse: nullable(rollup.lastEntryKaiUpulse) };
}
