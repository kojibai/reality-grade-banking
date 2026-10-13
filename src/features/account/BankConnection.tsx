import { useState } from 'react';
import type { OpenIdentity } from '../../receiz/native-identity';
import type { BankNativeReadiness } from '../../receiz/bank-native-readiness';

export function BankConnection({ identity }: { identity: OpenIdentity }) {
  const [report, setReport] = useState<BankNativeReadiness | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const check = async () => {
    setBusy(true); setReport(null); setError('');
    try { setReport(await identity.nativeReadiness()); }
    catch { setError('The bank connection could not be checked. Your held proofs are preserved.'); }
    finally { setBusy(false); }
  };
  return <details className="identity-import"><summary>Bank connection</summary>
    <p className="body-copy small-copy">Check the account connection used for custody, ownership and currency actions.</p>
    <button className="secondary-button" disabled={busy} onClick={() => void check()}>{busy ? 'Checking connection…' : 'Check connection'}</button>
    {report && <div role="status">
      <p className="body-copy">{report.status === 'permissions-needed' ? 'Native permissions needed' : report.status === 'runtime-unavailable' ? 'Native execution unavailable' : 'Bank execution sources required'}</p>
      <p className="body-copy small-copy">Custody, ownership and currency actions require their verified sources and an enabled bank execution route.</p>
      {report.missingScopes.length > 0 && <details><summary>Permission details</summary><ul>{report.missingScopes.map(scope => <li key={scope}><code>{scope}</code></li>)}</ul></details>}
      {report.unavailableOperations.length > 0 && <details><summary>Connection details</summary><ul>{report.unavailableOperations.map(item => <li key={item.operation}>{item.operation}{item.reason ? `: ${item.reason}` : ''}</li>)}</ul></details>}
    </div>}
    {error && <p className="error-message" role="status">{error}</p>}
  </details>;
}
