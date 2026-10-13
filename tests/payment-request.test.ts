import { expect, it } from 'vitest';
import { buildPaymentRequest, parsePaymentRequest } from '../src/receiz/payment-request';
it('roundtrips a public bank request with exact display dollars, without any signing material', () => {
  const url = buildPaymentRequest('public-receiz-coordinate', '12.30');
  expect(url).toContain('https://bank.receiz.com/'); expect(parsePaymentRequest(url)).toEqual({ recipient: 'public-receiz-coordinate', amount: '12.30' });
  expect(url).not.toContain('key'); expect(url).not.toContain('secret');
});
it('refuses unrelated origins, duplicate request parameters, oversized recipients, or fractional cents', () => {
  expect(() => parsePaymentRequest('https://evil.example/?to=somebody')).toThrow();
  expect(() => parsePaymentRequest('https://bank.receiz.com/?to=one&to=two')).toThrow();
  expect(() => buildPaymentRequest('x'.repeat(121))).toThrow();
  expect(() => buildPaymentRequest('somebody', '1.001')).toThrow();
});
