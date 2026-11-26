import { collectClosedEvidence } from './governance-closure';
import type { GovernanceRow } from './governance-directory';
import { requireGovernanceOriginal, type GovernanceOriginal } from './governance-documents';
import { readGovernanceDecision, transportGovernanceOriginals } from './governance-execution-plan';
import { charterRatification, type Row } from './governance-view';
import type { OpenIdentity } from './native-identity';

const hex = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);

export const openGovernanceCommandSchema = 'bankeiz.governance.open-register.v1';
type PortableOriginal = Awaited<ReturnType<typeof transportGovernanceOriginals>>[number];
export type SignedGovernanceOriginal = Readonly<{
  artifact: PortableOriginal;
  proof: import('@receiz/sdk').ReceizIdentityLoginProof;
  accountId: string;
  baselineSourceSha256: string;
  headSourceSha256: string;
}>;

export async function governanceOriginalAuthorization(
  original: GovernanceOriginal,
  input: Readonly<{
    applicationId: string;
    accountId: string;
    keyId: string;
    request(artifact: PortableOriginal): Promise<unknown>;
    sign(challengeB64Url: string): Promise<SignedGovernanceOriginal['proof']>;
  }>,
): Promise<SignedGovernanceOriginal> {
  const source = requireGovernanceOriginal(original);
  const [artifact] = await transportGovernanceOriginals([source]);
  const reply = await input.request(artifact) as Record<string, unknown> | null;
  if (reply?.accountId !== input.accountId || !hex(reply.baselineSourceSha256) || !hex(reply.headSourceSha256)) {
    throw Error('The author’s current account proof is unavailable.');
  }
  const { baselineSourceSha256, headSourceSha256 } = reply;
  const { canonicalizeReceizV122, receizBase64UrlEncode } = await import('@receiz/sdk');
  const challenge = receizBase64UrlEncode(new TextEncoder().encode(canonicalizeReceizV122({
    schema: 'bankeiz.governance.author-original.v1',
    applicationId: input.applicationId,
    author: source.document.author,
    originalSha256: artifact.artifactSha256,
    accountId: input.accountId,
    baselineSourceSha256,
    headSourceSha256,
    keyId: input.keyId,
  })));
  if (reply.challengeB64Url !== challenge) throw Error('The review does not match the exact signed Original.');
  const proof = await input.sign(challenge);
  return { artifact, proof, accountId: input.accountId, baselineSourceSha256, headSourceSha256 };
}

export async function retainRatifiedCurrencyCharter(identity: OpenIdentity, charter: Row<'charter'>, rows: readonly GovernanceRow[], read: (digest: string) => Promise<GovernanceOriginal>) {
  if (!identity.currencyGovernance) throw Error('Open a Bankeiz account to link the charter.');
  const ratification = charterRatification(charter, rows);
  if (!ratification.complete) throw Error('All founders must ratify this charter before linking it.');
  const originals = await Promise.all([charter, ...ratification.approvals].map(row => read(row.digest)));
  let sources: Record<string, unknown>;
  if (charter.document.terms.rules.execution?.rule === 'registered-roll-closure-v1') {
    const authorize = identity.authorizeGovernanceOriginal;
    if (!authorize || originals.some(original => original.document.author !== identity.binding.artifactOwnerReceizId)) {
      throw Error('Linking this charter requires the exact authorization of each founder.');
    }
    const [signedCharter, ...ratifications] = await Promise.all(originals.map(original => authorize(original)));
    sources = { schema: 'bankeiz.governance.open-currency-charter-sources.v1', charter: signedCharter, ratifications };
  } else {
    sources = { schema: 'bankeiz.governance.currency-charter-sources.v1',
      charter: charter.digest, originals: await transportGovernanceOriginals(originals) };
  }
  const result = await identity.currencyGovernance(sources) as Record<string, unknown>;
  if (result?.status !== 'retained' || result.governanceCharterSha256 !== charter.digest || !hex(result.governanceEvidenceSha256)) {
    throw Error('The charter’s retained proof is unavailable.');
  }
  return { governanceCharterSha256: charter.digest, governanceEvidenceSha256: result.governanceEvidenceSha256 };
}

const holderPhases = ['registration', 'review', 'voting', 'appeal', 'awaiting-freeze', 'awaiting-close', 'closed'] as const;
const windowFields = ['registrationOpensAtKai', 'registrationClosesAtKai', 'voteOpensAtKai', 'voteClosesAtKai', 'appealsCloseAtKai'] as const;
const pulse = (value: unknown): value is string => typeof value === 'string' && /^(0|[1-9][0-9]{0,24})$/u.test(value);
const digestOrNull = (value: unknown): value is string | null => value === null || hex(value);

export type HolderVoteStatus = Readonly<{
  phase: typeof holderPhases[number];
  window: Readonly<Record<typeof windowFields[number], string>>;
  registration: { savedOriginalSha256: string | null; acceptedOriginalSha256: string | null };
  ballot: { savedOriginalSha256: string | null; acceptedOriginalSha256: string | null };
}>;

export async function readHolderVoteStatus(identity: OpenIdentity, charter: GovernanceOriginal, proposal: string): Promise<HolderVoteStatus> {
  if (!identity.currencyGovernance) throw Error('Open the Bankeiz account you want to vote with.');
  const [artifact] = await transportGovernanceOriginals([charter]);
  const response = await identity.currencyGovernance({schema: openGovernanceCommandSchema,
    action: 'participant', charter: artifact, proposal}) as {
    proposal?: unknown; phase?: unknown; window?: Record<string, unknown>;
    registration?: Record<string, unknown>; ballot?: Record<string, unknown>;
  } | null;
  if (response?.proposal !== proposal || !holderPhases.some(phase => phase === response.phase) ||
    !windowFields.every(key => pulse(response.window?.[key])) ||
    ![response.registration,response.ballot].every(record => digestOrNull(record?.savedOriginalSha256) && digestOrNull(record?.acceptedOriginalSha256))) {
    throw Error('The held vote status could not be opened.');
  }
  return response as HolderVoteStatus;
}

export async function submitHolderGovernanceOriginal(identity: OpenIdentity, charter: GovernanceOriginal, original: GovernanceOriginal) {
  const phase = original.document.terms.kind;
  if (!identity.authorizeGovernanceOriginal || !identity.currencyGovernance ||
    !['proposal','registration','ballot','challenge'].includes(phase)) throw Error('Open the author’s Bankeiz account to submit this Original.');
  if (charter.document.terms.kind !== 'charter' || charter.document.terms.rules.execution?.rule !== 'registered-roll-closure-v1' ||
    !('charter' in original.document.terms) || original.document.terms.charter !== charter.digest) {
    throw Error('The Original belongs to a different charter.');
  }
  const [[artifact], statement] = await Promise.all([transportGovernanceOriginals([charter]),identity.authorizeGovernanceOriginal(original)]);
  const reply = await identity.currencyGovernance({schema: openGovernanceCommandSchema, action: 'submit', phase,
    charter: artifact, statement}) as Record<string, unknown> | null;
  if (reply?.status !== 'submitted' || reply.originalSha256 !== original.digest || !hex(reply.submissionSha256)) {
    throw Error('Submission is unconfirmed. Your signed Original is still saved here.');
  }
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
