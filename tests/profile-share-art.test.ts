import {afterEach,expect,it,vi} from 'vitest';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {prepareConformanceEvidenceRenderer} from '../src/conformance/evidence-renderer';
import {Resvg} from '@resvg/resvg-js';
import {assetCardFont} from '../server/asset-share-art';
import sharp from 'sharp';
import {profileShareCardSvg,renderProfileImage,profileCardFont} from '../server/profile-share-art';
import {parsePublicProfile} from '../src/receiz/public-profile';
import {profileFixture} from './fixtures/public-profile';
const profile=()=>parsePublicProfile(profileFixture(),'alexmorgan');
const inline=(color:string)=>'data:image/png;base64,'+Buffer.from(new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="${color}"/></svg>`).render().asPng()).toString('base64');
afterEach(()=>vi.unstubAllGlobals());
it('uses carried banner and portrait bytes directly with zero requests and emits a self-contained PNG',async()=>{
 const source=profile();source.bannerUrl=inline('#123456');source.avatarUrl=inline('#aabbcc');const fetch=vi.fn(()=>{throw Error('NO_EXTERNAL_READ');});vi.stubGlobal('fetch',fetch);
 const before=JSON.stringify(source),png=await renderProfileImage(source),meta=await sharp(png).metadata();expect(meta).toMatchObject({format:'png',width:1730,height:909});expect(JSON.stringify(source)).toBe(before);expect(fetch).not.toHaveBeenCalled();
 const {data}=await sharp(png).removeAlpha().raw().toBuffer({resolveWithObject:true});expect([...data.subarray((100*1730+100)*3,(100*1730+100)*3+3)]).toEqual([18,52,86]);
});
it('reuses carried deterministic SVG art without an external resource read',async()=>{
 const source=profile();source.bannerUrl='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300"><rect width="800" height="300" fill="#254bd8"/></svg>');source.avatarUrl=null;const fetch=vi.fn();vi.stubGlobal('fetch',fetch);expect((await sharp(await renderProfileImage(source)).metadata()).width).toBe(1730);expect(fetch).not.toHaveBeenCalled();
});
it('never fetches a URL embedded in an SVG or invents badges/stats/private identifiers',async()=>{
 const source=profile();source.bannerUrl='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300"><image href="https://private.invalid/a.png" width="800" height="300"/></svg>');source.avatarUrl=null;const fetch=vi.fn();vi.stubGlobal('fetch',fetch);await renderProfileImage(source);expect(fetch).not.toHaveBeenCalled();
 const svg=profileShareCardSvg(source);for(const forbidden of ['account-1','Verified','Verified creator','120 views','15 plays','aaaaaaaaaaaa'])expect(svg.includes(forbidden)).toBe(false);
});
it.each(['', 'A very long personal name '.repeat(30), 'Élodie Κοσμάς Мир <script>&'])('bounds and escapes the exact display name without throwing: %s',name=>{
 const source={...profile(),displayName:name,avatarUrl:null,bannerUrl:null};const svg=profileShareCardSvg(source);expect(svg.includes('<script>')).toBe(false);const raster=new Resvg(svg).render().asPng();expect(raster.length).toBeGreaterThan(1000);expect(svg).toContain('@alexmorgan');
});
it('keeps unavailable custom artwork optional within the dedicated image request',async()=>{
 const source=profile();source.bannerUrl='https://receiz.com/missing-banner.png';source.avatarUrl='https://receiz.com/missing-avatar.png';const fetch=vi.fn(async()=>new Response(null,{status:404}));vi.stubGlobal('fetch',fetch);const png=await renderProfileImage(source);expect((await sharp(png).metadata()).width).toBe(1730);expect(fetch).toHaveBeenCalledTimes(2);for(const [url]of fetch.mock.calls as unknown as [string][])expect(new URL(url).origin+new URL(url).pathname).toBe('https://receiz.com/api/media/image');
});

it('fits a genuine88-wide-glyph bio within its actual pixel slot',()=>{
 const source={...profile(),bio:'W'.repeat(88),avatarUrl:null,bannerUrl:null},svg=profileShareCardSvg(source),match=/<text x="346" y="751"[^>]*>([^<]*)<\/text>/.exec(svg);expect(match).not.toBeNull();expect(match![1].endsWith('…')).toBe(true);expect(match![1].length).toBeLessThan(88);
});

it('renders Han, Japanese and Korean through the exact profile-only fallback and measures the same glyphs',()=>{
 for(const label of ['東京','漢字','한국어']){
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="200"><text y="120" font-family="Inter" font-size="80">${label}</text></svg>`,text=new Resvg(svg,{font:profileCardFont}),withoutFallback=new Resvg(svg,{font:assetCardFont});expect(text.getBBox()!.width).toBeGreaterThan(70);expect(Buffer.from(text.render().asPng()).equals(Buffer.from(withoutFallback.render().asPng()))).toBe(false);
 }
 const source={...profile(),displayName:'東京 漢字 한국어',bio:'漢'.repeat(88),avatarUrl:null,bannerUrl:null},svg=profileShareCardSvg(source),bio=/<text x="346" y="751"[^>]*>([^<]*)<\/text>/.exec(svg)![1];
 const measured=new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="1730" height="200"><text y="120" font-family="Inter" font-size="27" font-weight="600" letter-spacing="-.945">${bio}</text></svg>`,{font:profileCardFont});expect(measured.getBBox()!.width).toBeLessThanOrEqual(1260);expect(bio.endsWith('…')).toBe(true);expect(svg.includes('東京 漢字 한국어')).toBe(true);
});

it('omits file-backed owner SVG resources before any native renderer can read them',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'bank-profile-og-marker-'));try{
  const marker=join(folder,'owned-marker.png');await writeFile(marker,new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#ff00ff"/></svg>').render().asPng());
  const source={...profile(),avatarUrl:null,bannerUrl:null},baseline=await renderProfileImage(source),fetch=vi.fn(()=>{throw Error('UNEXPECTED_EXTERNAL_RESOURCE_READ');});vi.stubGlobal('fetch',fetch);
  for(const href of [pathToFileURL(marker).href,marker,'http://127.0.0.1:1/owned-marker.png']){
   const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300"><image href="${href}" width="800" height="300"/></svg>`;
   expect(Buffer.from(await renderProfileImage({...source,bannerUrl:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)})).equals(Buffer.from(baseline))).toBe(true);
  }expect(fetch).not.toHaveBeenCalled();
 }finally{await rm(folder,{recursive:true,force:true});}
});
it('keeps exact embedded raster images inside an owner SVG available without network or files',async()=>{
 const source={...profile(),avatarUrl:null,bannerUrl:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300"><image href="${inline('#ff00ff')}" width="800" height="300" preserveAspectRatio="none"/></svg>`)},fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 const {data}=await sharp(await renderProfileImage(source)).removeAlpha().raw().toBuffer({resolveWithObject:true});expect([...data.subarray((100*1730+100)*3,(100*1730+100)*3+3)]).toEqual([255,0,255]);expect(fetch).not.toHaveBeenCalled();
});
it('refuses extreme source and width-fit dimensions before any SVG pixel allocation',async()=>{
 const {engine}=await prepareConformanceEvidenceRenderer(),render=vi.spyOn((engine.Resvg as any).prototype,'render').mockImplementation(()=>{throw Error('CONTROLLED_RENDER_MUST_NOT_BEGIN');});
 try{for(const height of [100000,4096]){
  const source={...profile(),avatarUrl:null,bannerUrl:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1" height="${height}"><rect width="1" height="${height}" fill="#ff00ff"/></svg>`)};
  await renderProfileImage(source);
 }expect(render).not.toHaveBeenCalled();}finally{render.mockRestore();}
});
