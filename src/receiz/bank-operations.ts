import type { ReceizClient, ReceizAuthoritySessionV124, ReceizOperationPlanV124, ReceizPortableExecutionTransitionSetV124 } from '@receiz/sdk';
import { BANK_APPLICATION_ID } from './config';
import { loadReceiz } from './client';
import { createBankExecution, type BankExecutionStore, type BankExecutionResult } from './bank-execution';
import { validateAssetDefinition, type AssetDefinition } from './asset-definition';
import { assertBankOperationQualified } from './bank-operation-qualification';
import { parseAmount } from '../core/money';

export type BankRail = 'reserve' | 'settlement';
export type BankOperationInput =
  | { kind: 'send-value'; rail: BankRail; amountUsdCents: string; recipient: string }
  | { kind: 'exchange'; rail: BankRail; amountUsdCents: string; assetDigest: string }
  | { kind: 'send-ownership'; assetDigest: string; quantityMicro: string; recipient: string }
  | { kind: 'sell-share'; assetDigest: string; quantityMicro: string; rail: BankRail; buyer: 'bank' | 'market' }
  | { kind: 'buy-shares'; assetDigest: string; quantityMicro: string; rail: BankRail }
  | { kind: 'redeem-asset'; assetDigest: string }
  | { kind: 'fund-asset'; definition: AssetDefinition; rail: BankRail; amountUsdCents: string };
