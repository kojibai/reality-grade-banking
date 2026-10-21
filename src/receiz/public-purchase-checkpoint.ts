import {assetPagePath} from './public-asset-page';
import type {PublicAssetTradeIntent} from './public-asset-trade';
import type {CardCheckout} from './card-deposit';
export interface PublicPurchaseCheckpoint {itemId: string; side: 'buy'; title: string; sessionId: string; amountUsdCents: string; view: 'deposit' | 'trade';}
const key = 'bankeiz.public-purchase-context.v1';
const sessionPattern = /^cs_[a-zA-Z0-9_]{8,200}$/;
function valid(input: unknown): input is PublicPurchaseCheckpoint {
  if (!input || typeof input !== 'object') return false;
  if (Object.keys(input).sort().join('|') !== 'amountUsdCents|itemId|sessionId|side|title|view') return false;
  const value = input as PublicPurchaseCheckpoint;
  return typeof value.itemId === 'string' && value.itemId.length > 0 && value.itemId.length <= 256 && !/[\x00-\x1f\x7f]/.test(value.itemId) && !value.itemId.startsWith('sports:') && value.side === 'buy'
    && typeof value.title === 'string' && value.title.length <= 4096 && typeof value.sessionId === 'string' && sessionPattern.test(value.sessionId)
    && typeof value.amountUsdCents === 'string' && /^[1-9]\d{0,7}$/.test(value.amountUsdCents) && BigInt(value.amountUsdCents) >= 50n && BigInt(value.amountUsdCents) <= 10_000_000n && ['deposit', 'trade'].includes(value.view);
}
function read(): PublicPurchaseCheckpoint[] {
  try {const raw = sessionStorage.getItem(key); if (!raw || raw.length > 48_000) return []; const values: unknown = JSON.parse(raw); return Array.isArray(values) && values.length <= 8 ? values.filter(valid) : [];} catch {return [];}
}
/** Public UI context only. Native device custody remains the sole checkout,
 * account, credit and trade authority; no secret or credential is stored here. */
export function retainPublicPurchase(intent: PublicAssetTradeIntent, checkout: Pick<CardCheckout, 'sessionId' | 'amountUsdCents'>, view: PublicPurchaseCheckpoint['view']): void {
  const value = {itemId: intent.itemId, side: intent.side, title: intent.title, sessionId: checkout.sessionId, amountUsdCents: checkout.amountUsdCents, view};
  if (!valid(value)) return;
  try {sessionStorage.setItem(key, JSON.stringify([...read().filter(item => item.sessionId !== value.sessionId), value].slice(-8))); dispatchEvent(new Event('bankeiz:public-purchase-checkpoint'));} catch { /* Native checkout recovery remains available without this optional UI context. */ }
}
export function publicPurchaseReturnLink(sessionId: string): string | null {
  const value = read().find(item => item.sessionId === sessionId);
  return value ? assetPagePath(value.itemId) + '#resumeCardSession=' + encodeURIComponent(value.sessionId) : null;
}
export function publicPurchaseAtLocation(): PublicPurchaseCheckpoint | null {
  const fragment = new URLSearchParams(location.hash.slice(1)), session = fragment.get('resumeCardSession');
  if (fragment.has('resumeCardSession') && (fragment.size !== 1 || !sessionPattern.test(session ?? ''))) return null;
  const values = read().filter(item => assetPagePath(item.itemId) === location.pathname);
  return session ? values.find(item => item.sessionId === session) ?? null : values.at(-1) ?? null;
}
export function publicPurchaseBudget(value: Pick<PublicPurchaseCheckpoint, 'amountUsdCents'>): string {
  const cents = BigInt(value.amountUsdCents); return `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;
}
