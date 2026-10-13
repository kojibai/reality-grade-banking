import { describe, expect, it } from 'vitest';
import { parsePublicMarket } from '../src/receiz/public-market';

const original = (i: number, extra = {}) => ({ id: `profile:alice:${i}`, receizId: `asset-${i}`, title: `Public object ${i}`, summary: 'Public source', canonicalHref: `/alice/verified/asset-${i}`, verifyHref: '/v/proof', valueUsd: 12.34, pulse: '12345', ...extra });
const membership = (items: unknown[]) => ({ ok: true, transport: { generatedAt: '2026-10-13T12:00:00Z', publicMembership: { version: 1, scope: 'whole-market-visible-showcase', source: 'canonical-complete', isComplete: true, itemCount: items.length, revision: 'r1' }, publicOriginals: items } });

describe('Receiz public Market catalog', () => {
  it('discovers every item beyond one thousand without creating ownership or trading authority', () => {
    const catalog = parsePublicMarket(membership(Array.from({ length: 1001 }, (_, i) => original(i))));
    expect(catalog.items).toHaveLength(1001);
    expect(catalog.complete).toBe(true);
    expect(catalog.items.every(item => item.authority === 'projection-only' && !item.canTrade)).toBe(true);
  });
  it('deduplicates exact IDs, excludes explicit private objects and reports an incomplete projection', () => {
    const catalog = parsePublicMarket(membership([original(1), original(1), original(2, { visibility: 'private' })]));
    expect(catalog.items).toHaveLength(1);
    expect(catalog.complete).toBe(false);
  });
  it('rejects archive and partial feeds as complete and does not accept unknown response shapes', () => {
    const input = membership([original(1)]); input.transport.publicMembership.source = 'shipped-archive';
    expect(parsePublicMarket(input).complete).toBe(false);
    expect(() => parsePublicMarket({ ok: false })).toThrow();
  });
  it('does not manufacture prices, price movements or charts from membership', () => {
    const item = parsePublicMarket(membership([original(1, { valueUsd: NaN })])).items[0];
    expect(item.priceUsd).toBeNull(); expect(item.changePct).toBeNull(); expect(item.chart).toEqual([]);
  });
  it('joins only public quotes by exact ID and retains the full collection', () => {
    const snapshot = { ok: true, data: { schema: 'receiz.market.public-snapshot.v1', liveMarkets: [{ itemId: 'profile:alice:1', visibility: 'public', priceUsd: 16.5, quoteUsdPerPhi: 2, changePct: -2, chart: [{ value: 8.5 }, { value: 8.25 }] }, { itemId: 'profile:alice:2', visibility: 'private', priceUsd: 900 }] } };
    const catalog = parsePublicMarket(membership([original(1), original(2)]), snapshot);
    expect(catalog.items[0].priceUsd).toBe(16.5); expect(catalog.items[0].chart).toEqual([17, 16.5]);
    expect(catalog.items[1].priceUsd).toBe(12.34);
    expect(catalog.items[1].chart).toEqual([]);
  });
  it('preserves enclosing digest and rejects foreign or dangerous source links', () => {
    const digest = 'd'.repeat(64);
    const item = parsePublicMarket(membership([original(1, { canonicalHref: 'javascript:alert(1)', verifyHref: 'https://evil.test/v/proof', profileOriginal: { media: { originalDownloadSrc: '/api/profile/originals/download?receizId=asset-1&kind=original', originalDownloadSha256Hex: digest } } })])).items[0];
    expect(item.sourceUrl).toBeNull(); expect(item.verifyUrl).toBeNull(); expect(item.originalDigest).toBe(digest);
    expect(item.originalUrl).toContain('https://receiz.com/api/profile/originals/download?');
  });
  it('replaces complete discovery on refresh, removing objects that are no longer public', () => {
    const before = parsePublicMarket(membership([original(1), original(2)]));
    const after = parsePublicMarket(membership([original(2)]));
    expect(before.items).toHaveLength(2); expect(after.items.map(item => item.id)).toEqual(['profile:alice:2']);
  });
  it('accepts only public source, proof and original-download path contracts', () => {
    const item = parsePublicMarket(membership([original(1, { canonicalHref: '/api/connect/wallet/me', verifyHref: '/api/oidc/authorize', profileOriginal: { media: { originalDownloadSrc: '/api/storage/object?private=true' } } })])).items[0];
    expect(item.sourceUrl).toBeNull(); expect(item.verifyUrl).toBeNull(); expect(item.originalUrl).toBeNull();
    const valid = parsePublicMarket(membership([original(1, { verifyHref: '/v/20261013_1200/AB12CD34/14610000?a=abcd1234&ms=1791892800000' })])).items[0];
    expect(valid.sourceUrl).toContain('/alice/verified/'); expect(valid.verifyUrl).toContain('/v/20261013_1200/');
  });
  it('shows the public showcase owner without inventing ownership for the viewer', () => {
    const item = parsePublicMarket(membership([original(1, { ownerUsername: 'current_holder', ownerDisplayName: 'Current Holder', creatorUsername: 'alice' })])).items[0];
    expect(item.ownerUsername).toBe('current_holder'); expect(item.ownerProfileUrl).toBe('https://receiz.com/current_holder');
    expect(item.canTrade).toBe(false);
  });
});
