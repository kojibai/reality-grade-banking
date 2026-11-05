import {expect,it} from 'vitest';
import {canonicalizeReceizConstitution} from '@receiz/sdk';
import {verifyCalendarProof,calendarProofExportInput} from '../src/receiz/calendar-proof';
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

it('exports only the already checked immutable payload for the same selected owner and revision',async()=>{
 const proof=await verifyCalendarProof(await response(),event,'owner'),expected=JSON.stringify(proof);
 proof.event.note='Mutated view';const input=calendarProofExportInput(proof,event,'owner');expect(new TextDecoder().decode(input.bytes)).toBe(expected);expect(input.recordHash).toBe(proof.bundleHash);expect(input.mimeType).toBe('application/json');
 expect(()=>calendarProofExportInput({...proof},event,'owner')).toThrow('ORGANIZER_PROOF_NOT_HELD');expect(()=>calendarProofExportInput(proof,event,'other')).toThrow();expect(()=>calendarProofExportInput(proof,{...event,updatedAt:'2026-10-27T00:00:00Z'},'owner')).toThrow();
});
it('checks and captures one isolated bundle and selected revision across the real hash await',async()=>{
 const selected={...event,metadata:{...event.metadata}},originalSelected=JSON.parse(JSON.stringify(selected)) as OrganizerEvent,raw=await response(selected),exact=JSON.stringify(raw.bundle),hash=raw.bundleHash;
 const pending=verifyCalendarProof(raw,selected,'owner');Object.assign(raw.bundle,{summary:'Changed while hashing',bundleHash:'f'.repeat(64)});raw.bundle.event.note='Changed while hashing';raw.bundle.event.metadata.pulse=999;selected.updatedAt='2026-10-27T00:00:00Z';raw.bundleHash='f'.repeat(64);
 const proof=await pending;expect(JSON.stringify(proof)).toBe(exact);expect(proof.bundleHash).toBe(hash);expect(new TextDecoder().decode(calendarProofExportInput(proof,originalSelected,'owner').bytes)).toBe(exact);expect(()=>calendarProofExportInput(proof,selected,'owner')).toThrow('ORGANIZER_PROOF_NOT_HELD');
});
