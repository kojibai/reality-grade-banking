import { Resvg } from '@resvg/resvg-js';
import { expect, it } from 'vitest';
import { embedAccountProofPng, extractAccountProofPng, readAccountProofFile } from '../src/receiz/account-proof-png';
import { verifyAccountProof } from '../src/receiz/account-proof';
import { accountProofRoute, accountProofUrl } from '../src/receiz/account-proof-links';
import { paymentQr } from '../src/receiz/payment-qr';
import jsQR from '../src/vendor/jsqr';
const png = () => new Uint8Array(new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="#fff"/></svg>').render().asPng());
it('carries the exact source bytes in an interoperable PNG, not its printed claims', async () => {
  const original = new TextEncoder().encode('{"fixture":"transport only, no financial proof"}'), image = embedAccountProofPng(png(), original);
  expect(extractAccountProofPng(image)).toEqual(original);
  const file = await readAccountProofFile(new File([new Uint8Array(image)], 'account.png'));
  expect(new Uint8Array(await file.arrayBuffer())).toEqual(original);
  await expect(verifyAccountProof(file)).rejects.toThrow();
});
it('refuses screenshots without a source, duplicate sources, corruption and appended private material', () => {
  const plain = png(), image = embedAccountProofPng(plain, new TextEncoder().encode('{}'));
  expect(() => extractAccountProofPng(plain)).toThrow('SOURCE_REQUIRED');
  expect(() => embedAccountProofPng(image, new Uint8Array([1]))).toThrow('DUPLICATE');
  const corrupt = new Uint8Array(image); corrupt[corrupt.length - 20] ^= 1; expect(() => extractAccountProofPng(corrupt)).toThrow('INVALID');
  expect(() => extractAccountProofPng(new Uint8Array([...image, 1]))).toThrow('INVALID');
});
it('encodes the exact immutable verification URL in a scannable QR', () => {
  const digest = 'a'.repeat(64), url = accountProofUrl(digest), matrix = paymentQr(url), scale = 5, size = 61 * scale, rgba = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (matrix[Math.floor(y / scale) - 4]?.[Math.floor(x / scale) - 4]) { const i = (y * size + x) * 4; rgba[i] = rgba[i + 1] = rgba[i + 2] = 23; }
  expect(jsQR(rgba, size, size)?.data).toBe(url);
  expect(accountProofRoute(`/verify/${digest}/`)).toBe(digest);
  expect(accountProofRoute('/verify/not-a-source')).toBeNull();
  expect(() => accountProofUrl('https://evil.invalid')).toThrow();
});
