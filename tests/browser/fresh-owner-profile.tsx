import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {PublicProfilePortal} from '../../src/features/account/PublicProfilePortal';
import {IdentityProfile} from '../../src/features/account/IdentityProfile';
import {PublicProfilePage} from '../../src/public-explorer/PublicProfilePage';
import type {OpenIdentity} from '../../src/receiz/native-identity';
import '../../src/styles/tokens.css';import '../../src/styles/app.css';import '../../src/styles/features.css';import '../../src/public-explorer/profile.css';
const held=JSON.parse(document.getElementById('admitted-owner')!.textContent!);
const username=held.username.replace(/^receiz_/,'');
const identity={...held,accountUsername:()=>held.username,walletReceivingAddress:()=>held.receivingUid,knownWallet:()=>held.wallet,knownProfile:()=>null,knownMessagingDisplay:()=>null}as unknown as OpenIdentity;
function Fixture(){const[open,setOpen]=useState(false);return <><PublicProfilePortal identity={identity} userId={held.receivingUid}/>{!open?<div onClick={e=>{const link=(e.target as Element).closest('a.identity-public-profile-link');if(link){e.preventDefault();history.replaceState(null,'',link.getAttribute('href'));setOpen(true);}}}><IdentityProfile identity={identity} onRefresh={()=>{}} onForget={async()=>{}}/></div>:<PublicProfilePage username={username} active source={{catalog:null,historyCatalog:null,pulse:0,status:'loading',quoteStatus:'stale',sportsStatus:'missing',error:null,refresh:async()=>{}} as never}/>}</>;}
createRoot(document.getElementById('root')!).render(<Fixture/>);
