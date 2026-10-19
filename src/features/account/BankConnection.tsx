import { useState } from 'react';
import type { OpenIdentity } from '../../receiz/native-identity';
import type { BankNativeReadiness } from '../../receiz/bank-native-readiness';
import { BANK_NATIVE_CONSENT } from '../../receiz/config';
import { BankConnectionError } from '../../receiz/bank-connection-error';
import {WalletSendRecovery} from './WalletSendOperation';
import { BankExecutionRecoveryPanel } from './BankExecutionRecoveryPanel';

export function BankConnection({ identity, onRefresh }: { identity: OpenIdentity; onRefresh?: () => void }) {
  const [report, setReport] = useState<BankNativeReadiness | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  const [proofConsent, setProofConsent] = useState(false), [proofConnected, setProofConnected] = useState(false);
  const [diagnostic, setDiagnostic] = useState<BankConnectionError | null>(null);
  const check = async (approveNative = false) => {
    if (approveNative && !consent) return;
    setBusy(true); setReport(null); setError(''); setDiagnostic(null);
    try { setReport(approveNative ? await identity.nativeReadiness(true) : await identity.nativeReadiness()); }
    catch (error) { setError('The bank connection could not be checked. Your held proofs are preserved.'); if (error instanceof BankConnectionError) setDiagnostic(error); }
    finally { setBusy(false); setConsent(false); }
  };
  const connectProof = async () => {
    if (!proofConsent || busy) return;
    setBusy(true); setError(''); setDiagnostic(null);
    try { await identity.connectNativeAccount(true); setProofConnected(true); }
    catch (error) { setError('The account proof could not be connected. Your existing account is preserved.'); setDiagnostic(error instanceof BankConnectionError ? error : new BankConnectionError('native-services', error)); }
    finally { setBusy(false); setProofConsent(false); }
  };
  return <details className="identity-import bank-connection"><summary>Bank connection</summary>
    {identity.binding && <div className="profile-owner-coordinate"><span>Signed ownership identifier</span><code>{identity.binding.identityOwnerReceizId}</code></div>}
    <BankExecutionRecoveryPanel identity={identity} onRefresh={onRefresh} /><WalletSendRecovery identity={identity} onRefresh={onRefresh} />
    <p className="body-copy small-copy">Check the account connection used for custody, ownership and currency actions.</p>
    <button className="secondary-button" disabled={busy} onClick={() => void check()}>{busy ? 'Checking connection…' : 'Check connection'}</button>
    {report && <div role="status">
      <p className="body-copy">{report.status === 'permissions-needed' ? 'Native permissions needed' : report.status === 'runtime-unavailable' ? 'Native execution unavailable' : 'Bank execution sources required'}</p>
      <p className="body-copy small-copy">Custody, ownership and currency actions require their verified sources and an enabled bank execution route.</p>
      {report.missingScopes.length > 0 && <details><summary>Permission details</summary><ul>{report.missingScopes.map(scope => <li key={scope}><code>{scope}</code></li>)}</ul></details>}
      {report.unavailableOperations.length > 0 && <details><summary>Connection details</summary><ul>{report.unavailableOperations.map(item => <li key={item.operation}>{item.operation}{item.reason ? `: ${item.reason}` : ''}</li>)}</ul></details>}
      {report.status === 'permissions-needed' && <><p className="body-copy small-copy">Connect this ID for ownership, sales and currencies. Every financial action still has its own review.</p><details><summary>Read bank access</summary><p className="body-copy small-copy">{BANK_NATIVE_CONSENT}</p></details><label className="consent-option"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /><span>I allow the listed Bankeiz access for this ID.</span></label><button className="primary-button" disabled={busy || !consent} onClick={() => void check(true)}>Approve bank access</button></>}
      {report.missingScopes.length === 0 && <details><summary>Account proof</summary><p className="body-copy small-copy">Connect a private account proof to this ID. Receiz holds its complete source for this bank’s connection. Custody and trading use their admitted asset and funding proofs.</p>{proofConnected && <p role="status" className="body-copy">Account proof connected</p>}<label className="consent-option"><input type="checkbox" checked={proofConsent} onChange={event => setProofConsent(event.target.checked)} /><span>I approve the private account proof and listed bank access.</span></label><button className="secondary-button" disabled={busy || !proofConsent} onClick={() => void connectProof()}>Connect account proof</button></details>}
    </div>}
    {error && <p className="error-message" role="status">{error}</p>}
    {diagnostic && <details><summary>Connection details</summary><p className="body-copy small-copy">{{ 'account-access': 'Account access', 'native-services': 'Native services', 'account-proof': 'Account proof', 'source-publication': 'Source publication', 'authority-session': 'Authority session' }[diagnostic.stage]}{diagnostic.status ? ` · HTTP ${diagnostic.status}` : ''}{diagnostic.code ? ` · ${diagnostic.code}` : ''}</p></details>}
  </details>;
}
