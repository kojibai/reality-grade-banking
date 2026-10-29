// @vitest-environment happy-dom
import {appendFileSync} from 'node:fs';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {beforeAll,expect,it,vi} from 'vitest';
import {MessagesPanel} from '../src/features/messages/MessagesPanel';
import type {OpenIdentity} from '../src/receiz/native-identity';
import type {NativeTwinAsk,NativeTwinReply} from '../src/receiz/native-twin';
const code=vi.hoisted(()=>{let release!:()=>void;return{promise:new Promise<void>(resolve=>{release=resolve;}),open:()=>release(),readyAt:0};});
vi.mock('../src/features/messages/BusinessReceipts',async()=>{await code.promise;const actual=await vi.importActual('../src/features/messages/BusinessReceipts');code.readyAt=performance.now();return actual;});
beforeAll(async()=>{await vi.importActual('../src/features/messages/BusinessReceipts');await import('../src/receiz/owner-tool-conversation');});
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('starts the same owner tool without waiting for receipt display code and paints its retained result when code is ready',async()=>{
 const evidence=process.env.BANKEIZ_OPENING_EVIDENCE,uid='33333333-3333-4333-8333-333333333333',actions=[{tool:'business_read_calendar',args:{start:'2026-11-02T00:00:00Z',end:'2026-11-03T00:00:00Z'}}];let acceptedAt=0,executeAt=0,releaseTimer:ReturnType<typeof setTimeout>|undefined;
 const execute=vi.fn(async(id:string,received:unknown)=>{executeAt=performance.now();expect(received).toEqual(actions);return[{id:id+':0',tool:actions[0].tool,status:'accepted' as const,title:'Native calendar result',summary:'Your held appointment result.',details:'{"events":[]}'}];});
 const ask=vi.fn(async(q:NativeTwinAsk):Promise<NativeTwinReply>=>{const first=ask.mock.calls.length===1;if(first){acceptedAt=performance.now();if(evidence)releaseTimer=setTimeout(code.open,300);}return{requestId:q.requestId,message:first?'I’ll read your calendar.':'Your calendar result is ready.',authority:'generated-interpretation',source:'upstream',memoryScope:'none',memory:[],sourceReferences:[],sharedContext:[],actionHandoffs:[],businessActions:first?actions:[]};});
 const api={accountUid:uid,twin:{ask,readiness:()=>({status:'configured',availability:'unchecked',requires:['business','usage-credits']})},knownConversations:()=>[],conversations:async()=>[],knownMessages:()=>null,callTransport:{heldFetch:async()=>Response.json({ok:true,calls:[],activeCall:null})}};
 const identity={binding:{identityOwnerReceizId:'held-owner'},knownTwinAccess:()=>true,messaging:async()=>api,businessSetup:async()=>({execute})} as unknown as OpenIdentity;
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await act(async()=>root.render(<MessagesPanel identity={identity} active onClose={()=>{}}/>));
  const field=host.querySelector<HTMLInputElement>('[aria-label="Ask your agent…"]')!;expect(field).toBeTruthy();
  await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(field,'Show tomorrow’s appointments');field.dispatchEvent(new Event('input',{bubbles:true}));});
  await act(async()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  await act(async()=>{await vi.waitFor(()=>expect(execute).toHaveBeenCalledOnce());});
  if(evidence)appendFileSync(evidence,JSON.stringify({path:'Owner tool start',startDelayMs:Math.round(executeAt-acceptedAt),receiptCodeDelayMs:300})+'\n');
  expect(code.readyAt===0||executeAt<code.readyAt).toBe(true);
  await act(async()=>code.open());
  await vi.waitFor(()=>expect(host.textContent).toContain('Native calendar result'));
  expect(host.textContent).toContain('Your calendar result is ready.');expect(execute).toHaveBeenCalledOnce();expect(ask).toHaveBeenCalledTimes(2);
 }finally{clearTimeout(releaseTimer);code.open();act(()=>root.unmount());host.remove();}
});
