import { digestReceizAuthority } from './authorityEncoding.js';
import { deriveReceizIdentityKeyIdFromPublicKeyRawB64u, receizBase64UrlDecode, receizBase64UrlEncode,
  verifyReceizIdentityPublicKeyProjectionSignature, type ReceizIdentityLoginProof } from './identity.js';
import { canonicalizeReceizV122 } from './v122Canonical.js';
import { verifyReceizWalletPlatformAttestationAtIssuance } from './offlineNotePlatformAttestation.js';
import { verifyReceizOfflineNoteRollbackConformanceEvidence, type ReceizOfflineNoteRollbackConformanceEvidenceV1, type ReceizOfflineNoteRollbackAssertion } from './offlineNoteRollbackConformance.js';
import { verifyReceizOfflineNoteWebAuthnAssertion } from './offlineNoteWebAuthnCustody.js';
import type { ReceizSignatureV4RootPublicKey } from './verifier/signatureV4.js';

// Bounded once for admission and the nearby spend envelope preflight.
export const MAX_RECEIZ_FINANCIAL_WALLET_ASSERTION_BYTES = 32 * 1024;
const PROOF_DOMAIN = 'receiz.account-financial.wallet-web-authn.v1';
const MAX_COUNTER = (1n << 32n) - 1n;
const DECIMAL = /^(0|[1-9][0-9]*)$/u;
function fail(): never { throw new TypeError('ACCOUNT_FINANCIAL_WALLET_CUSTODY_INVALID'); }
function exact(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== keys.length
    || keys.some(key => !Object.hasOwn(value, key))) fail();
  return value as Record<string, unknown>;
}

export type ReceizFinancialWalletCustodyBinding = Readonly<{
  certificateDigest: string;
  credentialIdB64u: string;
  custodyPublicKeyRawB64u: string;
  origin: string;
  rpId: string;
  initialSignCount: string;
}>;
const freshlyVerifiedBindings = new WeakSet<ReceizFinancialWalletCustodyBinding>();
export type ReceizFinancialWalletCustodyChallenge = Readonly<{
  credentialIdB64u: string;
  challengeB64u: string;
  expectedSignCount: string;
}>;
export type ReceizFinancialWalletReceiveOffer = Readonly<{
  applicationId: string;
  sourceArtifactSha256: string;
  allocationId: string;
  recipientUserId: string;
  conversationId: string;
  recipientKeyId: string;
  recipientCredentialCertificateDigest: string;
  recipientRecordSignerPublicKey: string;
  amountUsdCents: string;
}>;

export function receizFinancialWalletReceiveConsent(offer: ReceizFinancialWalletReceiveOffer): string {
  exact(offer, ['applicationId', 'sourceArtifactSha256', 'allocationId', 'recipientUserId', 'conversationId', 'recipientKeyId',
    'recipientCredentialCertificateDigest', 'recipientRecordSignerPublicKey', 'amountUsdCents']);
  const hash = /^[a-f0-9]{64}$/u;
  if (![offer.sourceArtifactSha256, offer.allocationId, offer.recipientKeyId, offer.recipientCredentialCertificateDigest]
    .every(value => typeof value === 'string' && hash.test(value))
    || typeof offer.recipientRecordSignerPublicKey !== 'string' || !/^[A-Za-z0-9_-]{43}$/u.test(offer.recipientRecordSignerPublicKey)
    || receizBase64UrlEncode(receizBase64UrlDecode(offer.recipientRecordSignerPublicKey)) !== offer.recipientRecordSignerPublicKey
    || typeof offer.applicationId !== 'string' || !/^[a-zA-Z0-9_.:-]{3,240}$/u.test(offer.applicationId)
    || ![offer.recipientUserId, offer.conversationId].every(value => typeof value === 'string'
      && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/u.test(value))
    || typeof offer.amountUsdCents !== 'string' || !/^[1-9][0-9]{0,18}$/u.test(offer.amountUsdCents)
    || BigInt(offer.amountUsdCents) > (1n << 63n) - 1n) fail();
  return 'receiz.account-financial.wallet-receive-consent.v1\0' + canonicalizeReceizV122(offer);
}

