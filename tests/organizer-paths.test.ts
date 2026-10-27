import {describe,it,expect} from 'vitest';
import {permittedOrganizerPath} from '../src/receiz/organizer-paths';
import {permittedNativePath} from '../src/receiz/native-transport';
const check=(path:string,method='GET')=>permittedOrganizerPath(new URL(path,'https://receiz.com'),method);
describe('same-account organizer transport',()=>{
 it('allows only the existing contact, calendar and booking operations',()=>{
  for(const [path,method] of [['/api/contacts','GET'],['/api/contacts','POST'],['/api/contacts/import','POST'],['/api/contacts/00000000-0000-4000-8000-000000000001','PATCH'],['/api/calendar/events?start=2026-10-01T00%3A00%3A00.000Z&end=2026-11-01T00%3A00%3A00.000Z&limit=250','GET'],['/api/calendar/events','POST'],['/api/calendar/embed/bjklock','PUT'],['/api/calendar/embed/bjklock?slotMinutes=30&hourStarts=9%2C10&weekdayIndexes=1%2C2&daysForward=14','GET']]){expect(check(path,method),path).toBe(true);expect(permittedNativePath(path,method),path).toBe(true);}
 });
 it('rejects owner selectors, duplicate arguments, wrong verbs and foreign origins',()=>{
  for(const [path,method] of [['/api/contacts?ownerUid=other','GET'],['/api/calendar/events?start=bad','GET'],['/api/calendar/events?limit=250&limit=1','GET'],['/api/calendar/embed/bjklock?accessToken=secret','GET'],['/api/calendar/embed/bjklock','DELETE'],['https://other.test/api/contacts','GET'],['/api/contacts/../../auth/logout','POST'],['/api/calendar/embed/bjklock#secret','GET']])expect(check(path,method),path).toBe(false);
 });
});

it('admits only one exact selected native Calendar proof read',()=>{
 const id='00000000-0000-4000-8000-000000000001';
 for(const path of [`/api/calendar/events/${id}/bundle`,`/api/calendar/events/${encodeURIComponent('wallet:transfer:'+id)}/bundle`])expect(check(path)).toBe(true);
 for(const [path,method] of [[`/api/calendar/events/${id}/bundle?owner=foreign`,'GET'],[`/api/calendar/events/${id}/bundle`,'POST'],['/api/calendar/events/foreign/bundle','GET'],[`/api/calendar/events/${encodeURIComponent('wallet:transfer:'+id+':foreign')}/bundle`,'GET']])expect(check(path,method)).toBe(false);
});
