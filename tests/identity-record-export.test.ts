import {beforeAll,afterEach,expect,it,vi} from 'vitest';
import {Resvg} from '@resvg/resvg-js';
import {pathToFileURL} from 'node:url';
import {openCanonicalIdentity} from '../src/receiz/native-identity';
import {createNewIdentityImageSource} from '../src/receiz/identity-image';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import {unprotectIdentityKeyFile} from '../src/receiz/identity-protection';
import {publicProfileArtwork} from '../src/receiz/profile-artwork';
import {projectProfileHeaderFields} from '../src/receiz/public-profile-header';
import {copyPublicProfileHeader} from '../src/receiz/public-head-cache';
import {exportIdentityRecord} from '../src/receiz/identity-record-export';
const selected=vi.hoisted(()=>({sdk:null as unknown}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>selected.sdk}));
// Empty local storage only. Verification, admission and issued-result guards remain the real SDK.
vi.mock('../src/receiz/identity-vault',async original=>({...await original<typeof import('../src/receiz/identity-vault')>(),loadWalletObservation:async()=>null,loadMarketPortfolioState:async()=>null,loadOrganizerDisplay:async()=>null,loadAccountLedgerState:async()=>null,loadMessagingConsent:async()=>null,loadMessagingDisplay:async()=>null,loadOfflineNoteState:async()=>null,loadPreparedNoteState:async()=>null,loadConnectedNoteState:async()=>null}));
const uid='22222222-2222-4222-8222-222222222222';
const profile={userId:uid,username:'maya',createdAt:'2026-02-02T12:00:00.000Z',creationKaiSource:'legacy-profile-genesis-recovery',authorshipVerified:true,authorshipPbiReceiptHash:'a'.repeat(64),avatarUrl:null as string|null,bannerUrl:null as string|null};
let f:Awaited<ReturnType<typeof conformanceOfflineFixture>>,key:import('@receiz/sdk').ReceizKeyFile,binding:import('@receiz/sdk').ReceizIdentityPublicBinding,source:{bytes:Uint8Array;filename:string;phrase:string},sealer:ReturnType<typeof f.runtime.offline.createReceizOfflineSealer>;
beforeAll(async()=>{
 f=await conformanceOfflineFixture({financial:true,account:true});const r=f.runtime;selected.sdk={...r,...r.identityTools};
 const admitted=await r.createReceizArtifactAdmissionEngine()(await r.verifyReceizArtifact(f.identity.bytes),{profile:'identity',identityPassphrase:f.identity.phrase});
 const original=await r.identityTools.readReceizIdentityArtifact(f.identity.bytes);
 const portable=await r.identityTools.appendReceizIdentityPortableState({keyFile:original,passphrase:f.identity.phrase,schema:'receiz.account.state.v3',snapshot:{schema:'receiz.account.state.v3',account:{userId:uid},pbiAccountBinding:{sourceB64u:'synthetic-native-history-original',sourceDigest:'b'.repeat(64)},unknownNamespace:{exact:'retained'},pbiAccountRecovery:{sourceMode:'legacy-sql',request:{localUid:original.owner.uid}}}});
 key=await unprotectIdentityKeyFile(portable,f.identity.phrase);expect((await r.identityTools.projectReceizIdentityAccount(key)).completeAtSealedHead).toBe(false);
 sealer=r.offline.createReceizOfflineSealer({ownerIdentityAdmission:admitted,store:f.store,resources:f.resources,fetch:async()=>{throw Error('IDENTITY_EXPORT_NETWORK_FORBIDDEN');}});
 const sealed=await sealer.seal({bytes:new TextEncoder().encode(r.identityTools.serializeReceizIdentityArtifact(key)),filename:'identity.receizkey',mimeType:'application/json'});
 source={bytes:sealed.artifactBytes,filename:sealed.filename,phrase:''};binding=await r.readReceizIdentityPublicBinding(await r.createReceizArtifactAdmissionEngine()(await r.verifyReceizArtifact(source.bytes),{profile:'identity',identityPassphrase:''}));
},120000);
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
function input(){return{source,keyFile:key,binding,accountUid:uid,username:'maya',assertCurrent:vi.fn(),heldProfile:profile,readProfile:vi.fn(async()=>profile),seal:vi.fn((value:Parameters<typeof sealer.seal>[0])=>sealer.seal(value)),rasterize:vi.fn(async(svg:string)=>new Uint8Array(new Resvg(svg).render().asPng()))};}
it('exports a recovered device as a genuine same-key PNG with its original account header, and cold-opens its exact portable state',async()=>{
 const value=input(),before=f.runtime.identityTools.serializeReceizIdentityArtifact(key),saved=await exportIdentityRecord(value);
 expect(saved.filename).toBe('identity_record_maya.receized.png');expect(saved.phrase).toBe('');expect([...saved.bytes.slice(0,8)]).toEqual([137,80,78,71,13,10,26,10]);expect(value.readProfile).not.toHaveBeenCalled();expect(value.seal).toHaveBeenCalledTimes(1);
 const expected=decodeURIComponent(publicProfileArtwork(profile).bannerUrl!.split(',')[1]);expect(value.rasterize.mock.calls[0][0]).toBe(expected);expect(value.rasterize.mock.calls[0][0]).toContain('HUMAN SIGNED');expect(key.owner.uid).not.toBe(uid);expect(key.issuedAt).not.toBe(profile.createdAt);
 const cold=await f.reloadRuntime(),admission=await cold.createReceizArtifactAdmissionEngine()(await cold.verifyReceizArtifact(saved.bytes),{profile:'identity',identityPassphrase:''});expect(admission.verdict).toBe('canonical-identity');const next=await cold.readReceizIdentityPublicBinding(admission);expect(next.keyId).toBe(binding.keyId);expect(next.artifactOwnerReceizId).toBe(binding.artifactOwnerReceizId);expect(next.publicKeyRawB64u).toBe(binding.publicKeyRawB64u);
 const restored=await cold.identityTools.readReceizIdentityArtifact(saved.bytes);expect(cold.identityTools.serializeReceizIdentityArtifact(restored)).toBe(before);expect(f.runtime.identityTools.serializeReceizIdentityArtifact(key)).toBe(before);expect(admission.recoveredState.completeAtSealedHead).toBe(false);expect(admission.recoveredState.verifiedState.account.userId).toBe(uid);
 const reuse=input();reuse.source=saved;reuse.binding=next;const again=await exportIdentityRecord(reuse);expect(again).toEqual(saved);expect(reuse.seal).not.toHaveBeenCalled();expect(reuse.rasterize).not.toHaveBeenCalled();expect(reuse.readProfile).not.toHaveBeenCalled();
},120000);
it('resolves only missing presentation after export and rejects another account or missing birth instead of using the device birthday',async()=>{
 const value=input();value.heldProfile=null as never;value.readProfile.mockResolvedValue(profile);await exportIdentityRecord(value);expect(value.readProfile).toHaveBeenCalledExactlyOnceWith('maya');
 for(const missing of [{...profile,userId:'another-account'},{...profile,createdAt:null},{...profile,isPrivate:true}]){const refused=input();refused.heldProfile=null as never;refused.readProfile.mockResolvedValue(missing as never);await expect(exportIdentityRecord(refused)).rejects.toThrow('IDENTITY_RECORD_PRESENTATION_REQUIRED');expect(refused.seal).not.toHaveBeenCalled();}
},120000);
it('keeps custom profile artwork unchanged while exporting the exact existing default-artwork contract',async()=>{
 const value=input();value.heldProfile={...profile,avatarUrl:'https://example.test/avatar.png',bannerUrl:'https://example.test/banner.png'} as typeof profile;const before=publicProfileArtwork(value.heldProfile);await exportIdentityRecord(value);expect(publicProfileArtwork(value.heldProfile)).toEqual(before);expect(value.rasterize.mock.calls[0][0]).toBe(decodeURIComponent(publicProfileArtwork(profile).bannerUrl!.split(',')[1]));
},120000);
it('refuses changed identity, broken seals and substituted keys without changing source custody',async()=>{
 const value=input(),before=new Uint8Array(source.bytes);value.assertCurrent.mockImplementation(()=>{throw Error('IDENTITY_CLOSED');});await expect(exportIdentityRecord(value)).rejects.toThrow('IDENTITY_CLOSED');expect(value.seal).not.toHaveBeenCalled();
 const changed=input();changed.seal.mockImplementation(async()=>({artifactBytes:new Uint8Array([1,2]),filename:'wrong.png'} as never));await expect(exportIdentityRecord(changed)).rejects.toThrow();expect(source.bytes).toEqual(before);
 const swapped=input();swapped.keyFile={...key,keyId:'f'.repeat(64)};await expect(exportIdentityRecord(swapped)).rejects.toThrow();expect(source.bytes).toEqual(before);
},120000);

