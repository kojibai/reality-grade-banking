import { BANK_APPLICATION_ID } from './config';

export const NATIVE_PATHS: Readonly<Record<string, string>> = {
  '/api/signer/v4/receiz/enroll': 'POST',
  '/api/auth/receiz-id/continue': 'POST',
  '/api/sdk/v1/identity/proof-authority/exchange': 'POST',
  '/api/sdk/v1/auth/granted-scopes': 'GET',
  '/api/connect/wallet/me': 'GET',
  '/api/connect/payments/checkout': 'POST',
  '/api/connect/payments/session': 'GET',
  '/api/sdk/v1/runtime/qualify': 'POST',
};
export function permittedNativePath(path: string, method: string): boolean {
  let url: URL; try { url = new URL(path, 'https://receiz.com'); } catch { return false; }
  if (url.origin !== 'https://receiz.com' || url.username || url.password || NATIVE_PATHS[url.pathname] !== method.toUpperCase() || url.hash) return false;
  if (url.pathname === '/api/sdk/v1/runtime/qualify') return [...url.searchParams.keys()].length === 1 && url.searchParams.get('applicationId') === BANK_APPLICATION_ID;
  if (!url.search) return url.pathname !== '/api/connect/payments/session';
  return url.pathname === '/api/connect/payments/session' && [...url.searchParams.keys()].length === 1 && /^cs_[a-zA-Z0-9_]{8,200}$/.test(url.searchParams.get('sessionId') ?? '');
}
export const nativeFetch: typeof fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input), 'https://receiz.com');
  const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
  if (!permittedNativePath(url.href, method)) throw new Error('Unsupported Receiz bank transport.');
  return fetch(`/api/bank/native${url.pathname}${url.search}`, { ...init, credentials: 'omit', redirect: 'error', signal: init?.signal ?? AbortSignal.timeout(60_000) });
};
