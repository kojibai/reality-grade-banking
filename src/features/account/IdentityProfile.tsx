import {IdentityRecordIcon} from '../../components/IdentityRecordIcon';
import {InlineOpening} from '../../components/InlineOpening';
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUpRight, BadgeCheck, ChevronRight, FileText, Fingerprint, LockKeyhole, Vote } from 'lucide-react';
import type { OpenIdentity } from '../../receiz/native-identity';
import {QuickProfileEditor} from './QuickProfileEditor';
import { BankConnection } from './BankConnection';
import { ProofPortabilityPanel } from './ProofPortabilityPanel';
import {AccountEmail} from './AccountEmail';
import {AppearanceSettings} from './AppearanceSettings';
import {ProfileAvatar} from '../../components/ProfileAvatar';
import {identityProfileAvatar,identityProfileName,identityProfileUsername} from '../../receiz/profile-avatar';
import {receivingUsernameForIdentity} from '../../../native/receiz/app/lib/profile/receivingUsername.js';
import {profilePagePath,profileUsername,retainedPublicProfile,knownProfilePbiAuthorship} from '../../receiz/public-profile';
import {ProfileVotingSheet} from '../voting/ProfileVotingSheet';
import './identity-governance.css';
const PrivateVaults=lazy(()=>import('../vault/VaultExperience').then(module=>({default:module.VaultExperience})));

