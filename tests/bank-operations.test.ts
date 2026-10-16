import { expect, it, vi } from 'vitest';
import * as sdk from '@receiz/sdk';
import { createBankOperations, type BankOperationInput, type BankOperationRequest } from '../src/receiz/bank-operations';
import type { BankExecutionCheckpoint, BankExecutionStore } from '../src/receiz/bank-execution';
import { BANK_APPLICATION_ID } from '../src/receiz/config';
import { permittedNativePath } from '../src/receiz/native-transport';

// Composition fixtures only. Native positive financial qualification is owned
// by the host; this simulates admitted transition custody, never a real source.
vi.mock('../src/receiz/bank-operation-qualification', () => ({ assertBankOperationQualified() {} }));
vi.mock('../src/receiz/client', () => ({ loadReceiz: async () => {
  const actual = await import('@receiz/sdk');
  return { ...actual, verifyReceizPortableExecutionTransitionSetV124: async (set: { members: { operationPlan: unknown }[] }) => ({ operationPlan: set.members[0].operationPlan, proposedParticipantHeads: {}, members: set.members }) };
} }));
const asset = 'a'.repeat(64), owner = 'fixture.receiz.id';
const exchange: BankOperationInput = { kind: 'exchange', rail: 'reserve', amountUsdCents: '500', assetDigest: asset };
function store() {
  let current: BankExecutionCheckpoint | null = null;
  const result: BankExecutionStore = { load: async () => structuredClone(current), saveNew: async value => { if (current && ['prepared', 'unknown'].includes(current.state)) throw Error('pending'); current = structuredClone(value); }, replace: async value => { current = structuredClone(value); } }; return result;
}
async function packet(request: BankOperationRequest, change?: (operation: { schema: string; request: BankOperationRequest; terms: Record<string, unknown> }) => void) {
  const command = { schema: 'bankeiz.operation.v1', request: structuredClone(request), terms: { debitUsdCents: '500', debitPhiMicro: '1000000', creditUsdCents: '0', creditPhiMicro: '0', feeUsdCents: '0', quantityMicro: '1000000', assetDigest: asset, recipient: null, expiresAtKaiUPulse: sdk.receizKaiNow().uPulse + 10_000_000 } as Record<string, unknown> }; change?.(command);
  const namespace = 'custom:bankeiz', heads = { fixture: 'b'.repeat(64) }, bindings = await sdk.createReceizCustomReducerBindingsV124({ namespace, registryDigest: 'c'.repeat(64), reducerDigest: 'd'.repeat(64) });
  const plan = await sdk.planAtomicOperationV124({ applicationId: BANK_APPLICATION_ID, operations: [{ operationId: 'fixture-bank-operation', category: 'custom', domainId: namespace, ...bindings, participants: ['fixture'], payload: { schema: 'receiz.custom-reducer-operation.v124', namespace, registryDigest: 'c'.repeat(64), reducerDigest: 'd'.repeat(64), expectedParticipantHeads: heads, operation: command } }], participants: ['fixture'], expectedParticipantHeads: heads, semanticIdempotencyKey: await sdk.digestReceizCanonicalV122(request), attemptId: request.requestId });
  return { schema: 'bankeiz.prepared-operation.v1', plan, transitionSet: { members: [{ operationPlan: plan }] } };
}
function setup(change?: Parameters<typeof packet>[1]) {
  const retained = store(); let prepared: Awaited<ReturnType<typeof packet>>;
  const request = vi.fn(async (_path: string, body: { body: { request: BankOperationRequest } }) => prepared = await packet(body.body.request, change));
  const stagePrepared = vi.fn(async () => { throw new sdk.ReceizExecutionZeroWriteErrorV124({ ...prepared.plan, schema: 'receiz.zero-write-failure.v124', reasonCode: 'STALE_HEAD', writes: 0 } as never); });
  const execute = vi.fn(), context = vi.fn(async () => ({ client: { request, execution: { stagePrepared, execute } } as unknown as sdk.ReceizClient, session: { actorSubjectId: 'fixture-subject', authoritySessionHandle: 'fixture-session', expiresAtKaiUPulse: sdk.receizKaiNow().uPulse + 10_000_000 } as sdk.ReceizAuthoritySessionV124 }));
  return { api: createBankOperations({ ownerReceizId: owner, store: retained, assertOpen: () => {}, context, lock: async fn => fn() }), retained, context, request, stagePrepared, execute };
}
it('prepares without submission, requires the held exact review, and accepts only its own zero-write refusal', async () => {
  const x = setup(), review = await x.api.prepare(exchange);
  expect(x.stagePrepared).not.toHaveBeenCalled(); expect(await x.retained.load()).toBeNull();
  await expect(x.api.execute({ ...review }, review.confirmationDigest)).rejects.toThrow('EXACT_CONFIRMATION');
  await expect(x.api.execute(review, 'wrong')).rejects.toThrow('EXACT_CONFIRMATION');
  expect(await x.api.execute(review, review.confirmationDigest)).toEqual({ status: 'zero-write', reasonCode: 'STALE_HEAD' });
  expect(x.stagePrepared).toHaveBeenCalledTimes(1); expect(x.execute).not.toHaveBeenCalled();
});
it.each(['target', 'request', 'overspend', 'fee', 'expiry', 'unknown-terms'])('refuses %s substitution before retaining or submitting', async mutation => {
  const x = setup(command => {
    if (mutation === 'target') command.terms.assetDigest = 'f'.repeat(64);
    if (mutation === 'request' && 'amountUsdCents' in command.request) command.request.amountUsdCents = '600';
    if (mutation === 'overspend') command.terms.debitUsdCents = '501';
    if (mutation === 'fee') command.terms.feeUsdCents = '1';
    if (mutation === 'expiry') command.terms.expiresAtKaiUPulse = 1;
    if (mutation === 'unknown-terms') command.terms.privateApproval = true;
  });
  await expect(x.api.prepare(exchange)).rejects.toThrow(); expect(await x.retained.load()).toBeNull(); expect(x.stagePrepared).not.toHaveBeenCalled();
});
it('keeps a lost staging response unknown and blocks preparation of a replacement', async () => {
  const x = setup(); x.stagePrepared.mockRejectedValue(Error('lost response'));
  const review = await x.api.prepare(exchange);
  expect((await x.api.execute(review, review.confirmationDigest)).status).toBe('unknown');
  expect((await x.retained.load())?.state).toBe('unknown');
  await expect(x.api.prepare(exchange)).rejects.toThrow('BANK_EXECUTION_PENDING'); expect(x.request).toHaveBeenCalledTimes(1);
});
it('allows a held review retry after a local retention failure but never retries submission after an unknown outcome', async () => {
  const x = setup(), review = await x.api.prepare(exchange), save = x.retained.saveNew;
  x.retained.saveNew = async () => { throw Error('device full'); };
  await expect(x.api.execute(review, review.confirmationDigest)).rejects.toThrow('device full'); expect(x.stagePrepared).not.toHaveBeenCalled();
  x.retained.saveNew = save; await x.api.execute(review, review.confirmationDigest); expect(x.stagePrepared).toHaveBeenCalledTimes(1);
  await expect(x.api.execute(review, review.confirmationDigest)).rejects.toThrow('EXACT_CONFIRMATION');
});
it('discards a review without submitting and refuses unsupported input before connecting', async () => {
  const x = setup(), review = await x.api.prepare(exchange); x.api.discard(review);
  await expect(x.api.execute(review, review.confirmationDigest)).rejects.toThrow('EXACT_CONFIRMATION');
  const fresh = setup(); await expect(fresh.api.prepare({ ...exchange, amountUsdCents: '-1' })).rejects.toThrow(); expect(fresh.context).not.toHaveBeenCalled();
});
it('permits only the registered scoped preparation POST and no account selectors', () => {
  const path = `/api/connect/bank/prepare?applicationId=${BANK_APPLICATION_ID}`;
  expect(permittedNativePath(path, 'POST')).toBe(true); expect(permittedNativePath(path, 'GET')).toBe(false);
  expect(permittedNativePath(path + '&accountUid=foreign', 'POST')).toBe(false);
  expect(permittedNativePath(path + `&applicationId=${BANK_APPLICATION_ID}`, 'POST')).toBe(false);
});
