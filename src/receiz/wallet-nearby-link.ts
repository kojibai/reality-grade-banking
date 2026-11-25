import { BANK_PUBLIC_ORIGIN } from './config';
import { walletPaymentLinkCapacity } from './payment-qr';

export const nearbyPaymentHashPrefix = '#account/receive/payment/';
const prefix = `${BANK_PUBLIC_ORIGIN}/${nearbyPaymentHashPrefix}`;
const maxTokenLength = walletPaymentLinkCapacity - prefix.length;

export function nearbyPaymentLink(bytes: Uint8Array): string | null {
  if (!bytes.length || Math.ceil(bytes.length * 4 / 3) > maxTokenLength) return null;
  return prefix + btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

export function nearbyPaymentLinkToken(hash: string): string | null {
  if (!hash.startsWith(nearbyPaymentHashPrefix)) return null;
  const token = hash.slice(nearbyPaymentHashPrefix.length);
  return token.length <= maxTokenLength && token.length % 4 !== 1 && /^[A-Za-z0-9_-]+$/u.test(token) ? token : null;
}

export function nearbyPaymentLinkBytes(token: string): Uint8Array | null {
  if (nearbyPaymentLinkToken(nearbyPaymentHashPrefix + token) !== token) return null;
  try {
    const bytes = Uint8Array.from(atob(token.replaceAll('-', '+').replaceAll('_', '/')), character => character.charCodeAt(0));
    return nearbyPaymentLink(bytes) === prefix + token ? bytes : null;
  } catch {
    return null;
  }
}

export function readNearbyPaymentLink(value: string): Uint8Array | null {
  if (!value.startsWith(prefix)) return null;
  return nearbyPaymentLinkBytes(value.slice(prefix.length));
}
