import type { ReceizClient, ReceizOperationPlanV124, ReceizPortableExecutionTransitionSetV124, ReceizPortableExecutionTransitionRecoveryV124, ReceizExecutionOutcomeV124 } from '@receiz/sdk';
import { BANK_APPLICATION_ID } from './config';
import { loadReceiz } from './client';
export interface BankExecutionCheckpoint { schema: 'bank.execution-checkpoint.v1'; operationId: string; plan: ReceizOperationPlanV124; transitionSet: ReceizPortableExecutionTransitionSetV124; state: 'prepared' | 'unknown' | 'committed' | 'zero-write'; recovery?: ReceizPortableExecutionTransitionRecoveryV124; }
export interface BankExecutionStore { load(): Promise<BankExecutionCheckpoint | null>; saveNew(value: BankExecutionCheckpoint): Promise<void>; replace(value: BankExecutionCheckpoint): Promise<void>; }
export interface BankExecutionReview { confirmationDigest: string; participantCount: number; writesPerformed: 0; }
export type BankExecutionResult = { status: 'committed'; recovery: ReceizPortableExecutionTransitionRecoveryV124 } | { status: 'zero-write'; reasonCode: string } | { status: 'unknown'; operationId: string };
// Call only with the bank's own device-authorized SDK client. This module
// composes execution mechanics; it supplies no bank reducer, funding, issuer
// authority, authority session or permission to submit an operation.
export function createBankExecution(client: Pick<ReceizClient, 'execution'>, store?: BankExecutionStore) {
  const reviews = new WeakMap<BankExecutionReview, BankExecutionCheckpoint>(); let busy = false;
  async function admit(checkpoint: BankExecutionCheckpoint) {
    const sdk = await loadReceiz(), plan = await sdk.validateReceizOperationPlanV124(checkpoint.plan);
    if (plan.applicationId !== BANK_APPLICATION_ID) throw new Error('BANK_EXECUTION_APPLICATION_MISMATCH');
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
    const { sdk, plan, source } = await admit(checkpoint);
    if (outcome.applicationId !== plan.applicationId || outcome.domainId !== plan.domainId || outcome.operationKind !== plan.operationKind || outcome.exactPlanDigest !== plan.exactPlanDigest || outcome.semanticIdempotencyKey !== plan.semanticIdempotencyKey || outcome.attemptId !== plan.attemptId) throw new Error('BANK_EXECUTION_OUTCOME_MISMATCH');
    if (outcome.status === 'committed') {
      if (sdk.canonicalizeReceizConstitution(outcome.committedHeads) !== sdk.canonicalizeReceizConstitution(source.proposedParticipantHeads)) throw new Error('BANK_EXECUTION_COMMITTED_HEAD_MISMATCH');
      // This SDK call refuses a structurally reconstructed successful result.
      const recovery = client.execution.exportCommittedRecovery(outcome);
      await reopenRecovery(checkpoint, recovery);
      await store!.replace({ ...checkpoint, state: 'committed', recovery });
      return { status: 'committed', recovery };
    }
    if (outcome.status === 'zero-write' || outcome.status === 'cancelled') {
      await store!.replace({ ...checkpoint, state: 'zero-write' });
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
    reviews.delete(review); busy = true;
    try {
      await admit(checkpoint); await store.saveNew(checkpoint);
      try {
        const handle = await client.execution.stagePrepared(checkpoint.plan, checkpoint.transitionSet);
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
      const { plan } = await admit(checkpoint);
      if (checkpoint.state === 'committed' && checkpoint.recovery) {
        await reopenRecovery(checkpoint, checkpoint.recovery);
        return { status: 'committed', recovery: checkpoint.recovery };
      }
      // Exact idempotency lookup, including after restart; no staging, fresh
      // attempt, replan, execution or inferred zero-write on this path.
      return await terminal(checkpoint, await client.execution.resolveByIdempotencyKey({ applicationId: plan.applicationId, domainId: plan.domainId, operationKind: plan.operationKind, semanticIdempotencyKey: plan.semanticIdempotencyKey }));
    } finally { busy = false; }
  }
  return Object.freeze({ inspect, execute, resolve });
}
