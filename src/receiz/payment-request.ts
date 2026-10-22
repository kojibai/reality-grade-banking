import { BANK_PUBLIC_ORIGIN, BANK_PAYMENT_ORIGINS } from './config';
import {publicReceizId} from './public-receiz-id';
import {parseCheckoutRequest} from './checkout-request';
export {publicReceizId} from './public-receiz-id';
export interface PaymentRequest { recipient: string; amount?: string; }
/** The public username is the human receiving coordinate. Wallet UUIDs remain
 * compatible in old request URLs but are never a newly displayed Receive ID. */
function recipient(value: string) { const normalized = value.trim(); if (!/^[a-zA-Z0-9._:@-]{1,120}$/.test(normalized)) throw new Error('Use a Receiz ID or public username.'); return normalized; }
function amount(value?: string) { if (!value) return undefined; if (!/^\d{1,18}(\.\d{1,2})?$/.test(value) || BigInt(value.replace('.', '').replace(/^0+/, '') || '0') <= 0n) throw new Error('Enter a positive amount with up to two decimal places.'); const [whole, fraction = ''] = value.split('.'); return `${BigInt(whole)}.${fraction.padEnd(2, '0')}`; }
// Public discovery only. Scans, links and NFC never confer spending authority.
export function buildPaymentRequest(to: string, dollars?: string): string {
  const url = new URL('/', BANK_PUBLIC_ORIGIN); url.searchParams.set('to', recipient(to)); const exact = amount(dollars); if (exact) url.searchParams.set('amount', exact); return url.href;
}
export function parsePaymentRequest(input: string): PaymentRequest {
  const id=publicReceizId(input);if(id)return {recipient:input.trim().toLowerCase().endsWith('.receiz.id')?id:id.slice(0,-10)};
  const checkout=parseCheckoutRequest(input);if(checkout)return{recipient:checkout.username,...(checkout.amount?{amount:checkout.amount}:{})};
  const url = new URL(input);
  if (!BANK_PAYMENT_ORIGINS.some(origin => origin === url.origin) || url.pathname !== '/' || url.username || url.password || url.hash || [...url.searchParams.keys()].some(key => !['to', 'amount'].includes(key)) || url.searchParams.getAll('to').length !== 1 || url.searchParams.getAll('amount').length > 1) throw new Error('Scan a Bankeiz payment request.');
  return { recipient: recipient(url.searchParams.get('to') ?? ''), amount: amount(url.searchParams.get('amount') ?? undefined) };
}
