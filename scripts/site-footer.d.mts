import type {siteFooter} from '../branding/site-footer.mjs';
type FooterOptions=Parameters<typeof siteFooter>[1];
export function siteFooterHtml(path?:string,options?:FooterOptions):string;
export function withPageFooter(html:string,path:string,options?:FooterOptions):string;
