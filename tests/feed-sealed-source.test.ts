import {afterEach,expect,it,vi} from 'vitest';
import {IDBFactory,IDBKeyRange} from 'fake-indexeddb';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import type {PublicMarketCatalog,PublicMarketItem} from '../src/receiz/public-market';
import type {ConnectedAssetLocalAdmission} from '../src/receiz/asset-publication-runtime';

afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
const item=(id:string,mediaKind:PublicMarketItem['mediaKind']='moment'):PublicMarketItem=>({id,assetId:id,title:id,summary:id,category:'proof',mediaKind,ownerUsername:'held_creator',ownerDisplayName:'Held creator',ownerProfileUrl:null,sourceUrl:null,verifyUrl:null,originalUrl:null,originalDigest:null,pulse:'14900000',sealedAt:null,priceUsd:null,changePct:null,chart:[],authority:'projection-only',canTrade:false});

it('projects a genuinely sealed Source into held Feed immediately and keeps it through an older complete delivery without a Source lookup',async()=>{
 vi.resetModules();vi.stubGlobal('indexedDB',new IDBFactory());vi.stubGlobal('IDBKeyRange',IDBKeyRange);
 const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)});
 const events=new EventTarget();vi.stubGlobal('window',events);
 const base:PublicMarketCatalog={items:[item('Existing audio','audio'),item('Existing moment')],complete:true,revision:'held-complete-source',observedAt:null,sourceCount:2},generation='a'.repeat(64);
 const marker={publicMarketCatalog:()=>base,publicMarketDocument:()=>({catalog:base,generation})};
 vi.stubGlobal('document',{readyState:'complete',getElementById:(id:string)=>id==='receiz-navigation'?marker:null});
 const network=vi.fn(async()=>{throw Error('HELD_FEED_SOURCE_NETWORK_FORBIDDEN');});vi.stubGlobal('fetch',network);
 const source=await import('../src/public-feed/feed-source'),adoption=await import('../src/receiz/asset-publication-adoption');
 source.reusePreparedFeedCatalog(base,generation);
 let displayed=base.items,notifications=0;
 const stop=source.subscribePreparedFeedCatalog(catalog=>{notifications++;displayed=source.completeFeedItems(displayed,catalog.items);});
 const selectedAudio=displayed[0],before=notifications;
 const f=await conformanceOfflineFixture({composer:true}),r=f.runtime;
 const actor=await r.createReceizArtifactAdmissionEngine()(await r.verifyReceizArtifact(new File([new Uint8Array(f.identity.bytes)],'identity.png')),{profile:'identity',identityPassphrase:f.identity.phrase});
 expect(actor.verdict).toBe('canonical-identity');
 const ownerReceizId=(await r.readReceizIdentityPublicBinding(actor)).artifactOwnerReceizId,uid='eecb99a0-9c6a-4e89-813b-f76331ea9c41',username='bjklock';
 const sealDocument=await r.createBankNativeNoteSealer({enrollment:await f.store.load(),resources:f.resources}),custody=r.createImportedProofSourceCustody();
 const prepared=await r.composer.prepareConnectedComposerSource({draft:{kind:'moment',title:'New sealed public Original',description:'Already accepted Source truth.',longForm:'The complete work is already held.',files:[]},ownerReceizId,creatorUsername:username,sealDocument,writeBlock:custody.writeBlock,assertCurrent(){}});
 let admission!:ConnectedAssetLocalAdmission;
 try{
  await r.connectedComposer.admitConnectedComposerSource({file:prepared.artifact,ownerReceizId,username,profileIdentity:uid,assertCurrent(){},onLocalAdmission:(value:ConnectedAssetLocalAdmission)=>{admission=value;adoption.retainAssetPublicationAdmission(value,{identityDigest:'d'.repeat(64),accountUid:uid});}});
  expect(notifications).toBeGreaterThan(before);
  const digest=prepared.reference.artifactSha256,held=source.readHeldFeedCatalog()!;
  expect(held.sourceCount).toBe(3);expect(held.items).toHaveLength(3);
  expect(held.items.find(row=>row.originalDigest===digest)).toMatchObject({title:'New sealed public Original',originalCreator:{userId:uid,username}});
  expect(displayed.map(row=>row.id).slice(0,2)).toEqual(['Existing audio','Existing moment']);expect(displayed[0]).toBe(selectedAudio);
  expect(await source.prepareFeedItems()).toBe(await source.prepareFeedItems());expect(network).not.toHaveBeenCalled();
  expect(adoption.admittedAssetPublicationDelivery(digest,username)).toBeNull();
  // A later complete delivery may still carry the older collection. It has no
  // authority to erase the already verified Source this reader holds.
  const delivered:PublicMarketCatalog={...base,items:[...base.items],revision:'later-complete-older-membership'};
  adoption.publishDiscoveredPublicCatalog(delivered);
  const after=source.readHeldFeedCatalog()!;
  expect(after.sourceCount).toBe(3);expect(after.items.some(row=>row.originalDigest===digest)).toBe(true);
  expect(displayed[0]).toBe(selectedAudio);expect(displayed).toHaveLength(3);
  expect(adoption.admittedAssetPublicationDelivery(digest,username)).toBeNull();expect(network).not.toHaveBeenCalled();
  adoption.publishDiscoveredPublicCatalog({...delivered,items:[...delivered.items,item('Another delivered Original')],sourceCount:3,revision:'later-complete-addition'});
  const extended=source.readHeldFeedCatalog()!;
  expect(extended.items.map(row=>row.id)).toContain('Another delivered Original');expect(extended.items.some(row=>row.originalDigest===digest)).toBe(true);expect(extended.sourceCount).toBe(4);
  expect(await source.prepareFeedItems()).toBe(await source.prepareFeedItems());expect(displayed[0]).toBe(selectedAudio);expect(network).not.toHaveBeenCalled();
  const exactReference=(admission.original as {importedSource:{reference:unknown}}).importedSource.reference;
  expect(exactReference).toEqual(admission.sourceReference);
  // A fresh Feed module can project the retained accepted Source even when
  // the complete discovery document is genuinely absent. It does not claim
  // anonymous delivery or require a replacement collection to open.
  stop();for(const key of [...values.keys()])if(key!=='bankeiz-admitted-public-assets-v1')values.delete(key);
  vi.stubGlobal('document',{readyState:'complete',getElementById:()=>null});vi.resetModules();
  const cold=await import('../src/public-feed/feed-source'),coldAdoption=await import('../src/receiz/asset-publication-adoption');
  try{
   const retained=cold.readHeldFeedCatalog()!;expect(retained.sourceCount).toBe(1);expect(retained.complete).toBe(false);
   expect((await cold.prepareFeedItems()).map(row=>row.originalDigest)).toEqual([digest]);
   expect(coldAdoption.admittedAssetPublicationDelivery(digest,username)).toBeNull();expect(network).not.toHaveBeenCalled();
  }finally{coldAdoption.forgetAssetPublicationAdmissions();}
 }finally{stop();adoption.forgetAssetPublicationAdmissions();}
},30000);
