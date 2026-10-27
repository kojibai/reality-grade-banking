import {expect,it,vi} from 'vitest';
import source from '../public/receiz-public-market.json';
import {parsePublicMarket} from '../src/receiz/public-market';
import {publicAssetManifest} from '../src/receiz/public-asset-manifest';
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
