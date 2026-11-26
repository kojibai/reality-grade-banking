import { collectClosedEvidence } from './governance-closure';
import type { GovernanceRow } from './governance-directory';
import { requireGovernanceOriginal, type GovernanceOriginal } from './governance-documents';
import { readGovernanceDecision, transportGovernanceOriginals } from './governance-execution-plan';
import { charterRatification, type Row } from './governance-view';
import type { OpenIdentity } from './native-identity';

const hex = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);

export async function retainRatifiedCurrencyCharter(identity: OpenIdentity, charter: Row<'charter'>, rows: readonly GovernanceRow[], read: (digest: string) => Promise<GovernanceOriginal>) {
  if (!identity.currencyGovernance) throw Error('Open a Bankeiz account to link the charter.');
  const ratification = charterRatification(charter, rows);
  if (!ratification.complete) throw Error('All founders must ratify this charter before linking it.');
  const originals = await Promise.all([charter, ...ratification.approvals].map(row => read(row.digest)));
  const result = await identity.currencyGovernance({
    schema: 'bankeiz.governance.currency-charter-sources.v1',
    charter: charter.digest,
    originals: await transportGovernanceOriginals(originals),
  }) as Record<string, unknown>;
  if (result?.status !== 'retained' || result.governanceCharterSha256 !== charter.digest || !hex(result.governanceEvidenceSha256)) {
    throw Error('The charter’s retained proof is unavailable.');
  }
  return { governanceCharterSha256: charter.digest, governanceEvidenceSha256: result.governanceEvidenceSha256 };
}

type CurrencyReceipt = { status: 'rejected' } | { status: 'applied'; assetId: string; sourceSha256: string };
const deliveries = new WeakMap<OpenIdentity, Map<string, Promise<CurrencyReceipt>>>();

export function applyCurrencyDecision(identity: OpenIdentity, proposal: Row<'proposal'>, rows: readonly GovernanceRow[], read: (digest: string) => Promise<GovernanceOriginal>) {
  const attempts = deliveries.get(identity) ?? new Map<string, Promise<CurrencyReceipt>>();
  deliveries.set(identity, attempts);
  const pending = attempts.get(proposal.digest);
  if (pending) return pending;
  const delivery = submitCurrencyDecision(identity, proposal, rows, read);
  attempts.set(proposal.digest, delivery);
  void delivery.then(result => { if (result.status === 'rejected') attempts.delete(proposal.digest); }, () => { attempts.delete(proposal.digest); });
  return delivery;
}

async function submitCurrencyDecision(identity: OpenIdentity, proposal: Row<'proposal'>, rows: readonly GovernanceRow[], read: (digest: string) => Promise<GovernanceOriginal>) {
  if (!identity.currencyGovernance) throw Error('Open a Bankeiz account to deliver the decision proof.');
  const originals = await collectClosedEvidence(proposal, rows, read);
  const decision = await readGovernanceDecision({ proposal: proposal.digest, originals });
  if (!decision.approved) return { status: 'rejected' as const };
  if (!decision.currencyChange) throw Error('This proof does not authorize a currency change.');
  const assetId = decision.currencyChange.assetId;
  const result = await identity.currencyGovernance({
    schema: 'bankeiz.governance.closure-sources.v1',
    proposal: proposal.digest,
    originals: await transportGovernanceOriginals(originals.map(requireGovernanceOriginal)),
  }) as Record<string, unknown>;
  if (result?.status !== 'applied' || result.proposalSha256 !== proposal.digest || result.assetId !== assetId || !hex(result.sourceSha256)) {
    throw Error('The currency’s accepted change is unavailable.');
  }
  return { status: 'applied' as const, assetId, sourceSha256: result.sourceSha256 };
}
