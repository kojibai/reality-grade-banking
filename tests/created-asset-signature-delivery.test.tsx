// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import * as adoption from '../src/receiz/asset-publication-adoption';
import {forgetPublicProfile} from '../src/receiz/public-profile';
import type {OpenIdentity} from '../src/receiz/native-identity';
import type {HeldDeposit} from '../src/receiz/deposit-source';
import type {AssetPublicationDelivery} from '../src/receiz/asset-publication';
import {parsePublicMarket} from '../src/receiz/public-market';
vi.mock('../src/features/assets/AssetComposer',()=>({AssetComposer:()=>null}));
import {CreateAsset} from '../src/features/assets/CreateAsset';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const reference={schema:'receiz.imported-proof-source.v1',artifactSha256:'a'.repeat(64),byteLength:2,filename:'asset.receizbundle',mimeType:'application/vnd.receiz.bundle+json',bytes:{kind:'bytes',sha256:'b'.repeat(64),byteLength:2,contentByteLength:2,height:0}};
const source='/api/profile/showcase/imported-source?'+new URLSearchParams({reference:JSON.stringify(reference)});
const original={id:'imported-new',assetTitle:'A complete work',claim:'A description',pulse:'14700000',createdAt:'2026-10-21T10:00:00Z',showOnProfile:true,importedSource:{reference},media:{kind:'image',src:source+'&payload=1',originalDownloadSrc:source,originalDownloadSha256Hex:reference.artifactSha256},longForm:{title:'A complete work',text:'An essay'}};
const admission={username:'artist',original,sourceReference:reference,firstPaint:null};
const owner={identityDigest:'d'.repeat(64),accountUid:'owner'};
const published=(digest:string)=>({status:'published' as const,artifactDigest:digest,operationCount:2,visibleChildCount:1});
const signed=(hash='e'.repeat(64))=>({...admission,original:{...original,hasPbiSignature:true,pbiReceiptHash:hash}});
const signatureDelivery=()=>Reflect.get(adoption,'admittedAssetPublicationSignatureDelivery') as ((digest:string,username:string)=>AssetPublicationDelivery|null)|undefined;

afterEach(()=>{adoption.forgetAssetPublicationAdmissions();forgetPublicProfile('artist');vi.restoreAllMocks();});

it('selects only the current admitted signature receipt, independently of an accepted older Source or signature',()=>{
 const request=vi.spyOn(globalThis,'fetch'),digest=reference.artifactSha256;
 adoption.retainAssetPublicationAdmission(admission,owner);adoption.acknowledgeAssetPublication(digest,published('c'.repeat(64)));
 const select=signatureDelivery();expect(select).toBeTypeOf('function');
 expect(select!(digest,'artist')).toBeNull();
 adoption.retainAssetPublicationAdmission(signed(),owner);
 expect(adoption.admittedAssetPublicationDelivery(digest,'artist')).toEqual({status:'published',showcaseArtifactDigest:'c'.repeat(64)});
 expect(select!(digest,'artist')).toBeNull();
 adoption.acknowledgeAssetPublication(digest,{status:'pending',code:'SIGNATURE_DELIVERY_PENDING'},'e'.repeat(64));
 expect(select!(digest,'artist')).toEqual({status:'pending',code:'SIGNATURE_DELIVERY_PENDING'});
 expect(select!(digest,'another')).toBeNull();expect(select!('0'.repeat(64),'artist')).toBeNull();
 adoption.acknowledgeAssetPublication(digest,published('f'.repeat(64)),'e'.repeat(64));
 expect(select!(digest,'artist')).toEqual({status:'published',showcaseArtifactDigest:'f'.repeat(64)});
 adoption.retainAssetPublicationAdmission(signed('1'.repeat(64)),owner);
 expect(select!(digest,'artist')).toBeNull();
 expect(adoption.admittedAssetPublicationDelivery(digest,'artist')?.status).toBe('published');
 const storage=vi.spyOn(Storage.prototype,'setItem');select!(digest,'artist');select!(digest,'artist');
 expect(storage).not.toHaveBeenCalled();expect(request).not.toHaveBeenCalled();
});

