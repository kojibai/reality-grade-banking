import type { ReceizClient, ReceizAuthoritySessionV124, ReceizOperationPlanV124, ReceizPortableExecutionTransitionSetV124 } from '@receiz/sdk';
import { BANK_APPLICATION_ID } from './config';
import { noteFailureStage } from './note-stage';
import { loadReceiz } from './client';
import { createBankExecution, type BankExecutionStore, type BankExecutionResult } from './bank-execution';
import { validateAssetDefinition, type AssetDefinition } from './asset-definition';
import { assertBankOperationQualified } from './bank-operation-qualification';
import { parseAmount } from '../core/money';

export type BankRail = 'reserve' | 'settlement';
export type BankOperationInput =
  | { kind: 'fund-asset'; definition: AssetDefinition; fundingRule: 'reserve-first-then-settlement'; amountUsdCents: string }
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
  expiresAtKaiUPulse: number; fundingComponents?: readonly import('./native-asset-backing').NativeAssetFundingComponent[];
}
export interface BankOperationReview { request: Readonly<BankOperationRequest>; terms: Readonly<BankOperationTerms>; confirmationDigest: string; }
export type BankOperationResult = (BankExecutionResult | import('./native-payment').NativePaymentResult | import('./native-asset').NativeAssetResult) & { retentionWarning?: string };
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
    // Receiz profile names are case-insensitive. Opaque receiving coordinates
    // keep every byte; do not rewrite punctuation into a different username.
    if(/^@?[a-z0-9_]{3,24}(?:\.receiz\.id)?$/iu.test(input.recipient))input.recipient=input.recipient.toLowerCase();
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
  payments?: BankOperations;
  assets?: BankOperations;
  context(rails: readonly BankRail[]): Promise<{ client: ReceizClient; session: ReceizAuthoritySessionV124 }>;
  lock<T>(operation: () => Promise<T>): Promise<T>;
  sources?(operation: BankOperationInput): Promise<readonly import('@receiz/sdk').ReceizPortableSealedArtifactV124[]>;
  retainCommitted?(result: Extract<BankExecutionResult, { status: 'committed' }>): Promise<void>;
}): BankOperations {
  const custody = new WeakMap<BankOperationReview, { runtime: ReturnType<typeof createBankExecution>; review: Awaited<ReturnType<ReturnType<typeof createBankExecution>['inspect']>>; session: ReceizAuthoritySessionV124 }>();
  let preparing = false;
  const nativeReviews = new WeakSet<BankOperationReview>();
  const nativeAssetReviews = new WeakSet<BankOperationReview>();
  return {
    async prepare(value) {
      input.assertOpen();
      if(value.kind === 'send-value' && input.payments){const pending=await input.store.load();input.assertOpen();if(pending&&['prepared','unknown'].includes(pending.state))throw Error('BANK_EXECUTION_PENDING');const review=await input.payments.prepare(inputRequest(value));nativeReviews.add(review);held.add(review);return review;}
      if(value.kind !== 'send-value' && input.assets){const pending=await input.store.load();input.assertOpen();if(pending&&['prepared','unknown'].includes(pending.state))throw Error('BANK_EXECUTION_PENDING');const review=await input.assets.prepare(inputRequest(value));nativeAssetReviews.add(review);held.add(review);return review;}
      assertBankOperationQualified(); if (preparing) throw Error('BANK_OPERATION_IN_PROGRESS'); preparing = true;
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
    execute: (review, confirmationDigest) => {
      if(nativeReviews.has(review)&&input.payments){return input.payments.execute(review,confirmationDigest).then(result=>{nativeReviews.delete(review);held.delete(review);return result;});}
      if(nativeAssetReviews.has(review)&&input.assets){return input.assets.execute(review,confirmationDigest).then(result=>{nativeAssetReviews.delete(review);held.delete(review);return result;});}
      return input.lock(async () => {
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
    });},
    discard(review) { if(nativeAssetReviews.has(review)&&input.assets){input.assets.discard(review);nativeAssetReviews.delete(review);held.delete(review);return;} if(nativeReviews.has(review))input.payments?.discard(review);nativeReviews.delete(review);custody.delete(review); held.delete(review); },
  };
}
const publicOperationCodes=new Set(['BANK_ASSET_MOMENT_SOURCE_REQUIRED','BANK_WALLET_PUBLIC_NOTE_UNAVAILABLE','BANK_NOTE_ATTEMPT_PENDING','wallet_send_guard_required','BANK_MARKET_REQUEST_INVALID','BANK_MARKET_QUOTE_INVALID','BANK_MARKET_CHECKPOINT_INVALID','BANK_MARKET_OUTCOME_MISMATCH','BANK_MARKET_ORIGINAL_UNAVAILABLE','BANK_MARKET_IDENTITY_CHANGED','BANK_WALLET_RECIPIENT_UNAVAILABLE','BANK_WALLET_IDENTITY_CHANGED','BANK_WALLET_SOURCE_INVALID','BANK_WALLET_CHECKPOINT_INVALID','BANK_WALLET_QUOTE_INVALID','BANK_WALLET_LOCAL_HEAD_REQUIRED','native_payment_unavailable','native_bank_unavailable','native_bank_protected_custody_unqualified','payment_access_denied','access_denied','insufficient_scope','BANK_PAYMENT_RECIPIENT_UNAVAILABLE','BANK_NATIVE_WALLET_INSUFFICIENT_SETTLEMENT','BANK_NATIVE_WALLET_INSUFFICIENT_RESERVE','BANK_NATIVE_WALLET_DENOMINATION_PRECISION','BANK_PAYMENT_REVIEW_INVALID','BANK_PAYMENT_SOURCE_INVALID','BANK_PAYMENT_FINANCIAL_SOURCE_INVALID','BANK_PAYMENT_CHECKPOINT_INVALID','BANK_PAYMENT_CONSENT_INVALID','BANK_PAYMENT_ACCESS_DENIED','BANK_PAYMENT_EXPIRED','BANK_PAYMENT_INTENT_CONFLICT','BANK_OPERATION_EXPIRED','BANK_OPERATION_SOURCE_MISMATCH','BANK_EXECUTION_PENDING','BANK_OPERATION_ACCESS_REQUIRED','BANK_OPERATION_FINANCIAL_ADAPTER_UNQUALIFIED','BANK_OPERATION_RUNTIME_UNAVAILABLE']);
/** Bounded diagnostics only; private HTTP payloads and exception text stay out. */
export function bankOperationFailureDetails(error:unknown){
 const value=error as {status?:unknown;message?:unknown;name?:unknown}|null;
 const status=typeof value?.status==='number'&&Number.isInteger(value.status)&&value.status>=400&&value.status<=599?value.status:null;
 const code=typeof value?.message==='string'&&publicOperationCodes.has(value.message)?value.message:status?`HTTP_${status}`:value?.name==='OperationError'?'BROWSER_OPERATION_ERROR':'BANK_OPERATION_UNAVAILABLE';
 return {code,status,...noteFailureStage(error)};
}
export function bankOperationError(error: unknown): string {
  const code = error instanceof Error ? error.message : '';
  if(code==='BANK_ASSET_MOMENT_SOURCE_REQUIRED')return 'Backed issuance currently supports a plain definition. Return to Seal a moment to preserve your originals and full text together.';
  const stage=noteFailureStage(error)?.stage;
  if(stage&&['saved-notes','prepared-notes','saved-note-identity','offline-note-checkpoint','prepared-note-checkpoint'].includes(stage))return 'Saved Offline Note custody could not be opened. Keep this device and its original proofs; the saved state has not been reset.';
  if(error&&typeof error==='object'&&(error as {name?:unknown}).name==='OperationError')return 'A protected browser operation failed. Your account and saved transaction state are preserved. Keep this device and check the failure details.';
  if(code==='BANK_WALLET_PUBLIC_NOTE_UNAVAILABLE')return 'Public payment notes are waiting for a service update. Remove the optional note to send now, or try again after the update.';
  if(code==='wallet_send_guard_required')return 'Wallet Send is waiting for a required service update. Your account and saved transaction state are preserved.';
  if(code==='BANK_WALLET_RECIPIENT_UNAVAILABLE')return 'The receiving account could not be resolved. Check its public username or account ID.';
  if(code==='BANK_WALLET_LOCAL_HEAD_REQUIRED')return 'This account has a locally advanced Note or proof head. Keep its original and complete its existing synchronization before using connected payments or Market trades.';
  if(code.startsWith('BANK_MARKET_'))return 'The Market request or its original result could not be verified. Your saved trade remains on this device. Review the failure details or check its original outcome.';
  if(code.startsWith('BANK_WALLET_'))return 'The Wallet request could not be verified. Your saved payment details remain held on this device.';
  if(code==='BANK_NATIVE_WALLET_INSUFFICIENT_SETTLEMENT')return 'Choose an amount within your available Settlement.';
  if(code==='BANK_NATIVE_WALLET_INSUFFICIENT_RESERVE')return 'Choose an amount within your available Reserve.';
  if(code==='BANK_PAYMENT_RECIPIENT_UNAVAILABLE')return 'This recipient could not be resolved from its account source. Check the Receiz ID or username.';
  if(code==='payment_access_denied'||code==='access_denied'||code==='insufficient_scope')return 'Approve the required account access in Bank connection, then review your transaction again. Each payment still needs your separate approval.';
  if(['native_payment_unavailable','native_bank_unavailable','native_bank_protected_custody_unqualified'].includes(code))return 'The payment service could not prepare verified terms. Your exact account sources remain held. Keep the failure details when reporting this issue.';
  if(code==='BANK_NATIVE_WALLET_DENOMINATION_PRECISION')return 'This amount cannot be represented exactly by the selected account’s value units. Choose a different amount and review again.';
  if(code==='BANK_PAYMENT_REVIEW_INVALID'||code==='BANK_PAYMENT_SOURCE_INVALID'||code==='BANK_PAYMENT_FINANCIAL_SOURCE_INVALID')return 'The payment proof could not be verified. Nothing has been submitted from this review.';
  if (code === 'BANK_OPERATION_FINANCIAL_ADAPTER_UNQUALIFIED') return 'This transaction is not available yet. Your balance and held proofs are unchanged.';
  if (code === 'BANK_OPERATION_ACCESS_REQUIRED') return 'Approve the required account access in Bank connection, then review your transaction again. Each payment still needs your separate approval.';
  if (code === 'BANK_OPERATION_CURRENT_SOURCE_REQUIRED') return 'This original needs its current transferable proof before it can move. Your original remains held on this device.';
  if (code === 'BANK_OPERATION_IDENTITY_SOURCE_FORBIDDEN') return 'Choose an asset proof. An Identity Record is private login material and cannot be supplied as an asset.';
  if (code === 'BANK_NOTE_ATTEMPT_PENDING') return 'An earlier Note attempt is saved. Open Send → Create note to resume it, or choose Discard unissued note if offered. Keep this device and its original proofs.';
  if (code === 'BANK_EXECUTION_PENDING') return 'An earlier transaction is awaiting a confirmed result. Open Bank connection in your ID to check its outcome.';
  if (code === 'BANK_OPERATION_EXPIRED') return 'These terms have expired. Review a fresh quote before continuing.';
  if (code === 'BANK_OPERATION_SOURCE_MISMATCH' || code.startsWith('V12')) return 'The transaction proof could not be verified. Nothing has been submitted from this review.';
  if (/^Enter /u.test(code)) return code;
  return 'Verified transaction terms are unavailable. Your account and held proofs are preserved. Try again when the receiving service is available.';
}
