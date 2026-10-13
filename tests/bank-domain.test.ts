import { expect, it } from 'vitest';
import { previewAssetChange, previewCurrencyChange, type BankAssetProjection, type BankCurrencyProjection } from '../src/receiz/bank-domain';
// Application conservation fixtures, not receipts, proof admission or money.
const asset = (): BankAssetProjection => ({ assetId: 'fixture', totalShares: '1000000', owners: { seller: '1000000' }, locks: {}, custody: 'held', receiptArtifactDigest: 'a'.repeat(64) });
it('moves half an asset and allows part of that ownership to be bought back without changing physical custody or supply', () => {
  const half = previewAssetChange(asset(), { kind: 'transfer', from: 'seller', to: 'buyer', shares: '500000' });
  expect(half.owners).toEqual({ seller: '500000', buyer: '500000' });
  const back = previewAssetChange(half, { kind: 'transfer', from: 'buyer', to: 'seller', shares: '250000' });
  expect(back.owners).toEqual({ seller: '750000', buyer: '250000' }); expect(back.custody).toBe('held'); expect(back.totalShares).toBe('1000000');
});
it('refuses ownership movement before custody or without an enclosing receipt coordinate', () => {
  expect(() => previewAssetChange({ ...asset(), custody: 'awaiting-receipt' }, { kind: 'transfer', from: 'seller', to: 'buyer', shares: '1' })).toThrow('CUSTODY_REQUIRED');
  expect(() => previewAssetChange({ ...asset(), receiptArtifactDigest: '' }, { kind: 'transfer', from: 'seller', to: 'buyer', shares: '1' })).toThrow('CUSTODY_REQUIRED');
});
it('cannot sell, transfer or commit the same locked ownership twice', () => {
  const locked = previewAssetChange(asset(), { kind: 'lock', owner: 'seller', shares: '600000', lockId: 'offer', purpose: 'sale' });
  expect(() => previewAssetChange(locked, { kind: 'transfer', from: 'seller', to: 'buyer', shares: '500000' })).toThrow('INSUFFICIENT_AVAILABLE_SHARES');
  expect(() => previewAssetChange(locked, { kind: 'lock', owner: 'seller', shares: '1', lockId: 'offer', purpose: 'sale' })).toThrow('LOCK_EXISTS');
});
it('only the lock owner can release a lock and a fractional holder cannot redeem the whole item', () => {
  const locked = previewAssetChange(asset(), { kind: 'lock', owner: 'seller', shares: '600000', lockId: 'offer', purpose: 'sale' });
  expect(() => previewAssetChange(locked, { kind: 'unlock', owner: 'buyer', lockId: 'offer' })).toThrow('LOCK_OWNER_MISMATCH');
  const shared = previewAssetChange(asset(), { kind: 'transfer', from: 'seller', to: 'buyer', shares: '500000' });
  expect(() => previewAssetChange(shared, { kind: 'redeem', owner: 'seller' })).toThrow('WHOLE_OWNERSHIP_REQUIRED');
});
it('a proposed sale conserves its locked shares and requires a payment intent coordinate', () => {
  const locked = previewAssetChange(asset(), { kind: 'lock', owner: 'seller', shares: '500000', lockId: 'offer', purpose: 'sale' });
  expect(() => previewAssetChange(locked, { kind: 'sell', owner: 'seller', buyer: 'buyer', lockId: 'offer', paymentIntentDigest: '' })).toThrow('PAYMENT_INTENT_REQUIRED');
  const sold = previewAssetChange(locked, { kind: 'sell', owner: 'seller', buyer: 'buyer', lockId: 'offer', paymentIntentDigest: 'b'.repeat(64) });
  expect(sold.owners).toEqual({ seller: '500000', buyer: '500000' }); expect(sold.locks).toEqual({});
});
const currency = (): BankCurrencyProjection => ({ currencyId: 'fixture', supply: '1000', balances: { issuer: '1000' }, backing: [{ commitmentId: 'backing', rail: 'reserve', amountPhiMicro: '1000001', sourceArtifactDigest: 'a'.repeat(64), valueHead: 'b'.repeat(64) }] });
it('currency movement conserves supply and never adds Reserve or Settlement', () => {
  const next = previewCurrencyChange(currency(), { kind: 'transfer', from: 'issuer', to: 'buyer', units: '100' });
  expect(next.balances).toEqual({ issuer: '900', buyer: '100' }); expect(next.supply).toBe('1000'); expect(next.backing).toEqual(currency().backing);
});
it('redemption burns units and returns exact proportional backing, retaining rounding until the final redemption', () => {
  const first = previewCurrencyChange(currency(), { kind: 'redeem', owner: 'issuer', units: '500' });
  expect(first.supply).toBe('500'); expect(first.backing[0].amountPhiMicro).toBe('500001'); expect(first.redemption?.[0].amountPhiMicro).toBe('500000');
  const last = previewCurrencyChange(first, { kind: 'redeem', owner: 'issuer', units: '500' });
  expect(last.supply).toBe('0'); expect(last.backing[0].amountPhiMicro).toBe('0'); expect(last.redemption?.[0].amountPhiMicro).toBe('500001');
});
it('rejects duplicate backing commitments, invalid supply and an unfunded currency', () => {
  expect(() => previewCurrencyChange({ ...currency(), backing: [] }, { kind: 'transfer', from: 'issuer', to: 'buyer', units: '1' })).toThrow('BACKING_REQUIRED');
  expect(() => previewCurrencyChange({ ...currency(), backing: [...currency().backing, ...currency().backing] }, { kind: 'transfer', from: 'issuer', to: 'buyer', units: '1' })).toThrow('DUPLICATE_BACKING');
  expect(() => previewCurrencyChange({ ...currency(), supply: '999' }, { kind: 'transfer', from: 'issuer', to: 'buyer', units: '1' })).toThrow('SUPPLY_MISMATCH');
});
it('rejects negative, zero, exponent and overspending amounts without changing the original projection', () => {
  const original = asset(), bytes = JSON.stringify(original);
  for (const shares of ['0', '-1', '1e6']) expect(() => previewAssetChange(original, { kind: 'transfer', from: 'seller', to: 'buyer', shares })).toThrow('INVALID_UNITS');
  expect(() => previewAssetChange(original, { kind: 'transfer', from: 'seller', to: 'buyer', shares: '1000001' })).toThrow('INSUFFICIENT_AVAILABLE_SHARES');
  expect(JSON.stringify(original)).toBe(bytes);
});
