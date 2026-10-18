import {publicMarketPulseSeed,type MarketPulseSeed,type MarketValueRow} from './market-projection/source.js';
/** Public discovery and quotes are display projections; they grant no ownership. */
export interface PublicMarketItem {
  id: string; assetId: string; title: string; summary: string; category: 'proof' | 'sports'; circulationCount?: number; pricedCount?: number; capitalizationUsdCents?: string | null;
  sourceUrl: string | null; verifyUrl: string | null; originalUrl: string | null;
  originalDigest: string | null; pulse: string | null; sealedAt: string | null;
  hasLongForm?: boolean;
  readingUrl?: string | null;
  livePulseSeed?:MarketPulseSeed;
  sportsValuation?:MarketValueRow;
  valuationBinding?:{itemId:string;assetId:string};
  ownerUsername: string | null; ownerDisplayName: string | null; ownerProfileUrl: string | null;
  priceUsd: number | null; changePct: number | null; chart: number[];
  authority: 'projection-only'; canTrade: false;
}
export interface PublicMarketCatalog { items: PublicMarketItem[]; complete: boolean; revision: string; observedAt: string | null; sourceCount: number; sportsCoverage?: 'complete' | 'partial' | 'missing'; sportsObservedAt?:string|null; }
type RecordValue = Record<string, unknown>;
function record(input: unknown): RecordValue { return input !== null && typeof input === 'object' && !Array.isArray(input) ? input as RecordValue : {}; }
function text(input: unknown, max = 4096): string | null { return typeof input === 'string' && input.length > 0 && input.length <= max ? input : null; }
function nonnegative(input: unknown): number | null { return typeof input === 'number' && Number.isFinite(input) && input >= 0 && input <= 1e18 ? input : null; }
export function safeReceizPublicUrl(input: unknown, kind: 'source' | 'proof' | 'original' = 'source'): string | null {
  const value = text(input, 8192); if (!value) return null;
  try {
    const url = new URL(value, 'https://receiz.com');
    if (url.origin !== 'https://receiz.com' || url.username || url.password || url.hash) return null;
    if (kind === 'source' && /^\/game\/sports\/card\/rsc_[a-f0-9]{16}\/?$/i.test(url.pathname)) return [...url.searchParams.keys()].length === 1 && /^[a-f0-9]{64}$/i.test(url.searchParams.get('claimHash') ?? '') ? url.href : null;
    if (kind === 'source') return !url.search && (/^\/[a-zA-Z0-9_-]{1,64}\/verified\/[a-zA-Z0-9_-]{1,128}\/?$/.test(url.pathname) || /^\/market\/assets\/[a-zA-Z0-9_-]{1,128}\/?$/.test(url.pathname)) ? url.href : null;
    if (kind === 'proof') return /^\/v\/[a-zA-Z0-9_-]{1,64}\/[a-fA-F0-9]{8,64}\/\d{1,24}\/?$/.test(url.pathname) && [...url.searchParams.keys()].every(key => ['a', 'ms', 'c', 'p', 'tz'].includes(key) && url.searchParams.getAll(key).length === 1) ? url.href : null;
    if (/^\/api\/proof-material\/packages\/[a-f0-9]{64}\/artifact$/i.test(url.pathname)) return !url.search ? url.href : null;
    return url.pathname === '/api/profile/originals/download' && [...url.searchParams.keys()].every(key => ['receizId', 'kind'].includes(key)) && url.searchParams.getAll('receizId').length === 1 && url.searchParams.getAll('kind').length === 1 && /^[a-zA-Z0-9_-]{1,128}$/.test(url.searchParams.get('receizId') ?? '') && url.searchParams.get('kind') === 'original' ? url.href : null;
  } catch { return null; }
}
/** A public material coordinate locates exact sealed bytes; it does not verify them. */
export function publicMaterialOriginalUrl(input: unknown): string | null {
  const value = text(input, 8192); if (!value) return null;
  try {
    const direct = safeReceizPublicUrl(value, 'original');
    if (direct && new URL(direct).pathname.startsWith('/api/proof-material/packages/')) return direct;
    const coordinate = new URL(value, 'https://receiz.com'), fragment = new URLSearchParams(coordinate.hash.slice(1));
    if ([...fragment.keys()].length !== 1) return null;
    const token = fragment.get('material') ?? ''; if (!/^rmc[12]:[a-f0-9]{64}$/i.test(token)) return null;
    coordinate.hash = ''; if (!safeReceizPublicUrl(coordinate.href, 'proof')) return null;
    return `https://receiz.com/api/proof-material/packages/${token.slice(5).toLowerCase()}/artifact`;
  } catch { return null; }
}
export function parsePublicMarket(membership: unknown, snapshot?: unknown): PublicMarketCatalog {
  const envelope = record(membership), transport = record(envelope.transport), meta = record(transport.publicMembership);
  if (envelope.ok !== true || !Array.isArray(transport.publicOriginals) || transport.publicOriginals.length > 100_000) throw new Error('Receiz public collection is unavailable.');
  const items: PublicMarketItem[] = [], ids = new Set<string>();
  for (const raw of transport.publicOriginals) {
    const source = record(raw), id = text(source.id, 256), assetId = text(source.receizId, 256), title = text(source.title, 4096);
    if (!id || !assetId || !title || ids.has(id) || source.visibility === 'private') continue;
    ids.add(id);
    const profile=record(source.profileOriginal),media = record(profile.media), material = record(media.material);
    const digest = text(media.originalDownloadSha256Hex ?? material.sealedArtifactSha256Hex, 64);
    const materialOriginal = typeof material.sealedArtifactSha256Hex === 'string' && material.sealedArtifactSha256Hex.toLowerCase() === digest?.toLowerCase() ? publicMaterialOriginalUrl(material.originalArtifactSrc) ?? publicMaterialOriginalUrl(material.proofObjectUrl) : null;
    const verifyUrl=safeReceizPublicUrl(source.verifyHref,'proof'),readingTz=profile.readingTzMinutesEast??media.receiptTzMinutesEast;
    let readingUrl=verifyUrl;if(readingUrl&&typeof readingTz==='number'&&Number.isInteger(readingTz)&&readingTz>=-840&&readingTz<=840){const coordinate=new URL(readingUrl);coordinate.searchParams.set('tz',String(readingTz));readingUrl=coordinate.href;}
    const sealedAt = text(source.createdAt, 64);
    const publicUsername = text(source.ownerUsername, 64);
    const ownerUsername = publicUsername && /^[a-zA-Z0-9_-]{1,64}$/.test(publicUsername) ? publicUsername : null;
    items.push({ id, assetId, title, summary: text(source.summary, 8192) ?? '', category: 'proof',
      sourceUrl: safeReceizPublicUrl(source.canonicalHref, 'source'), verifyUrl,readingUrl,
      originalUrl: materialOriginal ?? safeReceizPublicUrl(media.originalDownloadSrc, 'original'), originalDigest: digest && /^[a-f0-9]{64}$/i.test(digest) ? digest.toLowerCase() : null,
      hasLongForm:typeof profile.hasLongForm==='boolean'?profile.hasLongForm:Object.hasOwn(profile,'longForm')?Boolean(profile.longForm):undefined,
      pulse: typeof source.pulse === 'string' && /^\d{1,24}$/.test(source.pulse) ? source.pulse : null,livePulseSeed:publicMarketPulseSeed(source.livePulseSeed,source.pulse),valuationBinding:{itemId:id,assetId},
      sealedAt: sealedAt && Number.isFinite(Date.parse(sealedAt)) ? sealedAt : null,
      ownerUsername, ownerDisplayName: text(source.ownerDisplayName, 128), ownerProfileUrl: ownerUsername ? `https://receiz.com/${encodeURIComponent(ownerUsername)}` : null,
      priceUsd: nonnegative(source.valueUsd), changePct: null, chart: [], authority: 'projection-only', canTrade: false });
  }
  const catalog: PublicMarketCatalog = { items, complete: meta.version === 1 && meta.scope === 'whole-market-visible-showcase' && meta.source === 'canonical-complete' && meta.isComplete === true && meta.itemCount === items.length,
    revision: text(meta.revision, 256) ?? '', observedAt: text(transport.generatedAt, 64), sourceCount: Number.isSafeInteger(meta.itemCount) && Number(meta.itemCount) >= 0 ? Number(meta.itemCount) : items.length };
  return mergePublicQuotes(catalog, snapshot);
}
// Locators are public display projections, retained only for the exact artifact
// digest. They never replace verification of bytes returned by that locator.
const originalLocators = new Map<string, string>();
export function rememberPublicOriginalLocators(catalog: PublicMarketCatalog): void {
  for (const item of [...catalog.items].reverse()) {
    const url = publicMaterialOriginalUrl(item.originalUrl); if (!url || !item.originalDigest) continue;
    const key = `${item.assetId}:${item.originalDigest}`;
    originalLocators.delete(key); originalLocators.set(key, url);
    if (originalLocators.size > 2048) originalLocators.delete(originalLocators.keys().next().value!);
  }
}
export function retainedPublicOriginalUrl(assetId: string, digest: string): string | null { return originalLocators.get(`${assetId}:${digest.toLowerCase()}`) ?? null; }
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
export function validatePublicQuotes(snapshot: unknown): unknown {
  const envelope = record(snapshot), data = record(envelope.data);
  if (envelope.ok !== true || data.schema !== 'receiz.market.public-snapshot.v1' || !Array.isArray(data.liveMarkets) || data.liveMarkets.length > 100_000) throw new Error('Public quotes returned an unsupported response.');
  return snapshot;
}
export async function fetchPublicMarket(signal?: AbortSignal): Promise<PublicMarketCatalog> {
  const response = await fetch('/api/bank/public-market/membership', { signal, credentials: 'omit' });
  if (!response.ok) throw new Error('The public Market could not be refreshed.');
  const input = await response.json(); const catalog = parsePublicMarket(input); rememberPublicOriginalLocators(catalog);
  if (catalog.complete) try { localStorage.setItem('receiz-bank-public-discovery-v2', JSON.stringify(input)); } catch { /* Storage capacity does not change source availability. */ }
  return catalog;
}
export async function fetchPublicQuotes(signal?: AbortSignal): Promise<unknown> {
  const response = await fetch('/api/bank/public-market/quotes', { signal, credentials: 'omit' });
  if (!response.ok) throw new Error('Public quotes could not be refreshed.');
  return validatePublicQuotes(await response.json());
}
export function formatPublicPrice(value: number | null): string { return value === null ? 'Value unavailable' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value); }
