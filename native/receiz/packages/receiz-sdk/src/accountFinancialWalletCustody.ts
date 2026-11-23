import { digestReceizAuthority } from './authorityEncoding.js';
import { receizBase64UrlDecode, receizBase64UrlEncode } from './identity.js';
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
export type ReceizFinancialWalletCustodyChallenge = Readonly<{
  credentialIdB64u: string;
  challengeB64u: string;
  expectedSignCount: string;
}>;

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
  return Object.freeze({ certificateDigest, credentialIdB64u, custodyPublicKeyRawB64u, origin, rpId, initialSignCount: evidence.conformedStateSequence });
}

/** The challenge commits to the exact successor command and owner consent.
 * The command includes the allocation, predecessor, movement and signed Kai. */
export async function prepareReceizFinancialWalletCustodyChallenge(input: Readonly<{
  binding: ReceizFinancialWalletCustodyBinding;
  kind: 'spend' | 'release';
  sequence: string;
  command: unknown;
  ownerConsent: unknown;
}>): Promise<ReceizFinancialWalletCustodyChallenge> {
  const { binding, kind, sequence, command, ownerConsent } = input;
  if (!DECIMAL.test(sequence) || kind === 'spend' && sequence === '0') fail();
  const next = BigInt(binding.initialSignCount) + BigInt(sequence) + (kind === 'release' ? 1n : 0n);
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
