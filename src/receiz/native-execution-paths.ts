import { isBankNativeApplicationId } from './config.js';

// The SDK carries its signed application coordinate in the query for these
// POSTs. This is routing permission only; the upstream SDK still admits the
// request, exact plan, participant sources and authority session separately.
export const NATIVE_EXECUTION_POST_PATHS: readonly string[] = Object.freeze([
  '/api/sdk/v1/execution/stage',
  '/api/sdk/v1/execution/execute',
  '/api/sdk/v1/execution/cancel',
  '/api/sdk/v1/identity/public-recipient/resolve',
  '/api/sdk/v1/domains/verified-additions',
  '/api/sdk/v1/domains/verified-replay',
  '/api/sdk/v1/domains/verified-checkpoint',
  '/api/sdk/v1/domains/verified-private-additions',
]);

function exactCoordinate(segment: string): boolean {
  try {
    const decoded = decodeURIComponent(segment);
    return decoded.length > 0 && decoded.length <= 256 && decoded !== '.' && decoded !== '..'
      && /^[A-Za-z0-9_.:!-]+$/.test(decoded) && encodeURIComponent(decoded) === segment;
  } catch { return false; }
}

export function permittedNativeExecutionRead(url: URL, method: string): boolean {
  if (method.toUpperCase() !== 'GET' || url.search) return false;
  const parts = url.pathname.split('/');
  if (parts.slice(0, 5).join('/') !== '/api/sdk/v1/execution') return false;
  if (parts[5] === 'by-idempotency') {
    return parts.length === 10 && isBankNativeApplicationId(parts[6]) && parts.slice(7).every(exactCoordinate);
  }
  return parts.length === 7 && isBankNativeApplicationId(parts[5]) && exactCoordinate(parts[6]);
}
