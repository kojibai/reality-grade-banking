// @vitest-environment happy-dom
import {act} from 'react';import {createRoot} from 'react-dom/client';import {afterEach,expect,it,vi} from 'vitest';
import {PublicObjectArtwork} from '../src/features/market/PublicObjectRow';
import {ProofMedia} from '../src/features/media/ProofMedia';
import {parsePublicMarket,safeReceizArtworkUrl} from '../src/receiz/public-market';
import {retainAssetPublicationAdmission,mergeAdmittedPublicAssets,forgetAssetPublicationAdmissions} from '../src/receiz/asset-publication-adoption';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>{forgetAssetPublicationAdmissions();vi.restoreAllMocks();});
it('uses the exact locally held artwork through public adoption without weakening remote blob URL rejection or fetching media',async()=>{
 vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:local-artwork');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 const fetcher=vi.spyOn(globalThis,'fetch');
 const reference={schema:'receiz.imported-proof-source.v1',artifactSha256:'a'.repeat(64),byteLength:2,filename:'asset.receizbundle',mimeType:'application/vnd.receiz.bundle+json',bytes:{kind:'bytes',sha256:'b'.repeat(64),byteLength:2,contentByteLength:2,height:0}};
 const url='/api/profile/showcase/imported-source?'+new URLSearchParams({reference:JSON.stringify(reference)});
 retainAssetPublicationAdmission({username:'artist',original:{id:'imported-new',assetTitle:'A work',claim:'A work',pulse:'14700000',showOnProfile:true,importedSource:{reference},media:{kind:'image',src:url+'&payload=1',originalDownloadSrc:url,originalDownloadSha256Hex:reference.artifactSha256}},sourceReference:reference,firstPaint:null},
  {identityDigest:'d'.repeat(64),accountUid:'owner',artwork:new Blob(['already held image'],{type:'image/png'})});
 const item=mergeAdmittedPublicAssets(parsePublicMarket({ok:true,transport:{publicOriginals:[]}})).items[0];
 expect(safeReceizArtworkUrl('blob:local-artwork')).toBeNull();
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<PublicObjectArtwork item={item} artworkUrl={item.artworkUrl}/>));
  expect(host.querySelector('img')?.getAttribute('src')).toBe('blob:local-artwork');
  await act(async()=>root.render(<PublicObjectArtwork item={{...item,ownerUsername:'someone-else'}} artworkUrl={item.artworkUrl}/>));
  expect(host.querySelector('img')).toBeNull();expect(fetcher).not.toHaveBeenCalled();
  await act(async()=>root.render(<ProofMedia title={item.title} source={{kind:'public',url:item.originalUrl!,digest:item.originalDigest!}} publicImageUrl={url+'&payload=1'} autoOpen/>));
  expect(host.querySelector('img')?.getAttribute('src')).toBe('blob:local-artwork');expect(fetcher).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});
