export const NATIVE_PATHS: Readonly<Record<string, string>> = {
  '/api/signer/v4/receiz/enroll': 'POST',
  '/api/auth/receiz-id/continue': 'POST',
  '/api/sdk/v1/identity/proof-authority/exchange': 'POST',
  '/api/sdk/v1/auth/granted-scopes': 'GET',
  '/api/connect/wallet/me': 'GET',
};
export const nativeFetch: typeof fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input), 'https://receiz.com');
  const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
  if (url.origin !== 'https://receiz.com' || url.search || !NATIVE_PATHS[url.pathname] || NATIVE_PATHS[url.pathname] !== method.toUpperCase()) throw new Error('Unsupported Receiz bank transport.');
  return fetch(`/api/bank/native${url.pathname}`, { ...init, credentials: 'omit', redirect: 'error', signal: init?.signal ?? AbortSignal.timeout(60_000) });
};
