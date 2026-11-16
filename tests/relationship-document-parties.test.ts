import {describe,expect,it,vi} from 'vitest';
import {createNativeOrganizer} from '../src/receiz/native-organizer';
import type {OrganizerContact,OrganizerDisplay} from '../src/receiz/organizer-types';
import type {ChatConversation,ChatPerson} from '../src/receiz/native-messaging';
import {resolveRelationshipDocumentParties,type RelationshipDocumentPartiesInput} from '../src/receiz/relationship-document-parties';

const owner='11111111-1111-4111-8111-111111111111',peer='22222222-2222-4222-8222-222222222222',other='33333333-3333-4333-8333-333333333333';
const person=(userId=peer,displayName='Jordan Chen'):ChatPerson=>({kind:'user',userId,displayName,username:'jordan',avatarUrl:null});
const conversation=(patch:Partial<ChatConversation>={}):ChatConversation=>({id:'44444444-4444-4444-8444-444444444444',kind:'dm',title:'Jordan Chen',members:[person(owner,'Maya'),person()],aiAgents:[],defaultAiId:null,unreadCount:0,previewMessage:null,createdAt:'2026-11-15T12:00:00Z',updatedAt:'2026-11-15T12:00:00Z',lastMessageAt:null,...patch});
const contact=(id:string,linkedUserId:string,patch:Partial<OrganizerContact>={}):OrganizerContact=>({id,linkedUserId,fullName:'Jordan Chen',email:'jordan@example.com',phone:'+1 212 555 0123',createdAt:'2026-11-15T12:00:00Z',updatedAt:'2026-11-15T12:00:00Z',interactions:[],...patch});
const display=(contacts:OrganizerContact[]|null,accountUid=owner):OrganizerDisplay=>({schema:'bankeiz.organizer-display.v1',accountUid,contacts,contactsComplete:false,events:null,ranges:[],username:null});
function setup(contacts:OrganizerContact[]|null=[],patch:Partial<RelationshipDocumentPartiesInput>={}){
 const request=vi.fn(async()=>{throw Error('Unexpected catalog fetch');}),organizer=createNativeOrganizer({accountUid:owner,retained:display(contacts),request});
 const input:RelationshipDocumentPartiesInput={identity:{username:'maya',knownProfile:()=>({userId:owner,displayName:'Maya Studio',username:'maya',avatarUrl:null}),walletReceivingAddress:()=>owner,knownOrganizer:()=>organizer,knownOrganizerDisplay:()=>display(contacts)},api:{accountUid:owner},conversation:conversation(),isCurrent:()=>true,...patch};
 return{input,request,organizer};
}

