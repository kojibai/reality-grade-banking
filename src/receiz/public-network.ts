import {safeLedgerSourceUrl} from './ledger-receipts';
import { parsePublicMarket } from './public-market.ts';
import { ledgerUsdCents, readLedgerValueOperands, type LedgerValueOperands } from './ledger-value';
import {readLedgerDetails,type LedgerFields} from './ledger-inspection';
import {mergeLedgerCausalProjection} from './ledger-causal-source';

export const PUBLIC_SOURCES = ['actions', 'wallet', 'graph', 'proofs'] as const;
export const PUBLIC_NETWORK_INSPECTION_VERSION = 4;
export type PublicSource = typeof PUBLIC_SOURCES[number];
export interface PublicRecord {
  id: string; sourceId: string; source: PublicSource; kind: string; title: string;
  detail: string; time: string | null; actor: string | null; amountUsdCents: string | null;
  kaiUpulse: string | null; pulse: string | null; sourceUrl: string | null;
  sender?:string|null; recipient?:string|null; evidence: Record<string, string>; authority: 'public-source-projection' | 'account-source-projection'; origin?: 'identity-carried' | 'private-account';
  valueOperands?: LedgerValueOperands;
  details?: LedgerFields;
  /** Account-relative display only; absent from public projections/receipts. */
  accountFlow?:import('./account-history-direction').AccountHistoryFlow;
  accountFlowConflict?:true;
}
export interface PublicNetworkPage { source: PublicSource; records: PublicRecord[]; nextCursor: string | null; total: string | null; complete: boolean; }
/** Same public source projection used by the Ledger and standalone asset. */
export function publicMarketRecord(item:import('./public-market').PublicMarketItem):PublicRecord{
 return {id:`proofs:${item.id}`,sourceId:item.id,source:'proofs',kind:'proof recorded',title:item.title,detail:item.summary||'Public showcase proof',time:item.sealedAt,actor:null,sender:null,recipient:null,amountUsdCents:null,kaiUpulse:null,pulse:item.pulse,sourceUrl:item.sourceUrl??item.verifyUrl,evidence:digestEvidence(item.originalDigest),valueOperands:{assetId:item.assetId,marketItemId:item.id,proofValueUsdCents:ledgerUsdCents(item.priceUsd),...(item.livePulseSeed?{proofValuation:{assetId:item.assetId,marketItemId:item.id,seed:item.livePulseSeed}}:{})},details:readLedgerDetails({assetId:item.assetId,marketItemId:item.id,originalUrl:item.originalUrl,readingUrl:item.readingUrl,hasLongForm:item.hasLongForm,owner:{username:item.ownerUsername,displayName:item.ownerDisplayName}}),authority:'public-source-projection'};
}
function object(input: unknown): Record<string, unknown> { return input !== null && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {}; }
function text(input: unknown, max = 2048): string | null { return typeof input === 'string' && input.length > 0 && input.length <= max ? input : null; }
function digits(input: unknown, max = 25): string | null { const value = typeof input === 'number' && Number.isSafeInteger(input) && input >= 0 ? String(input) : text(input, max); return value && /^(0|[1-9]\d*)$/.test(value) && value.length <= max ? value : null; }
function alias(input: unknown): string | null { const value = text(input, 36); return value && /^[1-9A-HJ-NP-Za-km-z]{26,36}$/.test(value) ? value : null; }
function date(input: unknown): string | null { const value = text(input, 64); return value && Number.isFinite(Date.parse(value)) ? value : null; }
function digestEvidence(digest: string | null): Record<string, string> { const evidence: Record<string, string> = {}; if (digest) evidence.artifactDigest = digest; return evidence; }
function row(source: PublicSource, raw: unknown): PublicRecord {
  const value = object(raw), id = text(value.id, 512); if (!id) throw new Error('Public source returned a record without a valid ID.');
  const kind = text(value.actionKind ?? value.kind ?? value.ledgerKind, 128) ?? 'public record';
  const proof = object(value.proofBundle), actor = object(value.actor ?? value.sender ?? value.fromActor);
  const evidence: Record<string, string> = {};
  for (const key of ['entryHash', 'prevHash', 'transferId', 'objectId', 'proofHead']) { const item = text(value[key], 512); if (item) evidence[key] = item; }
  for (const key of ['bundleHash', 'capsuleHash', 'claimHash', 'artifactDigest']) { const item = text(proof[key], 512); if (item) evidence[key] = item; }
  if(kind==='wallet.transfer.connect'&&!evidence.transferId){const transferId=text(object(value.payload).transferId,512);if(transferId)evidence.transferId=transferId;}
  const pulse = digits(value.eventKaiPulse ?? value.pulse, 24), kaiUpulse = digits(value.kaiUpulse ?? value.kaiUPulse, 30);
  return { id: `${source}:${id}`, sourceId: id, source, kind,
    title: text(value.summary ?? value.label, 4096) ?? kind.replace(/[._]/g, ' '), detail: text(value.detail ?? value.objectLabel, 8192) ?? '',
    time: date(value.occurredAt ?? value.createdAt), actor: alias(value.actorUserId) ?? alias(actor.userId ?? actor.phiKey),
    amountUsdCents: typeof value.amountUsdCents === 'string' ? digits(value.amountUsdCents) : null,
    sender:text(object(value.sender).displayName??object(value.sender).username??object(value.sender).userId,128),recipient:text(object(value.recipient).displayName??object(value.recipient).username??object(value.recipient).userId,128),
    kaiUpulse, pulse, sourceUrl: safeLedgerSourceUrl(value.transactionHref) ?? safeLedgerSourceUrl(value.verifyHref) ?? safeLedgerSourceUrl(value.canonicalHref) ?? safeLedgerSourceUrl(proof.verifierUrl),
    evidence, valueOperands: readLedgerValueOperands(value), details:readLedgerDetails(value), authority: 'public-source-projection' };
}
export function parsePublicNetworkPage(source: PublicSource, input: unknown): PublicNetworkPage {
  const envelope = object(input);
  if (source === 'proofs') {
    const catalog = parsePublicMarket(input);
    return { source, nextCursor: null, complete: catalog.complete, total: String(catalog.sourceCount), records: catalog.items.map(publicMarketRecord) };
  }
  if (envelope.source && envelope.source !== source || envelope.ok !== true && envelope.source !== source) throw new Error('Public source returned an unsupported response.');
  const rows = envelope.rows ?? (source === 'actions' ? envelope.actions ?? envelope.events : source === 'wallet' ? envelope.events : envelope.ledgerRows);
  if (!Array.isArray(rows) || rows.length > 100_000) throw new Error('Public source returned an unsupported response.');
  const nextCursor = envelope.nextCursor ?? null;
  if (nextCursor !== null && (typeof nextCursor !== 'string' || !/^[a-zA-Z0-9_-]{1,2048}$/.test(nextCursor))) throw new Error('Public source returned an invalid cursor.');
  const rollup = object(envelope.rollup);
  return { source, records: mergePublicRecords([], rows.map(raw => row(source, raw))), nextCursor,
    total: digits(rollup.count ?? rollup.totalLedgerEntries, 20), complete: nextCursor === null };
}
export function mergePublicRecords(known: readonly PublicRecord[], incoming: readonly PublicRecord[]): PublicRecord[] {
  const records = new Map(known.map(item => [item.id, item])); for (const item of incoming) {
    const previous=records.get(item.id);let merged=mergeTransferEvidence(previous,item);
    if(previous?.authority==='account-source-projection'&&item.authority===previous.authority&&item.kind===previous.kind&&item.sourceId===previous.sourceId){
      const conflict=previous.accountFlowConflict||item.accountFlowConflict||previous.accountFlow&&item.accountFlow&&previous.accountFlow!==item.accountFlow;
      const flow=conflict?undefined:item.accountFlow??previous.accountFlow;
      if(merged.accountFlow!==flow)merged={...merged,accountFlow:flow};
      if(conflict)merged={...merged,accountFlowConflict:true};
      for(const key of ['ledgerEntryKind','reserveCreditKind'] as const){
        const before=previous.details?.[key],after=item.details?.[key];
        if(typeof before==='string'&&after===undefined)merged={...merged,details:{...merged.details,[key]:before}};
      }
    }
    records.set(item.id,merged);
  }
  return [...records.values()].sort((left, right) => {
    const a = left.kaiUpulse ? BigInt(left.kaiUpulse) : left.pulse ? BigInt(left.pulse) * 1_000_000n : null;
    const b = right.kaiUpulse ? BigInt(right.kaiUpulse) : right.pulse ? BigInt(right.pulse) * 1_000_000n : null;
    return a !== null && b !== null && a !== b ? a > b ? -1 : 1 : a !== null && b === null ? -1 : a === null && b !== null ? 1 : 0;
  });
}
/** Append supported fields only beneath the same immutable transaction source.
 * A repeated thin projection cannot erase its already carried event snapshot. */
