import type {PublicMarketItem} from '../src/receiz/public-market';
import type {ViteDevServer} from 'vite';
export function publicOwnerThumbnails(items:PublicMarketItem[],server:Pick<ViteDevServer,'ssrLoadModule'>):Promise<PublicMarketItem[]>;

import type {PublicProfileHead} from '../src/receiz/public-profile-header';
export function publicProfileHeadThumbnails<T extends PublicProfileHead>(heads:readonly T[],server:Pick<ViteDevServer,'ssrLoadModule'>):Promise<Array<T&{avatarFallback?:string}>>;
