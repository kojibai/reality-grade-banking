import {Resvg} from '@resvg/resvg-js';
import {assetCardFont, assetShareCardSvg} from './asset-share-art';
import type {PublicMarketItem} from '../src/receiz/public-market';
export async function renderAssetImage(item:PublicMarketItem):Promise<Uint8Array>{
 return new Resvg(assetShareCardSvg(item),{font:assetCardFont}).render().asPng();
}
