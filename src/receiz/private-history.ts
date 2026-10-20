import { type PublicRecord } from './public-network';
import {projectAccountHistoryRecords} from './account-history-direction';
export interface PrivateHistoryPage { accountUid: string; records: PublicRecord[]; nextCursor: string | null; origin: 'private-account'; sourceJson: string; }
export function privateHistoryPath(cursor?: string): string {
  if (cursor !== undefined && !/^[A-Za-z0-9_-]{1,2048}$/.test(cursor)) throw new Error('PRIVATE_HISTORY_CURSOR_INVALID');
  return `/api/wallet/ledger?limit=100&includeReceiz=0${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
}
// An authenticated private read is display data beneath held sealed history.
// Neither its balances nor its rows supply ownership or execution authority.
export function parsePrivateHistoryPage(input: unknown, accountUid: string): PrivateHistoryPage {
  const value = input as { ok?: unknown; accountUserId?: unknown; events?: unknown; nextCursor?: unknown } | null;
  if (!accountUid || value?.accountUserId !== accountUid) throw new Error(value?.accountUserId === undefined ? 'PRIVATE_HISTORY_ACCOUNT_MISMATCH_BINDING_MISSING' : 'PRIVATE_HISTORY_ACCOUNT_MISMATCH');
  if (value.ok !== true || !Array.isArray(value.events) || value.events.length > 100) throw new Error('PRIVATE_HISTORY_PAGE_INVALID');
  if (value.nextCursor !== null && (typeof value.nextCursor !== 'string' || !/^[A-Za-z0-9_-]{1,2048}$/.test(value.nextCursor))) throw new Error('PRIVATE_HISTORY_CURSOR_INVALID');
  const sourceJson = JSON.stringify(input); if (new TextEncoder().encode(sourceJson).length > 8 * 1024 * 1024) throw Error('PRIVATE_HISTORY_CAPACITY_EXCEEDED');
  return { accountUid, sourceJson, records: projectAccountHistoryRecords('wallet',value.events,accountUid).map(record => ({ ...record, origin: 'private-account' })), nextCursor: value.nextCursor, origin: 'private-account' };
}
/** Bounded diagnostics only: never expose a private payload, token or account ID. */
export function privateHistoryFailureCode(cause: unknown): string {
  const status = (cause as { status?: unknown } | null)?.status;
  if (typeof status === 'number' && Number.isInteger(status) && status >= 400 && status <= 599) return `HTTP_${status}`;
  const message = cause instanceof Error ? cause.message : '';
  if (/^PRIVATE_HISTORY_(ACCOUNT_MISMATCH(?:_BINDING_MISSING)?|PAGE_INVALID|CURSOR_INVALID)$/.test(message)) return message;
  if (message === 'Repeated private history cursor.') return 'PRIVATE_HISTORY_REPEATED_CURSOR';
  return 'PRIVATE_HISTORY_READ_UNAVAILABLE';
}

/** Retain complete responses independently of shortened display projections. */
export function appendPrivateLedgerPage(previous: readonly {cursor:string|null;json:string}[] | undefined,page:PrivateHistoryPage,cursor:string|null){
 const pages=[...(previous??[])];if(!pages.some(value=>value.json===page.sourceJson))pages.push({cursor,json:page.sourceJson});return pages;
}
export function validatePrivateLedgerPages(pages:unknown,accountUid:string,onPage?:(page:PrivateHistoryPage)=>void):asserts pages is {cursor:string|null;json:string}[]{
 if(!Array.isArray(pages)||pages.length>100000)throw Error('PRIVATE_HISTORY_CACHE_INVALID');
 for(const page of pages){if(!page||typeof page.json!=='string'||page.cursor!==null&&(typeof page.cursor!=='string'||!/^[A-Za-z0-9_-]{1,2048}$/.test(page.cursor)))throw Error('PRIVATE_HISTORY_CACHE_INVALID');const parsed=parsePrivateHistoryPage(JSON.parse(page.json),accountUid);onPage?.(parsed);}
}
