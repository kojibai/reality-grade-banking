import { computeIntrinsicUnsigned, type SigilMetadataLite } from '@receiz/sdk/valuation';
import { DEFAULT_ISSUANCE_POLICY, quotePhiForUsd } from './canonical-market-issuance';
import type { MarketCapSource, MarketPulseSeed, MarketValueRow } from './market-projection/source';
import type { PublicRecord } from './public-network';

/** Display operands only. These neither admit a proof nor establish available funds. */
export interface LedgerValueOperands {
  assetId?: string; marketItemId?: string; objectId?: string; collectibleId?: string; claimHash?: string;
  amountPhiMicro?: string; usdPerPhiMicrocents?: string; considerationUsdCents?: string;
  cardValueUsdCents?: string; proofValueUsdCents?: string; valuePulse?: string;
  fundingRule?: string; cardValueRule?: string; cardValueRecordedAt?: string; cardValueState?: string; settledUsdCents?: string; phiUsdCents?: string;
}
export interface LedgerValueDisplay {
  amountUsdCents: string | null;
  basis: 'card-snapshot' | 'intrinsic-model' | 'source-value' | 'payment' | 'unavailable';
  pulse: string | null;
  considerationUsdCents: string | null;
  comparison?: { pulse: string; amountUsdCents: string; percent: number };
  gap?: string;
}
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === 'string' && value.length > 0 && value.length <= 512 ? value : undefined;
const uint = (value: unknown): string | undefined => typeof value === 'string' && /^(0|[1-9]\d{0,29})$/.test(value) ? value : typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? String(value) : undefined;
export function ledgerUsdCents(value: unknown): string | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && Number.isSafeInteger(Math.round(value * 100)) ? String(Math.round(value * 100)) : undefined;
}
function recordedDollarCents(value: unknown): string | undefined {
  const decimal = typeof value === 'number' || typeof value === 'string' ? String(value).trim().replace(/[$,]/g, '') : '';
  if (!/^\d{1,28}(?:\.\d{1,6})?$/.test(decimal)) return;
  const [whole, fraction = ''] = decimal.split('.');
  return (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2)) + (Number(fraction[2] ?? 0) >= 5 ? 1n : 0n)).toString();
}
/** Preserve the source's supported fields, never copy arbitrary metadata into a receipt. */
export function readLedgerValueOperands(input: unknown): LedgerValueOperands {
  const raw = object(input), payload = object(raw.payload), metadata = object(raw.metadata), receipt = object(raw.valueReceipt);
  const value = { ...metadata, ...payload, ...raw }, result: LedgerValueOperands = {};
  for (const key of ['assetId', 'marketItemId', 'objectId', 'collectibleId', 'claimHash', 'fundingRule', 'cardValueRule', 'cardValueRecordedAt', 'cardValueState'] as const) {
    const field = text(value[key] ?? receipt[key]); if (field !== undefined) result[key] = field;
  }
  for (const key of ['amountPhiMicro', 'usdPerPhiMicrocents', 'considerationUsdCents', 'cardValueUsdCents', 'proofValueUsdCents', 'valuePulse', 'settledUsdCents', 'phiUsdCents'] as const) {
    const field = uint(value[key] ?? receipt[key]); if (field !== undefined) result[key] = field;
  }
  // The private v129 ledger explicitly names this amount as the transferred card snapshot.
  // Its legacy missing-value fallback is zero, so zero alone cannot support a card valuation.
  const snapshots = new Set<string>();
  if (/^(sports|signal)_card_transfer_card_value_snapshot$/.test(result.fundingRule ?? '') && result.phiUsdCents && BigInt(result.phiUsdCents) > 0n) snapshots.add(result.phiUsdCents);
  for (const source of [value, receipt]) for (const key of ['cardValueUsdCents', 'transferValueUsdCents', 'settledCardValueUsdCents'] as const) {
    const field = uint(source[key]); if (field !== undefined) snapshots.add(field);
  }
  // Older carried transfer payloads name their snapshot in dollars. Preserve
  // only explicit card/transfer fields; an ask, bid or current quote is not a
  // historical transaction valuation.
  for (const source of [value, receipt]) for (const key of ['transferValueUsd', 'cardValueUsd', 'settledCardValueUsd']) {
    const field = recordedDollarCents(source[key]); if (field !== undefined) snapshots.add(field);
  }
  if (snapshots.size === 1) result.cardValueUsdCents = [...snapshots][0]; else delete result.cardValueUsdCents;
  if (snapshots.size > 1) result.cardValueState = 'conflicting-recorded-snapshots';
  const chart = object(raw.marketAssetChart);
  if (raw.ledgerKind === 'market-asset' && typeof chart.live === 'number' && typeof chart.usdPerPhi === 'number' && chart.live >= 0 && chart.usdPerPhi > 0) {
    const quoted = ledgerUsdCents(chart.live * chart.usdPerPhi), pulse = uint(raw.sortKaiPulse);
    if (quoted !== undefined) result.proofValueUsdCents = quoted;
    if (pulse !== undefined) result.valuePulse = pulse;
  }
  return result;
}
export function readLedgerValueDisplay(input: unknown): LedgerValueDisplay | null {
  const value = object(input);
  if (!['card-snapshot', 'intrinsic-model', 'source-value', 'payment', 'unavailable'].includes(String(value.basis))) return null;
  const amount = uint(value.amountUsdCents), pulse = uint(value.pulse), consideration = uint(value.considerationUsdCents);
  if (value.amountUsdCents !== null && amount === undefined || value.pulse !== null && pulse === undefined) return null;
  const result: LedgerValueDisplay = { amountUsdCents: amount ?? null, basis: value.basis as LedgerValueDisplay['basis'], pulse: pulse ?? null, considerationUsdCents: consideration ?? null };
  const comparison = object(value.comparison), previousAmount = uint(comparison.amountUsdCents), previousPulse = uint(comparison.pulse);
  if (previousAmount && previousPulse && amount && pulse && BigInt(previousPulse) < BigInt(pulse) && BigInt(previousAmount) > 0n) {
    const percent = (Number(amount) / Number(previousAmount) - 1) * 100;
    if (Number.isFinite(percent)) result.comparison = { pulse: previousPulse, amountUsdCents: previousAmount, percent };
  }
  return result;
}
export type LedgerValueIndex = { source: MarketCapSource; evaluationPulse?:number; rows: Map<string, MarketValueRow | null> };
export function indexLedgerValues(source: MarketCapSource): LedgerValueIndex {
  const rows = new Map<string, MarketValueRow | null>();
  for (const row of source.valueRows) for (const key of new Set([row.id, row.seed, row.marketItem?.id].filter((key): key is string => Boolean(key)))) {
    if (!rows.has(key)) rows.set(key, row); else if (rows.get(key) !== row) rows.set(key, null);
  }
  return { source, rows };
}
function valueAtPulse(seed: MarketPulseSeed, pulse: number): string | null {
  if (!Number.isSafeInteger(pulse) || pulse < seed.claimPulse) return null;
  const meta = { pulse: seed.claimPulse, kaiPulse: seed.claimPulse, beat: seed.beat, stepIndex: seed.stepIndex, stepsPerBeat: 44, quality: 'high', creatorVerified: seed.creatorVerified, creatorRep: 0, chakraDay: seed.chakraDay ?? undefined, kaiSignature: seed.kaiSignature ?? undefined, userPhiKey: seed.userPhiKey ?? undefined } as SigilMetadataLite;
  const computed = computeIntrinsicUnsigned(meta, pulse);
  const quote = quotePhiForUsd({ meta, nowPulse: pulse, usd: 100, currentStreakDays: 0, lifetimeUsdSoFar: 0, plannedHoldBeats: 0 }, DEFAULT_ISSUANCE_POLICY, computed);
  const phi = computed.unsigned.valuePhi;
  return quote.usdPerPhi > 0 ? ledgerUsdCents(phi * quote.usdPerPhi) ?? null : null;
}
export function ledgerValueForRecord(record: PublicRecord, index: LedgerValueIndex | null = null): LedgerValueDisplay {
  const operands = readLedgerValueOperands(record.valueOperands), transfer = /transfer|send|payment_sent|payment_received/i.test(record.kind);
  const card = /(?:card|proof|original)[._-]transfer/i.test(record.kind);
  const eventPulse = record.pulse ?? (record.kaiUpulse ? String(BigInt(record.kaiUpulse) / 1_000_000n) : null);
  if (operands.cardValueState === 'conflicting-recorded-snapshots') return { amountUsdCents: null, basis: 'unavailable', pulse: eventPulse, considerationUsdCents: null, gap: 'The source carries conflicting card value snapshots.' };
  if (transfer && record.pulse && record.kaiUpulse && BigInt(record.pulse) !== BigInt(record.kaiUpulse) / 1_000_000n) return { amountUsdCents: null, basis: 'unavailable', pulse: null, considerationUsdCents: null, gap: 'The source pulse and micro-pulse disagree.' };
  const snapshotAmountIsCard = /_card_value_snapshot$/.test(operands.fundingRule ?? '');
  const consideration = operands.considerationUsdCents ?? (snapshotAmountIsCard ? null : record.amountUsdCents);
  if (transfer && operands.cardValueUsdCents !== undefined && eventPulse && (!operands.valuePulse || operands.valuePulse === eventPulse)) return { amountUsdCents: operands.cardValueUsdCents, basis: 'card-snapshot', pulse: eventPulse, considerationUsdCents: consideration };
  const keys = [operands.marketItemId, operands.assetId, operands.objectId, operands.collectibleId, operands.claimHash, record.evidence.objectId, record.evidence.claimHash, record.source === 'proofs' ? record.sourceId : record.sourceId.startsWith('market-asset-') ? record.sourceId.slice('market-asset-'.length) : undefined];
  const resolved=index?keys.filter((key):key is string=>!!key&&index.rows.has(key)).map(key=>index.rows.get(key)):[];
  const matches=new Set(resolved.filter((row):row is MarketValueRow=>!!row));
  if(resolved.some(row=>row===null)||matches.size>1)return{amountUsdCents:null,basis:'unavailable',pulse:eventPulse,considerationUsdCents:consideration,gap:'The source asset references disagree or are ambiguous.'};
  const row=[...matches][0]??null;
  const seed = row?.source === 'market-desk-live-asset' ? row.marketItem?.livePulseSeed : null;
  const isProof = record.source === 'proofs' || record.kind === 'market-asset';
  if (seed?.kind === 'sigil' && (transfer || isProof)) {
    const pulse = transfer ? Number(eventPulse) : index!.evaluationPulse??index!.source.serverPulse;
    const amountUsdCents = eventPulse !== null || isProof ? valueAtPulse(seed, pulse) : null;
    if (amountUsdCents !== null) {
      const result: LedgerValueDisplay = { amountUsdCents, basis: 'intrinsic-model', pulse: String(pulse), considerationUsdCents: transfer ? consideration : null };
      const previous = !transfer ? valueAtPulse(seed, pulse - 1) : null;
      if (previous && BigInt(previous) > 0n) result.comparison = { pulse: String(pulse - 1), amountUsdCents: previous, percent: (Number(amountUsdCents) / Number(previous) - 1) * 100 };
      return result;
    }
  }
  if (isProof && operands.proofValueUsdCents !== undefined) return { amountUsdCents: operands.proofValueUsdCents, basis: 'source-value', pulse: operands.valuePulse ?? null, considerationUsdCents: null };
  if (card) return { amountUsdCents: null, basis: 'unavailable', pulse: eventPulse, considerationUsdCents: consideration, gap: 'The source carries no object value operands at this transfer coordinate.' };
  if (consideration !== null) return { amountUsdCents: consideration, basis: 'payment', pulse: eventPulse, considerationUsdCents: null };
  return { amountUsdCents: null, basis: 'unavailable', pulse: eventPulse, considerationUsdCents: null, gap: 'The source carries no supported value operands.' };
}
export function ledgerValueLabel(value: LedgerValueDisplay): string {
  return value.basis === 'card-snapshot' ? 'Card value at transfer' : value.basis === 'intrinsic-model' ? 'Calculated value' : value.basis === 'source-value' ? 'Carried value' : value.basis === 'payment' ? 'Recorded amount' : 'Value unavailable';
}
