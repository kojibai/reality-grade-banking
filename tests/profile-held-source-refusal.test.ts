import {readFileSync} from 'node:fs';
import {afterEach,expect,it,vi} from 'vitest';
import {IDBFactory,IDBKeyRange} from 'fake-indexeddb';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import {profileFixture} from './fixtures/public-profile';
import * as adoption from '../src/receiz/asset-publication-adoption';
import * as profiles from '../src/receiz/public-profile';
import type {ConnectedAssetLocalAdmission} from '../src/receiz/asset-publication-runtime';

const username='bjklock',uid='eecb99a0-9c6a-4e89-813b-f76331ea9c41';
afterEach(()=>{profiles.forgetPublicProfile(username);adoption.forgetAssetPublicationAdmissions();vi.unstubAllGlobals();vi.restoreAllMocks();});

it('preserves genuine held Source when transport refuses without an accepted policy change',async()=>{
 vi.stubGlobal('indexedDB',new IDBFactory());vi.stubGlobal('IDBKeyRange',IDBKeyRange);
 const storage=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value),removeItem:(key:string)=>storage.delete(key)});
 const f=await conformanceOfflineFixture({composer:true}),r=f.runtime;
 const identity=await r.createReceizArtifactAdmissionEngine()(await r.verifyReceizArtifact(new File([new Uint8Array(f.identity.bytes)],'identity.png')),{profile:'identity',identityPassphrase:f.identity.phrase});
 expect(identity.verdict).toBe('canonical-identity');
 const ownerReceizId=(await r.readReceizIdentityPublicBinding(identity)).artifactOwnerReceizId;
 const image=new File([readFileSync(new URL('../public/apple-touch-icon.png',import.meta.url))],'held.png',{type:'image/png'});
 const sealDocument=await r.createBankNativeNoteSealer({enrollment:await f.store.load(),resources:f.resources}),custody=r.createImportedProofSourceCustody();
 const prepared=await r.composer.prepareConnectedComposerSource({draft:{kind:'image',title:'Held Source survives transport',description:'Retained sealed image and text.',longForm:'Exact carried text.',files:[{id:'primary',role:'primary',file:image}]},ownerReceizId,creatorUsername:username,sealDocument,writeBlock:custody.writeBlock,assertCurrent(){}});
 const opened=await r.openImportedProofSource(prepared.artifact,{canonicalSignatureV4RootPublicKeys:new Map(f.roots.map((root:{kid:string})=>[root.kid,root])),resolveSourceBlock:custody.resolveBlock});
 expect(opened.verification.ok).toBe(true);
 let admission!:ConnectedAssetLocalAdmission;
 await r.connectedComposer.admitConnectedComposerSource({file:prepared.artifact,ownerReceizId,username,profileIdentity:uid,assertCurrent(){},onLocalAdmission:(value:ConnectedAssetLocalAdmission)=>{admission=value;}});
 const owner={identityDigest:'d'.repeat(64),accountUid:uid};
 // Header fields are presentation only. Actual SDK Source admission supplies
 // the Original; no header field or editable receipt creates its authority.
 const raw=profileFixture();raw.profile.profile.userId=uid;raw.profile.profile.username=username;raw.profile.profile.authorshipVerified=false;raw.profile.profile.authorshipPbiReceiptHash='';
 raw.profile.originals=[admission.original as typeof raw.profile.originals[number]];raw.profile.stats.originals=1;
 for(const read of ['header','collection'] as const)for(const status of [403,404,409]){
  adoption.retainAssetPublicationAdmission(admission,owner);
  const selected=profiles.retainPublicProfile(profiles.parsePublicProfile(raw,username)),items=selected.items;
  expect(items).toHaveLength(1);expect(items[0].originalDigest).toBe(prepared.reference.artifactSha256);
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(null,{status})));
  await expect(read==='header'?profiles.fetchPublicProfileHeader(selected):profiles.fetchPublicProfile(username,'all:'+uid)).rejects.toThrow(status===403?'PROFILE_PRIVATE':status===404?'PROFILE_NOT_FOUND':'PROFILE_UNAVAILABLE');
  expect.soft(profiles.retainedPublicProfile(username),`${read} HTTP${status} erased held Source`).toBe(selected);
  expect.soft(profiles.retainedPublicProfile(username)?.items,`${read} HTTP${status} erased exact Originals`).toBe(items);
  profiles.forgetPublicProfile(username);
 }
 // The existing accepted native privacy callback still removes public display.
 adoption.retainAssetPublicationAdmission(admission,owner);profiles.retainPublicProfile(profiles.parsePublicProfile(raw,username));profiles.forgetPublicProfilesForAccount(uid);
 expect(profiles.retainedPublicProfile(username)).toBeNull();
},30000);
