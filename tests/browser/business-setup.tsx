import {createRoot} from 'react-dom/client';
import {MessagesPanel} from '../../src/features/messages/MessagesPanel';
import {createNativeMessaging} from '../../src/receiz/native-messaging';
import {createNativeTwin} from '../../src/receiz/native-twin';
import {createBusinessDnsTools} from '../../src/receiz/business-dns-tools';
import {createBusinessChat} from '../../src/receiz/business-chat';
import type {OpenIdentity} from '../../src/receiz/native-identity';
import '../../src/styles/tokens.css';import '../../src/styles/app.css';import '../../src/styles/features.css';
const uid='11111111-1111-4111-8111-111111111111',hostname='studio.example.com';
// Synthetic contract fixture: actual adapters, executor and UI. No external
// account, model call, provider grant, profile write or payment is performed.
const request=async(path:string,init?:RequestInit)=>{
 if(path.includes('/api/developers/twin/')){
  const body=JSON.parse(String(init?.body)),domain=String(body.message).toLowerCase().includes('domain'),text=domain?'I’ll check the saved domain and connect it with Namecheap and confirm when it’s live.':'I’ll save that bio on your existing profile.';
  const result={ok:true,requestId:body.requestId,world:{username:'fixture_owner'},businessSetupSupported:true,businessActions:[{tool:domain?'business_dns_configure':'business_update_profile',args:domain?{mode:'automatic',provider:'namecheap'}:{patch:{bio:'Independent creative studio.'}}}],reply:{message:text,source:'upstream',memoryScope:'relationship',memory:[],actions:[]}};
  let cancelled=false;const stream=new ReadableStream<Uint8Array>({start(controller){const emit=(event:string,data:unknown)=>{if(!cancelled)controller.enqueue(new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));};emit('ready',{});void(async()=>{for(const chunk of text.match(/.{1,8}/g)??[]){await new Promise(resolve=>setTimeout(resolve,180));if(cancelled)return;emit('delta',{text:chunk});}emit('result',result);if(!cancelled)controller.close();})();},cancel(){cancelled=true;}});return new Response(stream,{headers:{'content-type':'text/event-stream'}});
 }
 if(path==='/api/chat/conversations')return Response.json({ok:true,conversations:[]});
 if(path==='/api/chat/ai')return Response.json({ok:true,agents:[],defaultAiId:null});
 return Response.json({ok:true,calls:[],activeCall:null});
};
const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));let checks=0;
const domainSetup={recommendedRecords:[{type:'CNAME',name:hostname,value:'cname.vercel-dns.com',purpose:'Connect your profile'}],verificationRecords:[{type:'TXT',name:'_verify.'+hostname,value:'synthetic-verification-record',purpose:'Verify ownership'}]};
const setup=createBusinessChat({accountUid:uid,assertOpen(){},profile:async()=>({updateProfile:async()=>{await delay(3200);return{accountUid:uid,profilePath:'/fixture_owner',profile:{}};}}) as never,setup:async()=>({}) as never,dns:async()=>createBusinessDnsTools({accountUid:uid,assertOpen(){},execute:async tool=>{await delay(1400);const live=tool==='business_check_domain'&&++checks>=3;return{accountUid:uid,tool,outcome:'accepted',data:{domain:{hostname},setup:{...domainSetup,phase:live?'live':'pending_dns',attached:true,verified:live,misconfigured:!live,warning:null,liveUrl:live?'https://'+hostname:null,summary:live?'Profile delivery confirmed.':'Waiting for DNS propagation.'}}} as never;},connection:async()=>({accountUid:uid,provider:'Namecheap',canWrite:true,apply:async plan=>{await delay(2400);return{status:'applied',records:[plan.connectionOptions[0],...plan.verificationRecords]};}})})});
const twin=createNativeTwin({accountUid:uid,username:'fixture_owner',request,assertOpen(){}}),api=Object.assign(createNativeMessaging({accountUid:uid,request}),{twin,knownTwinAccess:()=>true});
const identity={binding:{identityOwnerReceizId:'synthetic-owner'},knownTwinAccess:()=>true,messaging:async()=>api,businessSetup:async()=>setup} as unknown as OpenIdentity;
createRoot(document.getElementById('root')!).render(<main><p style={{position:'fixed',top:8,left:16,fontSize:11,color:'#62738b'}}>Synthetic Business setup verification · no live account changes</p><MessagesPanel identity={identity} active onClose={()=>{}}/></main>);
