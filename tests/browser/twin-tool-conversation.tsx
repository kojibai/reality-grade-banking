// Controlled transport and effects; real Twin parser, tool choreography and UI.
import {createRoot} from 'react-dom/client';
import {MessagesPanel} from '../../src/features/messages/MessagesPanel';
import {createNativeTwin} from '../../src/receiz/native-twin';
import type {OpenIdentity} from '../../src/receiz/native-identity';
import type {MoneyReceipt} from '../../src/receiz/money-workspace';
import '../../src/styles/tokens.css';import '../../src/styles/app.css';import '../../src/styles/features.css';
const uid='33333333-3333-4333-8333-333333333333',username='controlled_owner';
let finishMoney!:(receipt:MoneyReceipt)=>void,finishCalendar!:(rows:unknown[])=>void;
const money=new Promise<MoneyReceipt>(resolve=>{finishMoney=resolve;}),calendar=new Promise<unknown[]>(resolve=>{finishCalendar=resolve;});
const fixture={requests:[] as Record<string,unknown>[],moneyExecutions:0,calendarExecutions:0,finishMoney:()=>finishMoney({id:'money-read',tool:'money_list_commitments',status:'accepted',summary:'Internal tool results stay in model context',data:{totalOutstandingUsdCents:'12500',commitments:[{id:'acme',title:'Acme project',counterparty:'Acme',outstandingUsdCents:'12500'}]}}),finishCalendar:()=>finishCalendar([{id:'calendar-read',tool:'business_read_calendar',status:'accepted',title:'Calendar read',summary:'Your accepted calendar result',details:'{"events":[{"title":"Meet Sam"}]}'}]),recover:()=>{}};
Object.assign(window,{twinToolFixture:fixture});
const encoder=new TextEncoder();let interrupted=false;
const request=async(path:string,init?:RequestInit)=>{
 if(!path.endsWith('/message'))return Response.json({ok:true,conversations:[],calls:[],activeCall:null});
 const q=JSON.parse(String(init?.body));fixture.requests.push(q);
 const checking=q.message==='Who owes me?',scheduling=q.message==='Check my calendar too';
 const calendarDone=q.ownerContext?.records.some((row:{id:string})=>row.id==='native:calendar-read');
 const message=checking?(q.moneyContext?'Acme owes you $125 for the project.':'I’ll check your commitments.'):scheduling?(calendarDone?'You’re meeting Sam tomorrow.':'I’ll check your calendar too.'):'Yes, I’m here while those checks run.';
 const result={ok:true,requestId:q.requestId,world:{username},...(q.moneyTools?{moneyToolsSupported:true,moneyActions:checking&&!q.moneyContext?[{tool:'money_list_commitments',args:{direction:'receivable'}}]:[]}:{}),businessSetupSupported:true,businessActions:scheduling&&!calendarDone?[{tool:'business_read_calendar',args:{}}]:[],reply:{message,source:'upstream',memoryScope:'relationship',memory:[],actions:[]}};
 const frame=(event:string,value:unknown)=>encoder.encode('event: '+event+'\ndata: '+JSON.stringify(value)+'\n\n');
 if(q.message==='Keep this interrupted reply')return new Response(new ReadableStream<Uint8Array>({start(controller){controller.enqueue(frame('delta',{text:'I’m still here'}));if(!interrupted){interrupted=true;controller.close();}else fixture.recover=()=>{controller.enqueue(frame('result',{...result,reply:{...result.reply,message:'I’m still here. Your reply is recovered.'}}));controller.close();};}}),{headers:{'content-type':'text/event-stream'}});
 return new Response(new ReadableStream<Uint8Array>({start(controller){controller.enqueue(frame('delta',{text:message}));controller.enqueue(frame('result',result));controller.close();}}),{headers:{'content-type':'text/event-stream'}});
};
const twin=createNativeTwin({accountUid:uid,username,request,assertOpen(){}});
const api={accountUid:uid,twin,knownConversations:()=>[],conversations:async()=>[],callTransport:{heldFetch:async()=>Response.json({ok:true,calls:[],activeCall:null})}};
const identity={binding:{identityOwnerReceizId:'controlled'},knownTwinAccess:()=>true,messaging:async()=>api,moneyTools:async()=>({execute:async()=>{fixture.moneyExecutions++;return money;},checkpoint:async()=>{},recoverQuestion:async()=>null}),businessSetup:async()=>({execute:async()=>{fixture.calendarExecutions++;return calendar;}})} as unknown as OpenIdentity;
createRoot(document.getElementById('root')!).render(<MessagesPanel identity={identity} active onClose={()=>{}}/>);
