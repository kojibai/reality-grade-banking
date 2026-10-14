import { BANK_CARD_APPLICATION_IDS, BANK_PREVIOUS_CARD_APPLICATION_ID } from './config';
export interface CardCheckout { sessionId: string; clientSecret: string; amountUsdCents: string; }
export interface CardDepositStatus { status: 'open' | 'settling' | 'credited' | 'expired' | 'unpaid'; amountPhiMicro?: string; }
export interface CardOperation { schema: 'receiz.bank.card-operation.v1'; applicationId: string; stage: 'creating' | 'ready'; operationId: string; amountUsdCents: string; checkout?: CardCheckout; }
export function cardOperationApplicationId(value: unknown): string {
  const applicationId = value ?? BANK_PREVIOUS_CARD_APPLICATION_ID;
  if (!BANK_CARD_APPLICATION_IDS.some(id => id === applicationId)) throw new Error('The unfinished deposit belongs to an unsupported bank registration.');
  return applicationId as string;
}
export function readCardOperation(value: unknown): CardOperation | null {
  if (value === null) return null; const input = record(value);
  const applicationId = cardOperationApplicationId(input.applicationId);
  if (input.schema !== 'receiz.bank.card-operation.v1' || !['creating', 'ready'].includes(String(input.stage)) || typeof input.operationId !== 'string' || !/^[a-zA-Z0-9-]{1,100}$/.test(input.operationId) || typeof input.amountUsdCents !== 'string' || !/^[1-9]\d{0,7}$/.test(input.amountUsdCents)) throw new Error('The unfinished card deposit cannot be read. Check its status before creating another.');
  if (input.stage === 'ready') {
    const checkout = record(input.checkout);
    return { ...input, applicationId, checkout: parseCardCheckout({ ok: true, checkout: { ...checkout, mode: 'embedded', currency: 'usd' } }, input.amountUsdCents) } as unknown as CardOperation;
  }
  return { ...input, applicationId } as unknown as CardOperation;
}
function record(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Receiz card deposit response is unavailable.'); return value as Record<string, unknown>; }
export function parseDepositDollars(value: string) {
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(value.trim())) throw new Error('Enter dollars with up to two decimal places.');
  const [whole, decimal = ''] = value.trim().split('.'), cents = BigInt(whole) * 100n + BigInt(decimal.padEnd(2, '0'));
  if (cents < 50n || cents > 10_000_000n) throw new Error('Enter an amount from $0.50 to $100,000.00.');
  return { amountUsd: `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`, amountUsdCents: cents.toString() };
}
export function parseCardCheckout(input: unknown, expectedCents: string): CardCheckout {
  const envelope = record(input), checkout = record(envelope.checkout);
  if (envelope.ok !== true || checkout.mode !== 'embedded') throw new Error('Receiz did not return an embedded card checkout.');
  if (checkout.currency !== 'usd' || checkout.amountUsdCents !== expectedCents) throw new Error('Receiz returned a different deposit amount.');
  if (typeof checkout.sessionId !== 'string' || !/^cs_[a-zA-Z0-9_]{8,200}$/.test(checkout.sessionId) || typeof checkout.clientSecret !== 'string' || !checkout.clientSecret || checkout.clientSecret.length > 1000) throw new Error('Receiz card session could not be opened.');
  return { sessionId: checkout.sessionId, clientSecret: checkout.clientSecret, amountUsdCents: expectedCents };
}
export function parseCardDepositStatus(input: unknown, expectedSession: string, expectedCents: string, expectedAccount: string): CardDepositStatus {
  const envelope = record(input), session = record(envelope.session);
  if (envelope.ok !== true || session.sessionId !== expectedSession || session.amountUsdCents !== expectedCents || session.currency !== 'usd') throw new Error('Receiz returned a different deposit session.');
  if (session.isPaid !== true) return { status: session.state === 'expired' ? 'expired' : session.state === 'complete_unpaid' ? 'unpaid' : 'open' };
  if (!envelope.settlement) return { status: 'settling' };
  const settlement = record(envelope.settlement);
  if (settlement.userId !== expectedAccount || settlement.amountUsdCents !== expectedCents) throw new Error('This deposit was not credited to the same account and amount.');
  if (typeof settlement.amountPhiMicro !== 'string' || !/^[1-9]\d{0,39}$/.test(settlement.amountPhiMicro)) throw new Error('Receiz deposit settlement is unavailable.');
  return { status: 'credited', amountPhiMicro: settlement.amountPhiMicro };
}