it('keeps a normalized and cold-copied signed header byte-identical to its actual carried default banner',async()=>{
 const raw={...profile,authorshipPbiSignedAt:'2026-08-02T12:00:00.000Z',authorshipPbiSignedKaiMicroPulse:'14440000000000'},header=projectProfileHeaderFields(raw),copied=copyPublicProfileHeader(JSON.parse(JSON.stringify(header)),'maya');expect(copied).not.toBeNull();expect(copied).toMatchObject({authorshipPbiSignedAt:raw.authorshipPbiSignedAt,authorshipPbiSignedKaiMicroPulse:raw.authorshipPbiSignedKaiMicroPulse});
 const value=input();value.heldProfile=copied as never;await exportIdentityRecord(value);expect(value.rasterize.mock.calls[0][0]).toBe(decodeURIComponent(header.bannerUrl!.split(',')[1]));expect(publicProfileArtwork(raw).bannerUrl).toBe(header.bannerUrl);
},120000);
it('refuses disposal during a missing-header read and keeps a private already-held owner profile usable without a public request',async()=>{
 const closed=input();closed.heldProfile=null as never;let disposed=false;closed.assertCurrent.mockImplementation(()=>{if(disposed)throw Error('IDENTITY_CLOSED');});closed.readProfile.mockImplementation(async()=>{disposed=true;return profile;});await expect(exportIdentityRecord(closed)).rejects.toThrow('IDENTITY_CLOSED');expect(closed.seal).not.toHaveBeenCalled();
 const held=input();held.heldProfile={...profile,isPrivate:true} as typeof profile;await exportIdentityRecord(held);expect(held.readProfile).not.toHaveBeenCalled();
},120000);
it('uses only the existing bounded public head transport for missing artwork and never an auth or complete-account export',async()=>{
 const value=input(),fetcher=vi.fn(async(_input:RequestInfo|URL,_init?:RequestInit)=>Response.json(projectProfileHeaderFields(profile)));vi.stubGlobal('fetch',fetcher);
 await exportIdentityRecord({...value,heldProfile:null,readProfile:undefined});expect(fetcher).toHaveBeenCalledExactlyOnceWith('/api/bank/public-profile/maya?view=head',expect.objectContaining({credentials:'omit',redirect:'error',cache:'no-store'}));
 expect(new Headers(fetcher.mock.calls[0]?.[1]?.headers).has('authorization')).toBe(false);
},120000);
it.each(['bytes','png-header'])('refuses a changed held carrier before copying or resealing it (%s)',async kind=>{
 const value=input(),changed=new Uint8Array(source.bytes);if(kind==='png-header')changed.set([137,80,78,71,13,10,26,10]);else changed[20]^=1;
 value.source={...source,bytes:changed};await expect(exportIdentityRecord(value)).rejects.toThrow('IDENTITY_RECORD_SOURCE_MISMATCH');expect(value.seal).not.toHaveBeenCalled();expect(value.readProfile).not.toHaveBeenCalled();
},120000);

