import { digestReceizAuthority } from './authorityEncoding.js';
import { deriveReceizIdentityKeyIdFromPublicKeyRawB64u, receizBase64UrlDecode, receizBase64UrlEncode,
  verifyReceizIdentityPublicKeyProjectionSignature, type ReceizIdentityLoginProof } from './identity.js';
import { canonicalizeReceizV122, digestReceizCanonicalV122 } from './v122Canonical.js';
import { verifyReceizWalletPlatformAttestationAtIssuance } from './offlineNotePlatformAttestation.js';
import { verifyReceizOfflineNoteRollbackConformanceEvidence, type ReceizOfflineNoteRollbackConformanceEvidenceV1, type ReceizOfflineNoteRollbackAssertion } from './offlineNoteRollbackConformance.js';
import { verifyReceizOfflineNoteWebAuthnAssertion } from './offlineNoteWebAuthnCustody.js';
import type { ReceizSignatureV4RootPublicKey } from './verifier/signatureV4.js';

// Bounded once for admission and the nearby spend envelope preflight.
export const MAX_RECEIZ_FINANCIAL_WALLET_ASSERTION_BYTES = 32 * 1024;
const PROOF_DOMAIN = 'receiz.account-financial.wallet-web-authn.v1';
const SHARED_COUNTER_DOMAIN = 'receiz.account-financial.wallet-counter.v1';
const MAX_COUNTER = (1n << 32n) - 1n;
const DECIMAL = /^(0|[1-9][0-9]*)$/u;
function fail(): never { throw new TypeError('ACCOUNT_FINANCIAL_WALLET_CUSTODY_INVALID'); }
function staleAllocation(): never { throw new TypeError('ACCOUNT_FINANCIAL_WALLET_STALE_ALLOCATION'); }
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
type WalletAssertionKind = 'spend' | 'release' | 'receive';
export type ReceizFinancialWalletCounterHeader = Readonly<{
  kind: WalletAssertionKind;
  allocationId: string;
  commandSha256: string;
  ownerConsentSha256: string;
}>;
export type ReceizFinancialWalletCounterEvent = Readonly<{
  header: ReceizFinancialWalletCounterHeader;
  assertion: unknown;
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
  kind: WalletAssertionKind;
  sequence: string;
  command: unknown;
  ownerConsent: unknown;
}>): Promise<ReceizFinancialWalletCustodyChallenge> {
  const { binding, kind, sequence, command, ownerConsent } = input;
  if (!DECIMAL.test(sequence) || kind === 'spend' && sequence === '0' || kind === 'receive' && sequence !== '0') fail();
  const next = BigInt(binding.initialSignCount) + BigInt(sequence) + (kind === 'spend' ? 0n : 1n);
  if (next > MAX_COUNTER) fail();
  return walletChallengeAtCount(binding, kind, next.toString(), command, ownerConsent);
}

async function walletChallengeAtCount(binding: ReceizFinancialWalletCustodyBinding, kind: WalletAssertionKind,
  expectedSignCount: string, command: unknown, ownerConsent: unknown): Promise<ReceizFinancialWalletCustodyChallenge> {
  const digest = await digestReceizAuthority('transition', PROOF_DOMAIN, { kind, certificateDigest: binding.certificateDigest, expectedSignCount, command, ownerConsent });
  const challengeB64u = receizBase64UrlEncode(Uint8Array.from({ length: 32 }, (_, index) => Number.parseInt(digest.slice(index * 2, index * 2 + 2), 16)));
  return Object.freeze({ credentialIdB64u: binding.credentialIdB64u, challengeB64u, expectedSignCount });
}

async function sharedCounterChallenge(binding: ReceizFinancialWalletCustodyBinding, header: ReceizFinancialWalletCounterHeader, expectedSignCount: string) {
  const digest = await digestReceizAuthority('transition', SHARED_COUNTER_DOMAIN, {
    certificateDigest: binding.certificateDigest, expectedSignCount, header,
  });
  const challengeB64u = receizBase64UrlEncode(Uint8Array.from({ length: 32 }, (_, index) => Number.parseInt(digest.slice(index * 2, index * 2 + 2), 16)));
  return Object.freeze({ credentialIdB64u: binding.credentialIdB64u, challengeB64u, expectedSignCount });
}

