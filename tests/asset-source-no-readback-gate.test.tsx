// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,expect,it,vi} from 'vitest';
import {OriginalSigning} from '../src/features/assets/OriginalSigning';
import {CreatedAssetResult} from '../src/features/assets/CreatedAssetResult';
import {isAssetPublicationDeliveryConfirmed,retainAssetPublicationDelivery} from '../src/receiz/asset-publication';
import * as adoption from '../src/receiz/asset-publication-adoption';
import type {OpenIdentity} from '../src/receiz/native-identity';
import type {HeldDeposit} from '../src/receiz/deposit-source';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const digest='a'.repeat(64),reference={schema:'receiz.imported-proof-source.v1',artifactSha256:digest,byteLength:2,filename:'original.receizbundle',mimeType:'application/vnd.receiz.bundle+json',bytes:{kind:'bytes',sha256:'b'.repeat(64),byteLength:2,contentByteLength:2,height:0}};
const source:HeldDeposit={digest,filename:reference.filename,title:'Held Original',kind:'proof',status:'held-proof',pulse:'14955302',bytes:new Uint8Array([1,2]),pbiSigned:false};
const original={id:'imported-held',assetTitle:source.title,claim:source.title,pulse:source.pulse,showOnProfile:true,hasPbiSignature:false,importedSource:{reference},media:null};
const admission={username:'artist',original,sourceReference:reference,firstPaint:null};
afterEach(()=>{adoption.forgetAssetPublicationAdmissions();localStorage.clear();vi.restoreAllMocks();});

it('accepts the existing native publication receipt without a saved-page readiness readback',()=>{
 const request=vi.spyOn(globalThis,'fetch');
 adoption.retainAssetPublicationAdmission(admission,{identityDigest:'d'.repeat(64),accountUid:'owner'});
 const legacyReceipt={status:'published' as const,artifactDigest:'f'.repeat(64),operationCount:3,visibleChildCount:1,publicFamilyStatus:'pending'};
 adoption.acknowledgeAssetPublication(digest,legacyReceipt);
 const accepted=adoption.admittedAssetPublicationDelivery(digest,'artist');
 expect(isAssetPublicationDeliveryConfirmed(accepted)).toBe(true);
 expect(retainAssetPublicationDelivery(accepted??undefined,{status:'pending',code:'LATE_PAGE_REPLY'})).toBe(accepted);
 expect(request).not.toHaveBeenCalled();
});

it('offers the existing owner signing operation for held Source before any public response',async()=>{
 const request=vi.spyOn(globalThis,'fetch'),publish=vi.fn().mockResolvedValue({...source,pbiSigned:true});
 adoption.retainAssetPublicationAdmission(admission,{identityDigest:'d'.repeat(64),accountUid:'owner'});
 const identity={binding:{keyId:'key'},accountUsername:()=> 'artist',publishAssetToMarket:publish} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<OriginalSigning identity={identity} source={source}/>));
  const sign=host.querySelector<HTMLButtonElement>('button');expect(sign).not.toBeNull();
  expect(request).not.toHaveBeenCalled();expect(publish).not.toHaveBeenCalled();
  await act(async()=>sign!.click());expect(publish).toHaveBeenCalledWith(source);
  expect(host.querySelector('button')).toBeNull();expect(request).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});

it('does not turn an accepted signed Source into a pending public surface because a saved page lags',()=>{
 const legacyDelivery={status:'published' as const,publicFamilyStatus:'pending'};
 const html=renderToStaticMarkup(<CreatedAssetResult result={{title:source.title,digest,pbiSigned:true,publication:{status:'published'},marketPublication:legacyDelivery}} settings={{symbol:'ORIG',units:'1'}} busy={false} error="" username="artist" publicItem={{id:'profile:artist:imported-held'}} onRetryDelivery={()=>{}} onPublishMarket={()=>{}} onOpenAsset={()=>{}} onSave={()=>{}} onClose={()=>{}}/>);
 expect(html).toContain('Your Original is signed and public.');
 expect(html).not.toContain('pending');expect(html).not.toContain('awaiting');
 expect(html).not.toContain('Public delivery progress');expect(html).not.toContain('Finish publishing');
 expect(html).toContain('Open your asset');
});
