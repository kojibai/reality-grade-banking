import type { ReceizClient, ReceizPortableExecutionTransitionRecoveryV124 } from '@receiz/sdk';
import { createBankExecution, type BankExecutionCheckpoint, type BankExecutionResult, type BankExecutionStore } from './bank-execution';
import { loadReceiz } from './client';
import { BANK_APPLICATION_ID } from './config';

export interface BankExecutionStatus {
  operationId: string;
  operationKind: string;
  planDigest: string;
  state: 'prepared' | 'unknown' | 'committed' | 'zero-write';
  hasRecovery: boolean;
}
export interface BankExecutionRecovery {
  status(): Promise<BankExecutionStatus | null>;
  resolve(approved?: boolean): Promise<BankExecutionResult | null>;
  exportRecovery(): Promise<{ bytes: Uint8Array; filename: string }>;
}

// Inspection reads only encrypted local choreography. Resolution uses the
// SDK's original idempotency coordinate; it never stages or executes a plan.
export function createBankExecutionRecovery(input: {
  store: BankExecutionStore;
  connect(): Promise<Pick<ReceizClient, 'execution'>>;
  assertOpen(): void;
  lock<T>(operation: () => Promise<T>): Promise<T>;
}): BankExecutionRecovery {
  async function reopen(value: BankExecutionCheckpoint): Promise<ReceizPortableExecutionTransitionRecoveryV124> {
    if (value.state !== 'committed' || !value.recovery) throw new Error('BANK_EXECUTION_COMMITTED_RECOVERY_REQUIRED');
    const sdk = await loadReceiz();
    await sdk.recoverReceizPortableExecutionTransitionSetV124(value.recovery, { audience: BANK_APPLICATION_ID });
    if (sdk.canonicalizeReceizConstitution(value.recovery.transitionSet) !== sdk.canonicalizeReceizConstitution(value.transitionSet)) throw new Error('BANK_EXECUTION_RECOVERY_SOURCE_MISMATCH');
    const plan = await sdk.validateReceizOperationPlanV124(value.plan);
    const source = await sdk.verifyReceizPortableExecutionTransitionSetV124(value.transitionSet, { audience: BANK_APPLICATION_ID });
    if (plan.applicationId !== BANK_APPLICATION_ID || value.operationId !== plan.attemptId || sdk.canonicalizeReceizConstitution(source.operationPlan) !== sdk.canonicalizeReceizConstitution(plan)) throw new Error('BANK_EXECUTION_PLAN_SOURCE_MISMATCH');
    input.assertOpen(); return value.recovery;
  }
  async function status(): Promise<BankExecutionStatus | null> {
    input.assertOpen();
    const value = await input.store.load();
    input.assertOpen();
    if (!value) return null;
    if (value.schema !== 'bank.execution-checkpoint.v1' || value.plan.applicationId !== BANK_APPLICATION_ID || value.operationId !== value.plan.attemptId) throw new Error('BANK_EXECUTION_CHECKPOINT_INVALID');
    if (value.state === 'committed') await reopen(value);
    return { operationId: value.operationId, operationKind: value.plan.operationKind, planDigest: value.plan.exactPlanDigest, state: value.state, hasRecovery: value.state === 'committed' && !!value.recovery };
  }
  async function resolve(approved = false) {
    return input.lock(async () => {
      input.assertOpen();
      if (!await input.store.load()) return null;
      // Retained terminal results reopen without acquiring or expanding a
      // network grant. Any actual lookup uses the connected SDK response.
      const sdk = await loadReceiz();
      const client = { execution: {
        stagePrepared: async (): Promise<never> => { throw new Error('BANK_RECOVERY_READ_ONLY'); },
        execute: async (): Promise<never> => { throw new Error('BANK_RECOVERY_READ_ONLY'); },
        exportCommittedRecovery: sdk.exportReceizCommittedExecutionRecoveryV124,
        resolveByIdempotencyKey: async (...args: Parameters<ReceizClient['execution']['resolveByIdempotencyKey']>) => {
          if (!approved) throw new Error('BANK_EXECUTION_RECOVERY_CONSENT_REQUIRED');
          input.assertOpen(); const connected = await input.connect(); input.assertOpen();
          const result = await connected.execution.resolveByIdempotencyKey(...args); input.assertOpen(); return result;
        },
      } };
      const result = await createBankExecution(client, input.store).resolve();
      input.assertOpen(); return result;
    });
  }
  async function exportRecovery() {
    return input.lock(async () => {
      input.assertOpen();
      const value = await input.store.load();
      if (!value || value.state !== 'committed' || !value.recovery) throw new Error('BANK_EXECUTION_COMMITTED_RECOVERY_REQUIRED');
      const exact = await reopen(value);
      return { bytes: new TextEncoder().encode(JSON.stringify(exact)), filename: `bank-execution-${value.plan.exactPlanDigest}.receiz-recovery.json` };
    });
  }
  return Object.freeze({ status, resolve, exportRecovery });
}
