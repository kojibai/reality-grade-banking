import { beforeEach, expect, it, vi } from 'vitest';
import * as sdk from '@receiz/sdk';
import { createBankExecution, type BankExecutionCheckpoint, type BankExecutionStore } from '../src/receiz/bank-execution';
import { BANK_APPLICATION_ID } from '../src/receiz/config';

// Protocol choreography fixtures only: simulate an already-admitted boundary
// to exercise lost responses and device state. This file does not verify bank
// proof sources or qualify any financial operation. The separate rejection
// tests use the unchanged actual SDK verifier.
const temporal = vi.hoisted(() => ({ sourceAdmissible: true }));
beforeEach(() => { temporal.sourceAdmissible = true; });
vi.mock('../src/receiz/client', () => ({ loadReceiz: async () => {
  const actual = await import('@receiz/sdk');
  return { ...actual, verifyReceizPortableExecutionTransitionSetV124: async (raw: sdk.ReceizPortableExecutionTransitionSetV124) => { if (!temporal.sourceAdmissible) throw new Error('EXPIRED'); return { operationPlan: raw.members[0].operationPlan, proposedParticipantHeads: raw.proposedParticipantHeads, members: raw.members }; } };
} }));
async function fixture() {
  const namespace = 'custom:bank-source-check', heads = { fixture: 'a'.repeat(64) };
  const bindings = await sdk.createReceizCustomReducerBindingsV124({ namespace, registryDigest: 'b'.repeat(64), reducerDigest: 'c'.repeat(64) });
  const plan = await sdk.planAtomicOperationV124({ applicationId: BANK_APPLICATION_ID, operations: [{ operationId: 'fixture-check', category: 'custom', domainId: namespace, ...bindings, participants: ['fixture'], payload: { schema: 'receiz.custom-reducer-operation.v124', namespace, registryDigest: 'b'.repeat(64), reducerDigest: 'c'.repeat(64), expectedParticipantHeads: heads, operation: { schema: 'bank.source-check.v1' } } }], participants: ['fixture'], expectedParticipantHeads: heads, semanticIdempotencyKey: 'fixture-check', attemptId: 'fixture-attempt' });
  const source = { members: [{ operationPlan: plan }], proposedParticipantHeads: { fixture: 'd'.repeat(64) } } as unknown as sdk.ReceizPortableExecutionTransitionSetV124;
  return { plan, source };
}
function memoryStore() {
  let value: BankExecutionCheckpoint | null = null;
  const store: BankExecutionStore = {
    load: async () => structuredClone(value),
    saveNew: async next => { if (value && ['prepared', 'unknown'].includes(value.state)) throw new Error('BANK_EXECUTION_PENDING'); value = structuredClone(next); },
    replace: async next => { if (value?.operationId !== next.operationId) throw new Error('BANK_EXECUTION_CHECKPOINT_CHANGED'); value = structuredClone(next); },
  };
  return store;
}
it('requires the same held review and exact confirmation before creating a pending intent', async () => {
  const { plan, source } = await fixture(), store = memoryStore(), client = {} as sdk.ReceizClient;
  const runtime = createBankExecution(client, store), review = await runtime.inspect(plan, source);
  await expect(runtime.execute({ ...review }, review.confirmationDigest, null)).rejects.toThrow('BANK_EXECUTION_EXACT_CONFIRMATION_REQUIRED');
  await expect(runtime.execute(review, 'wrong', null)).rejects.toThrow('BANK_EXECUTION_EXACT_CONFIRMATION_REQUIRED');
  expect(await store.load()).toBeNull();
});
it('retains a lost submission as unknown and resolves the same intent after restart without another execution', async () => {
  const { plan, source } = await fixture(), store = memoryStore();
  const client = { execution: { stagePrepared: async () => { throw new Error('response-lost'); }, resolveByIdempotencyKey: async () => ({ ...plan, status: 'unknown', executionId: 'fixture-execution' }) } } as unknown as sdk.ReceizClient;
  const runtime = createBankExecution(client, store), review = await runtime.inspect(plan, source);
  expect(await runtime.execute(review, review.confirmationDigest, null)).toEqual({ status: 'unknown', operationId: plan.attemptId });
  const pending = await store.load(); expect(pending?.state).toBe('unknown'); expect(pending?.plan).toEqual(plan); expect(pending?.transitionSet).toEqual(source);
  const restored = createBankExecution(client, store);
  expect(await restored.resolve()).toEqual({ status: 'unknown', operationId: plan.attemptId });
  const second = await restored.inspect(plan, source);
  await expect(restored.execute(second, second.confirmationDigest, null)).rejects.toThrow('BANK_EXECUTION_PENDING');
  expect((await store.load())?.state).toBe('unknown');
});
it('never reports committed from a caller-shaped successful response without canonical recovery custody', async () => {
  const { plan, source } = await fixture(), store = memoryStore();
  const client = { execution: { stagePrepared: async () => ({}), execute: async () => ({ ...plan, status: 'committed', committedHeads: source.proposedParticipantHeads }), exportCommittedRecovery: sdk.exportReceizCommittedExecutionRecoveryV124 } } as unknown as sdk.ReceizClient;
  const runtime = createBankExecution(client, store), review = await runtime.inspect(plan, source);
  expect(await runtime.execute(review, review.confirmationDigest, null)).toEqual({ status: 'unknown', operationId: plan.attemptId });
  expect((await store.load())?.state).toBe('unknown');
});

