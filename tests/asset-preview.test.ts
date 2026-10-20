import {expect,it,vi} from 'vitest';
import {handleAssetPreview} from '../server/asset-preview';
import {assetPagePath,assetPageId} from '../src/receiz/public-asset-page';
import {parsePublicMarket} from '../src/receiz/public-market';
const item=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:source',receizId:'source',title:'A moment $& <script>one</script>',summary:'The complete original.',ownerUsername:'artist',profileOriginal:{media:{kind:'image'}}}]}}).items[0];
const html='<html><head><title>Explore</title><meta name="description" content="Explore"><link rel="canonical" href="https://bankeiz.com/explore/"></head><body><div id="public-explore-root" data-public-runtime="explore"><main>Explore fallback</main></div><script id="receiz-navigation" type="application/json">{"pages":{}}</script></body></html>';
const deps=()=>({page:vi.fn(async()=>html),item:vi.fn(async()=>item),image:vi.fn(async()=>new Uint8Array([1,2]))});
it('serves an asset-specific original, canonical and complete public seed without account or upstream work',async()=>{
 const f=deps(),response=await handleAssetPreview(new Request('https://bankeiz.com'+assetPagePath(item.id)),f),body=await response.text();
 expect(response.status).toBe(200);expect(body).toContain('A moment $&amp; &lt;script&gt;one&lt;/script&gt;');expect(body).not.toContain('Explore fallback');
 expect(body).toContain('id="public-asset-seed"');expect(body).toContain('og.png');expect(body).toContain('projection-only');expect(f.image).not.toHaveBeenCalled();
 const seed=JSON.parse(body.match(/id="public-asset-seed" type="application\/json">([^<]+)<\/script>/)![1]);expect(seed.id).toBe(item.id);expect(seed.canTrade).toBe(false);
});
it.each(['','og.png'])('handles HEAD %s without source reads, font loading or image rendering',async suffix=>{
 const f=deps(),response=await handleAssetPreview(new Request('https://bankeiz.com'+assetPagePath(item.id)+suffix,{method:'HEAD'}),f);
 expect(response.status).toBe(200);expect(await response.text()).toBe('');expect(f.page).not.toHaveBeenCalled();expect(f.item).not.toHaveBeenCalled();expect(f.image).not.toHaveBeenCalled();
});
it('renders sharing artwork only on its explicit image route',async()=>{
 const f=deps(),response=await handleAssetPreview(new Request('https://bankeiz.com'+assetPagePath(item.id)+'og.png'),f);
 expect(response.headers.get('content-type')).toBe('image/png');expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1,2]));expect(f.page).not.toHaveBeenCalled();
});
it('does not assert an absent retained listing exists and refuses malformed or extra arguments',async()=>{
 const f=deps();f.item.mockResolvedValue(null as never);const response=await handleAssetPreview(new Request('https://bankeiz.com'+assetPagePath('new:public')),f);
 expect(await response.text()).toContain('noindex,follow');
 for(const url of ['https://bankeiz.com/api/asset?asset=a&asset=b','https://bankeiz.com/api/asset?asset=a&image=2','https://bankeiz.com/asset/%00/'])expect((await handleAssetPreview(new Request(url),f)).status).toBe(400);
});
it('round-trips an opaque source ID without treating it as a filesystem path',()=>{
 for(const id of ['sports:rsc_0123456789abcdef','public:name:a/b','source:?&%<>'])expect(assetPageId(assetPagePath(id))).toBe(id);
 expect(assetPageId('/asset/%/')).toBeNull();expect(assetPageId('/asset/source/og.png')).toBeNull();
});
it('resolves newly published public assets once per source window, without quotes or originals',async()=>{
 const {createLiveAssetResolver}=await import('../server/asset-preview');
 const read=vi.fn(async()=>({ok:true,transport:{publicOriginals:[{id:'profile:new:publication',receizId:'publication',title:'Newly published',visibility:'public'}]}}));
 const resolve=createLiveAssetResolver(read);
 const rows=await Promise.all([resolve('profile:new:publication'),resolve('profile:new:publication'),resolve('profile:absent:publication')]);
 expect(rows[0]?.title).toBe('Newly published');expect(rows[1]).toEqual(rows[0]);expect(rows[2]).toBeNull();expect(read.mock.calls).toEqual([['membership']]);
});
