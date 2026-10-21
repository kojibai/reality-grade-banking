export interface NotificationTarget {conversationId:string;recipientUserId:string;callId?:string;mode?:'voice'|'video'}
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
export function notificationTarget(value:unknown):NotificationTarget|null{
 if(!value||typeof value!=='object')return null;const v=value as Record<string,unknown>;
 if(!uuid(v.conversationId)||!uuid(v.recipientUserId))return null;
 return{conversationId:v.conversationId,recipientUserId:v.recipientUserId,...(uuid(v.callId)&&['voice','video'].includes(String(v.mode))?{callId:v.callId,mode:v.mode as 'voice'|'video'}:{})};
}
export function notificationFromUrl(search:string){
 const p=new URLSearchParams(search);if(p.get('bankNotification')!=='1')return null;
 if(['bankNotification','conversation','recipient','call','mode'].some(key=>p.getAll(key).length>1))return null;
 return notificationTarget({conversationId:p.get('conversation'),recipientUserId:p.get('recipient'),callId:p.get('call'),mode:p.get('mode')});
}
export function clearNotificationUrl(){const url=new URL(location.href);for(const key of ['bankNotification','conversation','recipient','call','mode'])url.searchParams.delete(key);history.replaceState(history.state,'',url.pathname+url.search+url.hash);}
