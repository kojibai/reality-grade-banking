// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import {parsePublicMarket,mergePublicQuotes} from '../src/receiz/public-market';
import {retainPublicProfile,retainedPublicProfile,forgetPublicProfile,type PublicProfile} from '../src/receiz/public-profile';
import {publicShareCapitalization,readPublicShareInventory} from '../src/receiz/market-share-inventory';
import * as adoption from '../src/receiz/asset-publication-adoption';
const reference={schema:'receiz.imported-proof-source.v1',artifactSha256:'a'.repeat(64),byteLength:2,filename:'asset.receizbundle',mimeType:'application/vnd.receiz.bundle+json',bytes:{kind:'bytes',sha256:'b'.repeat(64),byteLength:2,contentByteLength:2,height:0}};
const source='/api/profile/showcase/imported-source?'+new URLSearchParams({reference:JSON.stringify(reference)});
const original={id:'imported-new',assetTitle:'A complete work',claim:'A description',pulse:'14700000',createdAt:'2026-10-21T10:00:00Z',showOnProfile:true,importedSource:{reference},media:{kind:'image',src:source+'&payload=1',originalDownloadSrc:source,originalDownloadSha256Hex:reference.artifactSha256},longForm:{title:'A complete work',text:'An essay'}};
const admission={username:'artist',original,sourceReference:reference,firstPaint:{artifactDigest:'c'.repeat(64)}};
const owner={identityDigest:'d'.repeat(64),accountUid:'owner'};
const profile:PublicProfile={schema:'bankeiz.public-profile.v1',userId:'owner',username:'artist',displayName:'An artist',bio:null,location:null,websiteUrl:null,avatarUrl:null,bannerUrl:null,socialLinks:[],links:[],authorshipVerified:false,pbiReceiptHash:null,createdAt:null,stats:{originals:0,views:null,plays:null,seconds:null,completion:null},items:[],nextCursor:null};
afterEach(()=>{adoption.forgetAssetPublicationAdmissions();forgetPublicProfile('artist');vi.restoreAllMocks();});
it('leaves an unobserved owner portrait available for the later public profile',()=>{
 adoption.retainAssetPublicationAdmission(admission,owner);
 const item=adoption.admittedAssetPublicationItem(reference.artifactSha256,'artist')!;
 expect(item.ownerAvatarUrl).toBeUndefined();
 const portrait='https://receiz.com/artwork/artist.webp';
 retainPublicProfile({...profile,avatarUrl:portrait});
 expect(retainedPublicProfile('artist')?.items[0].ownerAvatarUrl).toBe(portrait);
 expect(adoption.admittedAssetPublicationItem(reference.artifactSha256,'artist')?.ownerAvatarUrl).toBe(portrait);
});
it('repairs a restored local admission portrait from the same current owner profile',async()=>{
 adoption.retainAssetPublicationAdmission(admission,owner);
 const key='bankeiz-admitted-public-assets-v1',saved=JSON.parse(localStorage.getItem(key)!);
 saved[0].row.ownerAvatarUrl=null;adoption.forgetAssetPublicationAdmissions();localStorage.setItem(key,JSON.stringify(saved));
 vi.resetModules();const restored=await import('../src/receiz/asset-publication-adoption'),profiles=await import('../src/receiz/public-profile');
 try{
  const portrait='https://receiz.com/artwork/current-artist.webp';profiles.retainPublicProfile({...profile,avatarUrl:portrait});
  expect(restored.admittedAssetPublicationItem(reference.artifactSha256,'artist')?.ownerAvatarUrl).toBe(portrait);
  expect(restored.mergeAdmittedPublicAssets(parsePublicMarket({ok:true,transport:{publicOriginals:[]}})).items[0].ownerAvatarUrl).toBe(portrait);
  profiles.retainPublicProfile({...profile,avatarUrl:null});expect(restored.admittedAssetPublicationItem(reference.artifactSha256,'artist')?.ownerAvatarUrl).toBeNull();
  profiles.retainPublicProfile({...profile,userId:'another-owner',avatarUrl:portrait});expect(restored.admittedAssetPublicationItem(reference.artifactSha256,'artist')?.ownerAvatarUrl).toBeNull();
 }finally{restored.forgetAssetPublicationAdmissions();profiles.forgetPublicProfile('artist');}
});
it('preserves an explicitly absent portrait from the observed public profile',()=>{
 retainPublicProfile(profile);adoption.retainAssetPublicationAdmission(admission,owner);
 expect(adoption.admittedAssetPublicationItem(reference.artifactSha256,'artist')?.ownerAvatarUrl).toBeNull();
});
it('keeps local membership through quote clones until actual discovery acknowledges it',()=>{
 adoption.retainAssetPublicationAdmission(admission,owner);adoption.acknowledgeAssetPublication(reference.artifactSha256,{status:'published',artifactDigest:'f'.repeat(64),operationCount:1,visibleChildCount:1});
 const empty=parsePublicMarket({ok:true,transport:{publicOriginals:[]}}),first=adoption.mergeAdmittedPublicAssets(empty);
 const quoted=mergePublicQuotes(first,{ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[{itemId:first.items[0].id,visibility:'public',currentPriceUsd:12,history:[]}]}});
 expect(adoption.mergeAdmittedPublicAssets(quoted).items).toHaveLength(1);
 expect(adoption.mergeAdmittedPublicAssets(empty).items).toHaveLength(1);expect(adoption.assetPublicationFreshnessHint()).toBe(reference.artifactSha256);
});
it('immediately adds one exact admitted source to the owner profile and Market and survives stale reads',()=>{
 retainPublicProfile(profile);const notify=vi.fn(),unsubscribe=adoption.subscribeAssetPublicationAdmissions(notify);
 try{adoption.retainAssetPublicationAdmission(admission,owner);expect(notify).toHaveBeenCalledOnce();expect(retainedPublicProfile('artist')?.items[0]).toMatchObject({id:'profile:artist:imported-new',title:'A complete work',mediaKind:'image',originalDigest:'a'.repeat(64)});
 const stale=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'existing',receizId:'existing',title:'An existing work'}]}});
 const first=adoption.mergeAdmittedPublicAssets(stale);expect(first.items.map(item=>item.id)).toEqual(['profile:artist:imported-new','existing']);adoption.retainAssetPublicationAdmission(admission,owner);expect(adoption.mergeAdmittedPublicAssets(first).items).toHaveLength(2);
 retainPublicProfile(profile);expect(retainedPublicProfile('artist')?.items).toHaveLength(1);const retained=retainedPublicProfile('artist')!;expect(retainPublicProfile(retained).stats.originals).toBe(1);
 }finally{unsubscribe();}
});
it('keeps pending delivery distinct from public acknowledgment and never creates another listing',()=>{
 adoption.retainAssetPublicationAdmission(admission,owner);expect(adoption.assetPublicationFreshnessHint()).toBeUndefined();adoption.acknowledgeAssetPublication('a'.repeat(64),{status:'pending',code:'PENDING'});expect(adoption.assetPublicationFreshnessHint()).toBeUndefined();
 expect(()=>adoption.acknowledgeAssetPublication('e'.repeat(64),{status:'published',artifactDigest:'f'.repeat(64),operationCount:1,visibleChildCount:1})).toThrow();
 adoption.acknowledgeAssetPublication('a'.repeat(64),{status:'published',artifactDigest:'f'.repeat(64),operationCount:1,visibleChildCount:1});expect(adoption.assetPublicationFreshnessHint()).toBe('a'.repeat(64));
 const accepted=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:imported-new',receizId:'imported-new',title:'A complete work',ownerUsername:'artist',profileOriginal:{media:original.media}}]}});
 adoption.acceptDiscoveredPublicAssets(accepted);expect(adoption.mergeAdmittedPublicAssets(accepted).items).toHaveLength(1);expect(adoption.assetPublicationFreshnessHint()).toBeUndefined();
});
it('rejects mismatched source data and ignores a late callback from a closed or renamed account',()=>{
 expect(()=>adoption.retainAssetPublicationAdmission({...admission,sourceReference:{...reference,artifactSha256:'e'.repeat(64)}},owner)).toThrow();
 adoption.retainAssetPublicationAdmission(admission,{...owner,isCurrent:()=>false});expect(adoption.mergeAdmittedPublicAssets(parsePublicMarket({ok:true,transport:{publicOriginals:[]}})).items).toHaveLength(0);
 retainPublicProfile({...profile,userId:'another-owner'});adoption.retainAssetPublicationAdmission(admission,owner);expect(retainedPublicProfile('artist')?.items).toHaveLength(0);
});
it('keeps selected artwork stable through stale and accepted discovery without another media read',()=>{
 const create=vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:local-artwork'),revoke=vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 adoption.retainAssetPublicationAdmission(admission,{...owner,artwork:new Blob(['art'],{type:'image/png'})});const empty=parsePublicMarket({ok:true,transport:{publicOriginals:[]}});const initial=adoption.mergeAdmittedPublicAssets(empty);expect(initial.items[0].artworkUrl).toBe('blob:local-artwork');
 const accepted=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:imported-new',receizId:'imported-new',title:'A complete work',ownerUsername:'artist',profileOriginal:{media:original.media}}]}});
 expect(adoption.mergeAdmittedPublicAssets(accepted).items[0].artworkUrl).toBe('blob:local-artwork');expect(create).toHaveBeenCalledOnce();expect(revoke).not.toHaveBeenCalled();
});

