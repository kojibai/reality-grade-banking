import type { ReceizIdentityPublicBinding, ReceizPortableSealedArtifactV124 } from '@receiz/sdk';
import { loadReceiz } from './client';
import { BANK_APPLICATION_ID } from './config';
import { ACCOUNT_PROOF_EXPORT_AGE_PULSES, ACCOUNT_PROOF_MAX_BYTES, ACCOUNT_PROOF_WRITERS } from './account-proof-policy';

export interface AccountProofTransaction {
  sequence: number; transactionId: string; eventDigest: string; previousEventDigest: string; kaiUPulse: string;
  kind: string; description: string; reserveDeltaUsdCents: string; settlementDeltaPhiMicro: string;
}
export interface AccountStatement {
  schema: 'bankeiz.public-account-statement.v1'; applicationId: string;
  account: { receizId: string; keyId: string; alg: 'Ed25519' | 'P-256'; publicKeyRawB64u: string };
  checkpoint: { accountHead: string; identityBindingDigest: string; genesisHead: string; historyHead: string;
    transactionCount: number; kaiUPulse: string; reserveUsdCents: string; settlementPhiMicro: string; historyDigest: string };
  transactions: readonly AccountProofTransaction[];
}
export interface VerifiedAccountProof { readonly statement: AccountStatement; readonly sourceDigest: string; readonly writer: string; }
const held = new WeakMap<VerifiedAccountProof, Uint8Array>();
export function isVerifiedAccountProof(value: unknown): value is VerifiedAccountProof { return !!value && typeof value === 'object' && held.has(value as VerifiedAccountProof); }
const digest = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/u.test(v);
const unsigned = (v: unknown): v is string => typeof v === 'string' && /^(0|[1-9]\d{0,39})$/u.test(v);
const signed = (v: unknown): v is string => typeof v === 'string' && /^(0|-?[1-9]\d{0,39})$/u.test(v);
const text = (v: unknown, limit = 512): v is string => typeof v === 'string' && v.length > 0 && v.length <= limit && !/[\x00-\x1f\x7f]/u.test(v);
function fail(code = 'INVALID'): never { throw Error(`ACCOUNT_PROOF_${code}`); }
function record(v: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).length !== keys.length || !keys.every(key => Object.hasOwn(v, key))) fail('PRIVATE_OR_UNSUPPORTED_FIELDS');
  return v as Record<string, unknown>;
}
function freeze<T>(v: T): T { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; }

/** Shape/reconciliation inspection only. Calling this does NOT verify a source,
 * admit identity, establish completeness, or create an exportable handle. */
export function inspectAccountStatement(input: unknown): AccountStatement {
  const v = record(input, ['schema', 'applicationId', 'account', 'checkpoint', 'transactions']);
  if (v.schema !== 'bankeiz.public-account-statement.v1' || v.applicationId !== BANK_APPLICATION_ID) fail('APPLICATION_MISMATCH');
  const a = record(v.account, ['receizId', 'keyId', 'alg', 'publicKeyRawB64u']);
  if (!text(a.receizId, 128) || !/^[a-z0-9][a-z0-9._-]*\.receiz\.id$/u.test(a.receizId) || !digest(a.keyId) || !['Ed25519', 'P-256'].includes(String(a.alg)) || !text(a.publicKeyRawB64u, 256) || !/^[A-Za-z0-9_-]+$/u.test(a.publicKeyRawB64u)) fail('IDENTITY_INVALID');
  const c = record(v.checkpoint, ['accountHead', 'identityBindingDigest', 'genesisHead', 'historyHead', 'transactionCount', 'kaiUPulse', 'reserveUsdCents', 'settlementPhiMicro', 'historyDigest']);
  if (![c.accountHead, c.identityBindingDigest, c.genesisHead, c.historyHead, c.historyDigest].every(digest) || !unsigned(c.kaiUPulse) || c.kaiUPulse.length > 30 || !unsigned(c.reserveUsdCents) || !unsigned(c.settlementPhiMicro)) fail('CHECKPOINT_INVALID');
  if (!Array.isArray(v.transactions) || v.transactions.length > 100_000 || c.transactionCount !== v.transactions.length) fail('HISTORY_INCOMPLETE');
  let previous = c.genesisHead, time = 0n, reserve = 0n, settlement = 0n;
  const ids = new Set<string>(), digests = new Set<string>();
  for (let index = 0; index < v.transactions.length; index++) {
    const t = record(v.transactions[index], ['sequence', 'transactionId', 'eventDigest', 'previousEventDigest', 'kaiUPulse', 'kind', 'description', 'reserveDeltaUsdCents', 'settlementDeltaPhiMicro']);
    if (t.sequence !== index + 1 || !text(t.transactionId, 256) || !digest(t.eventDigest) || t.previousEventDigest !== previous || !unsigned(t.kaiUPulse) || t.kaiUPulse.length > 30 || BigInt(t.kaiUPulse) < time || BigInt(t.kaiUPulse) > BigInt(c.kaiUPulse) || ids.has(t.transactionId) || digests.has(t.eventDigest) || t.eventDigest === c.genesisHead || !text(t.kind, 64) || !text(t.description) || !signed(t.reserveDeltaUsdCents) || !signed(t.settlementDeltaPhiMicro)) fail('HISTORY_INVALID');
    reserve += BigInt(t.reserveDeltaUsdCents); settlement += BigInt(t.settlementDeltaPhiMicro);
    if (reserve < 0n || settlement < 0n) fail('BALANCE_MISMATCH');
    ids.add(t.transactionId); digests.add(t.eventDigest); previous = t.eventDigest; time = BigInt(t.kaiUPulse);
  }
  if (previous !== c.historyHead || reserve !== BigInt(c.reserveUsdCents) || settlement !== BigInt(c.settlementPhiMicro)) fail('BALANCE_MISMATCH');
  return freeze(structuredClone(input)) as AccountStatement;
}
function parseWire(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > ACCOUNT_PROOF_MAX_BYTES) fail('CAPACITY');
  let value: unknown; try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { fail(); }
  const wire = record(value, ['schema', 'sdkVersion', 'source']);
  if (wire.schema !== 'bankeiz.account-proof.v1' || wire.sdkVersion !== '129.0.0') fail('UNSUPPORTED');
  const s = record(wire.source, ['schema', 'exactBytesB64u', 'filename', 'mimeType', 'artifactSha256', 'payloadSha256']);
  if (s.schema !== 'receiz.sealed-artifact-bytes.v124' || !text(s.filename, 240) || /[/\\]/u.test(s.filename) || !text(s.mimeType, 160) || !digest(s.artifactSha256) || !digest(s.payloadSha256) || typeof s.exactBytesB64u !== 'string' || !/^[A-Za-z0-9_-]+$/u.test(s.exactBytesB64u) || s.exactBytesB64u.length > ACCOUNT_PROOF_MAX_BYTES) fail();
  return s as unknown as ReceizPortableSealedArtifactV124;
}
/** Actual v129 canonical native opening. No custom verifier, trust roots, owner,
 * cached balance, or verified:true field can be supplied by the source. */
