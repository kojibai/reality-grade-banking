import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import type { OpenIdentity } from '../../receiz/native-identity';
import { bankOperationError, bankOperationFailureDetails, isBankOperationReview, type BankOperationInput, type BankOperationReview, type BankOperations } from '../../receiz/bank-operations';
import type { BankOperationResult } from '../../receiz/bank-operations';
import { formatMoney, formatUnits } from '../../core/money';
import { BankExecutionRecoveryPanel } from './BankExecutionRecoveryPanel';
import { BankConnection } from './BankConnection';

export function NativeOperation({ identity, input, inputKey, title, confirmLabel, onRefresh, children }: { identity?: OpenIdentity; input(): BankOperationInput; inputKey: string; title: string; confirmLabel: string; onRefresh(): void; children: ReactNode }) {
  const [review, setReview] = useState<BankOperationReview | null>(null), [result, setResult] = useState<BankOperationResult | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [failure,setFailure]=useState<(ReturnType<typeof bankOperationFailureDetails>&{phase:'Review'|'Submission'})|null>(null);
  const report=(cause:unknown,stage:'Review'|'Submission')=>{setError(bankOperationError(cause));setFailure({...bankOperationFailureDetails(cause),phase:stage});};
  const diagnostics=failure&&<details className="transaction-proof-details transaction-failure-details"><summary>Failure details</summary><p>{failure.phase}{failure.status!==null&&` · HTTP ${failure.status}`}</p><code>{failure.code}</code>{failure.stage&&<p>Stage: {failure.stage} · {failure.errorName}</p>}<p className="small-copy">These details contain no credentials or account data.</p></details>;
  const [approved, setApproved] = useState(false), generation = useRef(0), running = useRef(false), api = useRef<BankOperations | null>(null), held = useRef<BankOperationReview | null>(null);
  useEffect(() => {
    generation.current++; running.current = false; setReview(null); setResult(null); setBusy(false); setApproved(false); setError('');setFailure(null);
    return () => { generation.current++; if (held.current) api.current?.discard(held.current); held.current = null; api.current = null; };
  }, [identity, inputKey]);
  const prepare = async () => {
    if (running.current) return; const ticket = generation.current; running.current = true; setBusy(true); setError('');setFailure(null);
    try {
      const request = input();
      if (!identity?.operations) throw Error('BANK_OPERATION_RUNTIME_UNAVAILABLE');
      const connected = await identity.operations(); if (ticket !== generation.current) return; api.current = connected;
      const next = await connected.prepare(request);
      if (ticket !== generation.current) { connected.discard(next); return; }
      if (!isBankOperationReview(next)) throw Error('BANK_OPERATION_SOURCE_MISMATCH');
      held.current = next; setReview(next); setApproved(false);
    } catch (cause) { if (ticket === generation.current) report(cause,'Review'); }
    finally { if (ticket === generation.current) { running.current = false; setBusy(false); } }
  };
  const execute = async () => {
    if (!review || !approved || running.current || !api.current) return;
    const ticket = generation.current; running.current = true; setBusy(true); setError('');setFailure(null);
    try {
      const next = await api.current.execute(review, review.confirmationDigest);
      if (ticket === generation.current) { setResult(next); setReview(null); held.current = null; if (next.status === 'committed') onRefresh(); }
    } catch (cause) { if (ticket === generation.current) report(cause,'Submission'); }
    finally { if (ticket === generation.current) { running.current = false; setBusy(false); } }
  };
  if (result) return <section className="native-operation-result" aria-live="polite">
    {result.status === 'committed' && <div className="status-icon success"><Check size={30} /></div>}
    <h1 className="sheet-hero">{result.status === 'committed' ? 'Transaction complete.' : result.status === 'zero-write' ? 'Transaction not completed.' : 'Confirming your transaction.'}</h1>
    <p className="body-copy">{result.status === 'committed' ? 'The accepted transaction proof is saved on this device. Your account is refreshing from its source.' : result.status === 'zero-write' ? 'The native service confirmed that this transaction made no changes. Review new terms to try again.' : 'Keep this transaction’s reference. Check its recorded outcome before starting another; your original request is preserved.'}</p>
    {result.retentionWarning && <p className="body-copy small-copy" role="status">{result.retentionWarning}</p>}{identity && <BankExecutionRecoveryPanel identity={identity} onRefresh={onRefresh} />}
    {result.status === 'zero-write' && <button className="secondary-button" onClick={() => setResult(null)}>Review again</button>}
  </section>;
  if (review) {
    const t = review.terms, request = review.request, rail = 'rail' in request ? request.rail : null;
    return <section className="native-operation-review"><h1 className="sheet-hero">Review {title.toLowerCase()}.</h1>
      <div className="detail-list">
        {rail && <div><span>Account</span><strong>{rail === 'reserve' ? 'Reserve' : 'Settlement'}</strong></div>}
        {t.recipient && <div><span>Recipient</span><strong>{t.recipient}</strong></div>}
        {t.debitUsdCents !== '0' && <div><span>You pay</span><strong>{formatMoney(t.debitUsdCents)}</strong></div>}
        {t.debitPhiMicro !== '0' && <div><span>Exact value</span><strong>{formatUnits(t.debitPhiMicro)} Φ</strong></div>}
        {t.creditUsdCents !== '0' && <div><span>You receive</span><strong>{formatMoney(t.creditUsdCents)}</strong></div>}
        {t.creditPhiMicro !== '0' && <div><span>Exact received value</span><strong>{formatUnits(t.creditPhiMicro)} Φ</strong></div>}
        {t.quantityMicro !== '0' && <div><span>{request.kind === 'send-ownership' || request.kind === 'sell-share' ? 'Ownership' : 'Asset units'}</span><strong>{formatUnits(t.quantityMicro)}</strong></div>}
        <div><span>Fee</span><strong>{formatMoney(t.feeUsdCents)}</strong></div>
        {t.debitUsdCents !== '0' && <div><span>Total debit</span><strong>{formatMoney((BigInt(t.debitUsdCents) + BigInt(t.feeUsdCents)).toString())}</strong></div>}
      </div>
      <details className="transaction-proof-details"><summary>Transaction proof</summary>{t.fundingComponents&&<div className="detail-list">{t.fundingComponents.map(part=><div key={part.rail}><span>{part.rail==='reserve'?'Reserve':'Settlement'}</span><strong>{formatMoney(part.amountUsdCents)} · {formatUnits(part.amountPhiMicro)} Φ</strong></div>)}</div>}{t.assetDigest && <p className="proof-coordinate">Asset: {t.assetDigest}</p>}<p className="proof-coordinate">Review: {review.confirmationDigest}</p><p className="small-copy">Terms expire at ☤µKAI {t.expiresAtKaiUPulse}.</p></details>
      <label className="consent-option"><input type="checkbox" checked={approved} disabled={busy} onChange={event => setApproved(event.target.checked)} /><span>I approve this exact transaction and its displayed terms.</span></label>
      <button className="primary-button" disabled={busy || !approved} onClick={() => void execute()}>{busy ? 'Confirming transaction…' : confirmLabel}<ArrowRight size={17} /></button>
      <button className="secondary-button" disabled={busy} onClick={() => { api.current?.discard(review); held.current = null; setReview(null); setApproved(false); }}>Edit details</button>
      {error && <><p className="error-message" role="status">{error}</p>{diagnostics}</>}
    </section>;
  }
  return <><fieldset className="native-operation-fields" disabled={busy}>{children}</fieldset><div className="note-box"><ShieldCheck size={18} /><p>Review verifies the available terms. Your final approval authorizes the transaction.</p></div><button className="primary-button" disabled={busy} onClick={() => void prepare()}>{busy ? 'Verifying transaction…' : `Review ${title.toLowerCase()}`}<ArrowRight size={17} /></button>{error && <><p className="error-message" role="status">{error}</p>{diagnostics}{identity && error.startsWith('Approve the required') && <BankConnection identity={identity} onRefresh={onRefresh} />}</>}</>;
}
