import { parsePublicNetworkPage, type PublicRecord } from './public-network';
export interface PrivateHistoryPage { accountUid: string; records: PublicRecord[]; nextCursor: string | null; origin: 'private-account'; }
export function privateHistoryPath(cursor?: string): string {
  if (cursor !== undefined && !/^[A-Za-z0-9_-]{1,2048}$/.test(cursor)) throw new Error('PRIVATE_HISTORY_CURSOR_INVALID');
  return `/api/wallet/ledger?limit=100&includeReceiz=0${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
}
// An authenticated private read is display data beneath held sealed history.
// Neither its balances nor its rows supply ownership or execution authority.
export function parsePrivateHistoryPage(input: unknown, accountUid: string): PrivateHistoryPage {
  const value = input as { ok?: unknown; accountUserId?: unknown; events?: unknown; nextCursor?: unknown } | null;
  if (!accountUid || value?.accountUserId !== accountUid) throw new Error('PRIVATE_HISTORY_ACCOUNT_MISMATCH');
  if (value.ok !== true || !Array.isArray(value.events) || value.events.length > 100) throw new Error('PRIVATE_HISTORY_PAGE_INVALID');
  if (value.nextCursor !== null && (typeof value.nextCursor !== 'string' || !/^[A-Za-z0-9_-]{1,2048}$/.test(value.nextCursor))) throw new Error('PRIVATE_HISTORY_CURSOR_INVALID');
  return { accountUid, records: parsePublicNetworkPage('wallet', value).records.map(record => ({ ...record, authority: 'account-source-projection', origin: 'private-account' })), nextCursor: value.nextCursor, origin: 'private-account' };
}
