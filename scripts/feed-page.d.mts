import type {Plugin,ViteDevServer} from 'vite';
export function feedPageDevPlugin():Plugin;
export function renderFeedState(server:ViteDevServer):Promise<{seed:unknown[];profileNames:readonly string[];content:string;navigationContent:string}>;
export function applyFeedState(html:string,state:{seed:unknown[];content:string}):string;
export function feedSeedScript(seed:unknown[]):string;
