import {expect, it} from 'vitest';
import {assetShareCardSvg} from '../server/asset-share-art';
import {renderAssetImage} from '../server/asset-preview-render';
import {parsePublicMarket, type PublicMarketItem} from '../src/receiz/public-market';

const original = parsePublicMarket({ok: true, transport: {publicOriginals: [{
  id: 'profile:artist:source', receizId: 'source', title: 'The Shape of Tomorrow',
  ownerUsername: 'artist', profileOriginal: {media: {kind: 'image'}}, valueUsd: 1234567890.12,
}]}}).items[0];
const card = (fields: Partial<PublicMarketItem> = {}) => assetShareCardSvg({...original, ...fields});

it('shows the specific asset, content category, owner and unabridged market value', () => {
  const svg = card();
  expect(svg).toContain('The Shape of Tomorrow');
  expect(svg).toContain('Image');
  expect(svg).toContain('Owner · @artist');
  expect(svg).toContain('Market Value');
  expect(svg).toContain('$1,234,567,890.12');
  expect(svg).not.toMatch(/verified|guaranteed|yield|return|liquidity/i);
});

it.each([[0, '$0.00'], [0.00123, '$0.00123'], [12.3456, '$12.3456']])(
  'retains the supplied %s market value without abbreviating or rounding it away', (priceUsd, expected) => {
    expect(card({priceUsd})).toContain(expected);
  },
);

it('keeps absent price and owner information explicit', () => {
  const svg = card({priceUsd: null, ownerUsername: null, ownerDisplayName: null});
  expect(svg).toContain('Value unavailable');
  expect(svg).toContain('Owner unavailable');
  expect(svg).not.toContain('$');
});

it('does not present a multi-copy sports asset as belonging to one owner', () => {
  const svg = card({category: 'sports', circulationCount: 24, ownerUsername: 'artist'});
  expect(svg).toContain('Collectible');
  expect(svg).toContain('24 copies in circulation');
  expect(svg).not.toContain('@artist');
});

it('only names a sports owner when the item represents one circulating copy', () => {
  expect(card({category: 'sports', circulationCount: 1})).toContain('@artist');
  expect(card({category: 'sports', circulationCount: undefined})).not.toContain('@artist');
});

it('escapes source text and avoids embedding remote media or source locators', () => {
  const svg = card({title: 'A moment\u0000 $& <script>one</script>', sourceUrl: 'https://receiz.com/source', originalUrl: 'https://receiz.com/original'});
  expect(svg).toContain('$&amp;');
  expect(svg).toContain('&lt;script&gt;');
  expect(svg).not.toContain('<script>');
  expect(svg).not.toContain('\u0000');
  expect(svg).not.toContain('https://receiz.com');
  expect(svg).not.toContain('<image');
});

it('renders a complete deterministic social PNG from metadata alone', async () => {
  const png = Buffer.from(await renderAssetImage(original));
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.readUInt32BE(16)).toBe(1730);
  expect(png.readUInt32BE(20)).toBe(909);
  expect(Buffer.from(await renderAssetImage(original))).toEqual(png);
});
