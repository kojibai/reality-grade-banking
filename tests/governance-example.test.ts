import {createHash} from 'node:crypto';
import {readdir, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {expect, it} from 'vitest';
import {canonicalizeReceizV122} from '@receiz/sdk';
import {readVerifiedReceizDocumentBytesCanonical} from '../node_modules/@receiz/sdk/dist/verifier/canonical.js';
import {exampleSigningRoot} from './fixtures/governance-example/test-root';
import {
  governanceExampleRows as rows, exampleMemberName, exampleOriginalUrl,
} from '../src/features/voting/example/governance-example';
import {openGovernanceOriginal, readGovernanceTerms} from '../src/receiz/governance-documents';
import {ballotRegister, charterRatification, eligibleProposal, observedSeats, ofKind} from '../src/receiz/governance-view';

const directory = 'public/vote/examples/harbor-tool-library/originals';
const roots = new Map([[exampleSigningRoot.kid, exampleSigningRoot]]);

it('reopens every packaged file under the example key and matches its projection to its signed native source', async () => {
  const files = (await readdir(directory)).filter(file => file.endsWith('.original'));
  expect(files.sort()).toEqual(rows.map(row => row.digest + '.original').sort());
  for (const row of rows) {
    const bytes = await readFile(join(directory, row.digest + '.original'));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(row.digest);
    expect(exampleOriginalUrl(row.digest)).toEqual(expect.any(String));
    const filename = 'governance-' + row.document.terms.kind + '.receized.json';
    const opened = await readVerifiedReceizDocumentBytesCanonical({
      fileBytes: bytes, filename, mime: 'application/json', signatureV4RootPublicKeys: roots,
    });
    if (!opened.ok) throw Error(row.digest + ' failed verification: ' + opened.verification.errors.join(', '));
    expect(opened.verification.integrity.ok).toBe(true);
    expect(opened.verification.bundle?.nativeRecordSeal).toMatchObject({ownerReceizId: row.document.author});
    expect(String(opened.verification.bundle?.kaiPulseEternal)).toBe(row.pulse);
    expect(new TextDecoder().decode(opened.payloadBytes)).toBe(canonicalizeReceizV122(row.document));
    expect(readGovernanceTerms(row.document.terms)).toEqual(row.document.terms);
    expect(row.profileUid).toBeNull();
    expect(row.document.accountUid).toBeNull();
  }
  expect(exampleOriginalUrl('unknown')).toBeNull();
}, 30000);

it('keeps example signatures out of the live reader and rejects edited example bytes', async () => {
  const charter = ofKind(rows, 'charter')[0];
  const bytes = await readFile(join(directory, charter.digest + '.original'));
  const filename = 'governance-charter.receized.json';
  const publicFile = new File([new Uint8Array(bytes)], filename, {type: 'application/json'});
  await expect(openGovernanceOriginal(publicFile)).rejects.toThrow();
  const offset = bytes.indexOf('Harbor Tool Library');
  expect(offset).toBeGreaterThan(-1);
  bytes[offset] ^= 1;
  const tampered = await readVerifiedReceizDocumentBytesCanonical({
    fileBytes: bytes, filename, mime: 'application/json', signatureV4RootPublicKeys: roots,
  });
  expect(tampered.ok).toBe(false);
});

it('recounts election, poll revisions and representation and keeps the treasury request under challenge', () => {
  const charter = ofKind(rows, 'charter')[0];
  const ratification = charterRatification(charter, rows);
  expect(ratification.complete).toBe(true);
  expect(ratification.signed.size).toBe(2);

  const proposals = ofKind(rows, 'proposal');
  expect(proposals.every(row => eligibleProposal(row, charter, rows))).toBe(true);
  for (const row of rows) {
    const terms = row.document.terms;
    if (terms.kind !== 'charter') expect(terms.charter).toBe(charter.digest);
    if ('proposal' in terms) expect(proposals.some(p => p.digest === terms.proposal)).toBe(true);
  }
  const byDecision = new Map(proposals.map(p => [p.document.terms.decision, p]));
  expect([...byDecision.keys()].sort()).toEqual(['Amendment', 'Election', 'Policy', 'Poll', 'Treasury']);
  const election = byDecision.get('Election')!;
  const race = ballotRegister(election, charter, rows);
  expect(race.effective.size).toBe(4);
  const seats = observedSeats(race.counts, 1);
  expect(seats.leading.map(exampleMemberName)).toEqual(['Jo Bell']);
  expect(seats.tied).toEqual([]);
  expect([...race.counts].map(([id, count]) => [exampleMemberName(id), count])).toEqual([['Cal Ward', 1], ['Jo Bell', 3]]);

  const poll = ballotRegister(byDecision.get('Poll')!, charter, rows);
  expect(poll.ballots.length).toBe(5);
  expect(poll.effective.size).toBe(4);
  expect([...poll.counts.values()]).toEqual([2, 1, 1]);
  expect(poll.disputed.size).toBe(0);

  const policy = ballotRegister(byDecision.get('Policy')!, charter, rows);
  expect(policy.effective.size).toBe(3);
  expect([...policy.represented.keys()].map(exampleMemberName)).toEqual(['Ren Lake']);
  expect([...policy.counts.values()]).toEqual([3, 1]);

  const treasury = byDecision.get('Treasury')!;
  expect([...ballotRegister(treasury, charter, rows).counts.values()]).toEqual([1, 1]);
  expect(ofKind(rows, 'challenge').map(c => c.document.terms.proposal)).toEqual([treasury.digest]);
  expect(ballotRegister(byDecision.get('Amendment')!, charter, rows).ballots).toHaveLength(0);
});
