import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MessagesPanel} from '../../src/features/messages/MessagesPanel';
import {BUSINESS_OPENING_MESSAGE} from '../../src/features/messages/useBusinessEntry';
import {createNativeMessaging} from '../../src/receiz/native-messaging';
import {createNativeTwin} from '../../src/receiz/native-twin';
import type {OpenIdentity} from '../../src/receiz/native-identity';
import '../../src/styles/tokens.css';import '../../src/styles/app.css';import '../../src/styles/features.css';
// In-memory fixture: no device identity, private data, payment, or external requests.
const accountUid='11111111-1111-4111-8111-111111111111';
const request=async(path:string)=>path==='/api/chat/conversations'?Response.json({ok:true,conversations:[]}):Response.json({ok:false,error:'fixture_only'},{status:503});
const api=Object.assign(createNativeMessaging({request,accountUid}),{twin:createNativeTwin({request,accountUid,username:null,assertOpen(){}})});
let approved=false;
const identity={knownTwinAccess:()=>false,messaging:async(approve:boolean)=>{if(!approved&&!approve)throw Error('MESSAGING_CONSENT_REQUIRED');approved=true;return api;},upgradeTwin:async()=>{throw Error('Synthetic fixture never opens real checkout.');}} as unknown as OpenIdentity;
function Fixture(){
 const [entry,setEntry]=useState<{id:string}|null>(null),[open,setOpen]=useState(false);
 return <main><p style={{padding:20}}>Synthetic browser fixture · no account is created, nothing is sent.</p><button className="primary-button" onClick={()=>{setEntry({id:crypto.randomUUID()});setOpen(true);}}>Get Business</button><p style={{padding:20}}>Opening request: {BUSINESS_OPENING_MESSAGE}</p><MessagesPanel identity={identity} active={open} initialBusinessRequest={entry} onBusinessConsumed={()=>setEntry(null)} onClose={()=>setOpen(false)}/></main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
