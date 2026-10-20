import { loadReceiz } from './client';
import { BANK_APPLICATION_ID, isBankNativeApplicationId } from './config';
import { projectHeldDeposit } from './deposit-source';
import { inspectNoteProof } from './note-proof-portability';
import type { VerifiedAccountProof } from './account-proof';

export type ProofKind = 'owned-source' | 'received-original' | 'account-source' | 'execution-recovery' | 'note-image' | 'note-deposit' | 'payment-receipt' | 'asset-receipt';
export interface ProofSource { kind: ProofKind; filename: string; bytes: Uint8Array; }
export interface ProofSummary { kind: ProofKind; digest: string; filename: string; title: string; size: number; operationId?: string; participantCount?: number; }
export interface ProofReview { items: readonly ProofSummary[]; totalBytes: number; }
export interface ProofRetention { added: number; alreadyHeld: number; accountHistory?: 'restored' | 'retained'; }
export interface ProofLibrary {
  exportBackup(): Promise<{ bytes: Uint8Array; filename: string }>;
  inspect(file: File): Promise<ProofReview>;
  retain(review: ProofReview): Promise<ProofRetention>;
  list(): Promise<readonly ProofSummary[]>;
  exportProof(digest: string): Promise<{ bytes: Uint8Array; filename: string }>;
}
const MAX_SOURCE = 32 * 1024 * 1024, MAX_TOTAL = 64 * 1024 * 1024, MAX_WIRE = 90 * 1024 * 1024, MAX_COUNT = 1000;
const kinds: readonly ProofKind[] = ['owned-source', 'received-original', 'account-source', 'execution-recovery', 'note-image', 'note-deposit', 'payment-receipt', 'asset-receipt'];
const filename = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 240 && !/[\x00-\x1f\x7f/\\]/u.test(value);
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const exact = (v: Record<string, unknown>, fields: string[]) => Object.keys(v).length === fields.length && fields.every(key => Object.hasOwn(v, key));
const copy = (v: ProofSource): ProofSource => ({ kind: v.kind, filename: v.filename, bytes: new Uint8Array(v.bytes) });
const utf8 = (v: Uint8Array) => new TextDecoder('utf-8', { fatal: true }).decode(v);
function validateSource(source: ProofSource) {
  if (!kinds.includes(source.kind) || !filename(source.filename) || !source.bytes.length || source.bytes.length > MAX_SOURCE) throw Error('PROOF_SOURCE_INVALID');
}
export async function proofDigest(bytes: Uint8Array): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes)))].map(v => v.toString(16).padStart(2, '0')).join('');
}
export function createProofLibrary(input: {
  binding: { keyId: string; artifactOwnerReceizId: string };
  assertOpen(): void;
  readOwned(): Promise<ProofSource[]>;
  readArchive(): Promise<ProofSource[]>;
  readRecoveries(): Promise<ProofSource[]>;
  readNotes(): Promise<ProofSource[]>;
  readAccount?(): Promise<ProofSource[]>;
  commit(sources: ProofSource[]): Promise<ProofRetention>;
  restoreAccounts?(proofs: readonly VerifiedAccountProof[]): Promise<boolean>;
}): ProofLibrary {
  const binding = Object.freeze({ ...input.binding });
  const reviews = new WeakMap<ProofReview, { sources: readonly ProofSource[]; accounts: readonly VerifiedAccountProof[] }>();
  let busy = false;
  async function verify(source: ProofSource, accounts?: VerifiedAccountProof[], knownDigest?: string): Promise<ProofSummary> {
    input.assertOpen();
    validateSource(source);
    const sdk = await loadReceiz(), digest = knownDigest ?? await proofDigest(source.bytes);
    let title: string, extra: Pick<ProofSummary, 'operationId' | 'participantCount'> = {};
    if (source.kind === 'account-source') {
      const { verifyAccountProof } = await import('./account-proof');
      const proof = await verifyAccountProof(new File([new Uint8Array(source.bytes)], source.filename), binding);
      accounts?.push(proof);
      title = 'Verified account history';
    } else if (source.kind === 'owned-source') {
      const client = sdk.createReceizClient();
      const opened = await client.artifacts.verifyAndOpen(new File([new Uint8Array(source.bytes)], source.filename));
      if (opened.sealedArtifact.artifactSha256 !== digest) throw Error('PROOF_SOURCE_DIGEST_MISMATCH');
      let payload: unknown;
      try { payload = JSON.parse(utf8(opened.verifiedPayload.bytes)); } catch { /* An owned original may have a non-JSON payload. */ }
      if (object(payload) && payload.schema === 'receiz.bank.native-asset-holding.v1') {
        const { openNativeAssetHolding } = await import('./native-asset-holding');
        title = (await openNativeAssetHolding(source.bytes, source.filename, binding)).deposit.title;
      } else title = projectHeldDeposit(opened, source.bytes, source.filename, binding.artifactOwnerReceizId).title;
    } else if(source.kind==='received-original'){
      const opened=await sdk.createReceizClient().artifacts.verifyAndOpen(new File([new Uint8Array(source.bytes)],source.filename));
      if(opened.sealedArtifact.artifactSha256!==digest)throw Error('PROOF_SOURCE_DIGEST_MISMATCH');
      title=`Received original · ${opened.verifiedPayload.filename}`;
    } else if(source.kind==='payment-receipt'){
      const {verifyNativePaymentSource}=await import('./native-payment');const {receipt}=await verifyNativePaymentSource(JSON.parse(utf8(source.bytes)));
      if(receipt.review.keyId!==binding.keyId||receipt.review.request.actorReceizId!==binding.artifactOwnerReceizId)throw Error('PROOF_BACKUP_IDENTITY_MISMATCH');
      title=receipt.schema==='receiz.bank.native-payment-receipt.v1'?'Payment receipt':'Payment expiry proof';extra={operationId:receipt.review.request.requestId};
    } else if(source.kind==='asset-receipt'){
      const {verifyNativeAssetSource}=await import('./native-asset');const {receipt}=await verifyNativeAssetSource(JSON.parse(utf8(source.bytes)));
      if(receipt.review.keyId!==binding.keyId||receipt.review.request.actorReceizId!==binding.artifactOwnerReceizId)throw Error('PROOF_BACKUP_IDENTITY_MISMATCH');
      title=receipt.schema==='receiz.bank.native-asset-receipt.v1'?'Asset receipt':'Asset expiry proof';extra={operationId:receipt.review.request.requestId};
    } else if (source.kind === 'execution-recovery') {
      const recovery: unknown = JSON.parse(utf8(source.bytes));
      const applicationId = (recovery as import('@receiz/sdk').ReceizPortableExecutionTransitionRecoveryV124)?.transitionSet?.applicationId;
      if (!isBankNativeApplicationId(applicationId)) throw Error('PROOF_RECOVERY_APPLICATION_MISMATCH');
      await sdk.recoverReceizPortableExecutionTransitionSetV124(recovery, { audience: applicationId });
      // Read coordinates only after the complete enclosing sources recover.
      const value = recovery as import('@receiz/sdk').ReceizPortableExecutionTransitionRecoveryV124;
      const plan = value.transitionSet.members[0]?.operationPlan;
      if (!plan || plan.applicationId !== applicationId || !value.members.length) throw Error('PROOF_RECOVERY_APPLICATION_MISMATCH');
      title = 'Transaction recovery'; extra = { operationId: plan.attemptId, participantCount: value.members.length };
    } else {
      const note = await inspectNoteProof(source, binding.keyId);
      title = note.title;
    }
    input.assertOpen();
    return Object.freeze({ kind: source.kind, digest, filename: source.filename, title, size: source.bytes.length, ...extra });
  }
  async function admit(sources: ProofSource[]) {
    const summaries: ProofSummary[] = [], held: ProofSource[] = [], accounts: VerifiedAccountProof[] = [], seen = new Map<string, ProofKind>(); let total = 0;
    for (const raw of sources) {
      const source = copy(raw); validateSource(source);
      const digest = await proofDigest(source.bytes), prior = seen.get(digest);
      if (prior && prior !== source.kind) throw Error('PROOF_SOURCE_KIND_CONFLICT');
      if (!prior) {
        total += source.bytes.length;
        if (held.length >= MAX_COUNT || total > MAX_TOTAL) throw Error('PROOF_BACKUP_CAPACITY');
        const summary = await verify(source, accounts, digest); held.push(source); summaries.push(summary); seen.set(summary.digest, source.kind);
      }
    }
    return { held, summaries, accounts, totalBytes: held.reduce((n, value) => n + value.bytes.length, 0) };
  }
  async function exportBackup() {
    input.assertOpen();
    const sources = [...await input.readOwned(), ...await input.readArchive(), ...await input.readRecoveries(), ...await input.readNotes(), ...(await input.readAccount?.() ?? [])];
    const accepted = await admit(sources), sdk = await loadReceiz();
    const bytes = new TextEncoder().encode(JSON.stringify({ schema: 'bankeiz.proof-backup.v1', applicationId: BANK_APPLICATION_ID,
      keyId: binding.keyId, ownerReceizId: binding.artifactOwnerReceizId,
      sources: accepted.held.map((source, i) => ({ kind: source.kind, filename: source.filename, sha256: accepted.summaries[i].digest, bytesB64u: sdk.receizBase64UrlEncode(source.bytes) })) }));
    if (bytes.length > MAX_WIRE) throw Error('PROOF_BACKUP_CAPACITY');
    input.assertOpen(); return { bytes, filename: `bankeiz-proofs-${binding.keyId.slice(0, 12)}.json` };
  }
  async function inspect(file: File): Promise<ProofReview> {
    input.assertOpen(); if (!file.size || file.size > MAX_WIRE) throw Error('PROOF_BACKUP_CAPACITY');
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_WIRE) throw Error('PROOF_BACKUP_CAPACITY');
    let parsed: unknown; try { parsed = JSON.parse(utf8(bytes)); } catch { /* Native binary originals are verified below. */ }
    let sources: ProofSource[];
    if (object(parsed) && parsed.schema === 'bankeiz.proof-backup.v1') {
      if (!exact(parsed, ['schema', 'applicationId', 'keyId', 'ownerReceizId', 'sources']) || !isBankNativeApplicationId(parsed.applicationId)
        || parsed.keyId !== binding.keyId || parsed.ownerReceizId !== binding.artifactOwnerReceizId) throw Error('PROOF_BACKUP_IDENTITY_MISMATCH');
      if (!Array.isArray(parsed.sources) || parsed.sources.length > MAX_COUNT) throw Error('PROOF_BACKUP_CAPACITY');
      const sdk = await loadReceiz(); sources = []; let total = 0;
      for (const value of parsed.sources) {
        if (!object(value) || !exact(value, ['kind', 'filename', 'sha256', 'bytesB64u']) || !kinds.includes(value.kind as ProofKind)
          || !filename(value.filename) || typeof value.sha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(value.sha256)
          || typeof value.bytesB64u !== 'string' || !/^[A-Za-z0-9_-]+$/u.test(value.bytesB64u) || value.bytesB64u.length > Math.ceil(MAX_SOURCE * 4 / 3)) throw Error('PROOF_SOURCE_INVALID');
        const original = sdk.receizBase64UrlDecode(value.bytesB64u); total += original.length;
        if (total > MAX_TOTAL) throw Error('PROOF_BACKUP_CAPACITY');
        if (sdk.receizBase64UrlEncode(original) !== value.bytesB64u || await proofDigest(original) !== value.sha256) throw Error('PROOF_SOURCE_DIGEST_MISMATCH');
        sources.push({ kind: value.kind as ProofKind, filename: value.filename, bytes: original });
      }
    } else {
      const kind: ProofKind = object(parsed) && parsed.schema === 'bankeiz.account-proof.v1' ? 'account-source' : object(parsed) && parsed.schema === 'receiz.bank.native-asset-result.v1' ? 'asset-receipt' : object(parsed) && parsed.schema === 'receiz.bank.native-payment-result.v1' ? 'payment-receipt' : object(parsed) && parsed.schema === 'receiz.portable-execution-transition-recovery.v124' ? 'execution-recovery'
        : object(parsed) && ['receiz.bank.note-deposit-receipt.v1','receiz.bank.note-redemption-source.v1','receiz.bank.note-redemption-source.v2'].includes(String(parsed.schema)) ? 'note-deposit'
        : bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 ? 'note-image' : 'owned-source';
      // A PNG may also be an ordinary owned Original; classify via canonical
      // note verification first, then independently verify the owned source.
      sources = [{ kind, filename: file.name, bytes }];
      if (kind === 'note-image') {
        try { await inspectNoteProof(sources[0], binding.keyId); }
        catch { sources[0].kind = 'owned-source'; }
      }
    }
    const accepted = await admit(sources);
    const review = Object.freeze({ items: Object.freeze(accepted.summaries), totalBytes: accepted.totalBytes });
    reviews.set(review, { sources: accepted.held, accounts: accepted.accounts }); return review;
  }
  async function retain(review: ProofReview) {
    input.assertOpen(); const accepted = reviews.get(review);
    if (!accepted) throw Error('PROOF_REVIEW_REQUIRED');
    if (busy) throw Error('PROOF_IMPORT_IN_PROGRESS');
    busy = true;
    try {
      // Only this runtime's verified, private exact-byte custody is accepted.
      // Reuse it: display JSON cannot reconstruct this review or alter sources.
      input.assertOpen();
      const result = await input.commit(accepted.sources.map(copy)); input.assertOpen(); reviews.delete(review);
      if (!accepted.accounts.length) return result;
      // Exact evidence is already committed. Optional view restoration cannot
      // roll back that import or override a stronger local financial head.
      let restored = false;
      try { restored = await input.restoreAccounts?.(accepted.accounts) ?? false; }
      catch { /* The verified originals remain available for explicit retry. */ }
      input.assertOpen(); return { ...result, accountHistory: restored ? 'restored' as const : 'retained' as const };
    } finally { busy = false; }
  }
  async function list() { return (await admit(await input.readArchive())).summaries; }
  async function exportProof(digest: string) {
    input.assertOpen(); const sources = await input.readArchive();
    const found = await Promise.all(sources.map(async source => ({ source, digest: await proofDigest(source.bytes) })));
    const source = found.find(value => value.digest === digest)?.source;
    if (!source) throw Error('PROOF_SOURCE_NOT_HELD');
    await verify(source); return { bytes: new Uint8Array(source.bytes), filename: source.filename };
  }
  return Object.freeze({ exportBackup, inspect, retain, list, exportProof });
}
