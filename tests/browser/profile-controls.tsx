import {ArrowUpRight} from 'lucide-react';
import {createRoot} from 'react-dom/client';
import {useMemo,useRef,useState} from 'react';
import {QuickProfileEditor} from '../../src/features/account/QuickProfileEditor';
import {ProfileIdentity} from '../../src/public-explorer/ProfileIdentity';
import {ProfileAvatar} from '../../src/components/ProfileAvatar';
import {Sheet} from '../../src/components/Sheet';
import {BankMark} from '../../src/components/BankMark';
import {parsePublicProfile} from '../../src/receiz/public-profile';
import {profileFixture} from '../fixtures/public-profile';
import type {OpenIdentity} from '../../src/receiz/native-identity';
import type {ProfilePatch} from '../../src/receiz/profile-edit';
import '../../src/styles/tokens.css';import '../../src/styles/app.css';import '../../src/styles/features.css';import '../../src/public-explorer/profile.css';
const profile=parsePublicProfile(profileFixture(),'alexmorgan');profile.avatarUrl=null;profile.bannerUrl=null;profile.socialLinks=[{label:'Instagram',url:'https://instagram.com/alexmorgan'},{label:'GitHub',url:'https://github.com/alexmorgan'}];profile.links=[{label:'Studio',url:'https://studio.example/'},{label:'Writing',url:'https://writing.example/'}];
function Fixture(){const [username,setUsername]=useState(profile.username),[open,setOpen]=useState(true),held=useRef(username);held.current=username;const identity=useMemo(()=>({accountUsername:()=>held.current,knownProfile:()=>profile,profile:async()=>({availability:async(name:string)=>({available:name!=='taken'}),update:async(input:ProfilePatch)=>{if(input.username)setUsername(input.username);return{};}})} as unknown as OpenIdentity),[]);return <main className="console"><header className="app-header"><a className="bank-home-mark" href="/" aria-label="Bankeiz home"><BankMark/></a><button onClick={()=>setOpen(true)}>ID</button></header><section style={{padding:20,textAlign:'center'}}><h1>Profile controls</h1><p>Controlled qualification fixture. No account or host writes.</p><ProfileIdentity profile={profile}/></section>{open&&<Sheet title="Receiz ID" onClose={()=>setOpen(false)}><div className="profile-identity"><ProfileAvatar name={username} eager/><span className="profile-eyebrow">Receiz ID</span><code className="profile-public-id">{username}</code><p>Your verified identity, secured on this device.</p></div><QuickProfileEditor identity={identity} username={username}/><a className="identity-public-profile-link" href="/alexmorgan/"><span><strong>Your public profile</strong><small>View, share &amp; edit</small></span><ArrowUpRight size={18}/></a></Sheet>}</main>;}
createRoot(document.getElementById('root')!).render(<Fixture/>);