it('keeps the open Create result pending through an older Source receipt, then reflects the exact signature acknowledgment without another action',async()=>{
 const digest=reference.artifactSha256,request=vi.spyOn(globalThis,'fetch');
 adoption.retainAssetPublicationAdmission(admission,owner);adoption.acknowledgeAssetPublication(digest,published('c'.repeat(64)));
 adoption.retainAssetPublicationAdmission(signed(),owner);
 adoption.acknowledgeAssetPublication(digest,{status:'pending',code:'SIGNATURE_DELIVERY_PENDING'},'e'.repeat(64));
 const saved:HeldDeposit={digest,filename:'asset.receizbundle',title:original.assetTitle,kind:'proof',status:'held-proof',pulse:original.pulse,bytes:new Uint8Array([1,2]),pbiSigned:true,publication:{status:'published',showcaseArtifactDigest:'c'.repeat(64)},marketPublication:{status:'pending',code:'SIGNATURE_DELIVERY_PENDING'}};
 const retry=vi.fn(),publish=vi.fn(),create=vi.fn(),pending=vi.fn().mockResolvedValue(saved);
 const identity={username:'artist',accountUsername:()=> 'artist',pendingAssetPublication:pending,retryAssetPublication:retry,publishAssetToMarket:publish,createComposedAsset:create,binding:{keyId:'key',artifactOwnerReceizId:'artist.receiz.id'}} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<CreateAsset identity={identity} onRefresh={()=>{}} onClose={()=>{}}/>));
  expect(host.textContent).toContain('Your Original is public on Receiz.');
  expect(host.textContent).toContain('Market listing delivery is pending.');
  expect(host.textContent).not.toContain('Bankeiz Market listing is confirmed.');
  // An older unsigned public observation cannot confirm this signed intent.
  const old=adoption.mergeAdmittedPublicAssets(parsePublicMarket({ok:true,transport:{publicOriginals:[]}}));
  adoption.acceptDiscoveredPublicAssets({...old,items:old.items.map(item=>({...item,hasPbiSignature:false,pbiReceiptHash:undefined}))});
  expect(host.textContent).toContain('Market listing delivery is pending.');
  await act(async()=>adoption.acknowledgeAssetPublication(digest,published('f'.repeat(64)),'e'.repeat(64)));
  expect(host.textContent).toContain('Bankeiz Market listing is confirmed.');
  expect(host.textContent).not.toContain('Market listing delivery is pending.');
  expect(pending).toHaveBeenCalledOnce();expect(retry).not.toHaveBeenCalled();expect(publish).not.toHaveBeenCalled();expect(create).not.toHaveBeenCalled();expect(request).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});


it('completes a pending signed Create result from the later exact public catalog without another delivery or claimed Showcase head',async()=>{
 const digest=reference.artifactSha256,hash='e'.repeat(64),request=vi.spyOn(globalThis,'fetch');
 adoption.retainAssetPublicationAdmission({...admission,firstPaint:{artifactDigest:'c'.repeat(64)}},owner);adoption.acknowledgeAssetPublication(digest,published('c'.repeat(64)));
 adoption.retainAssetPublicationAdmission(signed(),owner);adoption.acknowledgeAssetPublication(digest,{status:'pending',code:'PROFILE_SHOWCASE_PUBLIC_DELIVERY_PENDING'},hash);
 const saved:HeldDeposit={digest,filename:'asset.receizbundle',title:original.assetTitle,kind:'proof',status:'held-proof',pulse:original.pulse,bytes:new Uint8Array([1,2]),pbiSigned:true,publication:{status:'published',showcaseArtifactDigest:'c'.repeat(64)},marketPublication:{status:'pending',code:'PROFILE_SHOWCASE_PUBLIC_DELIVERY_PENDING'}};
 const retry=vi.fn(),publish=vi.fn(),create=vi.fn(),pending=vi.fn().mockResolvedValue(saved),identity={username:'artist',accountUsername:()=> 'artist',pendingAssetPublication:pending,retryAssetPublication:retry,publishAssetToMarket:publish,createComposedAsset:create,binding:{keyId:'key',artifactOwnerReceizId:'artist.receiz.id'}} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 const publicCatalog=(uid='owner',pbi=hash)=>parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:imported-new',receizId:'imported-new',title:'A complete work',ownerUsername:'artist',ownerUserId:uid,ownerCreatedAt:'2026-01-01T00:00:00Z',profileOriginal:{media:original.media,hasPbiSignature:true,pbiReceiptHash:pbi}}]}});
 try{
  await act(async()=>root.render(<CreateAsset identity={identity} onRefresh={()=>{}} onClose={()=>{}}/>));
  expect(host.textContent).toContain('Market listing delivery is pending.');
  await act(async()=>{adoption.acceptDiscoveredPublicAssets(publicCatalog('another'));adoption.acceptDiscoveredPublicAssets(publicCatalog('owner','1'.repeat(64)));});
  expect(host.textContent).toContain('Market listing delivery is pending.');
  await act(async()=>adoption.acceptDiscoveredPublicAssets(publicCatalog()));
  expect(host.textContent).toContain('Bankeiz Market listing is confirmed.');
  expect(adoption.admittedAssetPublicationSignatureDelivery(digest,'artist')).toEqual({status:'published'});
  expect(adoption.pendingAssetPublicationSignatures(owner.identityDigest,owner.accountUid,'artist')).toEqual([]);
  // Retiring the profile and Market overlays must not erase display completion.
  adoption.acceptDiscoveredProfileAssets({schema:'bankeiz.public-profile.v1',userId:'owner',username:'artist',items:publicCatalog().items} as never);
  adoption.mergeAdmittedPublicAssets(publicCatalog());
  expect(adoption.admittedAssetPublicationSignatureDelivery(digest,'artist')).toEqual({status:'published'});
  expect(pending).toHaveBeenCalledOnce();expect(retry).not.toHaveBeenCalled();expect(publish).not.toHaveBeenCalled();expect(create).not.toHaveBeenCalled();expect(request).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});
