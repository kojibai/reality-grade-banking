import { useEffect, useState } from 'react';
import { applyCurrencyDecision } from '../../receiz/currency-governance';
import type { GovernanceRow } from '../../receiz/governance-directory';
import { charterElectorate, type GovernanceOriginal } from '../../receiz/governance-documents';
import { ofKind, type Row } from '../../receiz/governance-view';
import type { OpenIdentity } from '../../receiz/native-identity';
import type { CurrencyVotingContext } from './VotingBoard';

export function CurrencyDecisionApplication({ proposal, charter, rows, read, identity, onApplied }: {
  proposal: Row<'proposal'>; charter: Row<'charter'>; rows: readonly GovernanceRow[];
  read(id: string): Promise<GovernanceOriginal>; identity: OpenIdentity | null;
  onApplied?: CurrencyVotingContext['onApplied'];
}) {
  const [message, setMessage] = useState('');
  const [source, setSource] = useState('');
  const [retry, setRetry] = useState(0);
  const members = charterElectorate(charter.document.terms.rules);
  const closures = ofKind(rows, 'closure').filter(row => row.document.terms.proposal === proposal.digest
    && row.document.terms.charter === charter.digest && members.includes(row.document.author));
  const signatures = new Set(closures.map(row => row.document.author)).size;
  const evidence = closures.map(row => row.digest).sort().join(',');
  // Attempt again when new signed evidence is held or the connection returns.
  // Opening the proposal uses the held vote records immediately.
  useEffect(() => {
    if (!identity?.currencyGovernance || signatures !== members.length || source) return;
    let active = true;
    async function sync() {
      if (!active || navigator.onLine === false) return;
      try {
        const result = await applyCurrencyDecision(identity!, proposal, rows, read);
        if (!active) return;
        if (result.status === 'rejected') setMessage('The vote did not approve the change.');
        else {
          setSource(result.sourceSha256);
          setMessage('The currency change was applied.');
          onApplied?.(result.asset);
        }
      } catch (error) {
        if (!active) return;
        setMessage(error instanceof Error && error.message.includes('CURRENCY_HEAD_CONFLICT')
          ? 'The currency settings changed during this vote. Create a new proposal against the current terms.'
          : 'The signed decision is held here. Delivery can continue when the currency source is available.');
      }
    }
    void sync();
    return () => { active = false; };
  }, [identity, proposal.digest, evidence, signatures, members.length, retry, source]);
  useEffect(() => {
    const online = () => setRetry(value => value + 1);
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, []);
  return <div className="gov-stack">
    <p>{signatures} of {members.length} closure statements signed.</p>
    {message&&<p role="status">{message}</p>}
    {source&&<details><summary>Accepted change source</summary><code className="gov-proof-id">{source}</code></details>}
  </div>;
}