it('backs up an actually opened older offline device-v1 PNG without a carried or connected account UID',async()=>{
 const original=await f.runtime.identityTools.readReceizIdentityArtifact(f.identity.bytes),plain=await unprotectIdentityKeyFile(original,f.identity.phrase),runtime=await import(pathToFileURL(process.cwd()+'/public/native/identity-artwork.v129.mjs').href);
 const png=await createNewIdentityImageSource(plain,original,{runtime,rasterize:async svg=>new Uint8Array(new Resvg(svg).render().asPng()),kai:()=>({pulse:15000000,uPulse:15000000000000}),now:()=>new Date('2026-10-21T12:00:00Z')}),sealed=await sealer.seal(png),fetcher=vi.fn(async()=>{throw Error('OFFLINE_PNG_BACKUP_MUST_NOT_CONNECT');});vi.stubGlobal('fetch',fetcher);
 const identity=await openCanonicalIdentity(sealed.artifactBytes,'',sealed.filename,true);
 try{expect(identity.knownWallet()).toBeNull();expect(identity.walletReceivingAddress?.()).toBeNull();const before=identity.backup();expect(await identity.exportIdentityRecord!()).toEqual(before);expect(identity.backup()).toEqual(before);expect(fetcher).not.toHaveBeenCalled();}finally{identity.dispose();}
},120000);
