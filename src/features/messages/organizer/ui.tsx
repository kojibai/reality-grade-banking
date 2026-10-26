import {ChevronLeft,ChevronRight} from 'lucide-react';
import {useCopyFeedback,CopyFeedbackIcon} from '../../../components/CopyFeedback';
import type {ReactNode} from 'react';
export function Back({children,onClick}:{children:ReactNode;onClick():void}){return <button type="button" className="organizer-back" onClick={onClick}><ChevronLeft size={16}/>{children}</button>;}
export function Row({children,detail,onClick}:{children:ReactNode;detail?:ReactNode;onClick():void}){return <button type="button" className="organizer-row" onClick={onClick}><span>{children}</span>{detail&&<small>{detail}</small>}<ChevronRight size={16}/></button>;}
export function Copy({value,label='Copy link',onError}:{value:string;label?:string;onError?(error:unknown):void}){const feedback=useCopyFeedback(value);return <button type="button" className="organizer-copy" aria-label={feedback.copied?'Copied':label} onClick={()=>{void navigator.clipboard.writeText(value).then(feedback.confirm).catch(onError??(()=>{}));}}><CopyFeedbackIcon copied={feedback.copied}/><span>{label}</span></button>;}
export const localDay=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export const dayDate=(day:string)=>new Date(day+'T12:00:00');
// Labels use noon; event intervals must begin at local midnight.
export const dayStart=(day:string)=>new Date(day+'T00:00:00');
export const addDays=(day:string,n:number)=>{const date=dayDate(day);date.setDate(date.getDate()+n);return localDay(date);};
export const addMonths=(day:string,n:number)=>{const date=dayDate(day);date.setDate(1);date.setMonth(date.getMonth()+n);return localDay(date);};
export const dayLabel=(raw:string)=>new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric'}).format(dayDate(raw));
export const timeLabel=(raw:string)=>new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(new Date(raw));
export const errorLabel=(error:unknown)=>error instanceof Error&&error.message==='ORGANIZER_WRITE_UNCONFIRMED'?'Your change is not confirmed. Your details are kept here. Check the record before trying again.':error instanceof Error&&error.message==='insufficient_scope'?'Contacts and Calendar access is not available for this ID yet. Your records are unchanged.':error instanceof Error&&error.message.includes('conflict')?'This record changed elsewhere. Your details are kept here. Open the latest record before saving.':'This could not be completed. Your existing records and the details you entered are kept.';
export function OrganizerFailure({error}:{error:unknown}){
 const code=error instanceof Error&&/^(?:ORGANIZER_[A-Z_]+|contacts?_[a-z_]+|calendar_[a-z_]+|invalid_token|insufficient_scope|signin_required)$/.test(error.message)&&error.message.length<=100?error.message:null;
 const rawStatus=error!==null&&typeof error==='object'&&'status'in error?error.status:null,status=typeof rawStatus==='number'&&Number.isInteger(rawStatus)&&rawStatus>=100&&rawStatus<=599?rawStatus:null;
 return <><p className="organizer-error" role="alert">{error==='Contacts and Calendar are not available for this ID yet.'?error:errorLabel(error)}</p>{code&&<details className="organizer-details organizer-error-details"><summary>Details</summary><code>{code}</code>{status&&<small>HTTP {status}</small>}</details>}</>;
}
