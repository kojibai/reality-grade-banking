import {expect,it} from 'vitest';
import {canonicalizeReceizConstitution} from '@receiz/sdk';
import {verifyCalendarProof} from '../src/receiz/calendar-proof';
import type {OrganizerEvent} from '../src/receiz/organizer-types';
const event:OrganizerEvent={id:'00000000-0000-4000-8000-000000000003',ownerUserId:'owner',title:'Lunch',kind:'appointment',source:'manual',startAt:'2026-10-26T15:00:00Z',endAt:'2026-10-26T15:30:00Z',location:'Here',note:'A note',attendees:[],metadata:{pulse:123},createdAt:'2026-10-26T15:00:00Z',updatedAt:'2026-10-26T15:00:00Z'};
async function response(value=event){const core={kind:'receiz.calendar.event.bundle.v1',version:1,hashAlgorithm:'sha256-jcs',event:{...value,createdByUserId:null},provenance:{entryHash:null},conversation:{request:null,reply:null},visitor:{kind:'unknown'},summary:null};const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonicalizeReceizConstitution(core))),bundleHash=[...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('');return{ok:true,verified:true,bundleHash,bundle:{...core,bundleHash}};}
it('checks the existing Calendar bundle hash and exact selected owner/event before download',async()=>{const raw=await response(),verified=await verifyCalendarProof(raw,event,'owner');expect(verified.bundleHash).toBe(raw.bundleHash);expect(verified.event.title).toBe('Lunch');});
it('rejects tampered bytes, foreign owners and a different record revision',async()=>{const raw=await response();raw.bundle.event.note='Changed';await expect(verifyCalendarProof(raw,event,'owner')).rejects.toThrow();await expect(verifyCalendarProof(await response(),event,'other')).rejects.toThrow();await expect(verifyCalendarProof(await response({...event,updatedAt:'2026-10-27T00:00:00Z'}),event,'owner')).rejects.toThrow();});
it('matches a native list projection while retaining the complete candidate in the downloadable proof',async()=>{
 const complete={...event,metadata:{...event.metadata,candidate:{original:'full carried source'}}},raw=await response(complete);
 expect((await verifyCalendarProof(raw,event,'owner')).event.metadata.candidate).toEqual(complete.metadata.candidate);
 await expect(verifyCalendarProof(raw,{...event,note:'Different visible record'},'owner')).rejects.toThrow();
});
