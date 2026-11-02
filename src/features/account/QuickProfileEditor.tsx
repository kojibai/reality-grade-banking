import {useEffect,useRef,useState} from 'react';
import {Check,ChevronDown,ImagePlus} from 'lucide-react';
import type {OpenIdentity} from '../../receiz/native-identity';
import {ProfileAvatar} from '../../components/ProfileAvatar';
import {identityProfileAvatar} from '../../receiz/profile-avatar';
import {prepareProfileImage} from '../../receiz/profile-image';
import {publicAccountDisplayName} from '../../receiz/account-name';
const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
function heldDisplayName(identity:OpenIdentity,username:string):string{
 const current=identity.knownProfile?.();if(current?.username===username)return publicAccountDisplayName(current,username);
 const history=identity.localHistory;if(history?.portableStateVerified!==true||history.authority!=='verified-identity-portable-state')return '';
 const state=object(history.verifiedState),account=object(state.account);
 for(const profile of [object(object(state.profileView).profile),object(state.profile)])if(typeof account.userId==='string'&&profile.userId===account.userId&&profile.username===username)return publicAccountDisplayName(profile,username);
 return '';
}
/** The compact editor shares the same SDK owner and confirmed presentation
 * as the full profile. Opening it performs no profile read or write. */
export function QuickProfileEditor({identity,username}:{identity:OpenIdentity;username:string}){
 const heldName=heldDisplayName(identity,username);
 const [expanded,setExpanded]=useState(false),[name,setName]=useState(username),[displayName,setDisplayName]=useState(heldName),[displayEdited,setDisplayEdited]=useState(false),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false),file=useRef<HTMLInputElement>(null),owner=useRef(identity);owner.current=identity;
 useEffect(()=>{setName(username);},[identity,username]);
 useEffect(()=>{setDisplayName(heldName);setDisplayEdited(false);},[identity,username,heldName]);
 const usernameChanged=name!==username,displayChanged=displayEdited&&displayName.trim()!==heldName;
 useEffect(()=>{
  if(!expanded||name===username){setStatus('');return;}if(!/^[a-z0-9_]{3,24}$/.test(name)){setStatus('3–24 lowercase letters, numbers or underscores.');return;}
  let alive=true;setStatus('Checking availability…');const timer=setTimeout(()=>{void identity.profile?.().then(api=>api.availability(name)).then(value=>{if(alive)setStatus(value.available||value.isCurrent?'Available':'That username is taken.');}).catch(()=>{if(alive)setStatus('Availability will be checked when you save.');});},350);return()=>{alive=false;clearTimeout(timer);};
 },[expanded,name,username,identity]);
 async function save(){if(!identity.profile||busy||!usernameChanged&&!displayChanged)return;const current=identity;setBusy(true);setError('');try{await(await identity.profile()).update({...(usernameChanged?{username:name}:{}),...(displayChanged?{displayName:displayName.trim()||null}:{})});if(owner.current===current){setDisplayEdited(false);setSaved(true);setExpanded(false);}}catch{if(owner.current===current)setError('Your profile could not be saved. Please try again.');}finally{if(owner.current===current)setBusy(false);}}
 async function photo(chosen?:File){if(!chosen||busy||!identity.profile)return;const current=identity;setBusy(true);setError('');try{const [prepared,api]=await Promise.all([prepareProfileImage(chosen,'avatar'),identity.profile()]);if(owner.current!==current)return;if(!api.uploadImage)throw Error();await api.uploadImage(prepared,'avatar');if(owner.current===current)setSaved(true);}catch{if(owner.current===current)setError('Your photo could not be updated. Please try again.');}finally{if(owner.current===current)setBusy(false);if(file.current)file.current.value='';}}
 return <section className="quick-profile-editor"><button type="button" className="quick-profile-toggle" aria-expanded={expanded} onClick={()=>{setExpanded(value=>!value);setSaved(false);}}><span>Edit photo, name or username</span><ChevronDown size={14}/></button>{expanded&&<div className="quick-profile-fields"><button type="button" className="quick-profile-photo" disabled={busy} onClick={()=>file.current?.click()}><ProfileAvatar src={identityProfileAvatar(identity)} name={username}/><span><ImagePlus size={15}/>Change photo</span></button><input ref={file} hidden type="file" accept="image/*" aria-label="Choose profile photo" onChange={event=>void photo(event.target.files?.[0])}/><label>Display name<span className="quick-username-input"><input aria-label="Display name" value={displayName} autoComplete="name" maxLength={80} placeholder="Your name" disabled={busy} onChange={event=>{setDisplayName(event.target.value);setDisplayEdited(true);setSaved(false);}}/></span></label><small>Clear to use your default name.</small><label>Username<span className="quick-username-input"><span>@</span><input aria-label="Profile username" value={name} autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={24} disabled={busy} onChange={event=>{setName(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''));setSaved(false);}}/></span></label><small className={status==='Available'?'is-available':''} role="status">{status}</small><button type="button" className="secondary-button" disabled={busy||!usernameChanged&&!displayChanged||usernameChanged&&(!/^\w{3,24}$/.test(name)||status==='That username is taken.')} onClick={()=>void save()}>{busy?'Saving…':'Save'}</button></div>}{saved&&<p className="quick-profile-saved" role="status"><Check size={13}/>Updated</p>}{error&&<p className="error-message" role="alert">{error}</p>}</section>;
}
