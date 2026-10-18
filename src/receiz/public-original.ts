import { loadReceiz } from './client';
import { parsePublicMarket, rememberPublicOriginalLocators, retainedPublicOriginalUrl, safeReceizPublicUrl } from './public-market';
import { readPublicLedgerBytes } from './public-ledger-transfer';

/** Older public caches retain the download-sale URL. Resolve its current exact
 * public artifact before opening; a locator never replaces SDK verification. */
let shippedOriginalsRead = false;
export async function resolvePublicOriginalUrl(input: string, expectedDigest: string, signal?: AbortSignal): Promise<string> {
  signal?.throwIfAborted();
  const safe = safeReceizPublicUrl(input, 'original'); if (!safe) throw new Error('This original source is not supported.');
  const url = new URL(safe); if (url.pathname !== '/api/profile/originals/download') return safe;
  const id = url.searchParams.get('receizId')!;
  const retained = retainedPublicOriginalUrl(id, expectedDigest); if (retained) return retained;
  if (!shippedOriginalsRead) try {
    const seed = await fetch('/receiz-public-market.json', { credentials: 'omit', redirect: 'error', signal });
    if (seed.ok) {
      const bytes = await readPublicLedgerBytes(seed, 16 * 1024 * 1024);
      rememberPublicOriginalLocators(parsePublicMarket(JSON.parse(new TextDecoder().decode(bytes)))); shippedOriginalsRead = true;
    }
  } catch { signal?.throwIfAborted(); /* A missing public seed can be refreshed from discovery. */ }
  const shipped = retainedPublicOriginalUrl(id, expectedDigest); if (shipped) return shipped;
  const response = await fetch('/api/bank/public-market/membership', { credentials: 'omit', redirect: 'error', signal });
  if (!response.ok) throw new Error('The original source could not be refreshed. You can retry or inspect its source.');
  const bytes = await readPublicLedgerBytes(response, 16 * 1024 * 1024);
  const catalog = parsePublicMarket(JSON.parse(new TextDecoder().decode(bytes)));
  rememberPublicOriginalLocators(catalog);
  const original = catalog.items.find(item => item.assetId === id && item.originalDigest === expectedDigest.toLowerCase());
  if (!original?.originalUrl) throw new Error('This original does not match the current public source.');
  return original.originalUrl;
}

export async function verifyPublicOriginalBytes(bytes: Uint8Array, expectedDigest: string): Promise<{ digest: string; canClaimOwnership: false; canCreditValue: false }> {
  if (!/^[a-f0-9]{64}$/i.test(expectedDigest) || bytes.length > 64 * 1024 * 1024) throw new Error('Original verification exceeds the supported source boundary.');
  const { verifyReceizArtifact } = await loadReceiz(); const result = await verifyReceizArtifact(bytes);
  if (result.status !== 'verified-artifact') throw new Error('No verified original was obtained. Inspect the source for the canonical result.');
  if (result.artifactDigest.value.toLowerCase() !== expectedDigest.toLowerCase()) throw new Error('This original does not match the public source’s artifact digest.');
  return { digest: result.artifactDigest.value.toLowerCase(), canClaimOwnership: false, canCreditValue: false };
}
