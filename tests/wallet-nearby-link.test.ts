import { expect, it } from 'vitest';
import { parseRoute, routeHash } from '../src/core/routes';
import { decodePaymentPixels } from '../src/receiz/payment-decoder';
import { walletPaymentLinkQr } from '../src/receiz/payment-qr';
import {
  nearbyPaymentLink, nearbyPaymentLinkBytes, readNearbyPaymentLink,
} from '../src/receiz/wallet-nearby-link';

it.each([530, 900, 1800])('carries %i exact payment bytes in a scannable Bankeiz URL', async length => {
  const exact = Uint8Array.from({ length }, (_, index) => index % 256);
  const link = nearbyPaymentLink(exact)!;
  const matrix = walletPaymentLinkQr(link);
  const scale = 4, width = (matrix.length + 8) * scale;
  const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix.length; x++) {
      if (!matrix[y][x]) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const offset = (((y + 4) * scale + dy) * width + (x + 4) * scale + dx) * 4;
          pixels.fill(0, offset, offset + 3);
        }
      }
    }
  }
  const scanned = await decodePaymentPixels(pixels, width, width);
  expect(scanned).toBe(link);
  expect(readNearbyPaymentLink(scanned!)).toEqual(exact);
  const url = new URL(scanned!);
  expect(url.origin + url.pathname + url.search).toBe('https://bankeiz.com/');
  const route = parseRoute(url.hash);
  expect(route.sheet?.kind).toBe('receive');
  expect(routeHash(route.panel, route.sheet)).toBe(url.hash);
  if (route.sheet?.kind !== 'receive') throw Error('Expected Receive');
  expect(nearbyPaymentLinkBytes(route.sheet.nearbyPayment!)).toEqual(exact);
});

it('leaves other origins, malformed fragments and large proofs to their existing readers', () => {
  const link = nearbyPaymentLink(new Uint8Array([1, 2, 3]))!;
  expect(readNearbyPaymentLink(link.replace('bankeiz.com', 'foreign.test'))).toBeNull();
  expect(readNearbyPaymentLink(link.replace('/#', '/?to=coffee#'))).toBeNull();
  expect(readNearbyPaymentLink(link + '/extra')).toBeNull();
  expect(readNearbyPaymentLink(link + '=')).toBeNull();
  expect(nearbyPaymentLink(new Uint8Array(3000))).toBeNull();
  expect(parseRoute(new URL(link).hash + '/extra').sheet).toEqual({ kind: 'receive' });
});
