import type {Plugin,ViteDevServer} from 'vite';
import type {PublicMarketItem} from '../src/receiz/public-market';
import type {DiscoveryProfileHead} from '../src/public-discover/discovery-index';
export function discoveryPageDevPlugin():Plugin;
export function renderDiscoveryState(server:Pick<ViteDevServer,'ssrLoadModule'>):Promise<{seed:PublicMarketItem[];seedHeads:DiscoveryProfileHead[];content:string;navigationContent:string}>;
export function applyDiscoveryState(html:string,state:{seed:unknown[];seedHeads?:DiscoveryProfileHead[];content:string}):string;
export function discoverySeedScript(seed:unknown[]):string;
