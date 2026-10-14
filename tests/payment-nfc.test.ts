import { expect, it } from 'vitest';
import { nfcUrl, verifyPaymentTag, type BankNfcReader } from '../src/receiz/payment-nfc';
it('verifies the exact URL read back from an NFC tag and rejects a different recipient', async () => {
  const link = 'https://bank.receiz.com/?to=fixture.receiz.id';
  const bytes = new TextEncoder().encode(link);
  const record = { recordType: 'url', data: new DataView(bytes.buffer) };
  expect(nfcUrl([record])).toBe(link);
  class Reader implements BankNfcReader { listener?: (event: any) => void; async write() {} addEventListener(type: string, fn: (event: any) => void) { if (type === 'reading') this.listener = fn; } async scan() { this.listener!({ message: { records: [record] } }); } }
  await expect(verifyPaymentTag(Reader, link, new AbortController().signal)).resolves.toBeUndefined();
  await expect(verifyPaymentTag(Reader, 'https://bank.receiz.com/?to=other', new AbortController().signal)).rejects.toThrow('different');
});
