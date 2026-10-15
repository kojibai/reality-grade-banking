import { expect, it, vi } from 'vitest';
import { createBankExecutionRecovery } from '../src/receiz/bank-execution-recovery';
import { BANK_APPLICATION_ID } from '../src/receiz/config';

// A choreography boundary fixture, never a verified financial source.
const operation = { schema: 'bank.execution-checkpoint.v1', state: 'unknown', operationId: 'fixture-attempt', plan: { applicationId: BANK_APPLICATION_ID, operationKind: 'fixture-check', exactPlanDigest: 'a'.repeat(64), attemptId: 'fixture-attempt' }, transitionSet: { privateOriginals: 'must-not-reach-display' } } as const;
const mocks = vi.hoisted(() => ({ result: null as unknown, resolve: vi.fn(), reopen: vi.fn() }));
vi.mock('../src/receiz/bank-execution', () => ({ createBankExecution: (client: { execution: Record<string, (...args: unknown[]) => unknown> }) => ({ resolve: async () => {
  mocks.resolve();
  if (mocks.result === 'committed') {
    await client.execution.resolveByIdempotencyKey({ fixture: 'original-coordinate' });
    client.execution.exportCommittedRecovery({ fixture: 'sdk-admitted-outcome' });
  }
  return mocks.result;
} }) }));
vi.mock('../src/receiz/client', () => ({ loadReceiz: async () => ({ exportReceizCommittedExecutionRecoveryV124: mocks.reopen }) }));

function fixture(value: unknown = operation) {
  const connect = vi.fn(async () => ({ execution: { resolveByIdempotencyKey: vi.fn(async () => ({})), stagePrepared: vi.fn(), execute: vi.fn() } }));
  const api = createBankExecutionRecovery({ store: { load: async () => value as never, saveNew: vi.fn(), replace: vi.fn() }, connect: connect as never, assertOpen: () => {}, lock: async fn => fn() });
  return { api, connect };
}

it('shows no recovery controls and acquires no grant for an account with no retained attempt', async () => {
  const { api, connect } = fixture(null);
  expect(await api.status()).toBeNull(); expect(await api.resolve()).toBeNull(); expect(connect).not.toHaveBeenCalled();
});
it('returns a minimal local display without exposing proof sources or requesting access', async () => {
  const { api, connect } = fixture();
  expect(await api.status()).toEqual({ operationId: 'fixture-attempt', operationKind: 'fixture-check', planDigest: 'a'.repeat(64), state: 'unknown', hasRecovery: false });
  expect(connect).not.toHaveBeenCalled();
});
it('passes an actual resolved outcome to the SDK committed-recovery exporter without staging or executing', async () => {
  mocks.result = 'committed'; mocks.reopen.mockClear();
  const { api, connect } = fixture();
  await api.resolve(true); expect(connect).toHaveBeenCalledTimes(1); expect(mocks.reopen).toHaveBeenCalledWith({ fixture: 'sdk-admitted-outcome' });
  const client = await connect.mock.results[0].value;
  expect(client.execution.stagePrepared).not.toHaveBeenCalled(); expect(client.execution.execute).not.toHaveBeenCalled();
});
it('does not acquire recovery access without the user approving the outcome check', async () => {
  mocks.result = 'committed';
  const { api, connect } = fixture();
  await expect(api.resolve()).rejects.toThrow('BANK_EXECUTION_RECOVERY_CONSENT_REQUIRED');
  expect(connect).not.toHaveBeenCalled();
});
it('refuses exporting a pending attempt as a successful recovery', async () => {
  await expect(fixture().api.exportRecovery()).rejects.toThrow('BANK_EXECUTION_COMMITTED_RECOVERY_REQUIRED');
});
it('refuses local status coordinates from another application', async () => {
  await expect(fixture({ ...operation, plan: { ...operation.plan, applicationId: 'foreign' } }).api.status()).rejects.toThrow('BANK_EXECUTION_CHECKPOINT_INVALID');
});
