import type {PublicMarketItem} from './public-market';
/** Content navigation over the already-held Receiz showcase projection. The
 * internal proof/sports valuation families remain separate from these labels. */
export const MARKET_CONTENT_FILTERS=['All','Music','Images','Videos','Books','Essays','Moments','Collectibles','Documents']as const;
export type MarketContentFilter=typeof MARKET_CONTENT_FILTERS[number];
export function marketContentLabel(item:PublicMarketItem):string {
 if(item.category==='sports')return 'Collectible';
 switch(item.mediaKind){
  case'audio':return 'Music';case'image':return 'Image';case'video':return 'Video';case'epub':return 'Book';case'pdf':case'file':return 'Document';
  default:return item.hasLongForm?'Essay':item.mediaKind==='moment'?'Moment':'Sealed original';
 }
}
export function matchesMarketContent(item:PublicMarketItem,filter:MarketContentFilter):boolean {
 if(filter==='All')return true;
 if(item.category==='sports')return filter==='Collectibles';
 switch(filter){
  case'Music':return item.mediaKind==='audio';case'Images':return item.mediaKind==='image';case'Videos':return item.mediaKind==='video';case'Books':return item.mediaKind==='epub';
  case'Essays':return item.hasLongForm===true&&item.mediaKind!=='epub';
  case'Moments':return item.mediaKind==='moment'&&!item.hasLongForm;
  case'Documents':return item.mediaKind==='pdf'||item.mediaKind==='file';
  default:return false;
 }
}
