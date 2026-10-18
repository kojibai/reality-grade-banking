import { afterEach, expect, it, vi } from 'vitest';
import { resolvePublicOriginalUrl, verifyPublicOriginalBytes } from '../src/receiz/public-original';
import { fetchPublicMarket } from '../src/receiz/public-market';
const verify = vi.hoisted(() => vi.fn());
vi.mock('../src/receiz/client', () => ({ loadReceiz: async () => ({ verifyReceizArtifact: verify }) }));
afterEach(() => vi.restoreAllMocks());
const retainedOriginal=(id:string)=>({ok:true,transport:{publicOriginals:[{id:'profile:artist:'+id,receizId:id,title:'Carried original',profileOriginal:{media:{originalDownloadSrc:`/api/profile/originals/download?receizId=${id}&kind=original`,originalDownloadSha256Hex:'a'.repeat(64),material:{sealedArtifactSha256Hex:'a'.repeat(64),originalArtifactSrc:'/api/proof-material/packages/'+'c'.repeat(64)+'/artifact'}}}}]}});
it('opens old cached coordinates promptly from the shipped exact locator and reuses only that digest',async()=>{
  const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async input=>{
    if(input==='/receiz-public-market.json'||input==='/api/bank/public-market/membership')return Response.json(retainedOriginal('shipped_carried_original'));
    throw Error('Unexpected public request');
  });
  const url='https://receiz.com/api/profile/originals/download?receizId=shipped_carried_original&kind=original';
  await expect(resolvePublicOriginalUrl(url,'a'.repeat(64))).resolves.toBe('https://receiz.com/api/proof-material/packages/'+'c'.repeat(64)+'/artifact');
  await expect(resolvePublicOriginalUrl(url,'a'.repeat(64))).resolves.toContain('/api/proof-material/packages/');
  expect(fetch.mock.calls.map(call=>call[0])).toEqual(['/receiz-public-market.json']);
  await expect(resolvePublicOriginalUrl(url,'b'.repeat(64))).rejects.toThrow('does not match');
  expect(fetch.mock.calls.map(call=>call[0])).toEqual(['/receiz-public-market.json','/api/bank/public-market/membership']);
});
it('reuses an exact material locator already retained by public catalog discovery',async()=>{
  const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>Response.json(retainedOriginal('discovered_carried_original')));
  await fetchPublicMarket();
  await expect(resolvePublicOriginalUrl('https://receiz.com/api/profile/originals/download?receizId=discovered_carried_original&kind=original','a'.repeat(64))).resolves.toBe('https://receiz.com/api/proof-material/packages/'+'c'.repeat(64)+'/artifact');
  expect(fetch.mock.calls.map(call=>call[0])).toEqual(['/api/bank/public-market/membership']);
});
it('does not report a matching original for a different enclosing digest', async () => {
  verify.mockResolvedValue({ status: 'verified-artifact', artifactDigest: { value: 'a'.repeat(64) } });
  await expect(verifyPublicOriginalBytes(new Uint8Array([1, 2]), 'b'.repeat(64))).rejects.toThrow('does not match');
});
it('rejects unsupported proof bytes without granting value or ownership', async () => {
  verify.mockResolvedValue({ status: 'unsupported' });
  await expect(verifyPublicOriginalBytes(new Uint8Array([1]), 'a'.repeat(64))).rejects.toThrow('No verified original');
});
it('passes the exact original bytes to the canonical SDK verifier', async () => {
  const bytes = new Uint8Array([1, 2, 3]);
  verify.mockResolvedValue({ status: 'verified-artifact', artifactDigest: { value: 'a'.repeat(64) } });
  await expect(verifyPublicOriginalBytes(bytes, 'a'.repeat(64))).resolves.toEqual({ digest: 'a'.repeat(64), canClaimOwnership: false, canCreditValue: false });
  expect(verify).toHaveBeenLastCalledWith(bytes);
});
