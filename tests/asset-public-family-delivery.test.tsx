// @vitest-environment happy-dom
import {afterEach,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {CreatedAssetResult} from '../src/features/assets/CreatedAssetResult';
import {createAssetPublication,type AssetPublicationReceipt,type AssetPublicationState} from '../src/receiz/asset-publication';
import * as adoption from '../src/receiz/asset-publication-adoption';
import {parsePublicMarket} from '../src/receiz/public-market';
import type {PublicProfile} from '../src/receiz/public-profile';
const reference={schema:'receiz.imported-proof-source.v1',artifactSha256:'a'.repeat(64),byteLength:2,filename:'asset.receizbundle',mimeType:'application/vnd.receiz.bundle+json',bytes:{kind:'bytes',sha256:'b'.repeat(64),byteLength:2,contentByteLength:2,height:0}};
const url='/api/profile/showcase/imported-source?'+new URLSearchParams({reference:JSON.stringify(reference)}),digest=reference.artifactSha256,hash='e'.repeat(64),owner={identityDigest:'d'.repeat(64),accountUid:'owner'};
const original={id:'imported-new',assetTitle:'Exact Original',claim:'Exact Original',pulse:'14700000',createdAt:'2026-11-07T12:00:00Z',showOnProfile:true,hasPbiSignature:true,pbiReceiptHash:hash,importedSource:{reference},media:{kind:'image',src:url+'&payload=1',originalDownloadSrc:url,originalDownloadSha256Hex:digest}};
const admission={username:'artist',original,sourceReference:reference,firstPaint:{artifactDigest:'c'.repeat(64)}};
const pending={status:'published',artifactDigest:'f'.repeat(64),operationCount:2,visibleChildCount:1,publicFamilyStatus:'pending'} as AssetPublicationReceipt;
const catalog=()=>parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:imported-new',receizId:'imported-new',title:original.assetTitle,ownerUsername:'artist',ownerUserId:'owner',ownerCreatedAt:'2026-01-01T00:00:00Z',profileOriginal:original}]}});
const release={schema:'receiz.native-public-showcase-release.v1',ownerUserId:'owner',username:'artist',artifactDigest:'f'.repeat(64),operationCount:2,revision:'1'.repeat(64)} as const;
const profile=(extra={})=>({schema:'bankeiz.public-profile.v1',userId:'owner',username:'artist',displayName:'Artist',bio:null,location:null,websiteUrl:null,avatarUrl:null,bannerUrl:null,socialLinks:[],links:[],authorshipVerified:false,pbiReceiptHash:null,createdAt:null,stats:{originals:1,views:null,plays:null,seconds:null,completion:null},items:catalog().items,nextCursor:null,...extra} as PublicProfile);
afterEach(()=>{adoption.forgetAssetPublicationAdmissions();localStorage.clear();});
it('retains Source acceptance and its explicit pending saved-family status in durable creation and delivery',async()=>{
 let state:AssetPublicationState|null=null;const file=new File(['source'],'original.receizbundle');
 const api=createAssetPublication({ownerReceizId:'owner.receiz.id',assertOpen(){},lock:async run=>run(),read:async()=>state,write:async next=>{state=next;},seal:async()=>file,retain:async()=>digest,restore:async()=>file,readIntent:async()=>({title:'Exact Original'}),publish:async()=>pending});
 const result=await api.create({title:'Exact Original'});
 expect(result.publication).toMatchObject({status:'published',showcaseArtifactDigest:'f'.repeat(64),publicFamilyStatus:'pending'});
 expect(state).toMatchObject({status:'published',receipt:pending});
});
it('does not turn raw membership or an unqualified profile into saved-family confirmation',()=>{
 adoption.retainAssetPublicationAdmission(admission,owner);adoption.acknowledgeAssetPublication(digest,pending,hash);
 adoption.acceptDiscoveredPublicAssets(catalog());adoption.acceptDiscoveredProfileAssets(profile());
 expect(adoption.admittedAssetPublicationSignatureDelivery(digest,'artist')).toMatchObject({status:'published',publicFamilyStatus:'pending'});
 expect(adoption.admittedAssetPublicationDelivery(digest,'artist')).toMatchObject({status:'published',publicFamilyStatus:'pending'});
 adoption.mergeAdmittedPublicAssets(catalog());adoption.mergeAdmittedProfileAssets(profile());
 expect(adoption.admittedAssetPublicationSignatureDelivery(digest,'artist')).toMatchObject({publicFamilyStatus:'pending'});
});
it('confirms only the matching Original and PBI in the vector-released profile, including a later released head',()=>{
 adoption.retainAssetPublicationAdmission(admission,owner);adoption.acknowledgeAssetPublication(digest,pending,hash);
 for(const changed of [{ownerUserId:'different'},{username:'renamed'},{revision:'invalid'}]){
  adoption.acceptDiscoveredProfileAssets(profile({publicShowcaseRelease:{...release,...changed}}));
  expect(adoption.admittedAssetPublicationSignatureDelivery(digest,'artist')).toMatchObject({publicFamilyStatus:'pending'});
 }
 adoption.acceptDiscoveredProfileAssets(profile({publicShowcaseRelease:{...release,artifactDigest:'2'.repeat(64),operationCount:3}}));
 expect(adoption.admittedAssetPublicationSignatureDelivery(digest,'artist')).toMatchObject({status:'published',publicFamilyStatus:'ready'});
});
it('keeps a signed result pending publicly while preserving its exact source and opening actions',()=>{
 const html=renderToStaticMarkup(<CreatedAssetResult result={{title:'Exact Original',digest,pbiSigned:true,publication:{status:'published'},marketPublication:{status:'published',publicFamilyStatus:'pending'} as never}} settings={{symbol:'ORIG',units:'1000'}} busy={false} error="" username="artist" publicItem={{id:'profile:artist:imported-new'}} onRetryDelivery={()=>{}} onPublishMarket={()=>{}} onOpenAsset={()=>{}} onSave={()=>{}} onClose={()=>{}}/>);
 expect(html).toContain('Your Original is signed.');expect(html).not.toContain('Your Original is signed and public.');expect(html).not.toContain('Bankeiz Market listing is confirmed.');expect(html).toContain('Market listing delivery is pending.');expect(html).toContain('Open your asset');
});
