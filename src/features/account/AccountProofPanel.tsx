import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Download } from 'lucide-react';
import type { OpenIdentity } from '../../receiz/native-identity';
import { isVerifiedAccountProof, type VerifiedAccountProof } from '../../receiz/account-proof';
import { AccountProofDetails } from '../../components/AccountProofDetails';
import { accountProofError } from '../../receiz/account-proof-errors';
import type { AccountProofSharingStatus } from '../../receiz/account-proof-sharing';

export function AccountProofPanel({ identity }: { identity: OpenIdentity }) {
  const [proof, setProof] = useState<VerifiedAccountProof | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [approved, setApproved] = useState(false), [live, setLive] = useState(false), [sharing, setSharing] = useState<AccountProofSharingStatus | null>(null), [link, setLink] = useState('');
  const [image, setImage] = useState('');
  const generation = useRef(0), running = useRef(false), imageUrl = useRef('');
  useEffect(() => { generation.current++; running.current = false; setProof(null); setBusy(false); setError(''); setNotice(''); setApproved(false); setLive(false); setSharing(null); setLink(''); setImage(''); return () => { generation.current++; if (imageUrl.current) URL.revokeObjectURL(imageUrl.current); imageUrl.current = ''; }; }, [identity]);
  const review = async () => {
    if (running.current) return;
    const ticket = generation.current; running.current = true; setBusy(true); setProof(null); setError(''); setNotice(''); setApproved(false); setLive(false); setLink(''); setImage('');
    if (imageUrl.current) URL.revokeObjectURL(imageUrl.current); imageUrl.current = '';
    try {
      if (!identity.accountProof) throw Error('ACCOUNT_PROOF_SOURCE_UNAVAILABLE');
      const next = await identity.accountProof();
      if (!isVerifiedAccountProof(next)) throw Error('ACCOUNT_PROOF_VERIFIED_SOURCE_REQUIRED');
      if (ticket === generation.current) setProof(next);
    } catch (cause) { if (ticket === generation.current) setError(accountProofError(cause)); }
    finally { if (ticket === generation.current) { running.current = false; setBusy(false); } }
  };
  const save = async () => {
    if (!proof || !approved || running.current) return;
    const ticket = generation.current; running.current = true; setBusy(true); setError(''); setNotice('');
    try {
      if (!identity.accountProofSharing) throw Error('ACCOUNT_PROOF_SOURCE_UNAVAILABLE');
      const api = await identity.accountProofSharing(); if (ticket !== generation.current) return;
      const publication = await api.publish(proof, { approved, liveUpdates: live }); if (ticket !== generation.current) return;
      setSharing(publication.status); setLink(publication.url);
      const { createAccountProofImage } = await import('../../receiz/account-proof-image');
      const file = await createAccountProofImage(proof); if (ticket !== generation.current) return;
      const url = URL.createObjectURL(new Blob([new Uint8Array(file.bytes)], { type: 'image/png' }));
      if (imageUrl.current) URL.revokeObjectURL(imageUrl.current); imageUrl.current = url; setImage(url);
      const link = document.createElement('a'); link.href = url; link.download = file.filename; link.click();
      setNotice('Account proof image saved. You can also save the original image below. Anyone with the image or public link can read the disclosed balances, holdings and transaction history.');
    } catch { if (ticket === generation.current) setError('Public sharing or image delivery could not be confirmed. The link may already be public. Check public sharing before trying again; this did not authorize a payment.'); }
    finally { if (ticket === generation.current) { running.current = false; setBusy(false); } }
  };
  const manageSharing = async (disable = false) => {
    if (running.current) return; const ticket = generation.current; running.current = true; setBusy(true); setError('');
    try { if (!identity.accountProofSharing) throw Error('ACCOUNT_PROOF_SOURCE_UNAVAILABLE'); const api = await identity.accountProofSharing(); if (ticket !== generation.current) return; const next = disable ? await api.disable() : await api.status(); if (ticket === generation.current) setSharing(next); }
    catch { if (ticket === generation.current) setError('Public sharing status could not be confirmed. Existing public copies remain readable; check again before assuming live updates are off.'); }
    finally { if (ticket === generation.current) { running.current = false; setBusy(false); } }
  };
  return <section className="account-proof-share" aria-label="Shareable account proof">
    <h3>Share an account proof</h3><p className="body-copy small-copy">Let someone verify your identity, balances, holdings and transaction history without access to your account.</p>
    <button className="secondary-button" disabled={busy} onClick={() => void review()}>{busy ? 'Verifying account source…' : 'Review account proof'}</button>
    {proof && <><AccountProofDetails proof={proof} /><p className="body-copy small-copy">The image carries this exact proof. Its QR and public link let anyone inspect balances, holdings and every disclosed transaction. Signing keys and login access stay private.</p><label className="consent-option"><input type="checkbox" checked={approved} disabled={busy} onChange={event => setApproved(event.target.checked)} /><span>I approve publishing this proof’s balances, holdings and full transaction history.</span></label><label className="consent-option"><input type="checkbox" checked={live} disabled={busy} onChange={event => setLive(event.target.checked)} /><span>Keep this link updated with future balances, holdings and transactions until I turn live updates off.</span></label><button className="primary-button" disabled={busy || !approved} onClick={() => void save()}><Download size={16} />Create proof image &amp; link</button></>}
    {link && <a className="account-proof-published-link" href={link} target="_blank" rel="noreferrer">{link}</a>}
    {image && <img className="issued-account-proof-image" src={image} alt="Original account proof image with its verification QR code and exact embedded source" />}
    <details className="account-proof-sharing-controls"><summary>Public sharing</summary><button className="text-button" disabled={busy} onClick={() => void manageSharing()}>Check public sharing</button>{sharing && <><p className="body-copy small-copy">Live updates {(sharing.liveUpdates || sharing.otherLiveUpdates) ? 'on' : 'off'}. Previously shared snapshots and downloaded copies remain readable.</p>{(sharing.liveUpdates || sharing.otherLiveUpdates) && <button className="secondary-button" disabled={busy} onClick={() => void manageSharing(true)}>Turn off live updates</button>}</>}</details>
    {error && <p className="body-copy small-copy" role="status">{error}</p>}{notice && <p className="body-copy small-copy" role="status">{notice}</p>}
    <a className="account-proof-inspect-link" href="/verify/">Inspect a shared proof<ArrowUpRight size={13} /></a>
  </section>;
}
