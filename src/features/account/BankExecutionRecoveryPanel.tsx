import { useEffect, useRef, useState } from 'react';
import type { OpenIdentity } from '../../receiz/native-identity';
import type { BankExecutionStatus } from '../../receiz/bank-execution-recovery';
import type { BankExecutionResult } from '../../receiz/bank-execution';
import { BANK_RECOVERY_CONSENT } from '../../receiz/config';
import {identityRecordCopy} from '../../content/identity-record-copy.mjs';

export function BankExecutionRecoveryPanel({ identity, onRefresh = () => {} }: { identity: OpenIdentity; onRefresh?: () => void }) {
  const [status, setStatus] = useState<BankExecutionStatus | null>(null);
  const [outcome, setOutcome] = useState<BankExecutionResult | import('../../receiz/native-payment').NativePaymentResult | import('../../receiz/native-asset').NativeAssetResult | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const alive = useRef(false), submitting = useRef(false);
  useEffect(() => {
    alive.current = true; let current = true;
    setStatus(null); setOutcome(null); setError('');
    void identity.executionRecovery?.().status().then(value => { if (current) setStatus(value); }).catch(() => { if (current) setError('Retained transaction details could not be opened. Keep this device and try again.'); });
    return () => { current = false; alive.current = false; };
  }, [identity]);
  const check = async () => {
    if (submitting.current || !identity.executionRecovery) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      const value = await identity.executionRecovery().resolve(true);
      if (alive.current) { setOutcome(value); if (value?.status === 'committed') onRefresh(); }
    } catch { if (alive.current) setError('The outcome could not be read. This attempt stays retained; checking again will not send another payment.'); }
    finally { submitting.current = false; if (alive.current) setBusy(false); }
  };
  const save = async () => {
    if (submitting.current || !identity.executionRecovery) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      const original = await identity.executionRecovery().exportRecovery();
      if (!alive.current) return;
      const url = URL.createObjectURL(new Blob([new Uint8Array(original.bytes)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = original.filename; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { if (alive.current) setError('The complete recovery proof could not be verified for export. Its original remains held on this device.'); }
    finally { submitting.current = false; if (alive.current) setBusy(false); }
  };
  if (!status && !error) return null;
  const state = outcome?.status ?? status?.state;
  return <details className="identity-import"><summary>Transaction recovery</summary>
    <p className="body-copy small-copy" role="status">{state === 'committed' ? 'This transaction committed. Its complete recovery proof is retained.' : state === 'zero-write' ? 'This attempt made no writes. A new action needs its own review.' : 'This transaction’s outcome is still being determined. Check its original reference before starting another action.'}</p>
    {status && <code className="proof-coordinate">{status.operationId}</code>}
    {state !== 'committed' && state !== 'zero-write' && <><details><summary>Read-only recovery access</summary><p className="body-copy small-copy">{identityRecordCopy(BANK_RECOVERY_CONSENT)}</p></details><p className="body-copy small-copy">Check outcome approves reading this action’s recorded result. It does not submit the action again.</p><button className="secondary-button" disabled={busy} onClick={() => void check()}>{busy ? 'Checking outcome…' : 'Check outcome'}</button></>}
    {state === 'committed' && <><button className="secondary-button" disabled={busy} onClick={() => void save()}>{busy ? 'Verifying proof…' : 'Save recovery proof'}</button><p className="body-copy small-copy">This private file contains original transaction sources. Keep it with your account backups.</p></>}
    {error && <p className="error-message" role="alert">{error}</p>}
  </details>;
}