it('selects the exact admitted Original for the owner without fetching or inventing a listing',()=>{
 const request=vi.spyOn(globalThis,'fetch');adoption.retainAssetPublicationAdmission(admission,owner);
 expect(adoption.admittedAssetPublicationItem(reference.artifactSha256,'artist')).toMatchObject({id:'profile:artist:imported-new',originalDigest:reference.artifactSha256});
 expect(adoption.admittedAssetPublicationItem(reference.artifactSha256,'another')).toBeNull();expect(adoption.admittedAssetPublicationItem('e'.repeat(64),'artist')).toBeNull();expect(request).not.toHaveBeenCalled();
});

it('keeps a newly signed Original through stale unsigned discovery without adding a second asset',()=>{
 const empty=parsePublicMarket({ok:true,transport:{publicOriginals:[]}});
 adoption.retainAssetPublicationAdmission(admission,owner);
 const unsigned=adoption.mergeAdmittedPublicAssets(empty);
 adoption.acceptDiscoveredPublicAssets(unsigned);
 const signed={...admission,original:{...original,hasPbiSignature:true,pbiReceiptHash:'e'.repeat(64)},firstPaint:{artifactDigest:'f'.repeat(64)}};
 adoption.retainAssetPublicationAdmission(signed,owner);
 const updated=adoption.mergeAdmittedPublicAssets(unsigned);
 expect(updated.items).toHaveLength(1);expect(updated.items[0].hasPbiSignature).toBe(true);
 adoption.acceptDiscoveredPublicAssets(unsigned);
 expect(adoption.mergeAdmittedPublicAssets(unsigned).items[0].hasPbiSignature).toBe(true);
});

