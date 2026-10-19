import type { ReceizIdentityAccountProjection } from '@receiz/sdk';
import { mergePublicRecords, parsePublicNetworkPage, type PublicRecord } from './public-network';
import {calculateWalletFundingAttributions,walletAttributionFitsRecord} from './ledger-wallet-fifo';
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
  const actions = object(state.ledger ?? state.actionLedger), wallet = object(state.wallet);
  const entries = actions.entries ?? state.actionLedgerEntries ?? state.ledgerActions;
  const actionRows = Array.isArray(entries) ? entries.map((raw, index) => { const row = object(raw), payload = object(row.payload); return { ...row, id: row.entryHash ?? row.entry_hash ?? row.id ?? `carried-action-${index}`, actionKind: row.actionKind ?? row.action_kind, occurredAt: row.occurredAt ?? row.occurred_at, pulse: row.kaiPulse ?? row.kai_pulse, kaiUpulse: row.kaiUpulse ?? row.kai_upulse, summary: payload.summary ?? payload.title ?? row.actionKind ?? row.action_kind, amountUsdCents: payload.amountUsdCents }; }) : [];
  const ledgerEntries = wallet.ledgerEntries ?? state.walletLedgerEntries;
  const attributions=calculateWalletFundingAttributions(ledgerEntries,String(account.userId),projection.completeAtSealedHead&&(!Array.isArray(ledgerEntries)||wallet.ledgerEntryCount===undefined||wallet.ledgerEntryCount===ledgerEntries.length));
  const walletRows:Record<string,unknown>[] = Array.isArray(ledgerEntries) ? ledgerEntries.map(raw => { const row = object(raw); return { ...row, id: row.id, kind: row.entry_kind ?? row.kind, summary: row.description ?? row.entry_kind, createdAt: row.created_at ?? row.createdAt, pulse: row.kai_pulse ?? row.pulse, kaiUpulse: row.kai_upulse ?? row.kaiUpulse, amountUsdCents: row.amount_usd_cents ?? row.amountUsdCents, amountPhiMicro:row.amount_phi_micro??row.amountPhiMicro, proofBundle: row.proof_bundle ?? row.proofBundle }; }) : [];
  const transfers = wallet.chatTransfers ?? state.walletChatTransfers;
  const transferRows = Array.isArray(transfers) ? transfers.map(raw => { const row = object(raw); const sent = row.sender_user_id === account.userId; if (!sent && row.recipient_user_id !== account.userId) return null; return { ...row, id: `transfer:${row.id}`, transferId:row.id, kind: 'transfer', summary: sent ? 'Payment sent' : 'Payment received', createdAt: row.created_at, pulse: row.kai_pulse, kaiUpulse: row.kai_upulse, amountUsdCents: row.amount_usd_cents, amountPhiMicro: row.amount_phi_micro ?? row.amountPhiMicro, usdPerPhiMicrocents: row.usd_per_phi_microcents ?? row.usdPerPhiMicrocents, transactionHref:row.transactionHref??row.transaction_href,proofBundle:row.proofBundle??row.proof_bundle,sender:row.sender,recipient:row.recipient }; }).filter(Boolean) : [];
  const byLedgerId=new Map(walletRows.map(row=>[String(row.id),row]));
  const activityRows: Record<string, unknown>[] = Array.isArray(wallet.activityEvents) ? wallet.activityEvents.map(raw => {
    const row = object(raw), prior=row.kind==='wallet_ledger_entry'&&typeof row.id==='string'&&row.id.startsWith('wallet_ledger:')?byLedgerId.get(row.id.slice('wallet_ledger:'.length)):undefined;
    // Both representations are carried by this same admitted account. Keep
    // the exact row's origin operands when pagination exports a thinner event,
    // but never join evidence across contradictory money/time coordinates.
    const agrees=prior&&['amountUsdCents','amountPhiMicro','pulse','kaiUpulse','direction'].every(key=>prior[key]==null||row[key]==null||String(prior[key])===String(row[key]));
    return { ...(agrees?prior:{}), ...row, ...(agrees?{metadata:{...object(prior.metadata),...object(row.metadata)}}:{}), summary: row.summary ?? row.ledgerEntryKind ?? row.kind };
  }) : [];
  // The native wallet ledger route derives wallet_ledger:<row.id> from legacy rows.
  // Prefer that exact current event ID without collapsing other public/source witnesses.
  const representedLedgerIds = new Set(activityRows.filter(row => row.kind === 'wallet_ledger_entry' && typeof row.id === 'string' && row.id.startsWith('wallet_ledger:')).map(row => String(row.id).slice('wallet_ledger:'.length)));
  const legacyRows = walletRows.filter(row => !representedLedgerIds.has(String(row.id)));
  const byTransfer=new Map(Array.isArray(ledgerEntries)?ledgerEntries.flatMap(raw=>{const row=object(raw),attribution=attributions.get(String(row.id));return row.direction==='debit'&&typeof row.chat_transfer_id==='string'&&attribution?[[row.chat_transfer_id,attribution]as const]:[];}):[]);
  return { records: mergePublicRecords(parsePublicNetworkPage('actions', { ok: true, actions: actionRows }).records, mergePublicRecords(parsePublicNetworkPage('wallet', { ok: true, events: [...legacyRows, ...transferRows] }).records, parsePublicNetworkPage('wallet', { ok: true, events: activityRows }).records)).map(record=>{const attribution=record.source==='wallet'?(attributions.get(record.sourceId.replace(/^wallet_ledger:/,''))??byTransfer.get(record.evidence.transferId??record.sourceId.replace(/^transfer:/,''))):undefined;
   const bound=attribution&&walletAttributionFitsRecord(attribution,record,byTransfer.has(record.evidence.transferId??''));
   return {...record,authority:'account-source-projection',origin:'identity-carried',...(bound?{details:{...record.details,fundingAttribution:attribution as unknown as NonNullable<PublicRecord['details']>,...(record.evidence.transferId?{fundingTransferId:record.evidence.transferId}:{})}}:{})};}), available: true, completeAtSealedHead: projection.completeAtSealedHead };
}
