import {beforeEach,expect,it,vi} from 'vitest';
import {openCanonicalIdentity} from '../src/receiz/native-identity';
const owner='00000000-0000-4000-8000-000000000001';
const p=vi.hoisted(()=>({load:vi.fn(),network:vi.fn(),carried:null as unknown}));
const contact={id:'contact-1',linkedUserId:'peer',fullName:'Maya Chen',email:'maya@example.test',phone:'',createdAt:'2026-10-26T12:00:00Z',updatedAt:'2026-10-26T12:00:00Z',interactions:[]};
const event={id:'event-1',ownerUserId:owner,title:'Project review',kind:'appointment',source:'manual',startAt:'2026-10-30T14:00:00Z',endAt:'2026-10-30T14:30:00Z',location:'',note:'',attendees:[],metadata:{},createdAt:'2026-10-26T12:00:00Z',updatedAt:'2026-10-26T12:00:00Z'};
const range={start:'2026-10-01T00:00:00.000Z',end:'2026-11-01T00:00:00.000Z'};
const display=()=>({schema:'bankeiz.organizer-display.v1',accountUid:owner,contacts:[contact],contactsComplete:true,events:[event],ranges:[{...range,complete:true}],username:'maya'});
vi.mock('../src/receiz/identity-vault',async original=>({...await original<typeof import('../src/receiz/identity-vault')>(),loadWalletObservation:async()=>({wallet:{userId:owner}}),loadMarketPortfolioState:async()=>null,loadMessagingConsent:async()=>null,loadMessagingDisplay:async()=>null,loadOrganizerDisplay:p.load}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>({
 verifyReceizArtifact:async()=>({status:'verified-artifact'}),
 createReceizArtifactAdmissionEngine:()=>async()=>({verdict:'canonical-identity'}),isSdkIssuedReceizArtifactAdmission:()=>true,
 readReceizIdentityPublicBinding:async()=>({keyId:'fixture-key',artifactSha256:'a'.repeat(64),identityOwnerReceizId:owner}),
 readReceizIdentityArtifact:async()=>({owner:{uid:owner,username:'maya'},issuedAt:'2026-10-13T00:00:00Z',keyId:'fixture-key',alg:'Ed25519',crypto:{publicKeyRawB64u:'synthetic-public'}}),
 projectReceizIdentityAccount:async()=>p.carried??({authority:'identity-only'}),
 receizKaiNow:()=>({pulse:100,uPulse:100000000}),createReceizClient:()=>({request:p.network,identity:{continueReceizId:p.network,exchangeProofAuthority:p.network}}),
})}));
beforeEach(()=>{p.load.mockReset().mockResolvedValue(display());p.network.mockReset().mockImplementation(()=>{throw Error('UNEXPECTED_TRANSPORT');});p.carried=null;});
const open=()=>openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
it('paints saved Contacts and Calendar before either panel/service is opened and reads its local slot only once',async()=>{
 const identity=await open();
 try{
  expect(identity.knownOrganizerDisplay?.()).toMatchObject({accountUid:owner,contacts:[contact],events:[event]});
  expect(identity.knownOrganizer?.()).toBeNull();expect(p.load).toHaveBeenCalledTimes(1);
  const api=await identity.organizer!();expect(await api.contacts()).toEqual([contact]);expect(await api.events(range)).toEqual([event]);
  expect(identity.knownOrganizerDisplay?.()).toBe(api.known());expect(p.load).toHaveBeenCalledTimes(1);expect(p.network).not.toHaveBeenCalled();
 }finally{identity.dispose();}
});
it('keeps account entry independent of a pending optional local record read and reuses it when resolved',async()=>{
 let finish!:(value:unknown)=>void;const pending=new Promise<unknown>(resolve=>{finish=resolve;});p.load.mockReturnValue(pending);
 const identity=await open();
 try{
  expect(p.load).toHaveBeenCalledTimes(1);expect(identity.knownOrganizerDisplay?.()).toBeNull();
  finish(display());await pending;
  await vi.waitFor(()=>expect(identity.knownOrganizerDisplay?.()?.contacts).toEqual([contact]));
  const api=await identity.organizer!();expect(api.knownEvents(range)).toEqual([event]);expect(p.load).toHaveBeenCalledTimes(1);expect(p.network).not.toHaveBeenCalled();
 }finally{finish(null);identity.dispose();}
});
it('paints admitted carried domains while optional retained display is pending',async()=>{
 p.load.mockReturnValue(new Promise(()=>{}));p.carried={schema:'receiz.sdk.identity_account_projection.v1',keyId:'fixture-key',owner:{uid:owner},authority:'verified-identity-portable-state',portableStateVerified:true,verifiedState:{schema:'receiz.account.state.v3',account:{userId:owner},contactsProjection:{contacts:[contact]},calendar:{events:[event]}}};
 const identity=await open();
 try{expect(identity.knownOrganizerDisplay?.()).toMatchObject({contacts:[contact],events:[event]});expect(p.network).not.toHaveBeenCalled();}finally{identity.dispose();}
});
it('never exposes a foreign owner or replaces an unknown domain with fabricated empty records',async()=>{
 p.load.mockResolvedValue({...display(),accountUid:'other-account'});const identity=await open();
 expect(identity.knownOrganizerDisplay?.()).toBeNull();identity.dispose();expect(identity.knownOrganizerDisplay?.()).toBeNull();expect(p.network).not.toHaveBeenCalled();
});
it('keeps live organizer edits ahead of the earlier retained display',async()=>{
 const identity=await open();try{const api=await identity.organizer!();api.mergeSavedContacts(owner,[{...contact,id:'new-contact',fullName:'New contact'}]);expect(identity.knownOrganizerDisplay?.()?.contacts).toHaveLength(2);expect(identity.knownOrganizerDisplay?.()).toBe(api.known());}finally{identity.dispose();}
});