it('displays a canonically admitted local Original before Showcase delivery without inventing a Showcase head',()=>{
 adoption.retainAssetPublicationAdmission({...admission,firstPaint:null},owner);
 expect(adoption.admittedAssetPublicationItem(reference.artifactSha256,'artist')?.title).toBe('A complete work');
 expect(adoption.admittedAssetPublicationDelivery(reference.artifactSha256,'artist')).toBeNull();
 expect(adoption.assetPublicationFreshnessHint()).toBeUndefined();
 adoption.acknowledgeAssetPublication(reference.artifactSha256,{status:'published',artifactDigest:'f'.repeat(64),operationCount:1,visibleChildCount:1});
 expect(adoption.admittedAssetPublicationDelivery(reference.artifactSha256,'artist')).toEqual({status:'published',showcaseArtifactDigest:'f'.repeat(64)});
});

it('keeps locally pending signing unavailable until its existing receipt or public observation arrives',()=>{
 const request=vi.spyOn(globalThis,'fetch'),digest=reference.artifactSha256;
 expect(adoption.locallyPendingAssetPublication(digest,'artist')).toBe(false);
 adoption.retainAssetPublicationAdmission({...admission,firstPaint:null},owner);
 expect(adoption.locallyPendingAssetPublication(digest,'artist')).toBe(true);
 expect(adoption.locallyPendingAssetPublication(digest,'another')).toBe(false);
 const published=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:imported-new',receizId:'imported-new',title:'A complete work',ownerUsername:'artist',profileOriginal:{media:original.media}}]}});
 adoption.acceptDiscoveredPublicAssets(published);
 expect(adoption.locallyPendingAssetPublication(digest,'artist')).toBe(false);
 adoption.forgetAssetPublicationAdmissions();adoption.retainAssetPublicationAdmission({...admission,firstPaint:null},owner);
 adoption.acknowledgeAssetPublication(digest,{status:'published',artifactDigest:'f'.repeat(64),operationCount:1,visibleChildCount:1});
 expect(adoption.locallyPendingAssetPublication(digest,'artist')).toBe(false);expect(request).not.toHaveBeenCalled();
});

