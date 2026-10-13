/** Public discovery and quotes are display projections; they grant no ownership. */
export interface PublicMarketItem {
  id: string; assetId: string; title: string; summary: string; category: 'proof';
  sourceUrl: string | null; verifyUrl: string | null; originalUrl: string | null;
  originalDigest: string | null; pulse: string | null; sealedAt: string | null;
  priceUsd: number | null; changePct: number | null; chart: number[];
  authority: 'projection-only'; canTrade: false;
}
export interface PublicMarketCatalog { items: PublicMarketItem[]; complete: boolean; revision: string; observedAt: string | null; sourceCount: number; }
type RecordValue = Record<string, unknown>;
function record(input: unknown): RecordValue { return input !== null && typeof input === 'object' && !Array.isArray(input) ? input as RecordValue : {}; }
function text(input: unknown, max = 4096): string | null { return typeof input === 'string' && input.length > 0 && input.length <= max ? input : null; }
function nonnegative(input: unknown): number | null { return typeof input === 'number' && Number.isFinite(input) && input >= 0 && input <= 1e18 ? input : null; }
export function safeReceizPublicUrl(input: unknown): string | null {
  const value = text(input, 8192); if (!value) return null;
  try { const url = new URL(value, 'https://receiz.com'); return url.origin === 'https://receiz.com' && !url.username && !url.password && !url.hash ? url.href : null; } catch { return null; }
}
export function parsePublicMarket(membership: unknown, snapshot?: unknown): PublicMarketCatalog {
  const envelope = record(membership), transport = record(envelope.transport), meta = record(transport.publicMembership);
  if (envelope.ok !== true || !Array.isArray(transport.publicOriginals) || transport.publicOriginals.length > 100_000) throw new Error('Receiz public collection is unavailable.');
  const items: PublicMarketItem[] = [], ids = new Set<string>();
  for (const raw of transport.publicOriginals) {
    const source = record(raw), id = text(source.id, 256), assetId = text(source.receizId, 256), title = text(source.title, 4096);
    if (!id || !assetId || !title || ids.has(id) || source.visibility === 'private') continue;
    ids.add(id);
    const media = record(record(source.profileOriginal).media), material = record(media.material);
    const digest = text(media.originalDownloadSha256Hex ?? material.sealedArtifactSha256Hex, 64);
    const sealedAt = text(source.createdAt, 64);
    items.push({ id, assetId, title, summary: text(source.summary, 8192) ?? '', category: 'proof',
      sourceUrl: safeReceizPublicUrl(source.canonicalHref), verifyUrl: safeReceizPublicUrl(source.verifyHref),
      originalUrl: safeReceizPublicUrl(media.originalDownloadSrc), originalDigest: digest && /^[a-f0-9]{64}$/i.test(digest) ? digest.toLowerCase() : null,
      pulse: typeof source.pulse === 'string' && /^\d{1,24}$/.test(source.pulse) ? source.pulse : null,
      sealedAt: sealedAt && Number.isFinite(Date.parse(sealedAt)) ? sealedAt : null,
      priceUsd: nonnegative(source.valueUsd), changePct: null, chart: [], authority: 'projection-only', canTrade: false });
  }
  const catalog: PublicMarketCatalog = { items, complete: meta.version === 1 && meta.scope === 'whole-market-visible-showcase' && meta.source === 'canonical-complete' && meta.isComplete === true && meta.itemCount === items.length,
    revision: text(meta.revision, 256) ?? '', observedAt: text(transport.generatedAt, 64), sourceCount: Number.isSafeInteger(meta.itemCount) && Number(meta.itemCount) >= 0 ? Number(meta.itemCount) : items.length };
  return mergePublicQuotes(catalog, snapshot);
}
export function mergePublicQuotes(catalog: PublicMarketCatalog, snapshot: unknown): PublicMarketCatalog {
  const envelope = record(snapshot), data = record(envelope.data);
  if (envelope.ok !== true || data.schema !== 'receiz.market.public-snapshot.v1' || !Array.isArray(data.liveMarkets)) return catalog;
  const quotes = new Map<string, RecordValue>();
  for (const raw of data.liveMarkets) { const quote = record(raw), id = text(quote.itemId, 256); if (id && quote.visibility === 'public') quotes.set(id, quote); }
  return { ...catalog, items: catalog.items.map(item => {
    const quote = quotes.get(item.id); if (!quote) return item;
    // The public snapshot chart is in Phi; convert only with its own display basis.
    const basis = nonnegative(quote.quoteUsdPerPhi);
    const chart = Array.isArray(quote.chart) ? quote.chart.slice(-256).map(point => nonnegative(record(point).value)).filter((v): v is number => v !== null).map(value => basis ? value * basis : value).filter(Number.isFinite) : [];
    return { ...item, priceUsd: nonnegative(quote.priceUsd) ?? item.priceUsd,
      changePct: typeof quote.changePct === 'number' && Number.isFinite(quote.changePct) && Math.abs(quote.changePct) <= 1e6 ? quote.changePct : null,
      chart: basis ? chart : [] };
  }) };
}
export async function fetchPublicMarket(signal?: AbortSignal): Promise<PublicMarketCatalog> {
  const response = await fetch('/api/bank/public-market/membership', { signal, credentials: 'omit' });
  if (!response.ok) throw new Error('The public Market could not be refreshed.');
  const input = await response.json(); const catalog = parsePublicMarket(input);
  try { localStorage.setItem('receiz-bank-public-discovery-v1', JSON.stringify(input)); } catch { /* Storage capacity does not change source availability. */ }
  return catalog;
}
export async function fetchPublicQuotes(signal?: AbortSignal): Promise<unknown> {
  const response = await fetch('/api/bank/public-market/quotes', { signal, credentials: 'omit' });
  if (!response.ok) throw new Error('Public quotes could not be refreshed.');
  return response.json();
}
export function formatPublicPrice(value: number | null): string { return value === null ? 'Value unavailable' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value); }
