import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronRight, FileText, Fingerprint, LockKeyhole } from 'lucide-react';
import type { OpenIdentity } from '../../receiz/native-identity';
import {QuickProfileEditor} from './QuickProfileEditor';
import { BankConnection } from './BankConnection';
import { ProofPortabilityPanel } from './ProofPortabilityPanel';
import {ProfileAvatar} from '../../components/ProfileAvatar';
import {identityProfileAvatar} from '../../receiz/profile-avatar';
import {profilePagePath,profileUsername} from '../../receiz/public-profile';
import {reservePbiAccountPopup} from '../../receiz/pbi-account-bridge';
const PrivateVaults=lazy(()=>import('../vault/VaultExperience').then(module=>({default:module.VaultExperience})));

export function IdentityProfile({ identity, onForget, onRefresh }: { identity: OpenIdentity; onForget: () => Promise<void>; onRefresh: () => void }) {
  const [backup, setBackup] = useState(false), [removalError, setRemovalError] = useState('');
  const [vaultsOpen,setVaultsOpen]=useState(false);
  const [passkeyBusy,setPasskeyBusy]=useState(false),[passkeyConnected,setPasskeyConnected]=useState(false),[passkeyError,setPasskeyError]=useState('');
  const current=useRef<OpenIdentity|null>(identity),passkeyPopup=useRef<Window|null>(null),passkeyPending=useRef(false);
  useEffect(()=>{current.current=identity;setPasskeyConnected(false);return()=>{current.current=null;try{passkeyPopup.current?.close();}catch{/* Closed. */}};},[identity]);
  const connectPasskey=async()=>{
    if(passkeyPending.current||passkeyConnected)return;
    let popup:Window;try{popup=reservePbiAccountPopup();}catch{setPasskeyError('Your device verification window could not be opened. Try again.');return;}
    passkeyPopup.current=popup;passkeyPending.current=true;setPasskeyBusy(true);setPasskeyError('');
    const assertCurrent=()=>{if(current.current!==identity)throw Error('PBI_ACCOUNT_CLOSED');};
    try{await(await import('../../receiz/pbi-account-connect')).connectPbiToAccount(identity,popup,assertCurrent);if(current.current===identity)setPasskeyConnected(true);}
    catch(cause){if(current.current===identity&&!(cause instanceof Error&&['passkey_cancelled','PBI_ACCOUNT_CLOSED'].includes(cause.message)))setPasskeyError('Your passkey could not be connected. Try again.');}
    finally{passkeyPending.current=false;if(current.current===identity)setPasskeyBusy(false);try{if(!popup.closed)popup.close();}catch{/* Closed. */}if(passkeyPopup.current===popup)passkeyPopup.current=null;}
  };
  const publicId = identity.accountUsername?.() || identity.username || identity.binding.identityOwnerReceizId;
  const backupId = () => {
    const held = identity.backup(), url = URL.createObjectURL(new Blob([new Uint8Array(held.bytes)]));
    const link = document.createElement('a'); link.href = url; link.download = held.filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1_000); setBackup(true);
  };
  const remove = async () => {
    setRemovalError('');
    try { await onForget(); }
    catch (cause) { setRemovalError(cause instanceof Error ? cause.message : 'Device custody could not be removed.'); }
  };
  return <div className="identity-profile">
    <div className="profile-identity">
      <ProfileAvatar src={identityProfileAvatar(identity)} name={publicId} fallback="ID" eager/>
      <span className="profile-eyebrow">Receiz ID</span>
      <code className="profile-public-id">{publicId}</code>
      <p>Your verified identity, secured on this device.</p>
    </div>
    {identity.profile&&<QuickProfileEditor identity={identity} username={publicId}/>}
    {profileUsername(publicId)&&<a className="identity-public-profile-link" href={profilePagePath(publicId)}><span><strong>Your public profile</strong><small>View, share &amp; edit</small></span><ArrowUpRight size={18}/></a>}
    <button className="primary-button" onClick={backupId}>Back up my Identity Record</button>
    {backup && <div className="identity-import profile-backup">
      <p className="body-copy small-copy">{identity.needsPhrase ? 'Save this recovery phrase separately from your downloaded Identity Record. It unlocks your signing key on another device.' : 'Your Identity Record opens without an unlock phrase.'}</p>
      {identity.needsPhrase && <input type="password" readOnly value={identity.backup().phrase} aria-label="Private recovery phrase" />}
      <button className="text-button" onClick={() => setBackup(false)}>{identity.needsPhrase ? 'Hide recovery phrase' : 'Hide backup details'}</button>
    </div>}
    <button type="button" className="identity-passkey" aria-label={passkeyConnected?'Passkey connected':'Connect passkey'} disabled={passkeyBusy||passkeyConnected} onClick={()=>void connectPasskey()}><span className="identity-passkey-icon"><Fingerprint size={23} strokeWidth={1.4} aria-hidden="true"/></span><span>Passkey</span><small>{passkeyBusy?'Connecting…':passkeyConnected?'Connected':'Connect'}</small></button>
    {passkeyError&&<p className="error-message" role="alert">{passkeyError}</p>}
    {identity.vaults&&<button type="button" className="identity-vault-entry" onClick={()=>setVaultsOpen(true)}><LockKeyhole size={23} strokeWidth={1.3}/><span><strong>Your vaults</strong><small>Your money. Your originals. Their proof.</small></span><ChevronRight size={16}/></button>}
    {vaultsOpen&&<Suspense fallback={<p className="body-copy small-copy" role="status">Opening your vaults…</p>}><PrivateVaults identity={identity} onRefresh={onRefresh} onClose={()=>setVaultsOpen(false)}/></Suspense>}
    <ProofPortabilityPanel identity={identity} />
    <BankConnection identity={identity} onRefresh={onRefresh} />
    <section className="profile-device" aria-label="Device custody">
      <button className="secondary-button profile-remove" onClick={() => void remove()}>Remove ID from this device</button>
      <div className="profile-custody-note">
        <p>Removing this ID does not close your account. Save your Identity Record{identity.needsPhrase ? ', recovery phrase' : ''} and original deposited proofs first.</p>
        <p>Offline Notes and pending receiving requests keep this device in custody. An Identity Record backup alone does not restore hardware custody. Any unfinished card checkout stays on this device.</p>
      </div>
      {removalError && <p className="error-message" role="alert">{removalError}</p>}
    </section>
    <footer className="profile-footer"><a href="/legal/"><FileText size={14} aria-hidden="true" /><span>Software license &amp; notices</span><ArrowUpRight size={13} aria-hidden="true" /></a></footer>
  </div>;
}