export type BankOperationRequest = BankOperationInput & { schema: 'bankeiz.operation-request.v1'; applicationId: string; requestId: string; actorReceizId: string };
export interface BankOperationTerms {
  debitUsdCents: string; debitPhiMicro: string; creditUsdCents: string; creditPhiMicro: string;
  feeUsdCents: string; quantityMicro: string; assetDigest: string | null; recipient: string | null;
  expiresAtKaiUPulse: number;
}
export interface BankOperationReview { request: Readonly<BankOperationRequest>; terms: Readonly<BankOperationTerms>; confirmationDigest: string; }
export type BankOperationResult = BankExecutionResult & { retentionWarning?: string };
export interface BankOperations {
  prepare(input: BankOperationInput): Promise<BankOperationReview>;
  execute(review: BankOperationReview, confirmationDigest: string): Promise<BankOperationResult>;
  discard(review: BankOperationReview): void;
}
const held = new WeakSet<BankOperationReview>();
export const isBankOperationReview = (value: unknown): value is BankOperationReview => value !== null && typeof value === 'object' && held.has(value as BankOperationReview);
const fail = (): never => { throw Error('BANK_OPERATION_SOURCE_MISMATCH'); };
const record = (v: unknown): Record<string, unknown> => { if (!v || typeof v !== 'object' || Array.isArray(v)) return fail(); return v as Record<string, unknown>; };
function closed(v: unknown, keys: string[]) { const r = record(v); if (Object.keys(r).sort().join(',') !== [...keys].sort().join(',')) fail(); return r; }
function exact(v: unknown, positive = false): string { if (typeof v !== 'string' || !/^(0|[1-9]\d{0,39})$/u.test(v) || positive && v === '0') return fail(); return v; }
function digest(v: unknown): string { if (typeof v !== 'string' || !/^[a-f0-9]{64}$/u.test(v)) return fail(); return v; }
export function bankOperationDollars(value: string): string {
  if (!/^\d{1,18}(\.\d{1,2})?$/u.test(value.trim())) throw Error('Enter an amount with up to two decimal places.');
  const [whole, cents = ''] = value.trim().split('.'), result = (BigInt(whole) * 100n + BigInt(cents.padEnd(2, '0'))).toString();
  if (result === '0') throw Error('Enter an amount greater than zero.'); return result;
}
function inputRequest(value: BankOperationInput): BankOperationInput {
  const input = structuredClone(value), r = record(input);
  const fields: Record<BankOperationInput['kind'], string[]> = {
    'send-value': ['rail', 'amountUsdCents', 'recipient'], exchange: ['rail', 'amountUsdCents', 'assetDigest'],
    'send-ownership': ['assetDigest', 'quantityMicro', 'recipient'], 'sell-share': ['assetDigest', 'quantityMicro', 'rail', 'buyer'],
    'buy-shares': ['assetDigest', 'quantityMicro', 'rail'], 'redeem-asset': ['assetDigest'], 'fund-asset': ['definition', 'rail', 'amountUsdCents'],
  };
  if (typeof r.kind !== 'string' || !Object.hasOwn(fields, r.kind)) fail();
  closed(input, ['kind', ...fields[input.kind]]);
  if ('rail' in input && !['reserve', 'settlement'].includes(input.rail)) fail();
  if ('amountUsdCents' in input) exact(input.amountUsdCents, true);
  if ('quantityMicro' in input) exact(input.quantityMicro, true);
  if ('assetDigest' in input) digest(input.assetDigest);
  if ('recipient' in input) {
    if (typeof input.recipient !== 'string' || !/^[A-Za-z0-9_.@-]{1,160}$/u.test(input.recipient.trim())) throw Error('Enter a Receiz ID or public username.');
    input.recipient = input.recipient.trim();
  }
  if (input.kind === 'sell-share' && !['bank', 'market'].includes(input.buyer)) fail();
  if (input.kind === 'fund-asset') input.definition = validateAssetDefinition(input.definition);
  return input;
}
function termsFor(value: unknown, request: BankOperationRequest): Readonly<BankOperationTerms> {
  const t = closed(value, ['debitUsdCents', 'debitPhiMicro', 'creditUsdCents', 'creditPhiMicro', 'feeUsdCents', 'quantityMicro', 'assetDigest', 'recipient', 'expiresAtKaiUPulse']);
  for (const name of ['debitUsdCents', 'debitPhiMicro', 'creditUsdCents', 'creditPhiMicro', 'feeUsdCents', 'quantityMicro']) exact(t[name]);
  if (!Number.isSafeInteger(t.expiresAtKaiUPulse) || Number(t.expiresAtKaiUPulse) <= 0) fail();
  if (t.assetDigest !== null) digest(t.assetDigest);
  if (t.recipient !== null && (typeof t.recipient !== 'string' || !/^[A-Za-z0-9_.@-]{1,160}$/u.test(t.recipient))) fail();
  if ('assetDigest' in request && t.assetDigest !== request.assetDigest || 'recipient' in request && t.recipient !== request.recipient || 'quantityMicro' in request && t.quantityMicro !== request.quantityMicro) fail();
  if (request.kind === 'exchange' && BigInt(t.debitUsdCents as string) + BigInt(t.feeUsdCents as string) > BigInt(request.amountUsdCents)) fail();
  if (request.kind === 'send-value' && t.debitUsdCents !== request.amountUsdCents) fail();
  if (['send-ownership', 'redeem-asset', 'sell-share'].includes(request.kind) && (t.debitUsdCents !== '0' || t.debitPhiMicro !== '0')) fail();
  if (['send-ownership', 'redeem-asset'].includes(request.kind) && t.feeUsdCents !== '0') fail();
  if (['exchange', 'buy-shares'].includes(request.kind) && (t.quantityMicro === '0' || t.debitUsdCents === '0')) fail();
  if (request.kind === 'sell-share' && t.creditUsdCents === '0') fail();
  if (request.kind === 'fund-asset' && (t.debitUsdCents !== request.amountUsdCents || t.quantityMicro !== parseAmount(request.definition.units))) fail();
  return Object.freeze({ ...t }) as unknown as Readonly<BankOperationTerms>;
}
// The endpoint transports complete native prepared sources. Its status flags,
// summaries and JSON never replace canonical transition/source verification.
export function createBankOperations(input: {
  ownerReceizId: string; assertOpen(): void; store: BankExecutionStore;
  context(rails: readonly BankRail[]): Promise<{ client: ReceizClient; session: ReceizAuthoritySessionV124 }>;
  lock<T>(operation: () => Promise<T>): Promise<T>;
  sources?(operation: BankOperationInput): Promise<readonly import('@receiz/sdk').ReceizPortableSealedArtifactV124[]>;
  retainCommitted?(result: Extract<BankExecutionResult, { status: 'committed' }>): Promise<void>;
}): BankOperations {
  const custody = new WeakMap<BankOperationReview, { runtime: ReturnType<typeof createBankExecution>; review: Awaited<ReturnType<ReturnType<typeof createBankExecution>['inspect']>>; session: ReceizAuthoritySessionV124 }>();
  let preparing = false;
  return {
    async prepare(value) {
      input.assertOpen(); assertBankOperationQualified(); if (preparing) throw Error('BANK_OPERATION_IN_PROGRESS'); preparing = true;
      try {
        const normalized = inputRequest(value), pending = await input.store.load(); input.assertOpen();
        if (pending && ['prepared', 'unknown'].includes(pending.state)) throw Error('BANK_EXECUTION_PENDING');
        const request = { ...normalized, schema: 'bankeiz.operation-request.v1' as const, applicationId: BANK_APPLICATION_ID, requestId: crypto.randomUUID(), actorReceizId: input.ownerReceizId };
        const context = await input.context('rail' in normalized ? [normalized.rail] : []); input.assertOpen();
        const sdk = await loadReceiz();
        const sourceArtifacts = input.sources ? await input.sources(normalized) : [];
        const body = { applicationId: BANK_APPLICATION_ID, actorSubjectId: context.session.actorSubjectId, authoritySessionHandle: context.session.authoritySessionHandle, request, sourceArtifacts };
        if (new TextEncoder().encode(JSON.stringify(body)).length > 24 * 1024 * 1024) throw Error('BANK_OPERATION_CAPACITY');
        input.assertOpen();
        const raw = await context.client.request(`/api/connect/bank/prepare?applicationId=${encodeURIComponent(BANK_APPLICATION_ID)}`, { method: 'POST', body }); input.assertOpen();
        if (new TextEncoder().encode(JSON.stringify(raw)).length > 24 * 1024 * 1024) throw Error('BANK_OPERATION_CAPACITY');
        const packet = closed(raw, ['schema', 'plan', 'transitionSet']); if (packet.schema !== 'bankeiz.prepared-operation.v1') fail();
        const plan = await sdk.validateReceizOperationPlanV124(packet.plan as ReceizOperationPlanV124);
        if (plan.applicationId !== BANK_APPLICATION_ID || plan.domainId !== 'custom:bankeiz' || plan.attemptId !== request.requestId || plan.semanticIdempotencyKey !== await sdk.digestReceizCanonicalV122(request)) fail();
        const encoded = record(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(sdk.receizBase64UrlDecode(plan.exactPlanBytesB64u))));
        if (encoded.schema !== 'receiz.atomic-operation.v124' || !Array.isArray(encoded.operations) || encoded.operations.length !== 1) fail();
        const operation = record((encoded.operations as unknown[])[0]), payload = record(operation.payload);
        if (operation.category !== 'custom' || operation.domainId !== 'custom:bankeiz' || payload.namespace !== 'custom:bankeiz') fail();
        const command = closed(payload.operation, ['schema', 'request', 'terms']);
        if (command.schema !== 'bankeiz.operation.v1' || sdk.canonicalizeReceizConstitution(command.request) !== sdk.canonicalizeReceizConstitution(request)) fail();
        const terms = termsFor(command.terms, request);
        const runtime = createBankExecution(context.client, input.store);
        const inspected = await runtime.inspect(plan, packet.transitionSet as ReceizPortableExecutionTransitionSetV124, context.session.actorSubjectId); input.assertOpen();
        if (sdk.receizKaiNow().uPulse >= terms.expiresAtKaiUPulse) throw Error('BANK_OPERATION_EXPIRED');
        if (request.kind === 'fund-asset') Object.freeze(request.definition);
        const review = Object.freeze({ request: Object.freeze(request), terms, confirmationDigest: inspected.confirmationDigest });
        custody.set(review, { runtime, review: inspected, session: context.session }); held.add(review); return review;
      } finally { preparing = false; }
    },
    execute: (review, confirmationDigest) => input.lock(async () => {
      input.assertOpen(); assertBankOperationQualified(); const current = custody.get(review);
      if (!current || confirmationDigest !== review.confirmationDigest) throw Error('BANK_EXECUTION_EXACT_CONFIRMATION_REQUIRED');
      const sdk = await loadReceiz();
      if (sdk.receizKaiNow().uPulse >= review.terms.expiresAtKaiUPulse || sdk.receizKaiNow().uPulse >= current.session.expiresAtKaiUPulse) throw Error('BANK_OPERATION_EXPIRED');
      // createBankExecution retains before submission and admits committed
      // recovery. Unknown results remain bound to their original intent.
      const result = await current.runtime.execute(current.review, confirmationDigest, current.session);
      custody.delete(review); held.delete(review);
      if (result.status === 'committed' && input.retainCommitted) {
        try { await input.retainCommitted(result); }
        catch { return { ...result, retentionWarning: 'The transaction is complete. Its recovery proof is held, but some account originals could not be restored. Keep the recovery proof and retry recovery before another transaction.' }; }
      }
      return result;
    }),
    discard(review) { custody.delete(review); held.delete(review); },
  };
}
export function bankOperationError(error: unknown): string {
  const code = error instanceof Error ? error.message : '';
  if (code === 'BANK_OPERATION_FINANCIAL_ADAPTER_UNQUALIFIED') return 'This transaction is not available yet. Your balance and held proofs are unchanged.';
  if (code === 'BANK_OPERATION_ACCESS_REQUIRED') return 'Approve the required account access in Bank connection, then review your transaction again. Each payment still needs your separate approval.';
  if (code === 'BANK_OPERATION_CURRENT_SOURCE_REQUIRED') return 'This original needs its current transferable proof before it can move. Your original remains held on this device.';
  if (code === 'BANK_OPERATION_IDENTITY_SOURCE_FORBIDDEN') return 'Choose an asset proof. An Identity Seal is private login material and cannot be supplied as an asset.';
  if (code === 'BANK_EXECUTION_PENDING') return 'An earlier transaction is awaiting a confirmed result. Open Bank connection in your ID to check its outcome.';
  if (code === 'BANK_OPERATION_EXPIRED') return 'These terms have expired. Review a fresh quote before continuing.';
  if (code === 'BANK_OPERATION_SOURCE_MISMATCH' || code.startsWith('V12')) return 'The transaction proof could not be verified. Nothing has been submitted from this review.';
  if (/^Enter /u.test(code)) return code;
  return 'Verified transaction terms are unavailable. Your account and held proofs are preserved. Try again when the receiving service is available.';
}
