import {expect,it} from 'vitest';
import {publicAssetTitle} from '../src/receiz/asset-title';
import {parsePublicMarket} from '../src/receiz/public-market';
import {publicMarketRecord} from '../src/receiz/public-network';
import {publicAssetTitles} from '../src/content/public-asset-titles';
import {assetShareCardSvg} from '../server/asset-share-art';
it.each([
 [{media:{kind:'audio',audioDistribution:{releaseTitle:'Song title'}}},'Song title'],
 [{media:{kind:'epub',epubMetadata:{title:'Book title'}}},'Book title'],
 [{longForm:{title:'Essay title',text:'Full work'}},'Essay title'],
 [{media:{objectProof:{title:'Object title'}}},'Object title'],
 [{title:'Authored title'},'Authored title'],
 [{media:{kind:'audio',audioDistribution:{releaseTitle:'   '}}},'Caption fallback'],
])('shares the authored title rule across market, standalone and Ledger without moving the caption', (profile,title)=>{
 const source={id:'profile:author:one',receizId:'one',title:'Caption fallback',summary:'Keep this caption.',profileOriginal:profile};
 expect(publicAssetTitle(source)).toBe(title);
 const item=parsePublicMarket({ok:true,transport:{publicOriginals:[source]}}).items[0];
 expect(item.title).toBe(title);expect(item.summary).toBe('Keep this caption.');
 expect(publicMarketRecord(item)).toMatchObject({title,detail:'Keep this caption.'});
});

it('corrects a legacy cached caption before first render and uses the same authored title on the sharing image, without applying it to different evidence',()=>{
 const [id,[assetId,digest,title]]=Object.entries(publicAssetTitles)[0];
 const source={id,receizId:assetId,title:'An old caption that must not flash.',summary:'The complete caption stays here.',profileOriginal:{media:{originalDownloadSha256Hex:digest}}};
 const item=parsePublicMarket({ok:true,transport:{publicOriginals:[source]}}).items[0];
 expect(item.title).toBe(title);expect(item.summary).toBe(source.summary);
 const image=assetShareCardSvg(item);expect(image).not.toContain(source.title);expect(image).toContain(title.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'));
 expect(publicAssetTitle({...source,profileOriginal:{media:{originalDownloadSha256Hex:'0'.repeat(64)}}})).toBe(source.title);
 expect(publicAssetTitle({...source,profileOriginal:{assetTitle:'The current authored title',media:source.profileOriginal.media}})).toBe('The current authored title');
});
it('ignores invalid or oversized title fields and never treats a filename as an authored title',()=>{
 expect(publicAssetTitle({title:'Caption',profileOriginal:{media:{kind:'audio',name:'track-003.mp3',audioDistribution:{releaseTitle:'x'.repeat(4097)}}}})).toBe('Caption');
 expect(publicAssetTitle({title:'Caption',profileOriginal:{longForm:{title:{text:'not a title'}}}})).toBe('Caption');
});
it('uses the first caption sentence as a fallback headline while preserving the complete caption',()=>{
 const caption='This happened. The complete caption continues.\nAnd remains here.',source={id:'profile:writer:moment',receizId:'moment',title:caption,summary:caption,profileOriginal:{media:null}};
 const item=parsePublicMarket({ok:true,transport:{publicOriginals:[source]}}).items[0];expect(item.title).toBe('This happened.');expect(item.summary).toBe(caption);expect(publicAssetTitle({...source,profileOriginal:{assetTitle:'The authored title. In full.'}})).toBe('The authored title. In full.');expect(publicAssetTitle({...source,title:'First line\nSecond line'})).toBe('First line');
});
