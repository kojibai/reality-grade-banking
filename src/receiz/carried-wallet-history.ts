import {projectLegacyWalletObservation} from './legacy-wallet-history';
import type { ReceizIdentityAccountProjection } from '@receiz/sdk';
import { quoteReceizDisplayUsdV122 } from '@receiz/sdk';
import { projectHistoricalWallet, type WalletHistoryMovement } from './historical-wallet';
import { appendWalletPoint, mergeWalletPoints, walletPointTime, type WalletPoint } from './wallet-series';
import type { WalletObservation } from './wallet-observation';

const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('ACCOUNT_HISTORY_SOURCE_REQUIRED');
  return value as Record<string, unknown>;
};
const unsigned = (value: unknown): string => {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) value = String(value);
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,39})$/.test(value)) throw Error('ACCOUNT_HISTORY_AMOUNT_INVALID');
  return value;
};
const coordinate = (value: unknown) => {
  const exact = unsigned(value);
  if (exact.length > 30) throw Error('ACCOUNT_HISTORY_COORDINATE_INVALID');
  return exact;
};

/** Read-only history beneath the SDK's complete, admitted same-owner carrier.
 * Reconcile both rails and gross Phi with the carried wallet before drawing.
 * No snapshot alias, missing-rail inference, login grant or spending authority. */
function projectNativeCarriedWalletObservation(projection: ReceizIdentityAccountProjection, observation: WalletObservation): WalletObservation | null {
  try {
    if (projection.authority !== 'verified-identity-portable-state' || !projection.portableStateVerified || !projection.completeAtSealedHead) return null;
    const state = record(projection.verifiedState), owner = projection.owner.uid;
    if (!owner || record(state.account).userId !== owner || observation.wallet.userId !== owner) return null;
    const wallet = record(state.wallet), rows = wallet.ledgerEntries ?? state.walletLedgerEntries;
    if (!Array.isArray(rows) || rows.length > 100_000) return null;
    const end = coordinate(record(state.accountStateHead).kaiUpulse);
    if (Date.parse(walletPointTime(end)) > Date.parse(observation.observedAt)) return null;
    let reserve = 0n, settlement = 0n, gross = 0n;
    const movements: WalletHistoryMovement[] = [], ids = new Set<string>();
    const ordered = rows.map(value => { const row = record(value); return { row, kai: coordinate(row.kai_upulse) }; })
      .sort((a,b) => BigInt(a.kai) < BigInt(b.kai) ? -1 : BigInt(a.kai) > BigInt(b.kai) ? 1 : 0);
    for (const { row, kai } of ordered) {
      const metadata = row.metadata == null ? {} : record(row.metadata), id = row.id;
      if (typeof id !== 'string' || !id || ids.has(id) || row.user_id !== owner || !['credit','debit'].includes(String(row.direction))) return null;
      ids.add(id);
      const isReserve = row.entry_kind === 'admin_adjustment' || metadata.rail === 'reserve';
      if (row.entry_kind !== 'admin_adjustment' && !['reserve','settlement'].includes(String(metadata.rail))) return null;
      const sign = row.direction === 'debit' ? -1n : 1n;
      const phi = BigInt(unsigned(row.amount_phi_micro)) * sign, cents = BigInt(unsigned(row.amount_usd_cents)) * sign;
      gross += phi;
      if (isReserve) reserve += cents; else settlement += phi;
      if (gross < 0n || reserve < 0n || settlement < 0n || settlement > gross) return null;
      movements.push({ kaiUPulse: kai, reserveDeltaUsdCents: isReserve ? cents.toString() : '0', settlementDeltaPhiMicro: isReserve ? '0' : phi.toString() });
    }
    if (gross.toString() !== observation.wallet.balancePhiMicro || reserve.toString() !== observation.wallet.reserveUsdCents || settlement < 0n) return null;
    const rate = settlement === 0n ? null : unsigned(record(record(wallet.routeSummary).quote).usdPerPhiMicrocents);
    const dollars = settlement === 0n ? '0' : quoteReceizDisplayUsdV122(settlement.toString(), rate!);
    if (dollars !== observation.wallet.settlementUsdCents || (reserve + BigInt(dollars)).toString() !== observation.wallet.totalUsdCents) return null;
    // Action rows establish the actual first sealed activity, while the wallet
    // rows above account for money exactly once. Never manufacture receipts.
    const actions = record(state.ledger).entries;
    if (!Array.isArray(actions) || actions.length + movements.length > 100_000) return null;
    for (const value of actions) {
      const action = record(value);
      const actor = action.actorUserId ?? action.actor_user_id, subject = action.subjectUserId ?? action.subject_user_id;
      if (actor !== owner && subject !== owner) return null;
      movements.push({ kaiUPulse: coordinate(action.kaiUpulse ?? action.kai_upulse), reserveDeltaUsdCents: '0', settlementDeltaPhiMicro: '0' });
    }
    const history = projectHistoricalWallet({ transactions: movements, userId: owner, endKaiUPulse: end });
    return {...observation,walletScope:'native-full',history:appendWalletPoint(history, observation.wallet, walletPointTime(end), end),historyBasis:{schema:'bank.account-history-display.v1',startKaiUPulse:history[0]?.kaiUPulse??end,endKaiUPulse:end,settlementPhiMicro:settlement.toString(),reserveUsdCents:reserve.toString(),balancePhiMicro:gross.toString()}};
  } catch { return null; }
}

export function projectCarriedWalletHistory(projection:ReceizIdentityAccountProjection,observation:WalletObservation):WalletPoint[]|null{return projectCarriedWalletObservation(projection,observation)?.history??null;}

export function projectCarriedWalletObservation(projection:ReceizIdentityAccountProjection,observation:WalletObservation):WalletObservation|null{return projectNativeCarriedWalletObservation(projection,observation)??projectLegacyWalletObservation(projection,observation);}

/** Enrich only an unchanged same-account financial head. A later quoted
 * wallet wins; older accepted legacy observations extend its chart only. */
export function mergeCarriedWalletHistory(current:WalletObservation,carried:WalletObservation,projection:ReceizIdentityAccountProjection):WalletObservation{
 if(!Number.isFinite(Date.parse(current.observedAt))||!Number.isFinite(Date.parse(carried.observedAt))||current.source==='local-note-head'||Date.parse(current.observedAt)<Date.parse(carried.observedAt))return current;
 const sameAmounts=(['userId','totalUsdCents','reserveUsdCents','settlementUsdCents','balancePhiMicro','kaiUpulse']as const).every(key=>current.wallet[key]===carried.wallet[key]);
 const sameHead=(['userId','reserveUsdCents','balancePhiMicro','kaiUpulse']as const).every(key=>current.wallet[key]===carried.wallet[key]);
 if(!sameAmounts&&!sameHead)return current;
 const projected=projectCarriedWalletObservation(projection,carried);if(!projected?.history?.length||!sameAmounts&&projected.historyBasis?.kind!=='legacy-wallet-observations')return current;
 const history=mergeWalletPoints([projected.history,current.history??[]],current.wallet.userId),basis=projected.historyBasis;
 const walletScope=current.walletScope==='native-cash-only'||projected.walletScope==='native-cash-only'?'native-cash-only':projected.walletScope;
 return {...current,walletScope,history,historyBasis:basis&&history[0]?.kaiUPulse&&history.at(-1)?.kaiUPulse?{...basis,startKaiUPulse:history[0].kaiUPulse!,endKaiUPulse:history.at(-1)!.kaiUPulse!}:undefined};
}
