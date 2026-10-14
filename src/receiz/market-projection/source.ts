/** Public Proof Graph display source, never ownership, cash backing or execution authority. */
export interface MarketPulseSeed { kind: string; claimPulse: number; beat: number; stepIndex: number; creatorVerified: boolean; chakraDay?: string | null; kaiSignature?: string | null; userPhiKey?: string | null; }
export interface MarketValueRow { id: string; source: 'market-desk-live-asset' | 'sports-economy-card'; baseUsdValue: number; birthUsdValue: number; marketUsdValue: number; proofTotalValueUsd: number; scoreDelta: number; seed: string; quoteUsdPerPhi?: number; marketItem?: { id: string; source: string; priceUsd: number; pricePhi: number; quoteUsdPerPhi: number; changePct: number; pricingSourceKey?: string; livePulseSeed?: MarketPulseSeed | null; }; }
export interface MarketCapSource { schema: 'receiz.proof_graph.market_cap_projection.v1'; source: string; proofObjectHash: string; generatedAt: string; firstIssuancePulse: number; serverPulse: number; currentUsd: number; cardsInCirculation: number; sportsCardsPriced: number; marketAssetsPriced: number; valueRows: MarketValueRow[]; }
const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1e13;
const count = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
const text = (v: unknown) => typeof v === 'string' && v.length > 0 && v.length <= 512;
export function parseMarketCapSource(input: unknown): MarketCapSource {
  const envelope = input as { ok?: unknown; marketCapProjection?: MarketCapSource } | null, seed = envelope?.marketCapProjection;
  if (envelope?.ok !== true || !seed || seed.schema !== 'receiz.proof_graph.market_cap_projection.v1' || seed.source !== 'market-desk-live-assets.sum + single-card-current-live-value-proof.sum' || !/^[a-f0-9]{64}$/.test(seed.proofObjectHash) || !Number.isFinite(Date.parse(seed.generatedAt)) || !count(seed.firstIssuancePulse) || !count(seed.serverPulse) || seed.firstIssuancePulse > seed.serverPulse || seed.serverPulse > 1e10 || !finite(seed.currentUsd) || seed.currentUsd < 0 || !count(seed.cardsInCirculation) || !count(seed.sportsCardsPriced) || !count(seed.marketAssetsPriced) || seed.sportsCardsPriced > seed.cardsInCirculation || !Array.isArray(seed.valueRows) || seed.valueRows.length > 10000 || seed.valueRows.length !== seed.sportsCardsPriced + seed.marketAssetsPriced) throw new Error('Public capitalization source is incomplete.');
  const ids = new Set<string>(); let market = 0, sports = 0;
  for (const row of seed.valueRows) {
    if (!text(row.id) || ids.has(row.id) || !text(row.seed) || ![row.baseUsdValue, row.birthUsdValue, row.marketUsdValue, row.proofTotalValueUsd, row.scoreDelta].every(finite) || [row.baseUsdValue, row.birthUsdValue, row.marketUsdValue, row.proofTotalValueUsd].some(v => v < 0)) throw new Error('Public capitalization row is invalid.');
    ids.add(row.id);
    if (row.source === 'market-desk-live-asset') {
      market++; const item = row.marketItem;
      if (!item || !text(item.id) || !text(item.source) || ![item.priceUsd, item.pricePhi, item.quoteUsdPerPhi, item.changePct].every(finite) || item.priceUsd < 0 || item.pricePhi < 0 || item.quoteUsdPerPhi <= 0) throw new Error('Public market valuation basis is unavailable.');
      const meta = item.livePulseSeed;
      if (meta && (meta.kind !== 'sigil' || !count(meta.claimPulse) || !count(meta.beat) || meta.beat > 35 || !count(meta.stepIndex) || meta.stepIndex > 43 || typeof meta.creatorVerified !== 'boolean')) throw new Error('Public valuation metadata is invalid.');
    } else if (row.source === 'sports-economy-card') sports++;
    else throw new Error('Unknown public capitalization source.');
  }
  if (market !== seed.marketAssetsPriced || sports !== seed.sportsCardsPriced) throw new Error('Public capitalization coverage is incomplete.');
  return seed;
}
