import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MessagesPanel} from '../../src/features/messages/MessagesPanel';
import {BUSINESS_OPENING_MESSAGE,type BusinessStart} from '../../src/features/messages/useBusinessEntry';
import {businessFits,businessFitStart} from '../../src/content/business-fits.mjs';
import {createNativeMessaging} from '../../src/receiz/native-messaging';
import {createNativeTwin} from '../../src/receiz/native-twin';
import type {OpenIdentity} from '../../src/receiz/native-identity';
import '../../src/styles/tokens.css';import '../../src/styles/app.css';import '../../src/styles/features.css';
// In-memory fixture: no device identity, private data, payment, or external requests.
const accountUid='11111111-1111-4111-8111-111111111111',start=businessFitStart(businessFits[0]);
let approved=false,access=false;
const request=async(path:string,init?:RequestInit)=>{
 if(path==='/api/chat/conversations')return Response.json({ok:true,conversations:[]});
 if(path==='/api/developers/twin/fixture/message'){
  const question=JSON.parse(String(init?.body));
  return Response.json({ok:true,requestId:question.requestId,world:{username:'fixture'},reply:{message:`Synthetic reviewable draft. Your request: ${question.message}`,source:'local',memoryScope:'session',memory:[],actions:[],cognition:{frame:{owner:{ownerUserId:accountUid,username:'fixture'},sources:[],policy:{consequentialOutput:'proposal-only'}},proposal:{proposedActions:[]}}}});
 }
 return Response.json({ok:false,error:'fixture_only'},{status:503});
};
const api=Object.assign(createNativeMessaging({request,accountUid}),{twin:createNativeTwin({request,accountUid,username:'fixture',assertOpen(){}})});
const identity={knownTwinAccess:()=>access,messaging:async(approve:boolean)=>{if(!approved&&!approve)throw Error('MESSAGING_CONSENT_REQUIRED');approved=true;return api;},upgradeTwin:async()=>{access=true;return {twinAccess:true};}} as unknown as OpenIdentity;
function Fixture(){
 const [entry,setEntry]=useState<{id:string;start:BusinessStart}|null>(null),[open,setOpen]=useState(false);
 return <main><p style={{padding:20}}>Synthetic browser fixture · payment confirmation and replies are simulated. No account is created, nothing is sent.</p><button className="primary-button" onClick={()=>{setEntry({id:crypto.randomUUID(),start});setOpen(true);}}>Get Business</button><p style={{padding:20}}>Opening request: {BUSINESS_OPENING_MESSAGE}<br/>First task: {start.title}</p><MessagesPanel identity={identity} active={open} initialBusinessRequest={entry} onBusinessConsumed={()=>setEntry(null)} onClose={()=>setOpen(false)}/></main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
