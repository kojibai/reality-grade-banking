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
