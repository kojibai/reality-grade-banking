import type{ViteDevServer}from'vite';
export const bookingGuidePage: {bookingGuide:boolean;slug:string;path:string;title:string;description:string;lines:string[];caption:string;intro:string;sections:unknown[]};
export function inertBookingPreview(html:string):string;
export function renderBookingExamples(server:ViteDevServer):Promise<{screens:Record<string,string>;css:string}>;
export function bookingGuideContent(preview:{screens:Record<string,string>;css:string}):string;
