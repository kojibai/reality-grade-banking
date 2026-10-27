import {canonicalizeReceizConstitution} from '@receiz/sdk';
import {organizerRecord,organizerEvent,type OrganizerEvent} from './organizer-types';
export interface CalendarProof {kind:'receiz.calendar.event.bundle.v1';version:1;hashAlgorithm:'sha256-jcs';bundleHash:string;event:OrganizerEvent;[key:string]:unknown;}
/** Verify the existing native Calendar bundle's integrity and selected record.
 * This check does not convert an activity record into financial spend authority. */
export async function verifyCalendarProof(raw:unknown,expected:OrganizerEvent,owner:string):Promise<CalendarProof>{
 const envelope=organizerRecord(raw),bundle=organizerRecord(envelope.bundle),event=organizerEvent(bundle.event,owner);
 if(envelope.ok!==true||bundle.kind!=='receiz.calendar.event.bundle.v1'||bundle.version!==1||bundle.hashAlgorithm!=='sha256-jcs'||typeof bundle.bundleHash!=='string'||!/^[a-f0-9]{64}$/.test(bundle.bundleHash)||envelope.bundleHash!==bundle.bundleHash||expected.ownerUserId!==owner)throw Error('ORGANIZER_PROOF_INVALID');
 const selectedMetadata=(v:OrganizerEvent)=>{if(Object.hasOwn(expected.metadata,'candidate'))return v.metadata;const {candidate,...rest}=v.metadata;void candidate;return rest;};
 const selected=(v:OrganizerEvent)=>({id:v.id,ownerUserId:v.ownerUserId,createdByUserId:v.createdByUserId??null,title:v.title,kind:v.kind,source:v.source,startAt:v.startAt,endAt:v.endAt,location:v.location,note:v.note,attendees:v.attendees,metadata:selectedMetadata(v),createdAt:v.createdAt,updatedAt:v.updatedAt});
 if(canonicalizeReceizConstitution(selected(event))!==canonicalizeReceizConstitution(selected(expected)))throw Error('ORGANIZER_PROOF_RECORD_CHANGED');
 const {bundleHash,...core}=bundle,bytes=new TextEncoder().encode(canonicalizeReceizConstitution(core));if(bytes.length>4*1024*1024)throw Error('ORGANIZER_PROOF_CAPACITY');
 const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');if(digest!==bundleHash)throw Error('ORGANIZER_PROOF_INVALID');
 return bundle as unknown as CalendarProof;
}
