import { expect, it } from 'vitest';
import { parsePrivateHistoryPage, privateHistoryPath } from '../src/receiz/private-history';
import { permittedNativePath } from '../src/receiz/native-transport';
it('accepts only a history page bound to the already-confirmed account', () => {
  const response = { ok: true, accountUserId: 'current', nextCursor: 'older_cursor', events: [{ id: 'credit:1', kind: 'reserve_credit', createdAt: '2026-10-14T12:00:00Z', amountUsdCents: '25000', actor: { userId: 'current', username: 'me' } }] };
  expect(parsePrivateHistoryPage(response, 'current')).toMatchObject({ nextCursor: 'older_cursor', records: [{ amountUsdCents: '25000' }], origin: 'private-account' });
  expect(() => parsePrivateHistoryPage(response, 'foreign')).toThrow('ACCOUNT_MISMATCH');
  expect(() => parsePrivateHistoryPage({ ...response, accountUserId: undefined }, 'current')).toThrow('ACCOUNT_MISMATCH');
});
it('restricts private reads to fixed bounded pagination without account selectors or anchor creation', () => {
  expect(permittedNativePath(privateHistoryPath('older_cursor'), 'GET')).toBe(true);
  expect(permittedNativePath('/api/wallet/ledger?limit=100&includeReceiz=0&userId=foreign', 'GET')).toBe(false);
  expect(permittedNativePath('/api/wallet/ledger?limit=100&includeReceiz=1', 'GET')).toBe(false);
  expect(permittedNativePath(privateHistoryPath(), 'POST')).toBe(false);
  expect(() => privateHistoryPath('../foreign')).toThrow();
});
it('exports only bounded failure diagnostics, never private response payloads or messages', async () => {
  const { privateHistoryFailureCode } = await import('../src/receiz/private-history');
  expect(privateHistoryFailureCode({ status: 401, payload: { bearer: 'do-not-export' } })).toBe('HTTP_401');
  expect(privateHistoryFailureCode(new Error('private account and arbitrary secret'))).toBe('PRIVATE_HISTORY_READ_UNAVAILABLE');
});
it('retains the complete bound Ledger response beneath its display rows',()=>{
 const original={ok:true,accountUserId:'current',nextCursor:null,events:[{id:'debit:1',kind:'wallet_ledger_entry',direction:'debit',amountPhiMicro:'1250000',amountUsdCents:'250',valueReceipt:{settledUsdCents:'0',phiUsdCents:'250',fundingSource:'sovereign'},proofBundle:{bundleHash:'a'.repeat(64)}}],rollup:{totalPhiCreditMicro:'2000000',totalPhiDebitMicro:'1250000'},accountSource:{head:'b'.repeat(64)}};
 const page=parsePrivateHistoryPage(original,'current');expect(JSON.parse(page.sourceJson)).toEqual(original);original.events[0].amountPhiMicro='999';expect(JSON.parse(page.sourceJson).events[0].amountPhiMicro).toBe('1250000');
});
