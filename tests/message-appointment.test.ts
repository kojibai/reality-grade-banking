import {describe,it,expect} from 'vitest';
import {findMessageAppointments} from '../src/receiz/message-appointment';

const input={referenceAt:'2026-11-15T15:00:00Z',timezone:'America/New_York'};
const starts=(body:string)=>findMessageAppointments({...input,body}).map(value=>[value.startAt,value.endAt,value.timezone]);

describe('explicit appointment suggestions',()=>{
 it('resolves a message’s relative dates in its supplied timezone, independently of the device timezone',()=>{
  expect(starts('Could we meet tomorrow at 3pm?')).toEqual([['2026-11-16T20:00:00.000Z','2026-11-16T20:30:00.000Z','America/New_York']]);
  expect(starts('Wednesday at 14:30 works.')).toEqual([['2026-11-18T19:30:00.000Z','2026-11-18T20:00:00.000Z','America/New_York']]);
 });
 it('supports ISO and named dates, explicit ranges and stated durations',()=>{
  expect(starts('2026-11-20 at 10:00 AM–11:00 AM')).toEqual([['2026-11-20T15:00:00.000Z','2026-11-20T16:00:00.000Z','America/New_York']]);
  expect(starts('November 20, 2026 at 10am for 45 minutes')).toEqual([['2026-11-20T15:00:00.000Z','2026-11-20T15:45:00.000Z','America/New_York']]);
  expect(starts('20 November 2026 at 18:00 UTC')).toEqual([['2026-11-20T18:00:00.000Z','2026-11-20T18:30:00.000Z','UTC']]);
  expect(starts('November 20 at 18:00 for 1 hour UTC')).toEqual([['2026-11-20T18:00:00.000Z','2026-11-20T19:00:00.000Z','UTC']]);
  expect(starts('2026-11-20T10:00:00-05:00')).toEqual([['2026-11-20T15:00:00.000Z','2026-11-20T15:30:00.000Z','America/New_York']]);
 });
 it('does not turn missing times, ambiguous dates, unsupported timezone abbreviations or invalid dates into actions',()=>{
  for(const body of ['11/20/2026 at 3pm','Tomorrow afternoon','Friday at 3','Friday at 3:30','November 31, 2026 at 3pm','tomorrow at 3pm EST','tomorrow at 3pm est','tomorrow at 3pm Eastern time','tomorrow at 3pm for 1 hour pst','next Friday at 3pm','2026-11-20 at 25:00','tomorrow at 13pm','tomorrow at 3pm–2pm'])expect(starts(body),body).toEqual([]);
 });
 it('rejects past suggestions without silently advancing their date',()=>{
  for(const body of ['today at 9am','November 14 at 11am','2025-11-20 at 3pm'])expect(starts(body),body).toEqual([]);
  expect(starts('today at 11am')[0]?.[0]).toBe('2026-11-15T16:00:00.000Z');
 });
 it('rejects nonexistent and repeated wall times at DST changes while honoring explicit ISO offsets',()=>{
  expect(starts('March 14, 2027 at 02:30')).toEqual([]);
  expect(starts('November 7, 2027 at 01:30')).toEqual([]);
  expect(starts('2027-11-07T01:30:00-04:00')[0]?.[0]).toBe('2027-11-07T05:30:00.000Z');
  expect(starts('March 14, 2027 at 03:30')[0]?.[0]).toBe('2027-03-14T07:30:00.000Z');
 });
 it('returns distinct bounded alternatives and refuses oversized or invalid contexts',()=>{
  const result=starts(Array.from({length:12},(_,index)=>`2026-12-${String(index+1).padStart(2,'0')} at 15:00`).join(' or '));
  expect(result).toHaveLength(5);
  expect(starts('tomorrow at 3pm or tomorrow at 3pm')).toHaveLength(1);
  expect(starts('x'.repeat(16385)+' tomorrow at 3pm')).toEqual([]);
  expect(findMessageAppointments({...input,body:'tomorrow at 3pm',timezone:'invalid'})).toEqual([]);
  expect(findMessageAppointments({...input,body:'tomorrow at 3pm',referenceAt:'invalid'})).toEqual([]);
  expect(findMessageAppointments({...input,body:'tomorrow at 3pm',referenceAt:'2026-11-15T15:00:00'})).toEqual([]);
 });
 it('recognizes UTC without case-sensitive reinterpretation',()=>{
  expect(starts('tomorrow at 15:00 utc')[0]).toEqual(['2026-11-16T15:00:00.000Z','2026-11-16T15:30:00.000Z','UTC']);
 });
});
