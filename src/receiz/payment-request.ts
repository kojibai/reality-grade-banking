import { BANK_PUBLIC_ORIGIN } from './config';
export interface PaymentRequest { recipient: string; amount?: string; }
function recipient(value: string) { const normalized = value.trim(); if (!/^[a-zA-Z0-9._:@-]{1,120}$/.test(normalized)) throw new Error('Use a Receiz ID or public username.'); return normalized; }
function amount(value?: string) { if (!value) return undefined; if (!/^\d{1,18}(\.\d{1,2})?$/.test(value) || BigInt(value.replace('.', '').replace(/^0+/, '') || '0') <= 0n) throw new Error('Enter a positive amount with up to two decimal places.'); const [whole, fraction = ''] = value.split('.'); return `${BigInt(whole)}.${fraction.padEnd(2, '0')}`; }
// Public discovery only. Scans, links and NFC never confer spending authority.
export function buildPaymentRequest(to: string, dollars?: string): string {
  const url = new URL('/', BANK_PUBLIC_ORIGIN); url.searchParams.set('to', recipient(to)); const exact = amount(dollars); if (exact) url.searchParams.set('amount', exact); return url.href;
}
export function parsePaymentRequest(input: string): PaymentRequest {
  const url = new URL(input);
  if (url.origin !== BANK_PUBLIC_ORIGIN || url.pathname !== '/' || url.username || url.password || url.hash || [...url.searchParams.keys()].some(key => !['to', 'amount'].includes(key)) || url.searchParams.getAll('to').length !== 1 || url.searchParams.getAll('amount').length > 1) throw new Error('Scan a Bankeiz payment request.');
  return { recipient: recipient(url.searchParams.get('to') ?? ''), amount: amount(url.searchParams.get('amount') ?? undefined) };
}
