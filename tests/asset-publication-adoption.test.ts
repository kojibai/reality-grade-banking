// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import {parsePublicMarket} from '../src/receiz/public-market';
import {retainPublicProfile,retainedPublicProfile,forgetPublicProfile,type PublicProfile} from '../src/receiz/public-profile';
import * as adoption from '../src/receiz/asset-publication-adoption';
const reference={schema:'receiz.imported-proof-source.v1',artifactSha256:'a'.repeat(64),byteLength:2,filename:'asset.receizbundle',mimeType:'application/vnd.receiz.bundle+json',bytes:{kind:'bytes',sha256:'b'.repeat(64),byteLength:2,contentByteLength:2,height:0}};
const source='/api/profile/showcase/imported-source?'+new URLSearchParams({reference:JSON.stringify(reference)});
const original={id:'imported-new',assetTitle:'A complete work',claim:'A description',pulse:'14700000',createdAt:'2026-10-21T10:00:00Z',showOnProfile:true,importedSource:{reference},media:{kind:'image',src:source+'&payload=1',originalDownloadSrc:source,originalDownloadSha256Hex:reference.artifactSha256},longForm:{title:'A complete work',text:'An essay'}};
const admission={username:'artist',original,sourceReference:reference,firstPaint:{artifactDigest:'c'.repeat(64)}};
const owner={identityDigest:'d'.repeat(64),accountUid:'owner'};
const profile:PublicProfile={schema:'bankeiz.public-profile.v1',userId:'owner',username:'artist',displayName:'An artist',bio:null,location:null,websiteUrl:null,avatarUrl:null,bannerUrl:null,socialLinks:[],links:[],authorshipVerified:false,pbiReceiptHash:null,createdAt:null,stats:{originals:0,views:null,plays:null,seconds:null,completion:null},items:[],nextCursor:null};
afterEach(()=>{adoption.forgetAssetPublicationAdmissions();forgetPublicProfile('artist');vi.restoreAllMocks();});
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
 expect(adoption.mergeAdmittedPublicAssets(accepted).items).toHaveLength(1);expect(adoption.assetPublicationFreshnessHint()).toBeUndefined();
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
