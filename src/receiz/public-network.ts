import { safeReceizPublicUrl, parsePublicMarket } from './public-market.ts';

export const PUBLIC_SOURCES = ['actions', 'wallet', 'graph', 'proofs'] as const;
export type PublicSource = typeof PUBLIC_SOURCES[number];
export interface PublicRecord {
  id: string; sourceId: string; source: PublicSource; kind: string; title: string;
  detail: string; time: string | null; actor: string | null; amountUsdCents: string | null;
  kaiUpulse: string | null; pulse: string | null; sourceUrl: string | null;
  evidence: Record<string, string>; authority: 'public-source-projection';
}
export interface PublicNetworkPage { source: PublicSource; records: PublicRecord[]; nextCursor: string | null; total: string | null; complete: boolean; }
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
  const pulse = digits(value.eventKaiPulse ?? value.pulse, 24), kaiUpulse = digits(value.kaiUpulse ?? value.kaiUPulse, 30);
  return { id: `${source}:${id}`, sourceId: id, source, kind,
    title: text(value.summary ?? value.label, 4096) ?? kind.replace(/[._]/g, ' '), detail: text(value.detail ?? value.objectLabel, 2048) ?? '',
    time: date(value.occurredAt ?? value.createdAt), actor: alias(value.actorUserId) ?? alias(actor.userId ?? actor.phiKey),
    amountUsdCents: typeof value.amountUsdCents === 'string' ? digits(value.amountUsdCents) : null,
    kaiUpulse, pulse, sourceUrl: safeReceizPublicUrl(value.transactionHref ?? value.verifyHref, 'proof') ?? safeReceizPublicUrl(value.transactionHref ?? value.canonicalHref, 'source'),
    evidence, authority: 'public-source-projection' };
}
export function parsePublicNetworkPage(source: PublicSource, input: unknown): PublicNetworkPage {
  const envelope = object(input);
  if (source === 'proofs') {
    const catalog = parsePublicMarket(input);
    return { source, nextCursor: null, complete: catalog.complete, total: String(catalog.sourceCount), records: catalog.items.map<PublicRecord>(item => ({ id: `proofs:${item.id}`, sourceId: item.id, source, kind: 'proof recorded', title: item.title, detail: 'Public showcase proof', time: item.sealedAt, actor: null, amountUsdCents: null, kaiUpulse: null, pulse: item.pulse, sourceUrl: item.sourceUrl, evidence: digestEvidence(item.originalDigest), authority: 'public-source-projection' })) };
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
  const records = new Map(known.map(item => [item.id, item])); for (const item of incoming) records.set(item.id, item);
  return [...records.values()].sort((left, right) => {
    const a = left.kaiUpulse ? BigInt(left.kaiUpulse) : left.pulse ? BigInt(left.pulse) * 1_000_000n : null;
    const b = right.kaiUpulse ? BigInt(right.kaiUpulse) : right.pulse ? BigInt(right.pulse) * 1_000_000n : null;
    return a !== null && b !== null && a !== b ? a > b ? -1 : 1 : a !== null && b === null ? -1 : a === null && b !== null ? 1 : 0;
  });
}
export async function readPublicNetworkPage(source: PublicSource, cursor?: string, signal?: AbortSignal): Promise<PublicNetworkPage> {
  const query = new URLSearchParams({ source }); if (cursor) query.set('cursor', cursor);
  const response = await fetch(`/api/bank/public-network?${query}`, { credentials: 'omit', signal });
  if (!response.ok) throw new Error('This public source is temporarily unavailable.');
  return parsePublicNetworkPage(source, await response.json());
}