/** The custody provider may report this only when the attempt ended without
 * issuing an assertion or advancing the credential counter. A lost reply,
 * transport error, or an otherwise ambiguous outcome must use a different error. */
export class ReceizFinancialWalletCustodyCancelledBeforeAssertion extends Error {
  constructor() {
    super('ACCOUNT_FINANCIAL_WALLET_CUSTODY_CANCELLED_BEFORE_ASSERTION');
    this.name = 'ReceizFinancialWalletCustodyCancelledBeforeAssertion';
  }
}

/** A credential's counter is shared by its registrations and certificates.
 * Derive one stable coordinate per key and one per relying-party credential. */
export async function receizFinancialWalletCredentialClaims(binding: ReceizFinancialWalletCustodyBinding) {
  const key = receizBase64UrlEncode(receizBase64UrlDecode(binding.custodyPublicKeyRawB64u));
  const id = receizBase64UrlEncode(receizBase64UrlDecode(binding.credentialIdB64u));
  const [publicKey, registration] = await Promise.all([
    digestReceizAuthority('identity', 'receiz.account-financial.wallet-custody-key.v1', { key }),
    digestReceizAuthority('identity', 'receiz.account-financial.wallet-registration.v1', { rpId: binding.rpId, credentialId: id }),
  ]);
  return Object.freeze({ publicKey, registration });
}

/** Reuse the registered platform credential and its witnessed counter. The
 * signed Wallet allocation binds both facts, independently of any Note. */
export async function verifyReceizFinancialWalletCustodyBinding(input: unknown, options: Readonly<{
  roots: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
  fundedAtKaiUPulse: string;
}>): Promise<ReceizFinancialWalletCustodyBinding> {
  const value = exact(input, ['platformAttestationCertificate', 'rollbackConformanceEvidence']);
  const opening = value.platformAttestationCertificate as Readonly<{ rpId?: unknown; origin?: unknown; custodyPublicKeyRawB64u?: unknown }> | undefined;
  if (typeof opening?.rpId !== 'string' || typeof opening.origin !== 'string' || typeof opening.custodyPublicKeyRawB64u !== 'string') fail();
  const certificate = await verifyReceizWalletPlatformAttestationAtIssuance(opening, {
    roots: options.roots, expectedRpId: opening.rpId, expectedOrigin: opening.origin, expectedCustodyPublicKeyRawB64u: opening.custodyPublicKeyRawB64u,
  });
  if (BigInt(certificate.issuedAtKai) > BigInt(options.fundedAtKaiUPulse) / 1_000_000n) fail();
  const { certificateDigest, credentialIdB64u, custodyPublicKeyRawB64u, origin, rpId, registrationCounter } = certificate;
  const hostname = new URL(origin).hostname;
  if (hostname !== rpId && !hostname.endsWith('.' + rpId)) fail();
  const evidence = await verifyReceizOfflineNoteRollbackConformanceEvidence({
    evidence: value.rollbackConformanceEvidence as ReceizOfflineNoteRollbackConformanceEvidenceV1,
    credential: { credentialIdB64u, custodyPublicKeyRawB64u, origin, rpId }, registrationCounter,
  });
  if (BigInt(evidence.conformedStateSequence) >= MAX_COUNTER) fail();
  const binding = Object.freeze({ certificateDigest, credentialIdB64u, custodyPublicKeyRawB64u, origin, rpId, initialSignCount: evidence.conformedStateSequence });
  freshlyVerifiedBindings.add(binding);
  return binding;
}

/** The challenge commits to the exact successor command and owner consent.
 * The command includes the allocation, predecessor, movement and signed Kai. */