it('retains only this account’s unacknowledged signed additions for exact-proof resume',()=>{
 const request=vi.spyOn(globalThis,'fetch'),digest=reference.artifactSha256;
 adoption.retainAssetPublicationAdmission(admission,owner);
 adoption.acknowledgeAssetPublication(digest,{status:'published',artifactDigest:'c'.repeat(64),operationCount:1,visibleChildCount:1});
 expect(adoption.pendingAssetPublicationSignatures(owner.identityDigest,owner.accountUid,'artist')).toEqual([]);
 adoption.retainAssetPublicationAdmission({...admission,original:{...original,hasPbiSignature:true,pbiReceiptHash:'e'.repeat(64)}},owner);
 expect(adoption.pendingAssetPublicationSignatures(owner.identityDigest,owner.accountUid,'artist')).toEqual([digest]);
 expect(adoption.pendingAssetPublicationSignatures('f'.repeat(64),owner.accountUid,'artist')).toEqual([]);
 expect(adoption.pendingAssetPublicationSignatures(owner.identityDigest,'another','artist')).toEqual([]);
 expect(adoption.pendingAssetPublicationSignatures(owner.identityDigest,owner.accountUid,'another')).toEqual([]);
 adoption.acknowledgeAssetPublication(digest,{status:'pending',code:'DELIVERY_PENDING'},'e'.repeat(64));
 expect(adoption.pendingAssetPublicationSignatures(owner.identityDigest,owner.accountUid,'artist')).toEqual([digest]);
 adoption.acknowledgeAssetPublication(digest,{status:'published',artifactDigest:'f'.repeat(64),operationCount:2,visibleChildCount:1},'e'.repeat(64));
 expect(adoption.pendingAssetPublicationSignatures(owner.identityDigest,owner.accountUid,'artist')).toEqual([]);
 expect(request).not.toHaveBeenCalled();
});

it('keeps an exact later signed intent pending through an older signed discovery and preserves source delivery',()=>{
 const digest=reference.artifactSha256,a='e'.repeat(64),b='f'.repeat(64);
 const signed=(hash:string)=>({...admission,original:{...original,hasPbiSignature:true,pbiReceiptHash:hash}});
 const discovered=(hash:string)=>parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:imported-new',receizId:'imported-new',title:original.assetTitle,ownerUsername:'artist',ownerUserId:owner.accountUid,ownerCreatedAt:'2026-01-01T00:00:00Z',profileOriginal:{...original,hasPbiSignature:true,pbiReceiptHash:hash}}]}});
 adoption.retainAssetPublicationAdmission(signed(a),owner);
 adoption.acknowledgeAssetPublication(digest,{status:'published',artifactDigest:'1'.repeat(64),operationCount:1,visibleChildCount:1},a);
 adoption.acceptDiscoveredPublicAssets(discovered(a));
 adoption.retainAssetPublicationAdmission(signed(b),owner);
 expect(adoption.admittedAssetPublicationDelivery(digest,'artist')).toMatchObject({status:'published',showcaseArtifactDigest:'1'.repeat(64)});
 expect(adoption.pendingAssetPublicationSignatures(owner.identityDigest,owner.accountUid,'artist')).toEqual([digest]);
 adoption.acceptDiscoveredPublicAssets(discovered(a));
 expect(adoption.pendingAssetPublicationSignatures(owner.identityDigest,owner.accountUid,'artist')).toEqual([digest]);
 expect(adoption.mergeAdmittedPublicAssets(discovered(a)).items[0].pbiReceiptHash).toBe(b);
 expect(adoption.mergeAdmittedProfileAssets({...profile,items:discovered(a).items}).items[0].pbiReceiptHash).toBe(b);
 adoption.acceptDiscoveredPublicAssets(discovered(b));
 expect(adoption.pendingAssetPublicationSignatures(owner.identityDigest,owner.accountUid,'artist')).toEqual([]);
});

