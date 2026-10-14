import { expect, it } from 'vitest';
import { decodePaymentPixels } from '../src/receiz/payment-decoder';
import { paymentQr } from '../src/receiz/payment-qr';
it('decodes a real bank QR locally without the unsupported browser BarcodeDetector', async () => {
  const url = 'https://bank.receiz.com/?to=fixture.receiz.id&amount=12.30', matrix = paymentQr(url), size = 244;
  const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { if (matrix[Math.floor(y / 4) - 4]?.[Math.floor(x / 4) - 4]) { const i = (y * size + x) * 4; pixels[i] = pixels[i + 1] = pixels[i + 2] = 0; } }
  expect(await decodePaymentPixels(pixels, size, size)).toBe(url);
  expect(await decodePaymentPixels(new Uint8ClampedArray(size * size * 4).fill(255), size, size)).toBeNull();
});
