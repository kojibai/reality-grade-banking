import {canonicalizeReceizConstitution} from '@receiz/sdk';
import {organizerRecord,organizerEvent,type OrganizerEvent} from './organizer-types';
const snapshots=new WeakMap<CalendarProof,{bytes:Uint8Array;owner:string;recordHash:string;eventId:string;matches(event:OrganizerEvent):boolean}>();
export interface CalendarProof {kind:'receiz.calendar.event.bundle.v1';version:1;hashAlgorithm:'sha256-jcs';bundleHash:string;event:OrganizerEvent;[key:string]:unknown;}
/** Verify the existing native Calendar bundle's integrity and selected record.
 * This check does not convert an activity record into financial spend authority. */
export async function verifyCalendarProof(raw:unknown,expected:OrganizerEvent,owner:string):Promise<CalendarProof>{
 const envelope=organizerRecord(raw),serialized=JSON.stringify(organizerRecord(envelope.bundle)),capture=new TextEncoder().encode(serialized),bundle=organizerRecord(JSON.parse(serialized)),event=organizerEvent(bundle.event,owner);
 if(envelope.ok!==true||bundle.kind!=='receiz.calendar.event.bundle.v1'||bundle.version!==1||bundle.hashAlgorithm!=='sha256-jcs'||typeof bundle.bundleHash!=='string'||!/^[a-f0-9]{64}$/.test(bundle.bundleHash)||envelope.bundleHash!==bundle.bundleHash||expected.ownerUserId!==owner)throw Error('ORGANIZER_PROOF_INVALID');
 const includeCandidate=Object.hasOwn(expected.metadata,'candidate');const selectedMetadata=(v:OrganizerEvent)=>{if(includeCandidate)return v.metadata;const {candidate,...rest}=v.metadata;void candidate;return rest;};
 const selected=(v:OrganizerEvent)=>({id:v.id,ownerUserId:v.ownerUserId,createdByUserId:v.createdByUserId??null,title:v.title,kind:v.kind,source:v.source,startAt:v.startAt,endAt:v.endAt,location:v.location,note:v.note,attendees:v.attendees,metadata:selectedMetadata(v),createdAt:v.createdAt,updatedAt:v.updatedAt});
 const stamp=canonicalizeReceizConstitution(selected(expected));if(canonicalizeReceizConstitution(selected(event))!==stamp)throw Error('ORGANIZER_PROOF_RECORD_CHANGED');
 const {bundleHash,...core}=bundle,bytes=new TextEncoder().encode(canonicalizeReceizConstitution(core));if(bytes.length>4*1024*1024)throw Error('ORGANIZER_PROOF_CAPACITY');
 const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');if(digest!==bundleHash)throw Error('ORGANIZER_PROOF_INVALID');
 const proof=bundle as unknown as CalendarProof;snapshots.set(proof,{bytes:capture,owner,recordHash:bundleHash as string,eventId:event.id,matches:value=>canonicalizeReceizConstitution(selected(value))===stamp});return proof;
}

/** Exact checked record capture, not admission of its historical transaction. */
export function calendarProofExportInput(proof:CalendarProof,event:OrganizerEvent,owner:string):import('./record-proof-export').RecordProofExportInput{
 const held=snapshots.get(proof);if(!held||held.owner!==owner||event.ownerUserId!==owner||!held.matches(event))throw Error('ORGANIZER_PROOF_NOT_HELD');
 return{bytes:new Uint8Array(held.bytes),recordHash:held.recordHash,filename:`calendar-${held.eventId.replace(/[^a-zA-Z0-9._-]/g,'-').slice(0,120)}.receiz-calendar-bundle.json`,mimeType:'application/json'};
}
