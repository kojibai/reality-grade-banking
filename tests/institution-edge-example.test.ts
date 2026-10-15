import { expect, it } from 'vitest';
import { createReceizClient } from '@receiz/sdk';
import { planAndInspectBothEdges } from '../institution/examples/edge-payments';

// Planning/inspection only: synthetic coordinates, no source admission, signer,
// transition store, network call, custody or financial action.
it.each(['settlement', 'reserve'] as const)('independently inspects both %s roles using the actual SDK plan', async rail => {
  const edge = createReceizClient().value.edge;
  const result = await planAndInspectBothEdges(edge, rail, {
    applicationId: 'reference.fixture', amountPhiMicro: '1',
    sourceProofObjectId: 'nonfinancial-fixture-source', sourceValueHead: 'a'.repeat(64),
    destinationSubjectId: 'nonfinancial-fixture-receiver', expectedDestinationHead: 'b'.repeat(64),
    usdPerPhiMicrocents: '1', priceBasis: { nonfinancialFixture: true }, attemptId: 'nonfinancial-fixture-attempt',
  });
  expect(result.sender).toMatchObject({ rail, role: 'sender', participantId: result.plan.sourceParticipantId });
  expect(result.receiver).toMatchObject({ rail, role: 'receiver', participantId: result.plan.destinationParticipantId });
  expect(result.plan.authority.planIsTransactionAuthority).toBe(false);
});