async function prepareSharedWalletCounterCommand(
  binding: ReceizFinancialWalletCustodyBinding, kind: WalletAssertionKind,
  command: Readonly<{ allocationId: string }>, ownerConsent: unknown, signCount: string,
) {
  const header = Object.freeze({ kind, allocationId: command.allocationId,
    commandSha256: await digestReceizCanonicalV122(command), ownerConsentSha256: await digestReceizCanonicalV122(ownerConsent) });
  return { header, challenge: await sharedCounterChallenge(binding, header, signCount) };
}

/** A new receive carries no continuation of the recipient's existing balances.
 * Its exact signed counter becomes the new allocation's starting coordinate. */
export async function prepareReceizSharedWalletReceiveChallenge(input: Readonly<{
  binding: ReceizFinancialWalletCustodyBinding;
  offer: ReceizFinancialWalletReceiveOffer;
  ownerConsent: unknown;
  signCount: string;
}>) {
  const { binding, offer, ownerConsent, signCount } = structuredClone(input);
  receizFinancialWalletReceiveConsent(offer);
  if (typeof signCount !== 'string' || !DECIMAL.test(signCount) || BigInt(signCount) <= BigInt(binding.initialSignCount) || BigInt(signCount) >= MAX_COUNTER) fail();
  return prepareSharedWalletCounterCommand(binding, 'receive', offer, ownerConsent, signCount);
}

