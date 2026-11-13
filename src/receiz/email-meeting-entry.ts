import {openVerifiedInvitationAccount} from './pbi-account';
export type EmailMeetingObservation={ok:true;recipient:{userId:string;email:string};invitation:{eventId:string;key:string}};
export type EmailMeetingEntryState=EmailMeetingObservation|{ok:true;pending:true;autoContinue:boolean}|{ok:true;invitation:false};
const base='/api/bank/native/email-meeting/';
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
async function request(operation:'state'|'open'){
 const response=await fetch(base+operation,{method:operation==='open'?'POST':'GET',credentials:'same-origin',redirect:'error',cache:'no-store',headers:operation==='open'?{'Content-Type':'application/json',Accept:'application/json'}:{Accept:'application/json'},...(operation==='open'?{body:'{}'}:{}),signal:AbortSignal.timeout(60000)});
 const value=await response.json();if(!response.ok||value?.ok!==true)throw Error('This invitation could not be opened. Use the original invitation email and try again.');return value;
}
function observation(value:EmailMeetingObservation):EmailMeetingObservation{
 if(!uuid(value.recipient?.userId)||typeof value.recipient.email!=='string'||value.recipient.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.recipient.email)||!uuid(value.invitation?.eventId)||typeof value.invitation.key!=='string'||!/^[A-Za-z0-9_-]{16,160}$/.test(value.invitation.key))throw Error('This invitation could not be verified.');
 return{ok:true,recipient:value.recipient,invitation:value.invitation};
}
export async function readEmailMeetingEntry():Promise<EmailMeetingEntryState>{
 const value=await request('state');
 if(value.invitation===false){if(Object.keys(value).sort().join('|')!=='invitation|ok')throw Error('This invitation could not be verified.');return{ok:true,invitation:false};}
 if(value.pending===true)return{ok:true,pending:true,autoContinue:value.autoContinue===true};
 return observation(value);
}
let opening:Promise<EmailMeetingObservation>|null=null;
/** Only a canonical recipient observation can reach existing-account recovery.
 * A failed/expired invitation never falls through to fresh account creation. */
export function openEmailMeeting():Promise<EmailMeetingObservation>{
 if(opening)return opening;
 const work=(async()=>{const value=observation(await request('open')),identity=await openVerifiedInvitationAccount(value.recipient.userId);identity.dispose();return value;})();
 opening=work;void work.finally(()=>{if(opening===work)opening=null;}).catch(()=>{});return work;
}
export function emailMeetingResumePath(value:EmailMeetingObservation):string{
 const verified=observation(value),query=new URLSearchParams({meeting:verified.invitation.eventId,meetingKey:verified.invitation.key});return '/?'+query+'#account/messages';
}
