import { expect, it, vi } from 'vitest';
import { conformanceOfflineFixture } from './helpers/conformance-offline-sealer';
import type { GovernanceRow } from '../src/receiz/governance-directory';
import type { GovernanceOriginal, GovernanceTerms } from '../src/receiz/governance-documents';
import type { OpenIdentity } from '../src/receiz/native-identity';

const ports = vi.hoisted(() => ({ sdk: null as unknown, outbox: new Map<string, unknown>() }));
vi.mock('../src/receiz/client', () => ({ loadReceiz: async () => ports.sdk }));
vi.mock('../src/receiz/identity-vault', () => ({
  loadGovernanceOutbox: async (binding: { artifactSha256: string }) => structuredClone(ports.outbox.get(binding.artifactSha256)),
  saveGovernanceOutbox: async (binding: { artifactSha256: string }, next: unknown, expected: unknown) => {
    if (JSON.stringify(ports.outbox.get(binding.artifactSha256)) !== JSON.stringify(expected)) throw Error('BANK_NOTE_INTENT_CHANGED');
    ports.outbox.set(binding.artifactSha256, structuredClone(next));
  },
}));

it('resumes exact accepted closure delivery after a cold reopen and clears it on the native receipt even when asset display is unavailable', async () => {
  const start = Date.UTC(2026, 9, 5, 12);
  let elapsed = 0;
  const clock = vi.spyOn(Date, 'now').mockImplementation(() => start + elapsed);
  const monotonic = vi.spyOn(performance, 'now').mockImplementation(() => start + elapsed - performance.timeOrigin);
  try {
    const fixture = await conformanceOfflineFixture({ account: true, certificateDays: 7 });
    const installed = await import('@receiz/sdk');
    ports.sdk = { ...installed, ...fixture.runtime };
    const offline = fixture.runtime;
    async function device(identity: typeof fixture.identity) {
      const admission = await offline.createReceizArtifactAdmissionEngine()(await offline.verifyReceizArtifact(identity.bytes),
        { profile: 'identity', identityPassphrase: identity.phrase });
      const binding = await offline.readReceizIdentityPublicBinding(admission);
      const sealer = offline.offline.createReceizOfflineSealer({ ownerIdentityAdmission: admission, store: fixture.store, resources: fixture.resources,
        fetch: async () => { throw Error('OFFLINE'); } });
      return { binding, sealRecordExport: async input => {
        const sealed = await sealer.seal(input);
        return new File([new Uint8Array(sealed.artifactBytes)], sealed.filename, { type: sealed.mimeType });
      } } as OpenIdentity;
    }
    const [owner, elector] = await Promise.all([device(fixture.identity), fixture.otherIdentity().then(device)]);
    const authors = [owner.binding.artifactOwnerReceizId, elector.binding.artifactOwnerReceizId];
    const assetId = 'a'.repeat(64), acceptedSource = 'b'.repeat(64);
    const { sealGovernanceOriginal } = await import('../src/receiz/governance-documents');
    const rows: GovernanceRow[] = [], originals = new Map<string, GovernanceOriginal>();
    async function seal(identity: OpenIdentity, terms: GovernanceTerms) {
      elapsed += 60_000;
      const original = await sealGovernanceOriginal(identity, terms);
      originals.set(original.digest, original);
      return original;
    }
    function admit(original: GovernanceOriginal) {
      rows.push({ digest: original.digest, pulse: original.pulse, document: original.document, profileUid: null });
    }
    const charter = await seal(owner, { kind: 'charter', rules: {
      name: 'Currency community', purpose: 'Share a community currency.', founders: authors,
      membership: 'Two named electors.', decisions: 'Direct.', representation: 'Direct.', amendments: 'Founders ratify.',
      appeals: 'One day.', treasury: 'None.', approvalPercent: 51, minimumSupportPercent: 50, voteDays: 1, appealDays: 1,
      allowMandates: false, execution: { rule: 'unanimous-evidence-closure-v1', custodian: authors[0],
        registerProofObjectId: 'c'.repeat(64), registerGenesisHead: 'd'.repeat(64), treasury: null,
        currency: { assetId, minimumPriceUsdCents: '50', maximumPriceUsdCents: '100', allowSalesPause: false } },
    } });
    admit(charter);
    for (const voter of [owner, elector]) admit(await seal(voter, { kind: 'ratification', charter: charter.digest }));
    const proposal = await seal(owner, { kind: 'proposal', charter: charter.digest, title: 'Set price', text: 'Set the price to 75 cents.',
      decision: 'Policy', choices: ['Approve', 'Reject'], currencyChange: { assetId, expectedHead: 'e'.repeat(64), changes: { priceUsdCentsPerUnit: '75' } } });
    admit(proposal);
    for (const voter of [owner, elector]) admit(await seal(voter, { kind: 'ballot', charter: charter.digest, proposal: proposal.digest, choice: 'Approve', previous: null }));
    const evidence = rows.map(row => row.digest).sort();
    elapsed += 3 * 86_400_000;
    const terms = { kind: 'closure', charter: charter.digest, proposal: proposal.digest, evidence } as const;
    const ownClosure = await seal(owner, terms), otherClosure = await seal(elector, terms);
    admit(otherClosure);

    const request = vi.fn().mockRejectedValueOnce(Error('NATIVE_SOURCE_UNAVAILABLE')).mockResolvedValue({
      status: 'applied', assetId, proposalSha256: proposal.digest, sourceSha256: acceptedSource,
    });
    const view = vi.fn().mockRejectedValue(Error('PUBLIC_ASSET_PROJECTION_UNAVAILABLE'));
    const withDelivery = { ...owner, currencyGovernance: request, backedAssetPublication: view } as OpenIdentity;
    const queue = await import('../src/receiz/governance-outbox');
    await queue.rememberGovernanceDelivery(withDelivery, ownClosure, 'applying');
    const read = async (id: string) => {
      const held = originals.get(id);
      if (!held) throw Error('HELD_ORIGINAL_MISSING');
      return held;
    };
    await queue.deliverPendingCurrencyDecisions(withDelivery, rows, read);
    expect(request).not.toHaveBeenCalled();
    admit(ownClosure);
    await queue.deliverPendingCurrencyDecisions(withDelivery, rows, read);
    expect(request).toHaveBeenCalledTimes(1);
    expect(await queue.governanceOutbox(withDelivery)).toMatchObject([{ digest: ownClosure.digest, applicationProposal: proposal.digest }]);

    vi.resetModules();
    const reopened = await import('../src/receiz/governance-outbox');
    await reopened.deliverPendingCurrencyDecisions({ ...withDelivery }, rows, read);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1][0]).toEqual(request.mock.calls[0][0]);
    expect(request.mock.calls[1][0].originals.map((item: { artifactSha256: string }) => item.artifactSha256).sort())
      .toEqual([...evidence, ownClosure.digest, otherClosure.digest].sort());
    expect(view).not.toHaveBeenCalled();
    expect(await reopened.governanceOutbox(withDelivery)).toEqual([]);
  } finally {
    clock.mockRestore();
    monotonic.mockRestore();
  }
}, 120_000);
