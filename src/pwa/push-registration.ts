import type {MessageTransport} from '../receiz/native-messaging';
const OWNER='bankeiz.notifications.owner.v1',PATH='/api/chat/notifications/push';
export function supportsPush(){return typeof window!=='undefined'&&window.isSecureContext&&'Notification'in window&&'PushManager'in window&&'serviceWorker'in navigator;}
export function notificationOwner(){try{return localStorage.getItem(OWNER);}catch{return null;}}
function remember(owner:string|null){try{if(owner)localStorage.setItem(OWNER,owner);else localStorage.removeItem(OWNER);}catch{/* Local display preference only. */}}
async function workerMessage(worker:ServiceWorker,message:Record<string,unknown>){
 return new Promise<void>((resolve,reject)=>{const channel=new MessageChannel();const finish=(cause?:Error)=>{clearTimeout(timer);channel.port1.close();channel.port2.close();cause?reject(cause):resolve();};const timer=setTimeout(()=>finish(Error('PUSH_APP_UPDATE_REQUIRED')),1500);channel.port1.onmessage=event=>finish(event.data?.ready===true?undefined:Error('PUSH_APP_UPDATE_REQUIRED'));try{worker.postMessage(message,[channel.port2]);}catch{finish(Error('PUSH_APP_UPDATE_REQUIRED'));}});
}
export async function notificationWorker(){
 const registration=await navigator.serviceWorker.getRegistration('/');
 if(!registration?.active)throw Error('PUSH_APP_UPDATE_REQUIRED');
 await workerMessage(registration.active,{type:'BANK_PUSH_STATUS'});return registration;
}
async function bind(registration:ServiceWorkerRegistration,accountUid:string|null){if(!registration.active)throw Error('PUSH_APP_UPDATE_REQUIRED');await workerMessage(registration.active,{type:'BANK_PUSH_BIND',version:1,accountUid});}
async function checked(response:Response){const body=await response.json().catch(()=>null);if(!response.ok||body?.ok!==true)throw Error('PUSH_REGISTRATION_UNAVAILABLE');return body as {ok:true;publicKey?:string|null};}
function applicationKey(raw:string){if(!/^[A-Za-z0-9_-]{87}$/.test(raw))throw Error('PUSH_UNCONFIGURED');const bytes=Uint8Array.from(atob(raw.replace(/-/g,'+').replace(/_/g,'/')+'='),c=>c.charCodeAt(0));if(bytes.length!==65||bytes[0]!==4)throw Error('PUSH_UNCONFIGURED');return bytes;}
export function createMessageNotifications(request:MessageTransport,accountUid:string){
 let pending:Promise<void>|undefined;
 return{
  enable(requestPermission=true):Promise<void>{
   if(pending)return pending;
   const attempt=(async()=>{
   if(!supportsPush())throw Error('PUSH_UNSUPPORTED');
   // Must execute in the user's click stack, before any network or worker await.
   const permission=Notification.permission==='default'&&requestPermission?await Notification.requestPermission():Notification.permission;
   if(permission!=='granted')throw Error(permission==='denied'?'PUSH_PERMISSION_DENIED':'PUSH_PERMISSION_REQUIRED');
   const [registration,config]=await Promise.all([notificationWorker(),request(PATH,{cache:'no-store'}).then(checked)]);
   if(!config.publicKey)throw Error('PUSH_UNCONFIGURED');
   let subscription=await registration.pushManager.getSubscription(),created=false;
   if(!subscription){subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:applicationKey(config.publicKey)});created=true;}
   const prior=notificationOwner();
   try{
    await bind(registration,accountUid);
    await checked(await request(PATH,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({subscription:subscription.toJSON(),userAgent:navigator.userAgent,platform:navigator.platform})}));
    remember(accountUid);
   }catch(cause){await bind(registration,prior).catch(()=>{});if(created)await subscription.unsubscribe().catch(()=>{});throw cause;}
   })();
   pending=attempt;void attempt.finally(()=>{if(pending===attempt)pending=undefined;}).catch(()=>{});return attempt;
  },
  async disable(){
   await pending?.catch(()=>{});
   const registration=await navigator.serviceWorker.getRegistration('/');
   await (registration?bind(registration,null):Promise.resolve());remember(null);
   const subscription=await registration?.pushManager.getSubscription();if(!subscription)return;
   try{await checked(await request(PATH,{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({endpoint:subscription.endpoint})}));}finally{await subscription.unsubscribe();}
  },
 };
}
/** Forgetting this device revokes delivery locally even if the host is offline. */
export async function forgetPushSubscription(){
 remember(null);if(typeof navigator==='undefined'||!('serviceWorker'in navigator))return;
 const registration=await navigator.serviceWorker.getRegistration('/');if(!registration)return;
 await bind(registration,null).catch(()=>{});await (await registration.pushManager.getSubscription())?.unsubscribe();
}
