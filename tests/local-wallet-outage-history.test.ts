import { afterEach, expect, it, vi } from 'vitest';
import { CHART_PERIODS, chartPeriodBounds, chartPeriodPoints } from '../src/core/chart-history';
import { historicalWalletUsdRate, projectHistoricalWallet } from '../src/receiz/historical-wallet';
import { revalueKnownWallet } from '../src/receiz/local-wallet-valuation';
import type { WalletObservation } from '../src/receiz/wallet-observation';
import { walletPointTime } from '../src/receiz/wallet-series';
import { quoteReceizDisplayUsdV122 } from '@receiz/sdk';

afterEach(() => vi.unstubAllGlobals());

it('reconstructs unwitnessed valuation intervals after a long outage without a network read', () => {
  const network = vi.fn(() => { throw Error('Network unavailable'); });
  vi.stubGlobal('fetch', network);
  const transactions = [
    { kaiUPulse: '1000000', reserveDeltaUsdCents: '1000', settlementDeltaPhiMicro: '0' },
    { kaiUPulse: '2000000', reserveDeltaUsdCents: '0', settlementDeltaPhiMicro: '2000000' },
  ];
  const previousEnd = '15000000000000', now = '18000000000000';
  const history = projectHistoricalWallet({ transactions, userId: 'owner', endKaiUPulse: previousEnd });
  const endpoint = history.at(-1)!;
  const previous: WalletObservation = {
    walletScope: 'native-full', observedAt: endpoint.at, history,
    wallet: { userId: 'owner', totalUsdCents: endpoint.totalUsdCents, reserveUsdCents: '1000', settlementUsdCents: endpoint.settlementUsdCents, balancePhiMicro: '2000000', projectionComplete: true, pulse: '2', kaiUpulse: '2000000', portfolioUsdCents: null, pnlUsdCents: null, withdrawableUsdCents: null },
    historyBasis: { schema: 'bank.account-history-display.v1', startKaiUPulse: '1000000', endKaiUPulse: previousEnd, settlementPhiMicro: '2000000', balancePhiMicro: '2000000', reserveUsdCents: '1000' },
  };
  const original = structuredClone(previous);
  const next = revalueKnownWallet(previous, now, walletPointTime(now))!;
  expect(next).not.toBeNull();
  expect(next.history![0]).toEqual(history[0]);
  expect(next.history!.at(-1)?.kaiUPulse).toBe(now);
  expect(next.wallet.balancePhiMicro).toBe(previous.wallet.balancePhiMicro);
  expect(next.wallet.kaiUpulse).toBe(previous.wallet.kaiUpulse);
  const starts = new Set<number>();
  for (const period of CHART_PERIODS) {
    const range = chartPeriodBounds(next.history!, period)!;
    const points = chartPeriodPoints(next.history!, period);
    starts.add(range.start);
    expect(points.length).toBeGreaterThan(40);
    expect(Date.parse(points.at(-1)!.at)).toBe(range.end);
    // The recomputed range fills the plot instead of clustering at its right edge.
    expect((Date.parse(points[0].at) - range.start) / (range.end - range.start)).toBeLessThan(.015);
  }
  expect(starts.size).toBe(CHART_PERIODS.length);
  const unwitnessed = next.history!.find(point => BigInt(point.kaiUPulse!) > BigInt(previousEnd) && point.kaiUPulse !== now)!;
  expect(unwitnessed.valuation).toBe('deterministic-v129');
  expect(unwitnessed.settlementUsdCents).toBe(quoteReceizDisplayUsdV122('2000000', historicalWalletUsdRate(unwitnessed.kaiUPulse!)));
  expect(transactions).toHaveLength(2);
  expect(previous).toEqual(original);
  expect(network).not.toHaveBeenCalled();
});
