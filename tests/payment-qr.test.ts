import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { paymentQr } from '../src/receiz/payment-qr';
// Complete-matrix vectors independently compared against qrcode version 9/L,
// explicit byte mode and mask 0. That package is not a runtime dependency.
it.each([
  ['https://bank.receiz.com/?to=public-receiz-coordinate&amount=12.30', '66efe780ac67cb127a8dd086025dd1766d70d0897affe2e73722e545212d0e66'],
  ['x'.repeat(230), 'c27cc0ff6ff3c0382f94c6c3969cdd8f035b153e22b5c1552375ab7b41e6f87c'],
])('encodes the complete interoperable QR matrix', (input, digest) => {
  const matrix = paymentQr(input); expect(matrix).toHaveLength(53);
  expect(createHash('sha256').update(matrix.flat().map(Number).join('')).digest('hex')).toBe(digest);
});
it('bounds QR allocation to the standard byte capacity', () => { expect(() => paymentQr('x'.repeat(231))).toThrow('capacity'); });
