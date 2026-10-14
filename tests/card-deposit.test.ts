import { expect, it } from 'vitest';
import { parseCardCheckout, parseCardDepositStatus, parseDepositDollars, readCardOperation } from '../src/receiz/card-deposit';
it('uses exact dollar cents within the native Receiz card limits', () => {
  expect(parseDepositDollars('250')).toEqual({ amountUsd: '250.00', amountUsdCents: '25000' });
  expect(() => parseDepositDollars('0.10')).toThrow();
  expect(() => parseDepositDollars('1.001')).toThrow();
  expect(() => parseDepositDollars('100000.01')).toThrow();
});
it('an unfinished deposit stays bound to its original registration across the native bank upgrade', () => {
  const legacy = { schema: 'receiz.bank.card-operation.v1', stage: 'creating', operationId: 'unfinished-fixture', amountUsdCents: '500' };
  expect(readCardOperation(legacy)?.applicationId).toBe('rc_ELkGAUBINd9Nw4bE5zMqUsgc');
  expect(() => readCardOperation({ ...legacy, applicationId: 'foreign-client' })).toThrow('registration');
});
it('requires the actual embedded Receiz envelope and the exact requested amount', () => {
  const envelope = { ok: true, checkout: { mode: 'embedded', sessionId: 'cs_test_12345678', clientSecret: 'private-test-fixture', amountUsdCents: '25000', currency: 'usd' } };
  expect(parseCardCheckout(envelope, '25000').sessionId).toBe('cs_test_12345678');
  expect(() => parseCardCheckout(envelope, '25100')).toThrow('amount');
  expect(() => parseCardCheckout({ ...envelope, checkout: { ...envelope.checkout, mode: 'hosted' } }, '25000')).toThrow('embedded');
});
it('does not count checkout completion as a deposited balance without matching native settlement', () => {
  const session = { sessionId: 'cs_test_12345678', isPaid: true, amountUsdCents: '25000', currency: 'usd', state: 'paid' };
  expect(parseCardDepositStatus({ ok: true, session, settlement: null }, session.sessionId, '25000', 'account-1').status).toBe('settling');
  expect(parseCardDepositStatus({ ok: true, session, settlement: { userId: 'account-1', amountUsdCents: '25000', amountPhiMicro: '700' } }, session.sessionId, '25000', 'account-1').status).toBe('credited');
  expect(() => parseCardDepositStatus({ ok: true, session, settlement: { userId: 'foreign', amountUsdCents: '25000', amountPhiMicro: '700' } }, session.sessionId, '25000', 'account-1')).toThrow('account');
});