it('resumes a legacy retained signature whose published receipt and seen flags belonged to its unsigned Source',async()=>{
 const digest=reference.artifactSha256,key='bankeiz-admitted-public-assets-v1';
 adoption.retainAssetPublicationAdmission(admission,owner);
 adoption.acknowledgeAssetPublication(digest,{status:'published',artifactDigest:'c'.repeat(64),operationCount:1,visibleChildCount:1});
 adoption.retainAssetPublicationAdmission({...admission,original:{...original,hasPbiSignature:true,pbiReceiptHash:'e'.repeat(64)}},owner);
 const saved=JSON.parse(localStorage.getItem(key)!);
 // Legacy display retention did not bind acknowledgment to the signed append.
 saved[0].receipt=saved[0].sourceReceipt;saved[0].marketSeen=true;saved[0].profileSeen=true;delete saved[0].signatureDeliveryHash;
 adoption.forgetAssetPublicationAdmissions();localStorage.setItem(key,JSON.stringify(saved));vi.resetModules();
 const restored=await import('../src/receiz/asset-publication-adoption');
 try{
  expect(restored.admittedAssetPublicationDelivery(digest,'artist')).toEqual({status:'published',showcaseArtifactDigest:'c'.repeat(64)});
  expect(restored.admittedAssetPublicationSignatureDelivery(digest,'artist')).toBeNull();
  expect(restored.pendingAssetPublicationSignatures(owner.identityDigest,owner.accountUid,'artist')).toEqual([digest]);
  restored.acknowledgeAssetPublication(digest,{status:'published',artifactDigest:'f'.repeat(64),operationCount:2,visibleChildCount:1},'e'.repeat(64));
  expect(restored.pendingAssetPublicationSignatures(owner.identityDigest,owner.accountUid,'artist')).toEqual([]);
  const current=localStorage.getItem(key)!;restored.forgetAssetPublicationAdmissions();localStorage.setItem(key,current);vi.resetModules();
  const reopened=await import('../src/receiz/asset-publication-adoption');
  try{expect(reopened.pendingAssetPublicationSignatures(owner.identityDigest,owner.accountUid,'artist')).toEqual([]);expect(reopened.admittedAssetPublicationSignatureDelivery(digest,'artist')).toEqual({status:'published',showcaseArtifactDigest:'f'.repeat(64)});}
  finally{reopened.forgetAssetPublicationAdmissions();}
 }finally{restored.forgetAssetPublicationAdmissions();}
});

it('keeps a signed append pending when its older unsigned delivery returns afterward',()=>{
 const digest=reference.artifactSha256;
 adoption.retainAssetPublicationAdmission(admission,owner);
 // A genuine remote Source observation can enable Sign before the original
 // publisher receives its delayed acknowledgment.
 const unsigned=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:imported-new',receizId:'imported-new',title:original.assetTitle,ownerUsername:'artist',profileOriginal:original}]}});
 adoption.acceptDiscoveredPublicAssets(unsigned);
 adoption.retainAssetPublicationAdmission({...admission,original:{...original,hasPbiSignature:true,pbiReceiptHash:'e'.repeat(64)}},owner);
 adoption.acknowledgeAssetPublication(digest,{status:'published',artifactDigest:'c'.repeat(64),operationCount:1,visibleChildCount:1});
 expect(adoption.admittedAssetPublicationDelivery(digest,'artist')?.status).toBe('published');
 expect(adoption.admittedAssetPublicationSignatureDelivery(digest,'artist')).toBeNull();
 expect(adoption.pendingAssetPublicationSignatures(owner.identityDigest,owner.accountUid,'artist')).toEqual([digest]);
 const signedReceipt={status:'published' as const,artifactDigest:'f'.repeat(64),operationCount:2,visibleChildCount:1};
 expect(()=>adoption.acknowledgeAssetPublication(digest,signedReceipt,'')).toThrow('BANK_ASSET_PUBLICATION_RECEIPT_INVALID');
 adoption.acknowledgeAssetPublication(digest,signedReceipt,'1'.repeat(64));
 expect(adoption.pendingAssetPublicationSignatures(owner.identityDigest,owner.accountUid,'artist')).toEqual([digest]);
 adoption.acknowledgeAssetPublication(digest,signedReceipt,'e'.repeat(64));
 adoption.acknowledgeAssetPublication(digest,{status:'pending',code:'LATE_UNSIGNED_RESULT'});
 expect(adoption.admittedAssetPublicationDelivery(digest,'artist')).toEqual({status:'published',showcaseArtifactDigest:'c'.repeat(64)});
 expect(adoption.admittedAssetPublicationSignatureDelivery(digest,'artist')).toEqual({status:'published',showcaseArtifactDigest:'f'.repeat(64)});
 expect(adoption.pendingAssetPublicationSignatures(owner.identityDigest,owner.accountUid,'artist')).toEqual([]);
});

