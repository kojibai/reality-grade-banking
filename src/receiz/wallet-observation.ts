import {readCurrentBalanceSource} from './current-balance-source';
import {readBalanceOriginalProofReferences,readReserveFundingSource} from './balance-source-references';
import {hasSettledAccountView} from './account-view';
import {readCompositeWalletSource} from './composite-wallet-source';
import { hasNativeWalletUsdComposition, parseSharedWallet, readWalletPhiSplit, type SharedWallet } from './shared-wallet';
import { isBankNativeApplicationId, BANK_OBSERVATION_APPLICATION_IDS } from './config';
import type { WalletPoint } from './wallet-series';
type WalletFinancialState = Pick<SharedWallet, 'userId' | 'balancePhiMicro' | 'reserveUsdCents' | 'kaiUpulse' | 'pulse'>;
/** Display-only tombstone for units a saved note may have spent. A complete
 * old source cannot resume quotes; a different financial tuple can reconcile. */
export interface WalletQuoteHold extends WalletFinancialState { schema: 'bank.wallet-quote-hold.v1'; }
export function sameWalletFinancialState(left: WalletFinancialState, right: WalletFinancialState) {
  return (['userId', 'balancePhiMicro', 'reserveUsdCents', 'kaiUpulse', 'pulse'] as const).every(field => left[field] === right[field]);
}
export function createWalletQuoteHold(wallet: SharedWallet): WalletQuoteHold {
  return { schema: 'bank.wallet-quote-hold.v1', userId: wallet.userId, balancePhiMicro: wallet.balancePhiMicro, reserveUsdCents: wallet.reserveUsdCents, kaiUpulse: wallet.kaiUpulse, pulse: wallet.pulse };
}
export function isWalletQuoteHeld(value: WalletObservation): boolean { return !!value.quoteHold && sameWalletFinancialState(value.quoteHold, value.wallet); }
export interface WalletObservation { chartSource?: import('./composite-wallet-history').CompositeWalletSource; quoteHold?: WalletQuoteHold; wallet: SharedWallet; observedAt: string; history?: WalletPoint[]; source?: 'account-genesis' | 'local-note-head'; localHeadDigest?: string; walletScope?: 'native-full' | 'native-cash-only'; historyBasis?: { schema: 'bank.account-history-display.v1'; kind?:'legacy-wallet-observations'|'portfolio-model-v129'|'current-valuation-v129'; startKaiUPulse: string; endKaiUPulse: string; retainedStateSha256?: string; settlementPhiMicro?: string; balancePhiMicro?: string; reserveUsdCents?: string }; }
export function readWalletObservation(input: unknown, binding: { keyId: string; artifactSha256: string }): WalletObservation | null {
  if (!input || typeof input !== 'object') return null;
  const value = input as Record<string, unknown>; let wallet = value.wallet as SharedWallet;
  if (value.schema !== 'receiz.bank.private-wallet-observation.v1' || value.authority !== 'read-only-observation' || !BANK_OBSERVATION_APPLICATION_IDS.some(id => id === value.applicationId) || value.keyId !== binding.keyId || value.artifactSha256 !== binding.artifactSha256 || typeof value.observedAt !== 'string' || !Number.isFinite(Date.parse(value.observedAt)) || !wallet || typeof wallet.userId !== 'string' || !wallet.userId || wallet.userId.length > 128) return null;
  if (value.walletScope !== undefined && value.walletScope !== 'native-full' && value.walletScope !== 'native-cash-only') return null;
  for (const amount of [wallet.totalUsdCents, wallet.reserveUsdCents, wallet.settlementUsdCents, wallet.balancePhiMicro]) if (typeof amount !== 'string' || !/^(0|[1-9]\d{0,39})$/.test(amount)) return null;
  if (!hasNativeWalletUsdComposition(wallet)) return null;
  if(wallet.balanceSourceSha256!==undefined&&!/^[a-f0-9]{64}$/.test(wallet.balanceSourceSha256)){wallet={...wallet};delete wallet.balanceSourceSha256;}
  const phiSplit=readWalletPhiSplit(wallet,wallet.balancePhiMicro);if(Object.keys(phiSplit).length)wallet={...wallet,...phiSplit};
  const originalProofReferences=readBalanceOriginalProofReferences(wallet.originalProofReferences),reserveFundingSource=readReserveFundingSource(wallet.reserveFundingSource,wallet.userId,wallet.reserveUsdCents);
  if(wallet.originalProofReferences!==undefined||wallet.reserveFundingSource!==undefined){wallet={...wallet};delete wallet.originalProofReferences;delete wallet.reserveFundingSource;if(originalProofReferences)wallet.originalProofReferences=originalProofReferences;if(reserveFundingSource)wallet.reserveFundingSource=reserveFundingSource;}
  if(wallet.currentBalanceSource!==undefined){const currentBalanceSource=readCurrentBalanceSource(wallet.currentBalanceSource,wallet.userId);wallet={...wallet};delete wallet.currentBalanceSource;if(currentBalanceSource)wallet.currentBalanceSource=currentBalanceSource;}
  const quoteHold = value.quoteHold as WalletQuoteHold | undefined;
  if (value.quoteHold !== undefined && (!quoteHold || typeof quoteHold !== 'object' || Object.keys(quoteHold).sort().join('|') !== 'balancePhiMicro|kaiUpulse|pulse|reserveUsdCents|schema|userId'
    || quoteHold.schema !== 'bank.wallet-quote-hold.v1' || quoteHold.userId !== wallet.userId
    || ![quoteHold.balancePhiMicro, quoteHold.reserveUsdCents].every(amount => typeof amount === 'string' && /^(0|[1-9]\d{0,39})$/.test(amount))
    || ![quoteHold.kaiUpulse, quoteHold.pulse].every(kai => kai === null || typeof kai === 'string' && /^\d{1,30}$/.test(kai)))) return null;
  const history = Array.isArray(value.history) ? value.history.slice(-4096).filter((point): point is WalletPoint => {
    if (!point || typeof point !== 'object' || point.userId !== wallet.userId || typeof point.at !== 'string' || !Number.isFinite(Date.parse(point.at)) || Date.parse(point.at) > Date.parse(value.observedAt as string)) return false;
    if (point.kaiUPulse !== null && (typeof point.kaiUPulse !== 'string' || !/^\d{1,30}$/.test(point.kaiUPulse))) return false;
    if (point.valuation !== undefined && point.valuation !== 'deterministic-v129' && point.valuation !== 'legacy-model-v129' && point.valuation !== 'portfolio-model-v129') return false;
    if (![point.totalUsdCents, point.reserveUsdCents, point.settlementUsdCents].every(amount => typeof amount === 'string' && /^(0|[1-9]\d{0,39})$/.test(amount))) return false;
    return hasNativeWalletUsdComposition(point);
  }) : [];
  const basis = value.historyBasis as WalletObservation['historyBasis'];
  const historyBasis = basis?.schema === 'bank.account-history-display.v1' && (basis.kind===undefined||basis.kind==='legacy-wallet-observations'||basis.kind==='portfolio-model-v129'||basis.kind==='current-valuation-v129') && typeof basis.startKaiUPulse === 'string' && /^\d{1,30}$/.test(basis.startKaiUPulse) && typeof basis.endKaiUPulse === 'string' && /^\d{1,30}$/.test(basis.endKaiUPulse) && Array.isArray(value.history) && history.length === value.history.length && (basis.retainedStateSha256 === undefined || /^[a-f0-9]{64}$/.test(basis.retainedStateSha256)) && [basis.settlementPhiMicro,basis.balancePhiMicro,basis.reserveUsdCents].every(value => value === undefined || typeof value === 'string' && /^(0|[1-9]\d{0,39})$/.test(value)) ? basis : undefined;
  const chartSource = readCompositeWalletSource(value.chartSource,wallet.userId);
  return projectKnownNativeWalletPhiSplit({ wallet, observedAt: value.observedAt, ...(chartSource ? {chartSource} : {}), ...(quoteHold ? {quoteHold} : {}), ...(value.walletScope ? { walletScope: value.walletScope } : {}), ...(history.length ? { history } : {}), ...(historyBasis ? {historyBasis} : {}), ...(value.source === 'local-note-head' && typeof value.localHeadDigest === 'string' && /^[a-f0-9]{64}$/.test(value.localHeadDigest) ? { source: 'local-note-head' as const, localHeadDigest: value.localHeadDigest } : {}), ...(value.source === 'account-genesis' && wallet.totalUsdCents === '0' && wallet.balancePhiMicro === '0' ? { source: 'account-genesis' as const } : {}) });
}

/** Reuse exact native units already held beneath this same complete frame.
 * This fills presentation aliases, never reprices, rediscovers or admits it. */
export function projectKnownNativeWalletPhiSplit(value:WalletObservation):WalletObservation{
 const basis=value.historyBasis,wallet=value.wallet,uint=(v:unknown):v is string=>typeof v==='string'&&/^(0|[1-9]\d{0,39})$/.test(v);
 if((value.walletScope!=='native-full'&&value.walletScope!=='native-cash-only')||!basis||basis.kind!==undefined||!hasSettledAccountView(value)
  ||!uint(basis.settlementPhiMicro)||basis.balancePhiMicro!==wallet.balancePhiMicro||basis.reserveUsdCents!==wallet.reserveUsdCents||BigInt(basis.settlementPhiMicro)>BigInt(wallet.balancePhiMicro))return value;
 const reservePhiMicro=(BigInt(wallet.balancePhiMicro)-BigInt(basis.settlementPhiMicro)).toString();
 if(wallet.reservePhiMicro===reservePhiMicro&&wallet.settlementPhiMicro===basis.settlementPhiMicro)return value;
 return {...value,wallet:{...wallet,reservePhiMicro,settlementPhiMicro:basis.settlementPhiMicro}};
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
