import {Resvg} from '@resvg/resvg-js';
import {assetCardFont, assetShareCardSvg} from './asset-share-art';
import {assetShareCover} from './asset-share-cover';
import type {PublicMarketItem} from '../src/receiz/public-market';
export async function renderAssetImage(item:PublicMarketItem):Promise<Uint8Array>{
 const cover=await assetShareCover(item.artworkUrl);
 return new Resvg(assetShareCardSvg(item,cover),{font:assetCardFont}).render().asPng();
}
