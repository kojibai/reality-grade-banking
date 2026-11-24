import {
  canonicalizeReceizV122,
  digestReceizCanonicalV122,
  receizBase64UrlEncode,
  verifyReceizIdentityPublicKeyProjectionSignature,
} from '@receiz/sdk';

const schema = 'receiz.bank.wallet-nearby-consent.v1';
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u;
const keyId = /^[a-f0-9]{64}$/u;
const publicKey = /^[A-Za-z0-9_-]{43,120}$/u;
const signature = /^[A-Za-z0-9_-]{86}$/u;
const exact = (value: unknown, keys: string[]): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

export type NearbyWalletSplit = Readonly<{conversationId: string; offlineUsdCents: string}>;
export type NearbyWalletConsent = Readonly<{
  schema: typeof schema;
  applicationId: string;
  senderUserId: string;
  recipientUserId: string;
  clientNonce: string;
  amountUsdCents: string;
  note: string | null;
  kaiUPulse: string;
  split?: NearbyWalletSplit;
  keyId: string;
  alg: 'Ed25519' | 'P-256';
  publicKeyRawB64u: string;
}>;
export type NearbyWalletPayment = NearbyWalletConsent & Readonly<{ signatureB64Url: string }>;

const fields = ['schema', 'applicationId', 'senderUserId', 'recipientUserId', 'clientNonce',
  'amountUsdCents', 'note', 'kaiUPulse', 'keyId', 'alg', 'publicKeyRawB64u'];
const invalid = () => Error('BANK_WALLET_NEARBY_CONSENT_INVALID');

export async function nearbyWalletConsentChallenge(consent: NearbyWalletConsent) {
  const digest = await digestReceizCanonicalV122(consent);
  return receizBase64UrlEncode(new TextEncoder().encode(schema + ':' + digest));
}

export async function verifyNearbyWalletPayment(input: unknown): Promise<NearbyWalletPayment> {
  const keys = [...fields, 'signatureB64Url'];
  if (!exact(input, keys) && !exact(input, [...keys, 'split'])) throw invalid();
  const { signatureB64Url, ...terms } = structuredClone(input);
  if (terms.schema !== schema || typeof terms.applicationId !== 'string' || !/^rc_[A-Za-z0-9_-]{1,128}$/u.test(terms.applicationId)
    || ![terms.senderUserId, terms.recipientUserId, terms.clientNonce].every(id => typeof id === 'string' && uuid.test(id))
    || terms.senderUserId === terms.recipientUserId
    || typeof terms.amountUsdCents !== 'string' || !/^[1-9][0-9]{0,17}$/u.test(terms.amountUsdCents)
    || Object.hasOwn(terms, 'split') && (!exact(terms.split, ['conversationId','offlineUsdCents'])
      || typeof terms.split.conversationId !== 'string' || !uuid.test(terms.split.conversationId)
      || terms.split.conversationId !== terms.clientNonce
      || typeof terms.split.offlineUsdCents !== 'string' || !/^[1-9][0-9]{0,17}$/u.test(terms.split.offlineUsdCents))
    || typeof terms.kaiUPulse !== 'string' || !/^[1-9][0-9]{0,19}$/u.test(terms.kaiUPulse)
    || terms.note !== null && (typeof terms.note !== 'string' || !terms.note || terms.note.length > 280
      || terms.note !== terms.note.replace(/\s+/gu, ' ').trim() || terms.note.startsWith('bank.sale.v1:'))
    || typeof terms.keyId !== 'string' || !keyId.test(terms.keyId)
    || terms.alg !== 'Ed25519' && terms.alg !== 'P-256'
    || typeof terms.publicKeyRawB64u !== 'string' || !publicKey.test(terms.publicKeyRawB64u)
    || typeof signatureB64Url !== 'string' || !signature.test(signatureB64Url)) throw invalid();
  const consent = terms as NearbyWalletConsent;
  if (!await verifyReceizIdentityPublicKeyProjectionSignature({
    keyId: consent.keyId, alg: consent.alg, publicKeyRawB64u: consent.publicKeyRawB64u,
    challengeB64Url: await nearbyWalletConsentChallenge(consent), signatureB64Url,
  })) throw invalid();
  return Object.freeze({ ...consent, signatureB64Url });
}

export async function signNearbyWalletPayment(
  terms: Omit<NearbyWalletConsent, 'schema'>,
  sign: (challengeB64Url: string) => Promise<{ signatureB64Url: string }>,
) {
  const consent = { ...terms, schema } as const;
  const { signatureB64Url } = await sign(await nearbyWalletConsentChallenge(consent));
  return verifyNearbyWalletPayment({ ...consent, signatureB64Url });
}

export const encodeNearbyWalletPayment = (payment: NearbyWalletPayment) =>
  new TextEncoder().encode(canonicalizeReceizV122(payment));

export function isNearbyWalletPayment(input: unknown): boolean {
  return !!input && typeof input === 'object' && 'schema' in input && input.schema === schema;
}