it('keeps already-carried shares and capitalization when signing the same discovered Original',()=>{
 const fetch=vi.spyOn(globalThis,'fetch');
 adoption.retainAssetPublicationAdmission(admission,owner);
 const discovered=adoption.mergeAdmittedPublicAssets(parsePublicMarket({ok:true,transport:{publicOriginals:[]}})),item=discovered.items[0];
 const inventory=readPublicShareInventory({schema:'receiz.market.share-inventory.v1',marketItemId:item.id,assetId:item.assetId,family:'generic',quantityScope:'canonical-asset',observedAtKaiUPulse:'14710000000000',outstandingShareQuantityMicro:'1000000',availableShareQuantityMicro:'2000000',positionsMicro:'1000000',certificatesMicro:'0',reservedBuyMicro:'0',availability:'quote-capacity'},item)!;
 discovered.items=[{...item,priceUsd:10,shareInventory:inventory}];
 adoption.acceptDiscoveredPublicAssets(discovered);
 adoption.retainAssetPublicationAdmission({...admission,original:{...original,marketPreview:{priceUsd:10},hasPbiSignature:true,pbiReceiptHash:'e'.repeat(64)}},owner);
 const updated=adoption.mergeAdmittedPublicAssets(discovered),updatedProfile=adoption.mergeAdmittedProfileAssets({...profile,items:discovered.items});
 expect(updated.items).toHaveLength(1);
 for(const next of [updated.items[0],updatedProfile.items[0]]){
  expect(next.hasPbiSignature).toBe(true);expect(next.shareInventory).toBe(inventory);
 }
 expect(publicShareCapitalization(updated).usdCents).toBe(publicShareCapitalization(discovered).usdCents);
 expect(publicShareCapitalization(updated).covered).toBe(1);expect(fetch).not.toHaveBeenCalled();
 const changedSource={...discovered,items:[{...discovered.items[0],originalDigest:'b'.repeat(64)}]};
 expect(adoption.mergeAdmittedPublicAssets(changedSource).items[0].shareInventory).toBeUndefined();
 expect(adoption.mergeAdmittedProfileAssets({...profile,items:changedSource.items}).items[0].shareInventory).toBeUndefined();
 const changedAsset={...discovered,items:[{...discovered.items[0],assetId:'another'}]};
 expect(adoption.mergeAdmittedPublicAssets(changedAsset).items[0].shareInventory).toBeUndefined();
 expect(adoption.mergeAdmittedProfileAssets({...profile,items:changedAsset.items}).items[0].shareInventory).toBeUndefined();
 const wrongInventory={...discovered,items:[{...discovered.items[0],shareInventory:{...inventory,assetId:'another'}}]};
 expect(adoption.mergeAdmittedPublicAssets(wrongInventory).items[0].shareInventory).toBeUndefined();
 const wrongScope={...discovered,items:[{...discovered.items[0],shareInventory:{...inventory,quantityScope:undefined}}]};
 expect(adoption.mergeAdmittedPublicAssets(wrongScope).items[0].shareInventory).toBeUndefined();
 expect(adoption.mergeAdmittedProfileAssets({...profile,items:wrongScope.items}).items[0].shareInventory).toBeUndefined();
 expect(adoption.mergeAdmittedProfileAssets({...profile,userId:'another-owner',items:discovered.items}).items[0]).toBe(discovered.items[0]);
});

it('keeps observation-only signature completion headless even when display retention carries a Showcase digest',()=>{
 const digest=reference.artifactSha256,hash='e'.repeat(64);
 adoption.retainAssetPublicationAdmission({...admission,original:{...original,hasPbiSignature:true,pbiReceiptHash:hash}},owner);
 adoption.acknowledgeAssetPublication(digest,{status:'pending',code:'PUBLIC_DELIVERY_PENDING'},hash);
 const catalog=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:imported-new',receizId:'imported-new',title:original.assetTitle,ownerUsername:'artist',ownerUserId:owner.accountUid,ownerCreatedAt:'2026-01-01T00:00:00Z',profileOriginal:{...original,hasPbiSignature:true,pbiReceiptHash:hash}}]}});
 adoption.acceptDiscoveredPublicAssets(catalog);
 expect(adoption.admittedAssetPublicationSignatureDelivery(digest,'artist')).toEqual({status:'published'});
});
