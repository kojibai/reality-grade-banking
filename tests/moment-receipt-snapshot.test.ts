import {expect,it,vi} from 'vitest';
import source from '../public/receiz-public-market.json';
import {parsePublicMarket} from '../src/receiz/public-market';
import {publicAssetManifest} from '../src/receiz/public-asset-manifest';
import {reuseShippedProfileShareHistory} from '../server/profile-share-history';
import {parsePublicProfile} from '../src/receiz/public-profile';
import {profileFixture} from './fixtures/public-profile';
it('paints the verified carried receipt SHAs from the existing retained catalogue without a request',()=>{
 const request=vi.spyOn(globalThis,'fetch');try{
  const catalog=parsePublicMarket(source,source.snapshot),moments=catalog.items.filter(item=>item.mediaKind==='moment'&&item.proofManifestSource?.recordCardMediaSha256Hex);
  expect(moments.length).toBeGreaterThanOrEqual(108);
  expect(catalog.items.filter(item=>item.mediaKind==='moment'&&!item.proofManifestSource?.recordCardMediaSha256Hex).every(item=>!item.hasPbiSignature&&!item.proofManifestSource?.pbiReceiptHash)).toBe(true);
  const recovered=catalog.items.find(item=>item.assetId==='113fc127-4a84-44f9-8eee-d6317aa96f6c');
  expect(recovered?.proofManifestSource?.recordCardMediaSha256Hex).toBe('F8CC98587EEE975067031363BFA7DD49C57FAFA3D9CF23885478E0B76CB2D51E');
  const aligned=catalog.items.find(item=>item.assetId==='afd3d835-4765-40a7-b2c9-f0b38ee29e4b');
  expect(aligned?.proofManifestSource?.verifyPath).toBe('/v/20260315_1728/9595B144/11131738?a=3a6b7b1f');
  expect(aligned?.proofManifestSource?.pbiReceiptHash).toBeNull();
  expect(aligned?.proofManifestSource?.recordCardMediaSha256Hex).toBeNull();
  for(const item of moments)expect(publicAssetManifest(item.proofManifestSource).find(row=>row.label==='Media SHA-256')?.value).toBe(item.proofManifestSource!.recordCardMediaSha256Hex);
  expect(request).not.toHaveBeenCalled();
 }finally{request.mockRestore();}
});
it('carries the known Moment basis in the existing profile partition when the live collection omits it',async()=>{
 const catalog=parsePublicMarket(source,source.snapshot),known=catalog.items.find(item=>item.assetId==='cd5a74fa-bdc5-45b8-8e4b-8aa7fe4df420')!;
 const current={...known,proofManifestSource:{...known.proofManifestSource!,recordCardMediaSha256Hex:null}},profile={...parsePublicProfile(profileFixture(),'alexmorgan'),username:known.ownerUsername!,items:[current]};
 const fetch=vi.spyOn(globalThis,'fetch');try{const result=await reuseShippedProfileShareHistory(profile);expect(publicAssetManifest(result.items[0].proofManifestSource).find(row=>row.label==='Media SHA-256')?.value).toBe('F167D2B6ECD5D0A5C69B5BE21048A0CC7F020C360EEB6C2D4EC1D8F49688D5DB');expect(fetch).not.toHaveBeenCalled();}finally{fetch.mockRestore();}
});
