import { BANK_APPLICATION_ID, isBankNativeApplicationId, bankNoteRpId } from './config.js';
import { NATIVE_EXECUTION_POST_PATHS, permittedNativeExecutionRead } from './native-execution-paths.js';

export const NATIVE_PATHS: Readonly<Record<string, string>> = {
  '/api/signer/v4/receiz/enroll': 'POST',
  '/api/receiz/ownership/bearer-claim': 'POST',
  '/api/document-verify': 'POST',
  '/api/auth/receiz-id/continue': 'POST',
  '/api/sdk/v1/identity/proof-authority/exchange': 'POST',
  '/api/sdk/v1/auth/granted-scopes': 'GET',
  '/api/connect/wallet/me': 'GET',
  '/api/connect/transfers': 'POST',
  '/api/connect/transfers/public-note': 'POST',
  '/api/chat/conversations': 'POST',
  '/api/connect/payments/checkout': 'POST',
  '/api/connect/payments/session': 'GET',
  '/api/sdk/v1/runtime/qualify': 'POST',
  '/api/sdk/v1/sources/publish': 'POST',
  '/api/sdk/v1/runtime/authority-sessions/open': 'POST',
  '/api/sdk/v1/runtime/authority-sessions/refresh': 'POST',
  '/api/sdk/v1/runtime/authority-sessions/close': 'POST',
  '/api/sdk/v1/subjects/admit': 'POST',
};
export function permittedNativePath(path: string, method: string): boolean {
  let url: URL; try { url = new URL(path, 'https://receiz.com'); } catch { return false; }
  if (url.origin !== 'https://receiz.com' || url.username || url.password || url.hash) return false;
  if (url.pathname === '/api/connect/market/shares/trade') return method.toUpperCase()==='POST'?!url.search:method.toUpperCase()==='GET'&&[...url.searchParams.keys()].length===1&&url.searchParams.getAll('clientNonce').length===1&&/^[A-Za-z0-9._:-]{8,120}$/.test(url.searchParams.get('clientNonce')??'');
  if (url.pathname === '/api/connect/market/shares/quote') {
    const side=url.searchParams.get('side'),amount=side==='buy'?'amountUsd':'shareQuantity',id=url.searchParams.get('marketItemId');
    return method.toUpperCase()==='GET'&&['buy','sell'].includes(side??'')&&!!id&&id.length<=512&&!/[\u0000-\u0020\u007f]/.test(id)&&[...url.searchParams.keys()].length===3&&['marketItemId','side',amount].every(key=>url.searchParams.getAll(key).length===1)&&(side==='buy'?/^(0|[1-9]\d{0,15})\.\d{2}$/:/^(0|[1-9]\d{0,11})\.\d{6}$/).test(url.searchParams.get(amount)??'');
  }
  if (url.pathname === '/api/chat/users/search') return method.toUpperCase()==='GET' && [...url.searchParams.keys()].length===1 && url.searchParams.getAll('q').length===1 && /^[a-z0-9_]{3,24}$/.test(url.searchParams.get('q')??'');
  if (url.pathname === '/api/connect/transfers' && method.toUpperCase()==='GET') return [...url.searchParams.keys()].length===1 && (url.searchParams.has('clientNonce') ? /^[A-Za-z0-9._:-]{8,120}$/.test(url.searchParams.get('clientNonce')??'') : /^\d{1,18}\.\d{2}$/.test(url.searchParams.get('amountUsd')??''));
  if (/^\/api\/connect\/bank\/(?:payments\/(?:prepare|execute|recover)|assets\/(?:prepare|execute|recover|portfolio))$/.test(url.pathname)) return method.toUpperCase() === 'POST' && [...url.searchParams.keys()].length === 1 && url.searchParams.getAll('applicationId').length === 1 && (url.pathname.endsWith('/recover') ? isBankNativeApplicationId(url.searchParams.get('applicationId')) : url.searchParams.get('applicationId') === BANK_APPLICATION_ID);
  if (url.pathname === '/api/connect/bank/prepare') return method.toUpperCase() === 'POST' && [...url.searchParams.keys()].length === 1 && url.searchParams.get('applicationId') === BANK_APPLICATION_ID;
  if (url.pathname === '/api/connect/account-proof') return method.toUpperCase() === 'GET' && [...url.searchParams.keys()].length === 1 && url.searchParams.get('applicationId') === BANK_APPLICATION_ID;
  if (url.pathname === '/api/connect/account-proof/sources') return method.toUpperCase() === 'POST' && [...url.searchParams.keys()].length === 1 && url.searchParams.get('applicationId') === BANK_APPLICATION_ID;
  if (url.pathname === '/api/connect/account-proof/sharing') return ['GET', 'POST'].includes(method.toUpperCase()) && [...url.searchParams.keys()].length === 1 && isBankNativeApplicationId(url.searchParams.get('applicationId'));
  if (url.pathname.startsWith('/api/sdk/v1/execution/') && !NATIVE_EXECUTION_POST_PATHS.includes(url.pathname)) return permittedNativeExecutionRead(url, method);
  if (NATIVE_EXECUTION_POST_PATHS.includes(url.pathname)) return method.toUpperCase() === 'POST' && [...url.searchParams.keys()].length === 1 && url.searchParams.get('applicationId') === BANK_APPLICATION_ID;
  if (['/api/connect/offline-notes/funding', '/api/connect/offline-notes/redemption'].includes(url.pathname)) {
    const verb = method.toUpperCase(), recoveryKey = url.pathname.endsWith('/funding') ? 'allocationId' : 'noteId';
    const allowed = verb === 'POST' ? ['origin'] : ['origin', recoveryKey];
    if (!['GET', 'POST'].includes(verb) || [...url.searchParams.keys()].some(key => !allowed.includes(key) || url.searchParams.getAll(key).length !== 1) || !bankNoteRpId(url.searchParams.get('origin') ?? '')) return false;
    return verb === 'POST' ? !url.searchParams.has(recoveryKey) : recoveryKey === 'allocationId' ? /^[a-f0-9]{64}$/.test(url.searchParams.get(recoveryKey) ?? '') : /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(url.searchParams.get(recoveryKey) ?? '');
  }
  if (url.pathname === '/api/connect/offline-notes/custody/attestation') return ['GET', 'POST'].includes(method.toUpperCase()) && url.searchParams.getAll('origin').length === 1 && [...url.searchParams.keys()].every(key => key === 'origin') && Boolean(bankNoteRpId(url.searchParams.get('origin') ?? ''));
  if (url.pathname === '/api/wallet/ledger') return method.toUpperCase() === 'GET' && url.searchParams.get('limit') === '100' && url.searchParams.get('includeReceiz') === '0' && [...url.searchParams.keys()].every(key => ['limit', 'includeReceiz', 'cursor'].includes(key) && url.searchParams.getAll(key).length === 1) && (!url.searchParams.has('cursor') || /^[A-Za-z0-9_-]{1,2048}$/.test(url.searchParams.get('cursor')!));
  if (/^\/api\/sdk\/v1\/subjects\/receiz%3Asubject%3A[a-f0-9]{64}\/state$/.test(url.pathname)) return method.toUpperCase() === 'GET' && !url.search;
  if (NATIVE_PATHS[url.pathname] !== method.toUpperCase()) return false;
  if (url.pathname === '/api/sdk/v1/runtime/qualify' || url.pathname === '/api/sdk/v1/sources/publish' || url.pathname.startsWith('/api/sdk/v1/runtime/authority-sessions/')) return [...url.searchParams.keys()].length === 1 && url.searchParams.get('applicationId') === BANK_APPLICATION_ID;
  if (url.pathname === '/api/connect/wallet/me' && url.search) return url.searchParams.get('history') === '1' && [...url.searchParams.keys()].every(key => ['history','after'].includes(key) && url.searchParams.getAll(key).length===1) && (!url.searchParams.has('after') || /^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|\+00:00)$/.test(url.searchParams.get('after')!) && url.searchParams.get('after')!.length<=40);
  if (!url.search) return url.pathname !== '/api/connect/payments/session';
  return url.pathname === '/api/connect/payments/session' && [...url.searchParams.keys()].length === 1 && /^cs_[a-zA-Z0-9_]{8,200}$/.test(url.searchParams.get('sessionId') ?? '');
}
export const nativeFetch: typeof fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input), 'https://receiz.com');
  const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
  if (!permittedNativePath(url.href, method)) throw new Error('Unsupported Receiz bank transport.');
  return fetch(`/api/bank/native${url.pathname}${url.search}`, { ...init, credentials: 'omit', redirect: 'error', signal: init?.signal ?? AbortSignal.timeout(60_000) });
};
