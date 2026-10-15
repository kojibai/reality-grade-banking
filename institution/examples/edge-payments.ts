import type { ReceizClient, ReceizPortableExecutionTransitionSetV124 } from '@receiz/sdk';

/** Type-checked orchestration boundaries, not a signing or commit-store adapter.
 * The host must first admit the exact sources, bind its application/identity,
 * obtain consent and retain the exact operation outside model context. */
type Edge = ReceizClient['value']['edge'];
type Rail = 'settlement' | 'reserve';
type Input = Parameters<Edge['planSettlement']>[0];
type Plan = Awaited<ReturnType<Edge['planSettlement']>>;
type Recovery = Parameters<Edge['createRecovery']>[0];

export async function planAndInspectBothEdges(edge: Edge, rail: Rail, admittedInput: Input) {
  if (rail !== 'settlement' && rail !== 'reserve') throw Error('EXPLICIT_RAIL_REQUIRED');
  const plan = await (rail === 'settlement' ? edge.planSettlement(admittedInput) : edge.planReserve(admittedInput));
  const sender = await edge.inspect(plan.plan, { participantId: plan.sourceParticipantId, expectedRail: rail });
  const receiver = await edge.inspect(plan.plan, { participantId: plan.destinationParticipantId, expectedRail: rail });
  // Return the exact SDK objects. Persist the canonical plan, then independently
  // reopen it at the other edge. This does not commit or authorize a payment.
  return { plan, sender, receiver };
}

export async function verifyAndPrepareExactSet(edge: Edge, untrustedSet: unknown, applicationId: string) {
  const verified = await edge.verifyTransitionSet(untrustedSet, { audience: applicationId });
  return edge.prepareCommitSet(verified);
}

export async function packageActuallyCommittedTransitions(edge: Edge, input: Recovery) {
  // Only real SDK-issued committed transitions cross this boundary. A typed
  // assertion, SQL receipt or serialized object cannot mint SDK custody.
  return edge.createRecovery(input);
}

export async function receiveCommittedValue(edge: Edge, rail: Rail, untrustedRecovery: unknown, boundReceiver: { applicationId: string; participantId: string }) {
  if (rail !== 'settlement' && rail !== 'reserve') throw Error('EXPLICIT_RAIL_REQUIRED');
  // The SDK reopens the full recovery under pinned trust, checks the named
  // participant and rail, and derives the actual committed participant source.
  return rail === 'settlement' ? edge.receiveSettlement(untrustedRecovery, boundReceiver) : edge.receiveReserve(untrustedRecovery, boundReceiver);
}

// Contracts for the host's durable records; these are stored source transports,
// never live handles. They must be canonically reverified after reopening.
export interface RetainedPayment {
  readonly plan: Plan;
  readonly transitionSet: ReceizPortableExecutionTransitionSetV124;
  readonly recovery: Awaited<ReturnType<Edge['createRecovery']>> | null;
}
