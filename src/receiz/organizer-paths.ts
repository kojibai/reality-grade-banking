import {validCalendarTimezone} from './calendar-timezone.js';
const uuid=/^[a-f\d]{8}-[a-f\d]{4}-[1-5][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const date=(value:string)=>value.length<=35&&Number.isFinite(Date.parse(value));
/** Coordinates only. The existing Receiz service independently checks the
 * admitted account and permissions; the caller cannot select a private owner. */
export function permittedOrganizerPath(url:URL,method:string):boolean {
 if(url.origin!=='https://receiz.com'||url.username||url.password||url.hash)return false;
 const verb=method.toUpperCase(),path=url.pathname,params=url.searchParams;
 if([...params.keys()].some(key=>params.getAll(key).length!==1))return false;
 if(path==='/api/contacts')return !url.search&&['GET','POST'].includes(verb);
 if(path==='/api/contacts/import')return !url.search&&verb==='POST';
 if(path.startsWith('/api/contacts/'))return !url.search&&uuid.test(path.slice('/api/contacts/'.length))&&['GET','PATCH','DELETE'].includes(verb);
 if(path==='/api/calendar/events'){
  if(verb==='POST')return !url.search;
  if(verb!=='GET')return false;
  return [...params].every(([key,value])=>key==='start'||key==='end'?date(value):key==='limit'?/^(?:[1-9]\d?|[1-4]\d{2}|500)$/.test(value):key==='cursor'?/^[A-Za-z0-9_-]{1,2048}$/.test(value):false);
 }
 if(path.startsWith('/api/calendar/events/')&&path.endsWith('/bundle')){let id:string;try{id=decodeURIComponent(path.slice('/api/calendar/events/'.length,-'/bundle'.length));}catch{return false;}const parts=id.split(':');return !url.search&&verb==='GET'&&(uuid.test(id)||parts[0]==='wallet'&&((['transfer','note_mint','reserve_credit','wallet_ledger_entry'].includes(parts[1]!)&&parts.length===3&&uuid.test(parts[2]!))||(parts[1]==='note_claim'&&parts.length===4&&uuid.test(parts[2]!)&&uuid.test(parts[3]!))));}
 if(/^\/api\/calendar\/events\/[a-f\d-]{36}$/.test(path))return uuid.test(path.slice('/api/calendar/events/'.length))&&!url.search&&verb==='PATCH';
 if(/^\/api\/calendar\/embed\/[a-z0-9_]{3,24}$/.test(path)){
  if(['POST','PUT'].includes(verb))return !url.search;
  if(verb!=='GET')return false;
  return [...params].every(([key,value])=>key==='timezone'?validCalendarTimezone(value):key==='slotMinutes'?/^\d{2,3}$/.test(value)&&+value>=15&&+value<=180:key==='daysForward'?/^\d{1,3}$/.test(value)&&+value>=1&&+value<=45:key==='hourStarts'?/^(?:[01]?\d|2[0-3])(?:,(?:[01]?\d|2[0-3])){0,23}$/.test(value):key==='weekdayIndexes'?/^[0-6](?:,[0-6]){0,6}$/.test(value):key==='questions'?value.length<=8192:false);
 }
 return false;
}
