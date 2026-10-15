import type { ReceizClient, ReceizOperationPlanV124, ReceizPortableExecutionTransitionSetV124, ReceizPortableExecutionTransitionRecoveryV124, ReceizExecutionOutcomeV124, ReceizZeroWriteFailureV124 } from '@receiz/sdk';
import { BANK_APPLICATION_ID } from './config';
import { loadReceiz } from './client';
type ZeroWriteReason = ReceizZeroWriteFailureV124['reasonCode'];
export interface BankExecutionCheckpoint { schema: 'bank.execution-checkpoint.v1'; operationId: string; plan: ReceizOperationPlanV124; transitionSet: ReceizPortableExecutionTransitionSetV124; state: 'prepared' | 'unknown' | 'committed' | 'zero-write'; recovery?: ReceizPortableExecutionTransitionRecoveryV124; zeroWriteReason?: ZeroWriteReason; }
export interface BankExecutionStore { load(): Promise<BankExecutionCheckpoint | null>; saveNew(value: BankExecutionCheckpoint): Promise<void>; replace(value: BankExecutionCheckpoint): Promise<void>; }
export interface BankExecutionReview { confirmationDigest: string; participantCount: number; writesPerformed: 0; }
export type BankExecutionResult = { status: 'committed'; recovery: ReceizPortableExecutionTransitionRecoveryV124 } | { status: 'zero-write'; reasonCode: string } | { status: 'unknown'; operationId: string };
// Call only with the bank's own device-authorized SDK client. This module
// composes execution mechanics; it supplies no bank reducer, funding, issuer
// authority, authority session or permission to submit an operation.
export function createBankExecution(client: { execution: Pick<ReceizClient['execution'], 'stagePrepared' | 'execute' | 'exportCommittedRecovery' | 'resolveByIdempotencyKey'> }, store?: BankExecutionStore) {
  const reviews = new WeakMap<BankExecutionReview, BankExecutionCheckpoint>(); let busy = false;
  const zeroWriteReasons: readonly ZeroWriteReason[] = ['IDEMPOTENCY_CONFLICT', 'STALE_HEAD', 'MISSING_PARTICIPANT', 'UNAUTHORIZED', 'INVALID_OPERATION', 'INSUFFICIENT_VALUE', 'UNSUPPORTED_ATOMICITY', 'ALREADY_COMMITTED', 'CANCELLED'];
  function bindsPlan(value: Pick<ReceizExecutionOutcomeV124, 'applicationId' | 'domainId' | 'operationKind' | 'exactPlanDigest' | 'semanticIdempotencyKey' | 'attemptId'>, plan: ReceizOperationPlanV124) {
    return value.applicationId === plan.applicationId && value.domainId === plan.domainId && value.operationKind === plan.operationKind && value.exactPlanDigest === plan.exactPlanDigest && value.semanticIdempotencyKey === plan.semanticIdempotencyKey && value.attemptId === plan.attemptId;
  }
  async function retainedPlan(checkpoint: BankExecutionCheckpoint) {
    const sdk = await loadReceiz(), plan = await sdk.validateReceizOperationPlanV124(checkpoint.plan);
    if (plan.applicationId !== BANK_APPLICATION_ID) throw new Error('BANK_EXECUTION_APPLICATION_MISMATCH');
    if (checkpoint.schema !== 'bank.execution-checkpoint.v1' || checkpoint.operationId !== plan.attemptId) throw new Error('BANK_EXECUTION_CHECKPOINT_INVALID');
    return { sdk, plan };
  }
  async function admit(checkpoint: BankExecutionCheckpoint) {
    const { sdk, plan } = await retainedPlan(checkpoint);
    const source = await sdk.verifyReceizPortableExecutionTransitionSetV124(checkpoint.transitionSet, { audience: BANK_APPLICATION_ID });
    if (sdk.canonicalizeReceizConstitution(plan) !== sdk.canonicalizeReceizConstitution(source.operationPlan)) throw new Error('BANK_EXECUTION_PLAN_SOURCE_MISMATCH');
    return { sdk, plan, source };
  }
  async function reopenRecovery(checkpoint: BankExecutionCheckpoint, recovery: ReceizPortableExecutionTransitionRecoveryV124) {
    const { sdk } = await admit(checkpoint);
    if (sdk.canonicalizeReceizConstitution(recovery.transitionSet) !== sdk.canonicalizeReceizConstitution(checkpoint.transitionSet)) throw new Error('BANK_EXECUTION_RECOVERY_SOURCE_MISMATCH');
    return sdk.recoverReceizPortableExecutionTransitionSetV124(recovery, { audience: BANK_APPLICATION_ID });
  }
  async function terminal(checkpoint: BankExecutionCheckpoint, outcome: ReceizExecutionOutcomeV124): Promise<BankExecutionResult> {
    const { plan } = await retainedPlan(checkpoint);
    if (!bindsPlan(outcome, plan)) throw new Error('BANK_EXECUTION_OUTCOME_MISMATCH');
    if (outcome.status === 'committed') {
      const { sdk, source } = await admit(checkpoint);
      if (sdk.canonicalizeReceizConstitution(outcome.committedHeads) !== sdk.canonicalizeReceizConstitution(source.proposedParticipantHeads)) throw new Error('BANK_EXECUTION_COMMITTED_HEAD_MISMATCH');
      // This SDK call refuses a structurally reconstructed successful result.
      const recovery = client.execution.exportCommittedRecovery(outcome);
      await reopenRecovery(checkpoint, recovery);
      await store!.replace({ ...checkpoint, state: 'committed', recovery });
      return { status: 'committed', recovery };
    }
    if (outcome.status === 'zero-write' || outcome.status === 'cancelled') {
      if (outcome.writes !== 0 || !zeroWriteReasons.includes(outcome.reasonCode)) throw new Error('BANK_EXECUTION_OUTCOME_MISMATCH');
      await store!.replace({ ...checkpoint, state: 'zero-write', zeroWriteReason: outcome.reasonCode });
      return { status: 'zero-write', reasonCode: outcome.reasonCode };
    }
    await store!.replace({ ...checkpoint, state: 'unknown' });
    return { status: 'unknown', operationId: checkpoint.operationId };
  }
  async function inspect(plan: ReceizOperationPlanV124, transitionSet: ReceizPortableExecutionTransitionSetV124): Promise<BankExecutionReview> {
    const checkpoint: BankExecutionCheckpoint = structuredClone({ schema: 'bank.execution-checkpoint.v1', operationId: plan.attemptId, plan, transitionSet, state: 'prepared' });
    const admitted = await admit(checkpoint);
    const review = Object.freeze({ confirmationDigest: admitted.plan.exactPlanDigest, participantCount: admitted.source.members.length, writesPerformed: 0 as const });
    reviews.set(review, checkpoint); return review;
  }
  async function execute(review: BankExecutionReview, confirmation: string, session: unknown): Promise<BankExecutionResult> {
    const checkpoint = reviews.get(review);
    if (!checkpoint || confirmation !== review.confirmationDigest) throw new Error('BANK_EXECUTION_EXACT_CONFIRMATION_REQUIRED');
    if (busy) throw new Error('BANK_EXECUTION_IN_PROGRESS');
    if (!store) throw new Error('BANK_EXECUTION_PRIVATE_CUSTODY_REQUIRED');
    busy = true;
    try {
      await admit(checkpoint); await store.saveNew(checkpoint);
      // A local retention failure made no submission and leaves the exact
      // review usable. Only consume it once durable custody has succeeded.
      reviews.delete(review);
      let handle: Awaited<ReturnType<ReceizClient['execution']['stagePrepared']>>;
      try {
        handle = await client.execution.stagePrepared(checkpoint.plan, checkpoint.transitionSet);
      } catch (error) {
        const sdk = await loadReceiz();
        if (error instanceof sdk.ReceizExecutionZeroWriteErrorV124 && bindsPlan(error.failure, checkpoint.plan) && error.failure.writes === 0 && zeroWriteReasons.includes(error.failure.reasonCode)) {
          await store.replace({ ...checkpoint, state: 'zero-write', zeroWriteReason: error.failure.reasonCode });
          return { status: 'zero-write', reasonCode: error.failure.reasonCode };
        }
        await store.replace({ ...checkpoint, state: 'unknown' });
        return { status: 'unknown', operationId: checkpoint.operationId };
      }
      try {
        return await terminal(checkpoint, await client.execution.execute(handle, session));
      } catch {
        // Submission or response verification failures cannot prove zero
        // writes. Keep this original intent; never stage a replacement here.
        await store.replace({ ...checkpoint, state: 'unknown' });
        return { status: 'unknown', operationId: checkpoint.operationId };
      }
    } finally { busy = false; }
  }
  async function resolve(): Promise<BankExecutionResult | null> {
    if (busy) throw new Error('BANK_EXECUTION_IN_PROGRESS');
    if (!store) throw new Error('BANK_EXECUTION_PRIVATE_CUSTODY_REQUIRED');
    busy = true;
    try {
      const checkpoint = await store.load(); if (!checkpoint) return null;
      // A read-only outcome lookup needs the retained exact coordinate, not
      // permission to execute an expired candidate again. SDK response and
      // committed recovery admission still validate any reported success.
      const { plan } = await retainedPlan(checkpoint);
      if (checkpoint.state === 'committed' && checkpoint.recovery) {
        await reopenRecovery(checkpoint, checkpoint.recovery);
        return { status: 'committed', recovery: checkpoint.recovery };
      }
      if (checkpoint.state === 'zero-write' && checkpoint.zeroWriteReason && zeroWriteReasons.includes(checkpoint.zeroWriteReason)) return { status: 'zero-write', reasonCode: checkpoint.zeroWriteReason };
      // Exact idempotency lookup, including after restart; no staging, fresh
      // attempt, replan, execution or inferred zero-write on this path.
      return await terminal(checkpoint, await client.execution.resolveByIdempotencyKey({ applicationId: plan.applicationId, domainId: plan.domainId, operationKind: plan.operationKind, semanticIdempotencyKey: plan.semanticIdempotencyKey }));
    } finally { busy = false; }
  }
  return Object.freeze({ inspect, execute, resolve });
}
