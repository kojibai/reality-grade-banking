import type {ViteDevServer} from 'vite';
export const emailGuidePage:{emailGuide:boolean;slug:string;path:string;title:string;description:string;lines:string[];caption:string;intro:string;sections:unknown[]};
export function renderEmailExamples(server:ViteDevServer):Promise<{screens:Record<string,string>;css:string}>;
export function emailGuideContent(preview:{screens:Record<string,string>;css:string}):string;