describe('relationship document parties from held native contacts',()=>{
 it('selects the exact native peer and owner bindings without exporting private contact history',async()=>{
  const own=contact('self',owner,{fullName:'Maya',email:'maya@example.com',phone:'+1 415 555 0101',company:'Maya Studio LLC',location:'Boston, MA'}),target=contact('target',peer,{company:'Chen Design',location:'New York, NY',notes:'Private negotiation notes',profileSummary:'Private profile',interactions:[{id:'secret',kind:'email',summary:'Private summary',detail:'Private history',occurredAt:'2026-11-15T12:00:00Z'}],accessToken:'secret-token',address:'invented unsupported address'}),lookalike=contact('lookalike',other,{fullName:'Jordan Chen',email:'wrong@example.com',phone:'wrong number'});
  const {input,request}=setup([lookalike,own,target]);
  expect(await resolveRelationshipDocumentParties(input)).toEqual({issuerName:'Maya Studio',issuerDetails:'Maya Studio LLC\nmaya@example.com\n+1 415 555 0101\nBoston, MA',clientName:'Jordan Chen',clientDetails:'Chen Design\njordan@example.com\n+1 212 555 0123\nNew York, NY'});
  expect(request).not.toHaveBeenCalled();
 });
 it('uses only a unique exact correspondent email including supported secondary email fields',async()=>{
  const {input}=setup([contact('target','',{email:'business@example.com',emails:[' JORDAN@EXAMPLE.COM '],company:'Chen Studio'}),contact('lookalike','',{email:'other@example.com'})],{conversation:conversation({members:[person(owner,'Maya')],emailChannel:{schema:'receiz.chat.email-channel.v2',ownerUserId:owner,correspondentEmail:'jordan@example.com',displayName:'Jordan',subject:'Project'}})});
  expect(await resolveRelationshipDocumentParties(input)).toEqual({issuerName:'Maya Studio',issuerDetails:'',clientName:'Jordan Chen',clientDetails:'Chen Studio\nbusiness@example.com\njordan@example.com\n+1 212 555 0123'});
 });
 it('never borrows a different member’s name for an explicitly bound email correspondent',async()=>{
  const {input}=setup([],{conversation:conversation({members:[person(owner,'Maya'),person(other,'Wrong member')],emailChannel:{schema:'receiz.chat.email-channel.v2',ownerUserId:owner,correspondentUserId:peer,correspondentEmail:'jordan@example.com',displayName:'Jordan Email',subject:''}})});
  expect((await resolveRelationshipDocumentParties(input)).clientName).toBe('Jordan Email');
 });
 it('keeps details bounded by omitting whole optional fields without truncating their source',async()=>{
  const longCompany='C'.repeat(1000),longLocation='L'.repeat(1000),source=contact('target',peer,{company:longCompany,location:longLocation,phones:['+1 212 555 0999'],emails:['billing@example.com']});
  const {input}=setup([source]),result=await resolveRelationshipDocumentParties(input);
  expect(result.clientDetails.length).toBeLessThanOrEqual(1200);
  expect(result.clientDetails).toContain('jordan@example.com');expect(result.clientDetails).toContain('+1 212 555 0123');
  for(const line of result.clientDetails.split('\n'))expect([longCompany,longLocation,'jordan@example.com','billing@example.com','+1 212 555 0123','+1 212 555 0999']).toContain(line);
  expect(source.company).toBe(longCompany);expect(source.location).toBe(longLocation);
 });
 it('preserves the full group title within name bounds and leaves an overlong title for manual entry',async()=>{
  const {input}=setup([],{conversation:conversation({kind:'group',title:'  Project launch team  '})});
  expect((await resolveRelationshipDocumentParties(input)).clientName).toBe('  Project launch team  ');
  input.conversation=conversation({kind:'group',title:'T'.repeat(161)});
  expect((await resolveRelationshipDocumentParties(input)).clientName).toBe('');
 });
 it('keeps an ambiguous email’s supported channel address without selecting either contact',async()=>{
  const {input}=setup([contact('first','',{company:'First company'}),contact('second','',{company:'Second company'})],{conversation:conversation({members:[person(owner,'Maya')],emailChannel:{schema:'receiz.chat.email-channel.v2',ownerUserId:owner,correspondentEmail:'jordan@example.com',displayName:'Jordan Email',subject:'Project'}})});
  expect(await resolveRelationshipDocumentParties(input)).toEqual({issuerName:'Maya Studio',issuerDetails:'',clientName:'Jordan Email',clientDetails:'jordan@example.com'});
 });
 it('never matches a contact by name or selects a linked contact for a different known peer',async()=>{
  const {input}=setup([contact('lookalike',other,{company:'Wrong company'})]);
  expect(await resolveRelationshipDocumentParties(input)).toEqual({issuerName:'Maya Studio',issuerDetails:'',clientName:'Jordan Chen',clientDetails:''});
  input.conversation=conversation({emailChannel:{schema:'receiz.chat.email-channel.v2',ownerUserId:owner,correspondentUserId:peer,correspondentEmail:'jordan@example.com',displayName:'Jordan',subject:''}});
  expect((await resolveRelationshipDocumentParties(input)).clientDetails).toBe('jordan@example.com');
 });
 it('preserves an exact group title and never addresses the group to one selected member',async()=>{
  const {input}=setup([contact('target',peer,{company:'Individual company'})],{conversation:conversation({kind:'group',title:'Maya × Chen launch team',members:[person(owner,'Maya'),person(),person(other,'Taylor')]})});
  expect(await resolveRelationshipDocumentParties(input)).toEqual({issuerName:'Maya Studio',issuerDetails:'',clientName:'Maya × Chen launch team',clientDetails:''});
 });
 it('keeps missing details blank and never fetches the full catalog or opens organizer access',async()=>{
  const {input,request}=setup(null);const open=vi.fn(async()=>{throw Error('Should not open organizer');});
  Object.assign(input.identity,{organizer:open});
  expect(await resolveRelationshipDocumentParties(input)).toEqual({issuerName:'Maya Studio',issuerDetails:'',clientName:'Jordan Chen',clientDetails:''});
  expect(request).not.toHaveBeenCalled();expect(open).not.toHaveBeenCalled();
 });
 it('reuses an already-held organizer display even when the live organizer is not open',async()=>{
  const {input}=setup([contact('target',peer)]);input.identity.knownOrganizer=()=>null;
  expect((await resolveRelationshipDocumentParties(input)).clientDetails).toBe('jordan@example.com\n+1 212 555 0123');
 });
 it('does not choose between multiple contacts bound to the same user',async()=>{
  const {input}=setup([contact('first',peer,{company:'First company'}),contact('second',peer,{company:'Second company'})]);
  expect((await resolveRelationshipDocumentParties(input)).clientDetails).toBe('');
 });
 it('returns supported names when the profile and contacts are missing',async()=>{
  const {input}=setup(null);input.identity.knownProfile=()=>null;input.identity.accountUsername=()=> 'maya_studio';
  expect(await resolveRelationshipDocumentParties(input)).toEqual({issuerName:'maya_studio',issuerDetails:'',clientName:'Jordan Chen',clientDetails:''});
 });
 it.each(['profile','wallet','organizer','display','email'] as const)('refuses a foreign %s owner binding',async kind=>{
  const {input}=setup([contact('target',peer)]);
  if(kind==='profile')input.identity.knownProfile=()=>({userId:other,displayName:'Foreign',username:'foreign',avatarUrl:null});
  if(kind==='wallet')input.identity.walletReceivingAddress=()=>other;
  if(kind==='organizer')input.identity.knownOrganizer=()=>createNativeOrganizer({accountUid:other,request:async()=>{throw Error('Unexpected read');}});
  if(kind==='display')input.identity.knownOrganizerDisplay=()=>display([contact('target',peer)],other);
  if(kind==='email')input.conversation=conversation({emailChannel:{schema:'receiz.chat.email-channel.v2',ownerUserId:other,correspondentEmail:'jordan@example.com',displayName:'Jordan',subject:''}});
  await expect(resolveRelationshipDocumentParties(input)).rejects.toThrow(/OWNER|CONTEXT/);
 });
 it('refuses a closed relationship and a context switch while held data is being read',async()=>{
  const {input}=setup([contact('target',peer)]);input.isCurrent=()=>false;
  await expect(resolveRelationshipDocumentParties(input)).rejects.toThrow(/CONTEXT/);
  let current=true;input.isCurrent=()=>current;input.identity.knownOrganizerDisplay=()=>{current=false;return display([]);};
  await expect(resolveRelationshipDocumentParties(input)).rejects.toThrow(/CONTEXT/);
 });
 it('does not copy credential material even if it appears in a supported contact field',async()=>{
  const {input}=setup([contact('target',peer,{company:'{"accessToken":"private-secret"}',notes:'Private contact notes'})]);
  const result=await resolveRelationshipDocumentParties(input);
  expect(result.clientDetails).toBe('jordan@example.com\n+1 212 555 0123');
  expect(JSON.stringify(result)).not.toContain('private-secret');
 });
});