it('retains an exact SDK staging refusal as zero-write and reopens it offline', async () => {
  const { plan, source } = await fixture(), store = memoryStore();
  const rejection = new sdk.ReceizExecutionZeroWriteErrorV124({ ...plan, schema: 'receiz.zero-write-failure.v124', executionId: null, reasonCode: 'STALE_HEAD', writes: 0 } as never);
  const stagePrepared = vi.fn(async () => { throw rejection; }), execute = vi.fn(), lookup = vi.fn(async () => { throw new Error('offline'); });
  const client = { execution: { stagePrepared, execute, resolveByIdempotencyKey: lookup } } as unknown as sdk.ReceizClient;
  const runtime = createBankExecution(client, store), review = await runtime.inspect(plan, source);
  expect(await runtime.execute(review, review.confirmationDigest, null)).toEqual({ status: 'zero-write', reasonCode: 'STALE_HEAD' });
  expect((await store.load())?.state).toBe('zero-write');
  expect(await createBankExecution(client, store).resolve()).toEqual({ status: 'zero-write', reasonCode: 'STALE_HEAD' });
  expect(stagePrepared).toHaveBeenCalledTimes(1); expect(execute).not.toHaveBeenCalled(); expect(lookup).not.toHaveBeenCalled();
});

it('keeps a foreign SDK refusal unknown instead of asserting zero writes for this attempt', async () => {
  const { plan, source } = await fixture(), store = memoryStore();
  const client = { execution: { stagePrepared: async () => { throw new sdk.ReceizExecutionZeroWriteErrorV124({ ...plan, schema: 'receiz.zero-write-failure.v124', attemptId: 'another-attempt', executionId: null, reasonCode: 'STALE_HEAD', writes: 0 } as never); } } } as unknown as sdk.ReceizClient;
  const runtime = createBankExecution(client, store), review = await runtime.inspect(plan, source);
  expect(await runtime.execute(review, review.confirmationDigest, null)).toEqual({ status: 'unknown', operationId: plan.attemptId });
});

it('keeps the exact held review usable when local retention fails before staging', async () => {
  const { plan, source } = await fixture(), store = memoryStore();
  const save = store.saveNew; let failRetention = true;
  store.saveNew = async checkpoint => { if (failRetention) throw new Error('device-full'); return save(checkpoint); };
  const stagePrepared = vi.fn(async () => { throw new Error('offline'); });
  const runtime = createBankExecution({ execution: { stagePrepared } } as unknown as sdk.ReceizClient, store), review = await runtime.inspect(plan, source);
  await expect(runtime.execute(review, review.confirmationDigest, null)).rejects.toThrow('device-full');
  expect(stagePrepared).not.toHaveBeenCalled(); expect(await store.load()).toBeNull();
  failRetention = false;
  expect(await runtime.execute(review, review.confirmationDigest, null)).toEqual({ status: 'unknown', operationId: plan.attemptId });
  expect(stagePrepared).toHaveBeenCalledTimes(1);
});

it('can resolve the original pending coordinate to zero-write after its candidate capability expires', async () => {
  const { plan, source } = await fixture(), store = memoryStore();
  const lookup = vi.fn(async () => ({ ...plan, status: 'zero-write', writes: 0, reasonCode: 'UNAUTHORIZED' }));
  const client = { execution: { stagePrepared: async () => { throw new Error('reply-lost'); }, resolveByIdempotencyKey: lookup } } as unknown as sdk.ReceizClient;
  const runtime = createBankExecution(client, store), review = await runtime.inspect(plan, source);
  await runtime.execute(review, review.confirmationDigest, null); temporal.sourceAdmissible = false;
  expect(await createBankExecution(client, store).resolve()).toEqual({ status: 'zero-write', reasonCode: 'UNAUTHORIZED' });
  expect(lookup).toHaveBeenCalledWith({ applicationId: plan.applicationId, domainId: plan.domainId, operationKind: plan.operationKind, semanticIdempotencyKey: plan.semanticIdempotencyKey });
  expect(await createBankExecution(client, store).resolve()).toEqual({ status: 'zero-write', reasonCode: 'UNAUTHORIZED' });
  expect(lookup).toHaveBeenCalledTimes(1);
});
