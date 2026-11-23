// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {LiveAssets} from '../src/features/assets/LiveAssets';
import {acknowledgeAssetPublication,forgetAssetPublicationAdmissions,mergeAdmittedPublicAssets,retainAssetPublicationAdmission} from '../src/receiz/asset-publication-adoption';
import type {OpenIdentity} from '../src/receiz/native-identity';
import {parsePublicMarket} from '../src/receiz/public-market';

vi.mock('../src/features/market/PublicAssetDetail',()=>({PublicAssetDetail:()=>null}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const digest='a'.repeat(64),identityDigest='d'.repeat(64),accountUid='owner-uid',signatureHash='e'.repeat(64);
const reference={schema:'receiz.imported-proof-source.v1',artifactSha256:digest,byteLength:2,filename:'original.receizbundle',mimeType:'application/vnd.receiz.bundle+json',bytes:{kind:'bytes',sha256:'b'.repeat(64),byteLength:2,contentByteLength:2,height:0}};
const originalUrl='/api/profile/showcase/imported-source?'+new URLSearchParams({reference:JSON.stringify(reference)});
const original={id:'imported-exact',assetTitle:'A held Original',showOnProfile:true,hasPbiSignature:true,pbiReceiptHash:signatureHash,importedSource:{reference},media:{kind:'image',originalDownloadSrc:originalUrl,originalDownloadSha256Hex:digest}};
const admitted={username:'artist',original,sourceReference:reference,firstPaint:null};
const unsignedCatalog=()=>parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:imported-exact',receizId:original.id,title:original.assetTitle,ownerUsername:'artist',ownerUserId:accountUid,ownerCreatedAt:'2026-01-01T00:00:00Z',profileOriginal:{...original,hasPbiSignature:false,pbiReceiptHash:undefined}}]}});
afterEach(()=>forgetAssetPublicationAdmissions());

it.each([{kind:'pending exact signature',account:accountUid,finish:false,replay:true},{kind:'delivered exact signature',account:accountUid,finish:true,replay:false},{kind:'another account’s signature',account:'another-uid',finish:false,replay:false}])('reopens only the $kind on selection',async({account,finish,replay})=>{
 retainAssetPublicationAdmission(admitted,{identityDigest,accountUid});
 if(finish)acknowledgeAssetPublication(digest,{status:'published',artifactDigest:'c'.repeat(64),operationCount:2,visibleChildCount:1},signatureHash);
 const showcase=mergeAdmittedPublicAssets(unsignedCatalog()).items;
 expect(showcase[0]).toMatchObject({originalDigest:digest,hasPbiSignature:true,pbiReceiptHash:signatureHash});
 const retry=vi.fn(),identity={username:'artist',binding:{keyId:'key',artifactSha256:identityDigest,artifactOwnerReceizId:'artist.receiz.id'},walletReceivingAddress:()=>account,retryAssetSignatureOnOpen:retry} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<LiveAssets identity={identity} active revision={0} showcase={showcase} source={{sources:[],busy:false,error:''}} onOpen={()=>{}}/>));
  expect(retry).not.toHaveBeenCalled();
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent?.includes(original.assetTitle))!.click());
  if(replay)expect(retry).toHaveBeenCalledExactlyOnceWith(digest,undefined,showcase[0]!.originalUrl);
  else expect(retry).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});
