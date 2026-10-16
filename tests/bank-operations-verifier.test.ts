import { expect, it, vi } from 'vitest';
import * as sdk from '@receiz/sdk';
import { createBankOperations } from '../src/receiz/bank-operations';
import { BANK_APPLICATION_ID } from '../src/receiz/config';
// Exercise the generic SDK refusal separately from the production financial
// qualification gate. This does not qualify any positive financial source.
vi.mock('../src/receiz/bank-operation-qualification', () => ({ assertBankOperationQualified() {} }));

it('the unmodified v129 verifier rejects a forged prepared source before any execution or retention', async () => {
  const saveNew = vi.fn(), stagePrepared = vi.fn(), execute = vi.fn();
  const request = vi.fn(async (_path: string, options: { body: { request: { requestId: string } } }) => {
    const requested = options.body.request, namespace = 'custom:bankeiz', heads = { fixture: 'b'.repeat(64) }, bindings = await sdk.createReceizCustomReducerBindingsV124({ namespace, registryDigest: 'c'.repeat(64), reducerDigest: 'd'.repeat(64) });
    const plan = await sdk.planAtomicOperationV124({ applicationId: BANK_APPLICATION_ID, operations: [{ operationId: 'nonfinancial-forgery-refusal', category: 'custom', domainId: namespace, ...bindings, participants: ['fixture'], payload: { schema: 'receiz.custom-reducer-operation.v124', namespace, registryDigest: 'c'.repeat(64), reducerDigest: 'd'.repeat(64), expectedParticipantHeads: heads, operation: { schema: 'bankeiz.operation.v1', request: requested, terms: { debitUsdCents: '500', debitPhiMicro: '1000000', creditUsdCents: '0', creditPhiMicro: '0', feeUsdCents: '0', quantityMicro: '1000000', assetDigest: 'a'.repeat(64), recipient: null, expiresAtKaiUPulse: sdk.receizKaiNow().uPulse + 10_000_000 } } } }], participants: ['fixture'], expectedParticipantHeads: heads, semanticIdempotencyKey: await sdk.digestReceizCanonicalV122(requested), attemptId: requested.requestId });
    return { schema: 'bankeiz.prepared-operation.v1', plan, transitionSet: { verified: true, authority: 'invented' } };
  });
  const api = createBankOperations({ ownerReceizId: 'fixture.receiz.id', assertOpen: () => {}, store: { load: async () => null, saveNew, replace: vi.fn() }, context: async () => ({ client: { request, execution: { stagePrepared, execute } } as never, session: { actorSubjectId: 'fixture', authoritySessionHandle: 'test-only' } as never }), lock: async fn => fn() });
  await expect(api.prepare({ kind: 'exchange', rail: 'reserve', amountUsdCents: '500', assetDigest: 'a'.repeat(64) })).rejects.toThrow();
  expect(saveNew).not.toHaveBeenCalled(); expect(stagePrepared).not.toHaveBeenCalled(); expect(execute).not.toHaveBeenCalled();
});