export function IdentityProfile({ identity, onForget, onRefresh, active=true, accountUid, vaultsEntry, onVaultsEntryConsumed, onUseSendNearby }: { identity: OpenIdentity; onForget: () => Promise<void>; onRefresh: () => void; active?:boolean; accountUid?:string|null; vaultsEntry?:'create'; onVaultsEntryConsumed?():void; onUseSendNearby?(amount:string):void }) {
  const [backup, setBackup] = useState(false), [removalError, setRemovalError] = useState('');
  const [backupBusy,setBackupBusy]=useState<OpenIdentity|null>(null),[backupError,setBackupError]=useState<{owner:OpenIdentity;message:string}|null>(null);
  const backupPending=useRef<OpenIdentity|null>(null);
  const [vaultsOpen,setVaultsOpen]=useState<{owner:OpenIdentity;mode:'home'|'create'}|null>(null);
  const [governanceOpen,setGovernanceOpen]=useState<OpenIdentity|null>(null);
  // Resume a child after the owning Identity modal has rejoined the top layer.
  const [childSheetActive,setChildSheetActive]=useState(false);
  useLayoutEffect(()=>setChildSheetActive(active),[active]);
  useEffect(()=>{if(active&&vaultsEntry==='create'&&identity.vaults){setVaultsOpen({owner:identity,mode:'create'});onVaultsEntryConsumed?.();}},[active,vaultsEntry,identity,onVaultsEntryConsumed]);
  const [passkeyBusy,setPasskeyBusy]=useState(false),[passkeyConnected,setPasskeyConnected]=useState(false),[passkeyError,setPasskeyError]=useState('');
  const [recoveryChecked,setRecoveryChecked]=useState<{owner:OpenIdentity;ready:boolean}|null>(null);
  const current=useRef<OpenIdentity|null>(identity),passkeyPending=useRef(false);
  useEffect(()=>{current.current=identity;setPasskeyConnected(false);setBackup(false);setBackupError(null);setGovernanceOpen(null);return()=>{current.current=null;};},[identity]);
  const connectPasskey=async()=>{
    if(passkeyPending.current||recoveryReady)return;
    passkeyPending.current=true;setPasskeyBusy(true);setPasskeyError('');
    const assertCurrent=()=>{if(current.current!==identity)throw Error('PBI_ACCOUNT_CLOSED');};
    try{
      const module=await import('../../receiz/pbi-account-connect');
      if(profileVerified)await module.enablePbiIdentityRecovery(identity,assertCurrent);
      else await module.connectPbiToAccount(identity,assertCurrent);
      assertCurrent();
      const {hasPbiIdentityRecovery}=await import('../../receiz/pbi-identity-recovery');
      assertCurrent();
      setRecoveryChecked({owner:identity,ready:hasPbiIdentityRecovery(identity.knownWallet?.()?.wallet.userId??'',identity.binding.keyId)});
      setPasskeyConnected(true);
    }catch(cause){
      if(current.current!==identity)return;
      const code=cause instanceof Error?cause.message:'';
      if(['passkey_cancelled','PBI_ACCOUNT_CLOSED'].includes(code))return;
      setPasskeyError(code==='PBI_RECOVERY_PASSKEY_UNAVAILABLE'?'This passkey can verify your account but cannot unlock a recovery backup.':'Passkey setup could not finish. Try again.');
    }
    finally{passkeyPending.current=false;if(current.current===identity)setPasskeyBusy(false);}
  };
  const [preparedProfile,setPreparedProfile]=useState<{owner:OpenIdentity;username:string}|null>(null),[profileOpening,setProfileOpening]=useState<OpenIdentity|null>(null),[profileError,setProfileError]=useState<{owner:OpenIdentity;message:string}|null>(null);
  const profilePending=useRef<OpenIdentity|null>(null);
  const knownName = identity.confirmedAccountUsername?.() ?? (preparedProfile?.owner===identity?preparedProfile.username:null) ?? identityProfileUsername(identity);
  const publicName = (name: string) => {
    const fullName = receivingUsernameForIdentity(name, identity.username ?? '');
    return /^receiz_[a-z0-9]{17}$/.test(fullName) ? null : profileUsername(fullName);
  };
  const profileName = knownName ? publicName(knownName) : null;
  const publicId = profileName ?? identity.binding.identityOwnerReceizId;
  const governanceUid=accountUid??identity.walletReceivingAddress?.()??identity.knownWallet?.()?.wallet.userId;
  const openPublicProfile=async()=>{
    if(profilePending.current===identity||!identity.prepareReceivingUsername)return;
    profilePending.current=identity;setProfileOpening(identity);setProfileError(null);
    try{
      const username=publicName(await identity.prepareReceivingUsername());
      if(current.current!==identity)return;
      if(!username)throw Error('PROFILE_USERNAME_UNAVAILABLE');
      setPreparedProfile({owner:identity,username});
      dispatchEvent(new CustomEvent('bankeiz:navigate-public',{detail:{path:profilePagePath(username)}}));
    }catch{if(current.current===identity)setProfileError({owner:identity,message:'Your profile could not be opened. Try again.'});}
    finally{if(profilePending.current===identity)profilePending.current=null;if(current.current===identity)setProfileOpening(null);}
  };
  const profileVerified=passkeyConnected||!!knownProfilePbiAuthorship(identity.knownWallet?.()?.wallet.userId??'')||!!retainedPublicProfile(knownName??publicId)?.authorshipVerified;
  const recoveryReady=recoveryChecked?.owner===identity&&recoveryChecked.ready;
  useEffect(()=>{
    let active=true;
    if(profileVerified)void import('../../receiz/pbi-identity-recovery').then(({hasPbiIdentityRecovery})=>{
      if(active)setRecoveryChecked({owner:identity,ready:hasPbiIdentityRecovery(identity.knownWallet?.()?.wallet.userId??'',identity.binding.keyId)});
    });
    return()=>{active=false;};
  },[identity,profileVerified]);
 const downloadBackup = (held:ReturnType<OpenIdentity['backup']>) => {
    const url = URL.createObjectURL(new Blob([new Uint8Array(held.bytes)]));
    const link = document.createElement('a'); link.href = url; link.download = held.filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1_000); setBackup(true);
  };
  const backupId=async()=>{
    if(backupPending.current===identity)return;
    backupPending.current=identity;setBackupBusy(identity);setBackupError(null);
    try{const held=identity.exportIdentityRecord?await identity.exportIdentityRecord():identity.backup();if(current.current===identity)downloadBackup(held);}
    catch{if(current.current===identity)setBackupError({owner:identity,message:'Your Identity Record PNG could not be prepared. Your original file is unchanged.'});}
    finally{if(backupPending.current===identity)backupPending.current=null;if(current.current===identity)setBackupBusy(null);}
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
    <AppearanceSettings/>
    {identity.profile&&<QuickProfileEditor identity={identity} username={knownName??publicId}/>}
    {profileName?<a className="identity-public-profile-link" href={profilePagePath(profileName)}><span><strong>Your public profile</strong><small>View, share &amp; edit</small></span><ArrowUpRight size={18}/></a>:identity.prepareReceivingUsername&&<button type="button" className="identity-public-profile-link" disabled={profileOpening===identity} aria-busy={profileOpening===identity} onClick={()=>void openPublicProfile()}><span><strong>Your public profile</strong><small>View, share &amp; edit</small></span><ArrowUpRight size={18}/></button>}
    {profileError?.owner===identity&&<p className="error-message" role="alert">{profileError.message}</p>}
    <button className="primary-button" disabled={backupBusy===identity} onClick={()=>void backupId()}><IdentityRecordIcon action="save" size={20}/>{backupBusy===identity?'Preparing Identity Record':'Back up my Identity Record'}</button>
    {backupError?.owner===identity&&<div role="alert"><p className="body-copy small-copy">{backupError.message}</p><button className="text-button" onClick={()=>{if(current.current===identity)downloadBackup(identity.backup());}}>Download original Identity Record</button></div>}
    {backup && <div className="identity-import profile-backup">
      <p className="body-copy small-copy">{identity.needsPhrase ? 'Save this recovery phrase separately from your downloaded Identity Record. It unlocks your signing key on another device.' : 'Your Identity Record opens without an unlock phrase.'}</p>
      {identity.needsPhrase && <input type="password" readOnly value={identity.backup().phrase} aria-label="Private recovery phrase" />}
      <button className="text-button" onClick={() => setBackup(false)}>{identity.needsPhrase ? 'Hide recovery phrase' : 'Hide backup details'}</button>
    </div>}
    <button type="button" className={"identity-passkey"+(profileVerified?" is-verified":"")} aria-label={recoveryReady?'Passkey recovery ready':profileVerified?'Set up passkey recovery':'Connect passkey'} disabled={passkeyBusy||recoveryReady} onClick={()=>void connectPasskey()}><span className="identity-passkey-icon"><BadgeCheck size={23} strokeWidth={1.4} aria-hidden="true"/></span><span>{profileVerified?'Verified profile':'Verify profile'}</span><small>{passkeyBusy?'Confirming…':recoveryReady?'Recovery ready':profileVerified?'Set up recovery':'Sign with PBI'}</small></button>
    <p className="identity-pbi-hint"><Fingerprint size={12} aria-hidden="true"/>Passkey sign-in &amp; recovery</p>
    {passkeyError&&<p className="error-message" role="alert">{passkeyError}</p>}
    {identity.vaults&&<button type="button" className="identity-vault-entry" onClick={()=>setVaultsOpen({owner:identity,mode:'home'})}><LockKeyhole size={23} strokeWidth={1.3}/><span><strong>Your vaults</strong><small>Your money. Your originals. Their proof.</small></span><ChevronRight size={16}/></button>}
    {governanceUid&&<button type="button" className="identity-vault-entry identity-governance-entry" aria-haspopup="dialog" onClick={()=>setGovernanceOpen(identity)}>
      <Vote size={23} strokeWidth={1.4} aria-hidden="true"/>
      <span><strong>Governance</strong><small>Charters, proposals &amp; votes</small></span>
      <ChevronRight size={16} aria-hidden="true"/>
    </button>}
    {governanceOpen===identity&&governanceUid&&<ProfileVotingSheet
      active={active&&childSheetActive}
      isOwner
      onClose={()=>setGovernanceOpen(null)}
      profile={{uid:governanceUid,name:identityProfileName(identity),username:knownName??undefined,publicName:profileName??undefined,ownerIdentity:identity}}
    />}
    {vaultsOpen?.owner===identity&&<Suspense fallback={<p className="body-copy small-copy" role="status"><InlineOpening label="Preparing your vaults"/></p>}><PrivateVaults active={active&&childSheetActive} initialMode={vaultsOpen.mode} identity={identity} onUseSendNearby={onUseSendNearby} onRefresh={onRefresh} onClose={()=>setVaultsOpen(null)}/></Suspense>}
    <AccountEmail identity={identity}/>
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
