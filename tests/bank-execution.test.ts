import { expect, it, vi } from 'vitest';
import { createReceizClient, createReceizCustomReducerBindingsV124, planAtomicOperationV124 } from '@receiz/sdk';
import { BANK_APPLICATION_ID } from '../src/receiz/config';
import { createBankExecution } from '../src/receiz/bank-execution';

// Nonfinancial source-check fixtures test canonical refusal. These are not
// ownership admissions, receipts, funding sources or deployed bank operations.
async function plan(applicationId = BANK_APPLICATION_ID) {
  const heads = { fixture: 'a'.repeat(64) }, namespace = 'custom:bank-source-check';
  const bindings = await createReceizCustomReducerBindingsV124({ namespace, registryDigest: 'b'.repeat(64), reducerDigest: 'c'.repeat(64) });
  return planAtomicOperationV124({ applicationId, operations: [{ operationId: 'fixture-check', category: 'custom', domainId: namespace, ...bindings, participants: ['fixture'], payload: { schema: 'receiz.custom-reducer-operation.v124', namespace, registryDigest: 'b'.repeat(64), reducerDigest: 'c'.repeat(64), expectedParticipantHeads: heads, operation: { schema: 'bank.source-check.v1' } } }], participants: ['fixture'], expectedParticipantHeads: heads, semanticIdempotencyKey: 'fixture-check', attemptId: 'fixture-attempt' });
}
it('refuses a foreign application before staging or retaining any intent', async () => {
  const request = vi.fn<typeof fetch>();
  const runtime = createBankExecution(createReceizClient({ applicationId: BANK_APPLICATION_ID, fetchImpl: request }));
  await expect(runtime.inspect(await plan('fixture-foreign'), {} as never)).rejects.toThrow('BANK_EXECUTION_APPLICATION_MISMATCH');
  expect(request).not.toHaveBeenCalled();
});
it('the actual SDK refuses a transition set reconstructed from a verified flag', async () => {
  const request = vi.fn<typeof fetch>();
  const runtime = createBankExecution(createReceizClient({ applicationId: BANK_APPLICATION_ID, fetchImpl: request }));
  await expect(runtime.inspect(await plan(), { status: 'verified-portable-execution-transition-set', verified: true } as never)).rejects.toThrow();
  expect(request).not.toHaveBeenCalled();
});
