import { useEffect, useRef, useState } from 'react';
import { FileCheck2 } from 'lucide-react';
import { verifyAccountProof, type VerifiedAccountProof } from '../receiz/account-proof';
import { readAccountProofFile } from '../receiz/account-proof-png';
import { accountProofRoute } from '../receiz/account-proof-links';
import { readPublicAccountProof, verifyAccountProofContinuation } from '../receiz/account-proof-public';
import { AccountProofDetails } from '../components/AccountProofDetails';
import { accountProofError } from '../receiz/account-proof-errors';

/** Local-only verification. This component has no identity, permission,
 * admission-write, account-import, or financial command entry point. */
export function AccountProofReader() {
  const [proof, setProof] = useState<VerifiedAccountProof | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [snapshot, setSnapshot] = useState<VerifiedAccountProof | null>(null), [newest, setNewest] = useState<VerifiedAccountProof | null>(null);
  const request = useRef(0);
  const controller = useRef<AbortController | null>(null), original = useRef<VerifiedAccountProof | null>(null);
  const latestVerified = useRef<VerifiedAccountProof | null>(null);
  const [updateNotice, setUpdateNotice] = useState('');
  useEffect(() => {
    const digest = accountProofRoute(location.pathname);
    if (digest) {
      const ticket = ++request.current, abort = new AbortController(); controller.current = abort; setBusy(true);
      void readPublicAccountProof(digest, false, abort.signal).then(async value => {
        if (ticket !== request.current) return; original.current = value; setSnapshot(value); setProof(value); setBusy(false);
        try { const next = await readPublicAccountProof(digest, true, abort.signal); verifyAccountProofContinuation(value, next); if (ticket === request.current) { latestVerified.current = next; setNewest(next); setProof(next); setUpdateNotice(next.sourceDigest === value.sourceDigest ? 'The published source is unchanged.' : 'Newer shared source verified. The original image snapshot remains unchanged.'); } }
        catch { if (ticket === request.current) setUpdateNotice('Showing the original verified snapshot. A newer shared source is not established.'); }
      }).catch(cause => { if (ticket === request.current) setError(accountProofError(cause)); }).finally(() => { if (ticket === request.current) setBusy(false); });
    }
    return () => { request.current++; controller.current?.abort(); };
  }, []);
  const inspect = async (file: File) => {
    controller.current?.abort(); original.current = null; latestVerified.current = null;
    const ticket = ++request.current; setBusy(true); setError(''); setProof(null); setSnapshot(null); setNewest(null); setUpdateNotice('');
    try {
      const result = await verifyAccountProof(await readAccountProofFile(file)); if (ticket === request.current) { original.current = result; setSnapshot(result); setProof(result); }
    } catch (cause) { if (ticket === request.current) setError(accountProofError(cause)); }
    finally { if (ticket === request.current) setBusy(false); }
  };
  const latest = async () => {
    const prior = latestVerified.current ?? proof, snapshot = original.current; if (!prior || !snapshot || busy) return;
    controller.current?.abort();
    const ticket = ++request.current, abort = new AbortController(); controller.current = abort; setBusy(true); setUpdateNotice('');
    try { const next = await readPublicAccountProof(snapshot.sourceDigest, true, abort.signal); verifyAccountProofContinuation(prior, next); if (ticket === request.current) { latestVerified.current = next; setNewest(next); setProof(next); setUpdateNotice(next.sourceDigest === prior.sourceDigest ? 'The published source is unchanged.' : 'Newer shared source verified. The original image snapshot remains unchanged.'); } }
    catch { if (ticket === request.current) setUpdateNotice('No newer shared source could be verified. The original proof remains available; current account activity is not established.'); }
    finally { if (ticket === request.current) setBusy(false); }
  };
  return <section className="account-proof-reader" aria-label="Account proof verification">
    <div className="account-proof-reader-heading"><FileCheck2 size={20} /><h2>Open the original proof.</h2></div>
    <p>Verify the public account source on this device. No login is needed. The file cannot open an account, move funds or restore private custody.</p>
    <label className="account-proof-picker">{busy ? 'Verifying public source…' : 'Choose original proof image or file'}<input type="file" disabled={busy} accept=".png,.json,image/png,application/json" aria-label="Shared account proof file" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void inspect(file); }} /></label>
    {error && <p className="account-proof-inspector-error" role="status">{error}</p>}
    {snapshot && newest && snapshot.sourceDigest !== newest.sourceDigest && <div className="account-proof-version-choice" role="group" aria-label="Account source versions"><button aria-pressed={proof === snapshot} onClick={() => setProof(snapshot)}>Original snapshot</button><button aria-pressed={proof === newest} onClick={() => setProof(newest)}>Latest shared source</button></div>}
    {proof && <><AccountProofDetails key={proof.sourceDigest} proof={proof} /><button className="account-proof-refresh" disabled={busy} onClick={() => void latest()}>Check newer shared history</button></>}
    {updateNotice && <p role="status">{updateNotice}</p>}
  </section>;
}

export function AccountProofInspector() { return <details className="account-proof-inspector"><summary><FileCheck2 size={20} /><span>Inspect a shared account proof</span></summary><AccountProofReader /></details>; }