function mergeTransferEvidence(known: PublicRecord | undefined, incoming: PublicRecord): PublicRecord {
  const originalTransfer=known&&known.source===incoming.source&&known.sourceId===incoming.sourceId&&/transfer|send|payment_sent|payment_received/i.test(known.kind);
  const bound=(record:PublicRecord)=>['entryHash','artifactDigest','proofHead'].some(key=>/^[a-f0-9]{64}$/i.test(record.evidence[key]??''));
  if(originalTransfer&&known.kind!==incoming.kind&&bound(known)){
    if(incoming.kind==='public record'&&!bound(incoming))return known;
    throw Error('Public transaction evidence conflicts with its retained original.');
  }
  if (!known || known.source !== incoming.source || known.sourceId !== incoming.sourceId || known.kind !== incoming.kind || !/transfer|send|payment_sent|payment_received/i.test(known.kind)) return incoming;
  const before = readLedgerValueOperands(known.valueOperands), after = readLedgerValueOperands(incoming.valueOperands);
  const conflict = (left: unknown, right: unknown) => left !== undefined && left !== null && right !== undefined && right !== null && left !== right;
  const eventPulse = (record: PublicRecord) => record.pulse ?? (record.kaiUpulse ? String(BigInt(record.kaiUpulse) / 1_000_000n) : null);
  const evidenceKeys = ['entryHash', 'artifactDigest', 'proofHead', 'transferId', 'objectId', 'claimHash'];
  const operandKeys = ['assetId', 'marketItemId', 'objectId', 'collectibleId', 'claimHash', 'cardValueUsdCents', 'valuePulse', 'considerationUsdCents', 'fundingRule', 'cardValueRule'] as const;
  // In the native card-snapshot wallet wire, amount is the card value. In
  // ordinary action/payment wires it is the consideration. Retain that
  // distinction when a thin projection omits its original classification.
  const snapshotAmountIsCard = [before.fundingRule, after.fundingRule].some(rule => /^(sports|signal)_card_transfer_card_value_snapshot$/.test(rule ?? ''));
  const consideration = (record: PublicRecord, operands: LedgerValueOperands) => operands.considerationUsdCents ?? (snapshotAmountIsCard ? null : record.amountUsdCents);
  if (evidenceKeys.some(key => conflict(known.evidence[key], incoming.evidence[key])) || operandKeys.some(key => conflict(before[key], after[key]))
    || conflict(known.amountUsdCents, incoming.amountUsdCents) || conflict(consideration(known, before), consideration(incoming, after))
    || conflict(eventPulse(known), eventPulse(incoming)) || conflict(known.kaiUpulse, incoming.kaiUpulse) || before.cardValueState === 'conflicting-recorded-snapshots' || after.cardValueState === 'conflicting-recorded-snapshots') throw Error('Public transaction evidence conflicts with its retained original.');
  const sharedProof = ['entryHash', 'artifactDigest', 'proofHead'].some(key => /^[a-f0-9]{64}$/i.test(known.evidence[key] ?? '') && known.evidence[key] === incoming.evidence[key]);
  const sharedTransfer = known.evidence.transferId && known.evidence.transferId === incoming.evidence.transferId && before.collectibleId && before.collectibleId === after.collectibleId && before.claimHash && before.claimHash === after.claimHash;
  const sameWalletWitness=known.source==='wallet'&&known.evidence.transferId&&known.evidence.transferId===incoming.evidence.transferId&&/^[a-f0-9]{64}$/i.test(known.evidence.bundleHash??'')&&known.evidence.bundleHash===incoming.evidence.bundleHash&&known.evidence.capsuleHash===incoming.evidence.capsuleHash;
  const sourceIdentity = known.source === 'graph' && /^sports-card-transfer-rsc_[a-f0-9]{16}-[a-f0-9]{64}:[a-f0-9]{24}$/i.test(known.sourceId);
  if (!sharedProof && !sharedTransfer && !sourceIdentity && !sameWalletWitness) return incoming;
  return { ...incoming, amountUsdCents: incoming.amountUsdCents ?? known.amountUsdCents, pulse: incoming.pulse ?? known.pulse, kaiUpulse: incoming.kaiUpulse ?? known.kaiUpulse, time: incoming.time ?? known.time,
    evidence: { ...known.evidence, ...incoming.evidence }, valueOperands: readLedgerValueOperands({ ...before, ...after }), details: readLedgerDetails({ ...known.details, ...incoming.details,...(known.details?.causalLineage&&incoming.details?.causalLineage?{causalLineage:mergeLedgerCausalProjection(known.details.causalLineage,incoming.details.causalLineage)}:{}) }) };
}
export async function readPublicNetworkPage(source: PublicSource, cursor?: string, signal?: AbortSignal): Promise<PublicNetworkPage> {
  const query = new URLSearchParams({ source }); if (cursor) query.set('cursor', cursor);
  const response = await fetch(`/api/bank/public-network?${query}`, { credentials: 'omit', signal });
  if (!response.ok) throw new Error('This public source is temporarily unavailable.');
  return parsePublicNetworkPage(source, await response.json());
}
