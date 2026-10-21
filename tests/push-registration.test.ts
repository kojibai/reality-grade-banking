// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import {createMessageNotifications,notificationOwner} from '../src/pwa/push-registration';
import {notificationFromUrl} from '../src/pwa/notification-target';
const uid='33333333-3333-4333-8333-333333333333',thread='11111111-1111-4111-8111-111111111111';
afterEach(()=>{vi.unstubAllGlobals();localStorage.clear();});
function fixture(permission:NotificationPermission='default',configured=true,save=true){
 const order:string[]=[],requestPermission=vi.fn(async()=>{order.push('permission');Object.assign(Notification,{permission:'granted'});return 'granted' as const;}),unsubscribe=vi.fn(async()=>true),subscription={endpoint:'https://push.example/device',toJSON:()=>({endpoint:'https://push.example/device',keys:{p256dh:'a',auth:'b'}}),unsubscribe};
 let held:typeof subscription|null=null;
 const worker={postMessage:(data:any,ports:MessagePort[])=>{order.push(data.type);ports[0].postMessage({ready:true});}};
 const registration={active:worker,pushManager:{getSubscription:async()=>held,subscribe:vi.fn(async()=>{order.push('subscribe');return held=subscription;})}};
 vi.stubGlobal('isSecureContext',true);vi.stubGlobal('Notification',{permission,requestPermission});vi.stubGlobal('PushManager',class{});
 Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{getRegistration:async()=>registration}});
 const publicKey=btoa(String.fromCharCode(4)+String.fromCharCode(...Array.from({length:64},(_,i)=>i))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 const request=vi.fn(async(_path:string,init?:RequestInit)=>{const method=init?.method??'GET';order.push(method);return Response.json(method==='GET'?{ok:true,publicKey:configured?publicKey:null}:{ok:save},{status:save||method==='GET'?200:503});});
 return{api:createMessageNotifications(request,uid),request,requestPermission,order,registration,unsubscribe};
}
it('does nothing until explicitly enabled, requests permission in the click stack, and registers one existing-account subscription',async()=>{
 const f=fixture();expect(f.request).not.toHaveBeenCalled();const pending=f.api.enable();expect(f.order[0]).toBe('permission');await pending;expect(f.request.mock.calls.map(([,init])=>init?.method??'GET')).toEqual(['GET','POST']);expect(f.registration.pushManager.subscribe).toHaveBeenCalledOnce();expect(notificationOwner()).toBe(uid);await f.api.enable(false);expect(f.requestPermission).toHaveBeenCalledOnce();
});
it('does not subscribe or save when notification service is unconfigured',async()=>{const f=fixture('granted',false);await expect(f.api.enable()).rejects.toThrow('PUSH_UNCONFIGURED');expect(f.registration.pushManager.subscribe).not.toHaveBeenCalled();expect(notificationOwner()).toBeNull();});
it('removes a newly created browser subscription if server registration fails',async()=>{const f=fixture('granted',true,false);await expect(f.api.enable()).rejects.toThrow('PUSH_REGISTRATION_UNAVAILABLE');expect(f.unsubscribe).toHaveBeenCalledOnce();expect(notificationOwner()).toBeNull();});
it('does not contact the service when permission is denied',async()=>{const f=fixture('denied');await expect(f.api.enable()).rejects.toThrow('PUSH_PERMISSION_DENIED');expect(f.request).not.toHaveBeenCalled();});
it('clears local delivery and the exact subscription when turned off',async()=>{const f=fixture('granted');await f.api.enable();await f.api.disable();expect(notificationOwner()).toBeNull();expect(f.unsubscribe).toHaveBeenCalledOnce();expect(f.request.mock.calls.at(-1)?.[1]).toMatchObject({method:'DELETE',body:JSON.stringify({endpoint:'https://push.example/device'})});});
it('accepts only typed notification coordinates, never alternate URLs or duplicate selectors',()=>{
 expect(notificationFromUrl('?bankNotification=1&recipient='+uid+'&conversation='+thread)).toEqual({recipientUserId:uid,conversationId:thread});
 expect(notificationFromUrl('?bankNotification=1&recipient='+uid+'&conversation=../private')).toBeNull();expect(notificationFromUrl('?bankNotification=1&recipient='+uid+'&conversation='+thread+'&conversation='+thread)).toBeNull();
});

it('coalesces concurrent restoration into one registration instead of creating redundant calls',async()=>{const f=fixture('granted');const one=f.api.enable(false),two=f.api.enable(false);expect(one).toBe(two);await one;expect(f.request.mock.calls.map(([,init])=>init?.method??'GET')).toEqual(['GET','POST']);expect(f.registration.pushManager.subscribe).toHaveBeenCalledOnce();});
