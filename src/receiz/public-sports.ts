import { safeReceizPublicUrl, type PublicMarketCatalog, type PublicMarketItem } from './public-market';
function object(value: unknown): Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function cents(value: unknown): string | null { if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null; const result = Math.round(value * 100); return Number.isSafeInteger(result) ? String(result) : null; }
function count(value: unknown): number | null { return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 1e9 ? Number(value) : null; }
export function mergePublicSports(catalog: PublicMarketCatalog, input: unknown): PublicMarketCatalog {
  const data = object(input);
  if (data.ok !== true || data.schema !== 'receiz.sports_economy.live_inventory.v1' || !Array.isArray(data.cards) || data.cards.length > 100000) return { ...catalog, sportsCoverage: 'missing' };
  const items = new Map(catalog.items.filter(item => item.category !== 'sports').map(item => [/^rsc_[a-f0-9]{16}$/i.test(item.assetId) ? item.assetId.toLowerCase() : item.assetId, item]));
  let complete = data.fallback !== true;
  for (const raw of data.cards) {
    const card = object(raw), id = card.collectibleId, claim = card.claimHash;
    if (typeof id !== 'string' || !/^rsc_[a-f0-9]{16}$/i.test(id) || typeof claim !== 'string' || !/^[a-f0-9]{64}$/i.test(claim) || !['baseball', 'soccer', 'fight'].includes(String(card.sport)) || typeof card.athlete !== 'string' || !card.athlete || card.athlete.length > 160) { complete = false; continue; }
    const issued = count(card.issuedCount), vault = count(card.vaultCount), pricedRaw = count(card.pricedCount);
    const circulation = Math.max(issued ?? 0, vault ?? 0, pricedRaw ?? 0, 1), priced = pricedRaw ?? 0;
    if (issued === null || vault === null || pricedRaw === null || vault > (issued ?? 0) || priced > (vault ?? 0)) complete = false;
    const total = cents(card.totalValueUsd), unit = cents(card.liveValueUsd);
    if (total === null || unit === null || priced !== circulation) complete = false;
    const normalized = id.toLowerCase(), existing = items.get(normalized);
    if (existing?.category === 'sports') continue;
    const item: PublicMarketItem = { id: existing?.id ?? `sports:${normalized}`, assetId: normalized, title: card.athlete, summary: `${card.sport} · ${typeof card.rarity === 'string' ? card.rarity.slice(0, 40) : 'Sports card'}${typeof card.issueLine === 'string' ? ` · ${card.issueLine.slice(0, 100)}` : ''}`, category: 'sports', sourceUrl: safeReceizPublicUrl(card.route), verifyUrl: null, originalUrl: null, originalDigest: null, pulse: null, sealedAt: null, ownerUsername: null, ownerDisplayName: null, ownerProfileUrl: null, priceUsd: unit === null ? null : Number(unit) / 100, changePct: null, chart: [], circulationCount: circulation, pricedCount: priced, capitalizationUsdCents: total, authority: 'projection-only', canTrade: false };
    items.set(normalized, item);
  }
  return { ...catalog, items: [...items.values()], sportsCoverage: complete ? 'complete' : 'partial' };
}
export async function fetchPublicSports(signal?: AbortSignal): Promise<unknown> {
  const response = await fetch('/api/bank/public-market/sports', { credentials: 'omit', signal });
  if (!response.ok) throw new Error('Public sports inventory could not be refreshed.');
  const input = await response.json(); if (input.ok !== true || input.schema !== 'receiz.sports_economy.live_inventory.v1' || !Array.isArray(input.cards)) throw new Error('Public sports inventory is unavailable.');
  try { localStorage.setItem('receiz-bank-public-sports-v1', JSON.stringify(input)); } catch { /* Public discovery retention is optional. */ }
  return input;
}
