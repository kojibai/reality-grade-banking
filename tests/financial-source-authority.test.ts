import {beforeAll, expect, it} from 'vitest';
import {canonicalJson} from '../src/conformance/assessment';
import {createLocalFinancialSession} from '../src/receiz/local-financial';
import type {FinancialCommit, FinancialSource} from '../src/receiz/local-financial-runtime';
import {createLocalFinancialFixtureFactory} from './helpers/local-financial-fixture';

// Synthetic funding and stores; actual Source admission, signatures and replay.
// These checks establish local authority boundaries, not production funding.
let fixture: Awaited<ReturnType<typeof createLocalFinancialFixtureFactory>>;
beforeAll(async () => { fixture = await createLocalFinancialFixtureFactory(); }, 60_000);

it('refuses serialized financial-source descriptions and copied admitted handles', async () => {
  const f = await fixture();
  const source = await f.runtime.admitReceizAccountFinancialSource(f.options.sourceBytes);
  await expect(f.runtime.admitReceizAccountFinancialSource(
    new TextEncoder().encode(JSON.stringify(source)),
  )).rejects.toThrow(/ACCOUNT_FINANCIAL_SOURCE_/);
  expect(() => f.runtime.financialSourceApplicationId({...source})).toThrow(/CUSTODY_REQUIRED/);
  expect(f.originals.size).toBe(0);
  expect(f.requests).toHaveLength(0);
});

it('ignores changes to a returned wallet or ledger view when executing the next action', async () => {
  const f = await fixture(), session = await createLocalFinancialSession(f.options);
  try {
    const before = await session.current(), view = await session.current();
    const viewWallet = view.state.wallet as Record<string, string>;
    const viewLedger = view.state.walletLedger as Record<string, string>;
    viewWallet.availableUsdCents = '9223372036854775807';
    viewWallet.balancePhiMicro = '9223372036854775807';
    viewLedger.totalCreditUsdCents = '9223372036854775807';
    expect(await session.current()).toEqual(before);
    await expect(session.execute({
      operationId: 'a1111111-1111-4111-8111-111111111111',
      action: {kind: 'send', recipientUserId: '33333333-3333-4333-8333-333333333333',
        conversationId: '44444444-4444-4444-8444-444444444444', amountUsdCents: '10001'},
    })).rejects.toThrow(/WALLET_INSUFFICIENT_BALANCE/);
    expect(await session.current()).toEqual(before);
    expect(f.requests).toHaveLength(0);
  } finally { session.dispose(); }
});

it('replays an exact financial Original and refuses its altered next-state balance', async () => {
  const f = await fixture(), session = await createLocalFinancialSession(f.options);
  const runtime = f.runtime as typeof f.runtime & {
    admitReceizAccountFinancialOperation(bytes: Uint8Array, options: {
      source: FinancialSource; predecessor: null;
    }): Promise<{artifactSha256: string}>;
    exportReceizAccountFinancialCommit(commit: FinancialCommit): Uint8Array;
  };
  try {
    const source = await runtime.admitReceizAccountFinancialSource(f.options.sourceBytes);
    const commit = await session.execute({
      operationId: 'a2222222-2222-4222-8222-222222222222',
      action: {kind: 'buy', marketItemId: 'asset:held', amountUsdCents: '100'},
    });
    expect(commit.status).toBe('committed');
    if (commit.status !== 'committed') throw Error('Synthetic commit missing');
    const original = runtime.exportReceizAccountFinancialCommit(commit);
    expect((await runtime.admitReceizAccountFinancialOperation(original, {
      source, predecessor: null,
    })).artifactSha256).toBe(commit.operation.artifactSha256);
    const altered = JSON.parse(new TextDecoder().decode(original));
    altered.nextState.wallet.balancePhiMicro =
      String(BigInt(altered.nextState.wallet.balancePhiMicro) + 1n);
    await expect(runtime.admitReceizAccountFinancialOperation(
      new TextEncoder().encode(canonicalJson(altered)), {source, predecessor: null},
    )).rejects.toThrow(/ORIGINAL_MISMATCH/);
    expect(() => runtime.exportReceizAccountFinancialCommit(
      structuredClone(commit),
    )).toThrow(/COMMIT_CUSTODY_REQUIRED/);
    expect(f.requests).toHaveLength(0);
  } finally { session.dispose(); }
});
