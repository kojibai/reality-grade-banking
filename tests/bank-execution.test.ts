import { expect, it, vi } from 'vitest';
import { createReceizClient, createReceizCustomReducerBindingsV124, planAtomicOperationV124 } from '@receiz/sdk';
import { BANK_APPLICATION_ID } from '../src/receiz/config';
import { createBankExecution } from '../src/receiz/bank-execution';
import { createBankExecutionRecovery } from '../src/receiz/bank-execution-recovery';

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
it('reopens committed sources before a retained checkpoint can show a success label', async () => {
  const original = await plan(), connect = vi.fn();
  const recovery = createBankExecutionRecovery({
    store: { load: async () => ({ schema: 'bank.execution-checkpoint.v1', operationId: original.attemptId, plan: original, transitionSet: {} as never, recovery: {} as never, state: 'committed' }), saveNew: vi.fn(), replace: vi.fn() },
    connect, assertOpen: () => {}, lock: async fn => fn(),
  });
  await expect(recovery.status()).rejects.toThrow();
  expect(connect).not.toHaveBeenCalled();
});
it('recovers the previous native registration at its original application coordinate without executing',async()=>{
 const applicationId='rc_uV6aT6wZJCQDspB0_SJ1DcEm',original=await plan(applicationId);
 const lookup=vi.fn(async(_coordinate:unknown)=>{throw Error('fixture-read-only-stop');}),stage=vi.fn(),execute=vi.fn();
 const connect=vi.fn(async()=>({execution:{resolveByIdempotencyKey:lookup,stagePrepared:stage,execute}}));
 const recovery=createBankExecutionRecovery({store:{load:async()=>({schema:'bank.execution-checkpoint.v1',operationId:original.attemptId,plan:original,transitionSet:{} as never,state:'unknown'}),saveNew:vi.fn(),replace:vi.fn()},connect:connect as never,assertOpen(){},lock:async fn=>fn()});
 expect((await recovery.status())?.state).toBe('unknown');
 await expect(recovery.resolve(true)).rejects.toThrow('fixture-read-only-stop');
 expect(connect).toHaveBeenCalledExactlyOnceWith(applicationId);expect(lookup.mock.calls[0][0]).toMatchObject({applicationId,semanticIdempotencyKey:original.semanticIdempotencyKey});expect(stage).not.toHaveBeenCalled();expect(execute).not.toHaveBeenCalled();
 await expect(createBankExecution({execution:{stagePrepared:stage,execute,exportCommittedRecovery:vi.fn(),resolveByIdempotencyKey:lookup}} as never).inspect(original,{} as never)).rejects.toThrow('BANK_EXECUTION_APPLICATION_MISMATCH');
});
