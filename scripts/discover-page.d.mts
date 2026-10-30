import type {Plugin,ViteDevServer} from 'vite';
export function discoveryPageDevPlugin():Plugin;
export function renderDiscoveryState(server:ViteDevServer):Promise<{seed:unknown[];content:string;navigationContent:string}>;
export function applyDiscoveryState(html:string,state:{seed:unknown[];content:string}):string;
export function discoverySeedScript(seed:unknown[]):string;
