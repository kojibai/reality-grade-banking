import type {PublicMarketItem} from '../src/receiz/public-market';
import type {ViteDevServer} from 'vite';
export function publicOwnerThumbnails(items:PublicMarketItem[],server:Pick<ViteDevServer,'ssrLoadModule'>):Promise<PublicMarketItem[]>;