export async function prepareReceizSharedWalletCounterChallenge(input: Readonly<{
  binding: ReceizFinancialWalletCustodyBinding;
  kind: Exclude<WalletAssertionKind, 'receive'>;
  command: Readonly<{ allocationId:string }>;
  ownerConsent: unknown;
  lastSignCount: string;
  intervening: readonly ReceizFinancialWalletCounterEvent[];
}>) {
  const { binding, kind, command, ownerConsent, lastSignCount, intervening } = structuredClone(input);
  if (kind !== 'spend' && kind !== 'release') fail();
  const before = await verifyReceizFinancialWalletCounterContinuity({
    binding, allocationId: command.allocationId, lastSignCount, intervening,
  });
  return prepareSharedWalletCounterCommand(binding, kind, command, ownerConsent, String(BigInt(before) + 1n));
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

/** Identify an authenticated conflict with this allocation's expected head.
 * Historical proof admission continues to use the exact-counter verifier. */
export async function verifyReceizLiveFinancialWalletCustodyAssertion(
  binding: ReceizFinancialWalletCustodyBinding, challenge: ReceizFinancialWalletCustodyChallenge, input: unknown,
): Promise<ReceizOfflineNoteRollbackAssertion> {
  const assertion = structuredClone(input);
  try { return await verifyReceizFinancialWalletCustodyAssertion(binding, challenge, assertion); }
  catch (error) {
    const authenticatorData = (assertion as Partial<ReceizOfflineNoteRollbackAssertion> | null)?.authenticatorDataB64u;
    if (typeof authenticatorData !== 'string' || authenticatorData.length > MAX_RECEIZ_FINANCIAL_WALLET_ASSERTION_BYTES) throw error;
    const raw = receizBase64UrlDecode(authenticatorData);
    if (raw.byteLength < 37) throw error;
    const actual = new DataView(raw.buffer, raw.byteOffset + 33, 4).getUint32(0);
    if (actual === 0 || String(actual) === challenge.expectedSignCount) throw error;
    await verifyReceizFinancialWalletCustodyAssertion(binding, { ...challenge, expectedSignCount: String(actual) }, assertion);
    staleAllocation();
  }
}

/** Prove that every counter since the caller's verified Wallet head was
 * consumed by an operation other than a spend or release of this balance.
 * The anchor count comes from admitted Source custody, not the witness. */
export async function verifyReceizFinancialWalletCounterContinuity(input: Readonly<{
  binding: ReceizFinancialWalletCustodyBinding;
  allocationId: string;
  lastSignCount: string;
  intervening: readonly ReceizFinancialWalletCounterEvent[];
}>, options?: Readonly<{ reportStaleAllocation: true }>): Promise<string> {
  const { binding, allocationId, lastSignCount, intervening } = structuredClone(input);
  const hash = /^[a-f0-9]{64}$/u;
  if (!hash.test(allocationId) || !DECIMAL.test(lastSignCount) || !Array.isArray(intervening)
    || intervening.length > 64) fail();
  let count = BigInt(lastSignCount);
  if (!DECIMAL.test(binding.initialSignCount) || count < BigInt(binding.initialSignCount)
    || count + BigInt(intervening.length) >= MAX_COUNTER) fail();
  for (const event of intervening) {
    exact(event, ['header', 'assertion']);
    const { header, assertion } = event;
    exact(header, ['kind', 'allocationId', 'commandSha256', 'ownerConsentSha256']);
    if (!['receive','spend','release'].includes(header.kind)
      || ![header.allocationId,header.commandSha256,header.ownerConsentSha256].every(value=>typeof value==='string'&&hash.test(value))) fail();
    count += 1n;
    const challenge = await sharedCounterChallenge(binding, header, count.toString());
    await verifyReceizFinancialWalletCustodyAssertion(binding, challenge, assertion);
    if (header.kind !== 'receive' && header.allocationId === allocationId) {
      if (options?.reportStaleAllocation) staleAllocation();
      fail();
    }
  }
  return count.toString();
}

/** Reserve one exact receive offer under verified enrollment. Subsequent
 * spending starts from the signed receive counter for this allocation. */
export async function verifyReceizFinancialWalletRecipientAcceptance(input: Readonly<{
  binding: ReceizFinancialWalletCustodyBinding;
  offer: ReceizFinancialWalletReceiveOffer;
  identity: Readonly<{ keyId: string; alg: 'Ed25519' | 'P-256'; publicKeyRawB64u: string }>;
  ownerConsent: ReceizIdentityLoginProof;
  assertion: unknown;
  signCount?: string;
}>): Promise<ReceizFinancialWalletCustodyBinding> {
  if (!freshlyVerifiedBindings.has(input.binding)) fail();
  const { binding, offer, identity, ownerConsent, assertion, signCount } = structuredClone(input);
  await verifyReceizFinancialWalletReceiveOwner({ certificateDigest: binding.certificateDigest, offer, identity, ownerConsent });
  const challenge = signCount === undefined
    ? await prepareReceizFinancialWalletCustodyChallenge({ binding, kind:'receive', sequence:'0', command:offer, ownerConsent })
    : (await prepareReceizSharedWalletReceiveChallenge({ binding, offer, ownerConsent, signCount })).challenge;
  if (BigInt(challenge.expectedSignCount) >= MAX_COUNTER) fail();
  await verifyReceizFinancialWalletCustodyAssertion(binding, challenge, assertion);
  return Object.freeze({ ...binding, initialSignCount: challenge.expectedSignCount });
}


/** Owner approval is shared by the available hardware custody providers. */
export async function verifyReceizFinancialWalletReceiveOwner(input: Readonly<{
  certificateDigest: string;
  offer: ReceizFinancialWalletReceiveOffer;
  identity: Readonly<{ keyId: string; alg: 'Ed25519' | 'P-256'; publicKeyRawB64u: string }>;
  ownerConsent: ReceizIdentityLoginProof;
}>) {
  const { offer, identity, ownerConsent } = input;
  const challengeText = receizFinancialWalletReceiveConsent(offer);
  const challengeB64Url = receizBase64UrlEncode(new TextEncoder().encode(challengeText));
  exact(ownerConsent, ['schema', 'keyId', 'alg', 'challengeB64Url', 'signatureB64Url']);
  if (identity.keyId !== offer.recipientKeyId || input.certificateDigest !== offer.recipientCredentialCertificateDigest
    || ownerConsent.schema !== 'receiz.identity.login_proof.v1'
    || ownerConsent.keyId !== identity.keyId || ownerConsent.alg !== identity.alg || ownerConsent.challengeB64Url !== challengeB64Url
    || await deriveReceizIdentityKeyIdFromPublicKeyRawB64u(identity.publicKeyRawB64u, identity.alg) !== identity.keyId
    || !await verifyReceizIdentityPublicKeyProjectionSignature({ ...identity, challengeB64Url, signatureB64Url: ownerConsent.signatureB64Url })) fail();
}
