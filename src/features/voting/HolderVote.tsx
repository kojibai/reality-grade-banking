import { useState } from 'react';
import { FileCheck2, Vote } from 'lucide-react';
import type { OpenIdentity } from '../../receiz/native-identity';
import type { GovernanceOriginal, GovernanceTerms } from '../../receiz/governance-documents';
import type { Row } from '../../receiz/governance-view';
import { readHolderVoteStatus, type HolderVoteStatus } from '../../receiz/currency-governance';
import { GovernanceTime } from './GovernanceTime';

const phaseLabel: Record<HolderVoteStatus['phase'], string> = {
  registration: 'Registration is open',
  review: 'The voter roll is under review',
  voting: 'Voting is open',
  appeal: 'The challenge period is open',
  'awaiting-freeze': 'The voter roll is awaiting confirmation',
  'awaiting-close': 'The decision is awaiting certification',
  closed: 'The decision is closed',
};

export function HolderVote({ identity, charter, proposal, read, review }: {
  identity: OpenIdentity;
  charter: Row<'charter'>;
  proposal: Row<'proposal'>;
  read(digest: string): Promise<GovernanceOriginal>;
  review(terms: GovernanceTerms): void;
}) {
  const [status, setStatus] = useState<HolderVoteStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [choice, setChoice] = useState('');
  const [challenge, setChallenge] = useState('');
  async function check() {
    setChecking(true);
    setError('');
    setStatus(null);
    try {
      setStatus(await readHolderVoteStatus(identity, await read(charter.digest), proposal.digest));
    } catch {
      setError('Vote status is unavailable. You can still read this proposal and its proof.');
    } finally {
      setChecking(false);
    }
  }
  const target = { charter: charter.digest, proposal: proposal.digest };
  const window = status?.window;
  const registration = status?.registration;
  const ballot = status?.ballot;
  const ballotPending = Boolean(ballot?.savedOriginalSha256 && ballot.savedOriginalSha256 !== ballot.acceptedOriginalSha256);
  return <section className="gov-box gov-stack">
    <h3>Holder vote</h3>
    <button type="button" onClick={() => void check()} disabled={checking}>
      <FileCheck2 size={16}/>{checking ? 'Opening vote status…' : status ? 'Refresh vote status' : 'Check vote status'}
    </button>
    {error && <p role="status">{error}</p>}
    {status && <p role="status">{phaseLabel[status.phase]}.</p>}
    {status?.phase === 'registration' && window && <GovernanceTime pulse={window.registrationClosesAtKai} label="Registration closes"/>}
    {status?.phase === 'voting' && window && <GovernanceTime pulse={window.voteClosesAtKai} label="Voting closes"/>}
    {status?.phase === 'appeal' && window && <GovernanceTime pulse={window.appealsCloseAtKai} label="Challenges close"/>}
    {registration?.acceptedOriginalSha256 ? <p>Your registration is accepted.</p>
      : registration?.savedOriginalSha256 ? <p>Your registration is awaiting admission.</p>
      : status?.phase === 'registration' && <button className="gov-primary" type="button" onClick={() => review({ kind: 'registration', ...target })}>
        Review registration
      </button>}
    {ballotPending ? <p>Your ballot is awaiting admission.</p> : ballot?.acceptedOriginalSha256 && <p>Your ballot is recorded.</p>}
    {status?.phase === 'voting' && registration?.acceptedOriginalSha256 && !ballotPending &&
      <form className="gov-form" onSubmit={event => {
        event.preventDefault();
        review({ kind: 'ballot', ...target, choice, previous: ballot?.acceptedOriginalSha256 ?? null });
      }}>
        <label>Your public ballot<select required value={choice} onChange={event => setChoice(event.target.value)}>
          <option value="">Choose a response</option>
          {proposal.document.terms.choices.map(option => <option key={option}>{option}</option>)}
        </select></label>
        <button className="gov-primary"><Vote size={16}/>Review ballot</button>
      </form>}
    {status?.phase === 'appeal' && registration?.acceptedOriginalSha256 && <details>
      <summary>Challenge this decision</summary>
      <form className="gov-form" onSubmit={event => {
        event.preventDefault();
        review({ kind: 'challenge', ...target, text: challenge.trim() });
      }}>
        <label>Public evidence and requested remedy<textarea required maxLength={4000} value={challenge}
          onChange={event => setChallenge(event.target.value)}/></label>
        <button>Review challenge</button>
      </form>
    </details>}
  </section>;
}
