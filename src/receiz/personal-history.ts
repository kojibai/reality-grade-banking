import type { ReceizIdentityAccountProjection } from '@receiz/sdk';
import { mergePublicRecords, parsePublicNetworkPage, type PublicRecord } from './public-network';
function object(value: unknown): Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
export interface PersonalHistory { records: PublicRecord[]; completeAtSealedHead: boolean; available: boolean; }
// Called only with the projection held by an SDK-admitted Identity Seal. Never public lookup/filtering.
export function projectPersonalHistory(projection: ReceizIdentityAccountProjection): PersonalHistory {
  if (projection.authority !== 'verified-identity-portable-state' || !projection.portableStateVerified) return { records: [], completeAtSealedHead: false, available: false };
  const state = object(projection.verifiedState), account = object(state.account);
  if (!projection.owner.uid || account.userId !== projection.owner.uid) throw new Error('The carried history belongs to a different identity.');
  const actions = object(state.ledger), wallet = object(state.wallet);
  const actionRows = Array.isArray(actions.entries) ? actions.entries.map((raw, index) => { const row = object(raw), payload = object(row.payload); return { ...row, id: row.entryHash ?? `carried-action-${index}`, pulse: row.kaiPulse, summary: payload.summary ?? payload.title ?? row.actionKind, amountUsdCents: payload.amountUsdCents }; }) : [];
  const walletRows = Array.isArray(wallet.ledgerEntries) ? wallet.ledgerEntries.map(raw => { const row = object(raw); return { id: row.id, kind: row.entry_kind ?? row.kind, summary: row.description ?? row.entry_kind, createdAt: row.created_at, kaiUpulse: row.kai_upulse, amountUsdCents: row.amount_usd_cents, proofBundle: row.proof_bundle }; }) : [];
  return { records: mergePublicRecords(parsePublicNetworkPage('actions', { ok: true, actions: actionRows }).records, parsePublicNetworkPage('wallet', { ok: true, events: walletRows }).records), available: true, completeAtSealedHead: projection.completeAtSealedHead };
}
