import {useEffect,useRef,useState} from 'react';
import {Bell,BellRing,Check,X} from 'lucide-react';
import type {NativeMessaging} from '../../receiz/native-messaging';
import {notificationOwner,supportsPush} from '../../pwa/push-registration';
const explanation=(cause:unknown)=>{
 switch(cause instanceof Error?cause.message:''){
  case 'PUSH_PERMISSION_DENIED':return 'Notifications are turned off in your device settings. You can allow them there.';
  case 'PUSH_APP_UPDATE_REQUIRED':return 'Close and reopen Bankeiz to finish updating notifications, then try again.';
  case 'PUSH_UNCONFIGURED':return 'Phone notifications are not available yet. Your messages and calls still work here.';
  default:return 'Notifications could not be enabled. You can try again here.';
 }
};
export function NotificationsControl({api}:{api:NativeMessaging|null}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[enabled,setEnabled]=useState(()=>supportsPush()&&Notification.permission==='granted'&&notificationOwner()===api?.accountUid),region=useRef<HTMLDivElement>(null),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{if(!open)return;const outside=(e:PointerEvent)=>{if(!region.current?.contains(e.target as Node))setOpen(false);},key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.stopPropagation();setOpen(false);}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key,true);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key,true);};},[open]);
 // Restore an already-consented subscription only after Messages is open.
 // Never prompt, block admission, poll, or register on the account paint path.
 useEffect(()=>{
  if(!api?.notifications||!supportsPush()||Notification.permission!=='granted'||notificationOwner()!==api.accountUid)return;
  let current=true;void api.notifications.enable(false).then(()=>{if(current)setEnabled(true);}).catch(cause=>{if(current){setEnabled(false);setNotice(explanation(cause));}});return()=>{current=false;};
 },[api]);
 const toggle=async()=>{if(!api?.notifications||busy)return;setBusy(true);setNotice('');try{if(enabled){await api.notifications.disable();if(alive.current)setEnabled(false);}else{await api.notifications.enable();if(alive.current){setEnabled(true);setNotice('Messages and calls can now reach this device.');}}}catch(cause){if(alive.current)setNotice(explanation(cause));}finally{if(alive.current)setBusy(false);}};
 if(!api?.notifications)return null;
 const supported=supportsPush();
 return <div ref={region} className="bank-notifications"><button type="button" className={'bank-notification-entry'+(enabled?' is-enabled':'')} aria-label="Message and call notifications" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{enabled?<BellRing size={17}/>:<Bell size={17}/>}</button>{open&&<section className="bank-notification-popover" aria-label="Notification settings"><button type="button" className="bank-notification-close" aria-label="Close notification settings" onClick={()=>setOpen(false)}><X size={15}/></button><span className="bank-notification-mark"><Bell size={21}/></span><h3>Stay in the conversation.</h3><p>Messages and calls, on your phone. Tap a notification to pick up where you left off.</p>{supported?<button type="button" className="bank-notification-toggle" disabled={busy} onClick={()=>void toggle()}>{busy?'Updating…':enabled?<><Check size={14}/>Notifications on · Turn off</>:'Enable notifications'}</button>:<p className="bank-notification-help">On iPhone, add Bankeiz to your Home Screen and open it there to enable phone notifications. This browser must support Web Push.</p>}{notice&&<p className="bank-notification-help" role="status">{notice}</p>}</section>}</div>;
}