export async function verifyAccountProof(file: File, expected?: Pick<ReceizIdentityPublicBinding, 'keyId' | 'artifactOwnerReceizId'>): Promise<VerifiedAccountProof> {
  if (!file.size || file.size > ACCOUNT_PROOF_MAX_BYTES) fail('CAPACITY');
  const bytes = new Uint8Array(await file.arrayBuffer()), source = parseWire(bytes), sdk = await loadReceiz();
  const exact = sdk.receizBase64UrlDecode(source.exactBytesB64u);
  if (sdk.receizBase64UrlEncode(exact) !== source.exactBytesB64u) fail();
  const opened = await sdk.createReceizClient().artifacts.verifyAndOpen(new File([new Uint8Array(exact)], source.filename, { type: source.mimeType }));
  if (opened.sealedArtifact.kind !== 'receiz.native-record-seal' || opened.sealedArtifact.artifactSha256 !== source.artifactSha256 || opened.verifiedPayload.sha256 !== source.payloadSha256) fail('SOURCE_MISMATCH');
  const writer = opened.sealedArtifact.continuity.ownerReceizId;
  if (!writer || !ACCOUNT_PROOF_WRITERS.includes(writer)) fail('WRITER_NOT_PINNED');
  let payload: unknown; try { payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(opened.verifiedPayload.bytes)); } catch { fail(); }
  const statement = inspectAccountStatement(payload);
  if (await sdk.deriveReceizIdentityKeyIdFromPublicKeyRawB64u(statement.account.publicKeyRawB64u, statement.account.alg) !== statement.account.keyId) fail('IDENTITY_INVALID');
  if (await sdk.digestReceizCanonicalV122(statement.account) !== statement.checkpoint.identityBindingDigest) fail('IDENTITY_BINDING_MISMATCH');
  if (expected && (statement.account.keyId !== expected.keyId || statement.account.receizId !== expected.artifactOwnerReceizId)) fail('OWNER_MISMATCH');
  if (await sdk.digestReceizCanonicalV122(statement.transactions) !== statement.checkpoint.historyDigest) fail('HISTORY_DIGEST_MISMATCH');
  const now = BigInt(sdk.receizKaiNow().uPulse);
  if (BigInt(statement.checkpoint.kaiUPulse) > now) fail('FUTURE_SOURCE');
  const verified = Object.freeze({ statement, sourceDigest: source.artifactSha256, writer });
  held.set(verified, new Uint8Array(bytes)); return verified;
}
export async function exportAccountProof(proof: VerifiedAccountProof): Promise<{ bytes: Uint8Array; filename: string }> {
  const bytes = held.get(proof); if (!bytes) fail('VERIFIED_SOURCE_REQUIRED');
  const sdk = await loadReceiz(), age = BigInt(sdk.receizKaiNow().uPulse) - BigInt(proof.statement.checkpoint.kaiUPulse);
  if (age < 0n || age > ACCOUNT_PROOF_EXPORT_AGE_PULSES * 1_000_000n) fail('REFRESH_REQUIRED');
  return { bytes: new Uint8Array(bytes), filename: `bankeiz-account-proof-${proof.sourceDigest.slice(0, 16)}.json` };
}
export const accountProofSourceConfigured = () => ACCOUNT_PROOF_WRITERS.length > 0;
