import {resolve} from 'node:path';
import {Resvg} from '@resvg/resvg-js';
import {shareCardSvg} from '../scripts/social/share-card-art.mjs';
import type {PublicMarketItem} from '../src/receiz/public-market';
import {marketContentLabel} from '../src/receiz/market-categories';
export async function renderAssetImage(item:PublicMarketItem):Promise<Uint8Array>{
 const title=item.title.replace(/[\x00-\x1f\x7f]/g,' ').trim(),words=title.split(/\s+/),lines=['',''];
 let split=0;while(split<words.length&&(lines[0]+' '+words[split]).trim().length<=28){lines[0]+=(lines[0]?' ':'')+words[split++];}
 if(!lines[0]){lines[0]=title.slice(0,27)+'…';lines[1]=marketContentLabel(item);}else{lines[1]=words.slice(split).join(' ')||marketContentLabel(item);if(lines[1].length>33)lines[1]=lines[1].slice(0,32).trimEnd()+'…';}
 const caption=['Public original',marketContentLabel(item),...(item.ownerUsername?['@'+item.ownerUsername]:[])].join(' · ').slice(0,70),sizes=lines.map(line=>Math.min(108,Math.max(35,Math.floor(1450/Math.max(1,line.length)))));
 return new Resvg(shareCardSvg({lines,caption,motif:item.category==='sports'?'badge':'cube',sizes}),{font:{fontFiles:['Inter-SemiBold.ttf','Inter-Regular.ttf'].map(name=>resolve('scripts/social/fonts',name)),loadSystemFonts:false}}).render().asPng();
}
