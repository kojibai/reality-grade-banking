import type { ReceizIdentityAccountProjection } from '@receiz/sdk';
import { mergePublicRecords, parsePublicNetworkPage, type PublicRecord } from './public-network';
function object(value: unknown): Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
export interface PersonalHistory { records: PublicRecord[]; completeAtSealedHead: boolean; available: boolean; awaitingAccountBinding?: boolean; }
// Called only with the projection held by an SDK-admitted Identity Seal. Never public lookup/filtering.
export function projectPersonalHistory(projection: ReceizIdentityAccountProjection, boundAccountUid?: string): PersonalHistory {
  if (projection.authority !== 'verified-identity-portable-state' || !projection.portableStateVerified) return { records: [], completeAtSealedHead: false, available: false };
  const state = object(projection.verifiedState), account = object(state.account);
  if (!projection.owner.uid || typeof account.userId !== 'string' || !account.userId) throw new Error('The carried history has no account placement.');
  // Local key ownership and global account placement are separate native coordinates.
  // A foreign placement may be opened only after continuation + protected wallet read bind it.
  if (boundAccountUid && account.userId !== boundAccountUid) throw new Error('The carried history belongs to a different account.');
  if (!boundAccountUid && account.userId !== projection.owner.uid) return { records: [], completeAtSealedHead: false, available: false, awaitingAccountBinding: true };
  const actions = object(state.ledger), wallet = object(state.wallet);
  const actionRows = Array.isArray(actions.entries) ? actions.entries.map((raw, index) => { const row = object(raw), payload = object(row.payload); return { ...row, id: row.entryHash ?? `carried-action-${index}`, pulse: row.kaiPulse, summary: payload.summary ?? payload.title ?? row.actionKind, amountUsdCents: payload.amountUsdCents }; }) : [];
  const walletRows = Array.isArray(wallet.ledgerEntries) ? wallet.ledgerEntries.map(raw => { const row = object(raw); return { id: row.id, kind: row.entry_kind ?? row.kind, summary: row.description ?? row.entry_kind, createdAt: row.created_at, kaiUpulse: row.kai_upulse, amountUsdCents: row.amount_usd_cents, proofBundle: row.proof_bundle }; }) : [];
  const activityRows: Record<string, unknown>[] = Array.isArray(wallet.activityEvents) ? wallet.activityEvents.map(raw => { const row = object(raw); return { ...row, summary: row.summary ?? row.ledgerEntryKind ?? row.kind }; }) : [];
  // The native wallet ledger route derives wallet_ledger:<row.id> from legacy rows.
  // Prefer that exact current event ID without collapsing other public/source witnesses.
  const representedLedgerIds = new Set(activityRows.filter(row => row.kind === 'wallet_ledger_entry' && typeof row.id === 'string' && row.id.startsWith('wallet_ledger:')).map(row => String(row.id).slice('wallet_ledger:'.length)));
  const legacyRows = walletRows.filter(row => !representedLedgerIds.has(String(row.id)));
  return { records: mergePublicRecords(parsePublicNetworkPage('actions', { ok: true, actions: actionRows }).records, mergePublicRecords(parsePublicNetworkPage('wallet', { ok: true, events: legacyRows }).records, parsePublicNetworkPage('wallet', { ok: true, events: activityRows }).records)), available: true, completeAtSealedHead: projection.completeAtSealedHead };
}