export async function prepareReceizFinancialWalletCustodyChallenge(input: Readonly<{
  binding: ReceizFinancialWalletCustodyBinding;
  kind: 'spend' | 'release' | 'receive';
  sequence: string;
  command: unknown;
  ownerConsent: unknown;
}>): Promise<ReceizFinancialWalletCustodyChallenge> {
  const { binding, kind, sequence, command, ownerConsent } = input;
  if (!DECIMAL.test(sequence) || kind === 'spend' && sequence === '0' || kind === 'receive' && sequence !== '0') fail();
  const next = BigInt(binding.initialSignCount) + BigInt(sequence) + (kind === 'spend' ? 0n : 1n);
  if (next > MAX_COUNTER) fail();
  const expectedSignCount = next.toString();
  const digest = await digestReceizAuthority('transition', PROOF_DOMAIN, { kind, certificateDigest: binding.certificateDigest, expectedSignCount, command, ownerConsent });
  const challengeB64u = receizBase64UrlEncode(Uint8Array.from({ length: 32 }, (_, index) => Number.parseInt(digest.slice(index * 2, index * 2 + 2), 16)));
  return Object.freeze({ credentialIdB64u: binding.credentialIdB64u, challengeB64u, expectedSignCount });
}

export async function verifyReceizFinancialWalletCustodyAssertion(
  binding: ReceizFinancialWalletCustodyBinding, challenge: ReceizFinancialWalletCustodyChallenge, input: unknown,
): Promise<ReceizOfflineNoteRollbackAssertion> {
  const assertion = exact(input, ['authenticatorDataB64u', 'clientDataJSONB64u', 'signatureB64u']);
  if (!Object.values(assertion).every(value => typeof value === 'string' && /^[A-Za-z0-9_-]+$/u.test(value))
    || challenge.credentialIdB64u !== binding.credentialIdB64u
    || JSON.stringify(assertion).length > MAX_RECEIZ_FINANCIAL_WALLET_ASSERTION_BYTES) fail();
  const verifiedAssertion = assertion as ReceizOfflineNoteRollbackAssertion;
  try {
    await verifyReceizOfflineNoteWebAuthnAssertion({ ...verifiedAssertion, custodyPublicKeyRawB64u: binding.custodyPublicKeyRawB64u,
      origin: binding.origin, rpId: binding.rpId, challengeB64u: challenge.challengeB64u, expectedSignCount: challenge.expectedSignCount });
  } catch { fail(); }
  return Object.freeze(structuredClone(verifiedAssertion));
}

/** The first assertion reserves a fresh recipient credential for one exact
 * predecessor. Subsequent spending starts from the signed receive counter. The
 * caller supplies the recipient's already-admitted account and device binding. */
export async function verifyReceizFinancialWalletRecipientAcceptance(input: Readonly<{
  binding: ReceizFinancialWalletCustodyBinding;
  offer: ReceizFinancialWalletReceiveOffer;
  identity: Readonly<{ keyId: string; alg: 'Ed25519' | 'P-256'; publicKeyRawB64u: string }>;
  ownerConsent: ReceizIdentityLoginProof;
  assertion: unknown;
}>): Promise<ReceizFinancialWalletCustodyBinding> {
  if (!freshlyVerifiedBindings.has(input.binding)) fail();
  const { binding, offer, identity, ownerConsent, assertion } = structuredClone(input);
  const challengeText = receizFinancialWalletReceiveConsent(offer);
  const challengeB64Url = receizBase64UrlEncode(new TextEncoder().encode(challengeText));
  exact(ownerConsent, ['schema', 'keyId', 'alg', 'challengeB64Url', 'signatureB64Url']);
  if (identity.keyId !== offer.recipientKeyId || binding.certificateDigest !== offer.recipientCredentialCertificateDigest
    || ownerConsent.schema !== 'receiz.identity.login_proof.v1'
    || ownerConsent.keyId !== identity.keyId || ownerConsent.alg !== identity.alg || ownerConsent.challengeB64Url !== challengeB64Url
    || await deriveReceizIdentityKeyIdFromPublicKeyRawB64u(identity.publicKeyRawB64u, identity.alg) !== identity.keyId
    || !await verifyReceizIdentityPublicKeyProjectionSignature({ ...identity, challengeB64Url, signatureB64Url: ownerConsent.signatureB64Url })) fail();
  const challenge = await prepareReceizFinancialWalletCustodyChallenge({ binding, kind: 'receive', sequence: '0', command: offer, ownerConsent });
  if (BigInt(challenge.expectedSignCount) >= MAX_COUNTER) fail();
  await verifyReceizFinancialWalletCustodyAssertion(binding, challenge, assertion);
  return Object.freeze({ ...binding, initialSignCount: challenge.expectedSignCount });
}
