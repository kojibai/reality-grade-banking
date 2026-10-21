import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {expect,it,vi} from 'vitest';
const owner='33333333-3333-4333-8333-333333333333',conversation='11111111-1111-4111-8111-111111111111',call='22222222-2222-4222-8222-222222222222';
function worker(){
 const handlers:Record<string,(event:any)=>void>={},stored=new Map<string,Response>(),notifications:any[]=[];
 const client={url:'https://bankeiz.com/',focus:vi.fn(async()=>client),postMessage:vi.fn()},openWindow=vi.fn();
 const source=readFileSync('src/pwa/sw.template.js','utf8').replace('__CACHE_VERSION__','test').replace('__SHELL_ASSETS__','[]').replace('__RESOURCE_HASHES__','{}').replace('__PAGE_ROUTES__','{}');
 runInNewContext(source,{URL,URLSearchParams,Request,Response,Date,console,self:{location:{origin:'https://bankeiz.com'},addEventListener:(key:string,fn:any)=>handlers[key]=fn,registration:{showNotification:async(title:string,options:any)=>notifications.push({title,...options})},clients:{matchAll:async()=>[client],openWindow}},caches:{open:async()=>({match:async(key:string)=>stored.get(key)?.clone(),put:async(key:string,value:Response)=>{stored.set(key,value);},delete:async(key:string)=>stored.delete(key)})}});
 async function event(key:string,values:any){let work:Promise<unknown>|undefined;expect(handlers[key],key+' handler').toBeTypeOf('function');handlers[key]({...values,waitUntil:(value:Promise<unknown>)=>work=value});await work;}
 const bind=(userId:string|null)=>event('message',{data:{type:'BANK_PUSH_BIND',version:1,accountUid:userId},source:{url:'https://bankeiz.com/'},ports:[]});
 const push=(values:any)=>event('push',{data:{json:()=>values}});
 return{event,bind,push,notifications,client,openWindow};
}
const payload=()=>({version:1,source:'receiz.chat',kind:'message',title:'Sam',body:'An incoming message',recipientUserId:owner,conversationId:conversation,timestamp:Date.now(),url:'https://attacker.invalid/'});
it('shows a bound message with Bank icons and derives its destination from validated IDs, never a supplied URL',async()=>{
 const w=worker();await w.bind(owner);await w.push(payload());expect(w.notifications).toHaveLength(1);expect(w.notifications[0]).toMatchObject({title:'Sam',body:'An incoming message',icon:'/icon-192.png',data:{conversationId:conversation,recipientUserId:owner}});
 const close=vi.fn();await w.event('notificationclick',{notification:{data:w.notifications[0].data,close},action:''});expect(close).toHaveBeenCalledOnce();expect(w.client.postMessage).toHaveBeenCalledWith(expect.objectContaining({type:'BANK_NOTIFICATION_OPEN',target:expect.objectContaining({conversationId:conversation,recipientUserId:owner})}));expect(w.openWindow).not.toHaveBeenCalled();
});
it('never exposes another account’s message or opens its conversation after the binding changes',async()=>{
 const w=worker();await w.bind(owner);await w.push(payload());const old=w.notifications[0];await w.bind('44444444-4444-4444-8444-444444444444');await w.push(payload());expect(w.notifications.at(-1).body).not.toContain('An incoming message');await w.event('notificationclick',{notification:{data:old.data,close:()=>{}},action:''});expect(w.client.postMessage.mock.calls.at(-1)?.[0].target).toBeNull();
});
it('opens a current call invitation, treats stale calls as messages, and dismisses without opening the app',async()=>{
 const w=worker();await w.bind(owner);await w.push({...payload(),kind:'call',callId:call,mode:'voice'});expect(w.notifications[0]).toMatchObject({requireInteraction:true,data:{callId:call,mode:'voice'}});
 await w.event('notificationclick',{notification:{data:w.notifications[0].data,close:()=>{}},action:'dismiss'});expect(w.client.focus).not.toHaveBeenCalled();
 await w.push({...payload(),kind:'call',callId:call,mode:'voice',timestamp:Date.now()-180000});expect(w.notifications.at(-1).data.callId).toBeUndefined();
});
it('rejects malformed IDs and ignores attempts by another origin to change the notification account',async()=>{
 const w=worker();await w.bind(owner);await w.event('message',{data:{type:'BANK_PUSH_BIND',version:1,accountUid:null},source:{url:'https://other.invalid/'},ports:[]});await w.push(payload());expect(w.notifications[0].title).toBe('Sam');await w.push({...payload(),conversationId:'../private'});expect(w.notifications.at(-1).data).toBeNull();
});
