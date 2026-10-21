import {expect,it} from 'vitest';
import {publicAssetTitle} from '../src/receiz/asset-title';
import {parsePublicMarket} from '../src/receiz/public-market';
import {publicMarketRecord} from '../src/receiz/public-network';
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
it('ignores invalid or oversized title fields and never treats a filename as an authored title',()=>{
 expect(publicAssetTitle({title:'Caption',profileOriginal:{media:{kind:'audio',name:'track-003.mp3',audioDistribution:{releaseTitle:'x'.repeat(4097)}}}})).toBe('Caption');
 expect(publicAssetTitle({title:'Caption',profileOriginal:{longForm:{title:{text:'not a title'}}}})).toBe('Caption');
});
