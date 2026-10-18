import { parseSharedWallet, type SharedWallet } from './shared-wallet';
import { isBankNativeApplicationId, BANK_OBSERVATION_APPLICATION_IDS } from './config';
import type { WalletPoint } from './wallet-series';
export interface WalletObservation { wallet: SharedWallet; observedAt: string; history?: WalletPoint[]; source?: 'account-genesis' | 'local-note-head'; localHeadDigest?: string; walletScope?: 'native-cash-only'; historyBasis?: { schema: 'bank.account-history-display.v1'; startKaiUPulse: string; endKaiUPulse: string; retainedStateSha256?: string; settlementPhiMicro?: string; balancePhiMicro?: string; reserveUsdCents?: string }; }
export function readWalletObservation(input: unknown, binding: { keyId: string; artifactSha256: string }): WalletObservation | null {
  if (!input || typeof input !== 'object') return null;
  const value = input as Record<string, unknown>, wallet = value.wallet as SharedWallet;
  if (value.schema !== 'receiz.bank.private-wallet-observation.v1' || value.authority !== 'read-only-observation' || !BANK_OBSERVATION_APPLICATION_IDS.some(id => id === value.applicationId) || value.keyId !== binding.keyId || value.artifactSha256 !== binding.artifactSha256 || typeof value.observedAt !== 'string' || !Number.isFinite(Date.parse(value.observedAt)) || !wallet || typeof wallet.userId !== 'string' || !wallet.userId || wallet.userId.length > 128) return null;
  for (const amount of [wallet.totalUsdCents, wallet.reserveUsdCents, wallet.settlementUsdCents, wallet.balancePhiMicro]) if (typeof amount !== 'string' || !/^(0|[1-9]\d{0,39})$/.test(amount)) return null;
  if (BigInt(wallet.totalUsdCents) !== BigInt(wallet.reserveUsdCents) + BigInt(wallet.settlementUsdCents)) return null;
  const history = Array.isArray(value.history) ? value.history.slice(-4096).filter((point): point is WalletPoint => {
    if (!point || typeof point !== 'object' || point.userId !== wallet.userId || typeof point.at !== 'string' || !Number.isFinite(Date.parse(point.at)) || Date.parse(point.at) > Date.parse(value.observedAt as string)) return false;
    if (point.kaiUPulse !== null && (typeof point.kaiUPulse !== 'string' || !/^\d{1,30}$/.test(point.kaiUPulse))) return false;
    if (point.valuation !== undefined && point.valuation !== 'deterministic-v129') return false;
    if (![point.totalUsdCents, point.reserveUsdCents, point.settlementUsdCents].every(amount => typeof amount === 'string' && /^(0|[1-9]\d{0,39})$/.test(amount))) return false;
    return BigInt(point.totalUsdCents) === BigInt(point.reserveUsdCents) + BigInt(point.settlementUsdCents);
  }) : [];
  const basis = value.historyBasis as WalletObservation['historyBasis'];
  const historyBasis = basis?.schema === 'bank.account-history-display.v1' && typeof basis.startKaiUPulse === 'string' && /^\d{1,30}$/.test(basis.startKaiUPulse) && typeof basis.endKaiUPulse === 'string' && /^\d{1,30}$/.test(basis.endKaiUPulse) && Array.isArray(value.history) && history.length === value.history.length && (basis.retainedStateSha256 === undefined || /^[a-f0-9]{64}$/.test(basis.retainedStateSha256)) && [basis.settlementPhiMicro,basis.balancePhiMicro,basis.reserveUsdCents].every(value => value === undefined || typeof value === 'string' && /^(0|[1-9]\d{0,39})$/.test(value)) ? basis : undefined;
  return { wallet, observedAt: value.observedAt, ...(history.length ? { history } : {}), ...(historyBasis ? {historyBasis} : {}), ...(value.source === 'local-note-head' && typeof value.localHeadDigest === 'string' && /^[a-f0-9]{64}$/.test(value.localHeadDigest) ? { source: 'local-note-head' as const, localHeadDigest: value.localHeadDigest } : {}), ...(value.source === 'account-genesis' && wallet.totalUsdCents === '0' && wallet.balancePhiMicro === '0' ? { source: 'account-genesis' as const } : {}) };
}

/** A signer-authenticated snapshot cannot establish a foreign account placement. */
export function readCarriedWalletObservation(projection: import('@receiz/sdk').ReceizIdentityAccountProjection): WalletObservation | null {
  if (projection.authority !== 'verified-identity-portable-state' || !projection.portableStateVerified) return null;
  const state = projection.verifiedState as { account?: { userId?: string }; wallet?: { routeSummary?: unknown }; exportedAt?: string; bankGenesis?: { schema?: string; applicationId?: string; keyId?: string; userId?: string; createdAt?: string; kaiUPulse?: string } } | null;
  if (!state?.account?.userId || state.account.userId !== projection.owner.uid || !state.wallet?.routeSummary || !state.exportedAt || !Number.isFinite(Date.parse(state.exportedAt))) return null;
  try {
    const wallet = parseSharedWallet({ ok: true, wallet: state.wallet.routeSummary }, projection.owner.uid), genesis = state.bankGenesis;
    const isGenesis = genesis?.schema === 'bank.account-genesis.v1' && isBankNativeApplicationId(genesis.applicationId) && genesis.keyId === projection.keyId && genesis.userId === projection.owner.uid && typeof genesis.createdAt === 'string' && Number.isFinite(Date.parse(genesis.createdAt)) && Date.parse(genesis.createdAt) <= Date.parse(state.exportedAt) && typeof genesis.kaiUPulse === 'string' && /^\d{1,30}$/.test(genesis.kaiUPulse) && wallet.totalUsdCents === '0' && wallet.balancePhiMicro === '0';
    return { wallet, observedAt: state.exportedAt, ...(isGenesis ? { source: 'account-genesis' as const, history: [{ userId: wallet.userId, at: genesis.createdAt!, kaiUPulse: genesis.kaiUPulse!, totalUsdCents: '0', reserveUsdCents: '0', settlementUsdCents: '0' }] } : {}) };
  } catch { return null; }
}
