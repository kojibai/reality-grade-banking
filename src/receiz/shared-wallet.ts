export interface SharedWallet {
  userId: string; totalUsdCents: string; reserveUsdCents: string; settlementUsdCents: string; balancePhiMicro: string;
  portfolioUsdCents: string | null; pnlUsdCents: string | null; withdrawableUsdCents: string | null;
  projectionComplete: boolean; pulse: string | null; kaiUpulse: string | null;
}
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Receiz wallet response is unavailable.'); return value as Record<string, unknown>; }
function exact(value: unknown): string { if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value) || value.length > 40) throw new Error('Receiz wallet returned an unsupported amount.'); return value; }
function nullable(value: unknown): string | null { return value === null || value === undefined ? null : exact(value); }
function nullableSigned(value: unknown): string | null { if (value === null || value === undefined) return null; if (typeof value !== 'string' || !/^-?(0|[1-9]\d*)$/.test(value) || value.length > 40) throw new Error('Receiz wallet returned unsupported profit data.'); return value; }
function usdCents(value: unknown): string { if (typeof value !== 'string' || !/^(0|[1-9]\d*)\.\d{2}$/.test(value) || value.length > 40) throw new Error('Receiz wallet total is unavailable.'); const [dollars, cents] = value.split('.'); return (BigInt(dollars) * 100n + BigInt(cents)).toString(); }
// Read-only presentation of loadWalletSummaryForUser, also used by Receiz's wallet.
// It is never a new balance authority and never feeds the demo reducer.
export function parseSharedWallet(input: unknown, expectedUserId: string): SharedWallet {
  const envelope = object(input), wallet = object(envelope.wallet), value = object(wallet.valueStates);
  if (envelope.ok !== true || !expectedUserId || wallet.userId !== expectedUserId) throw new Error('This wallet does not belong to the connected Receiz ID.');
  const reserveUsdCents = exact(value.settledBalanceUsdCents), settlementUsdCents = exact(value.ecosystemBalanceUsdCents), totalUsdCents = usdCents(wallet.balanceUsd);
  if (BigInt(reserveUsdCents) + BigInt(settlementUsdCents) !== BigInt(totalUsdCents)) throw new Error('Receiz wallet value states are inconsistent. Refresh to retrieve the current source.');
  const sync = object(wallet.sync), rollup = object(wallet.rollup);
  return { userId: expectedUserId, reserveUsdCents, settlementUsdCents, totalUsdCents, balancePhiMicro: exact(wallet.balancePhiMicro),
    portfolioUsdCents: nullable(value.livePortfolioValueUsdCents), pnlUsdCents: nullableSigned(value.unrealizedPnlUsdCents), withdrawableUsdCents: nullable(value.withdrawableNowUsdCents),
    projectionComplete: sync.projectionComplete === true, pulse: nullable(rollup.lastEntryKaiPulse), kaiUpulse: nullable(rollup.lastEntryKaiUpulse) };
}
