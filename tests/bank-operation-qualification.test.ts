import { expect, it, vi } from 'vitest';
import { createBankOperations } from '../src/receiz/bank-operations';

it('refuses an unqualified financial adapter before requesting terms, expanding access or retaining anything', async () => {
  const context = vi.fn(async () => { throw Error('must not connect'); }), load = vi.fn(async () => null), saveNew = vi.fn();
  const api = createBankOperations({ ownerReceizId: 'fixture.receiz.id', assertOpen() {}, store: { load, saveNew, replace: vi.fn() }, context, lock: async fn => fn() });
  await expect(api.prepare({ kind: 'exchange', rail: 'reserve', amountUsdCents: '500', assetDigest: 'a'.repeat(64) })).rejects.toThrow('BANK_OPERATION_FINANCIAL_ADAPTER_UNQUALIFIED');
  expect(context).not.toHaveBeenCalled(); expect(load).not.toHaveBeenCalled(); expect(saveNew).not.toHaveBeenCalled();
});
