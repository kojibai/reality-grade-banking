import {expect,it,vi} from 'vitest';
import source from '../public/receiz-public-market.json';
import {parsePublicMarket} from '../src/receiz/public-market';
import {publicAssetManifest} from '../src/receiz/public-asset-manifest';
it('paints the verified carried receipt SHAs from the existing retained catalogue without a request',()=>{
 const request=vi.spyOn(globalThis,'fetch');try{
  const catalog=parsePublicMarket(source,source.snapshot),moments=catalog.items.filter(item=>item.mediaKind==='moment'&&item.proofManifestSource?.recordCardMediaSha256Hex);
  expect(moments.length).toBeGreaterThanOrEqual(107);
  for(const item of moments)expect(publicAssetManifest(item.proofManifestSource).find(row=>row.label==='Media SHA-256')?.value).toBe(item.proofManifestSource!.recordCardMediaSha256Hex);
  expect(request).not.toHaveBeenCalled();
 }finally{request.mockRestore();}
});
