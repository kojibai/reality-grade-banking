import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {transformSync} from 'esbuild';
import {APP_APPEARANCE_CHANGE,APP_APPEARANCE_COLORS,APP_APPEARANCE_KEY,installAppAppearance,setAppAppearance} from '../src/core/app-appearance.mjs';

const cssUrl=new URL('../src/styles/appearance.css',import.meta.url);
const conformanceEntry=fileURLToPath(new URL('../conformance/index.html',import.meta.url));
const conformanceCssUrl=new URL('../src/styles/conformance-appearance.css',import.meta.url);
const appearanceStyles=new Map();
const parameters=[APP_APPEARANCE_KEY,APP_APPEARANCE_CHANGE,APP_APPEARANCE_COLORS].map(value=>JSON.stringify(value)).join(',');
const script=transformSync('('+installAppAppearance.toString()+')(window,'+parameters+','+setAppAppearance.toString()+');',{minify:true,target:'es2022'}).code.trim();

function appearanceCss(url){
 const dark=readFileSync(url,'utf8');
 const cached=appearanceStyles.get(url);
 if(cached?.source===dark)return cached.css;
 const system=dark.replaceAll(':root[data-bank-appearance="dark"]',':root:not([data-bank-appearance])');
 const css=transformSync(dark+'\n@media(prefers-color-scheme:dark){'+system+'}',{loader:'css',minify:true,target:['safari16','chrome100']}).code.trim();
 appearanceStyles.set(url,{source:dark,css});
 return css;
}
const entries=new Set([
 'index.html','explore/index.html','discover/index.html','feed/index.html','ledger/index.html',
 'receipt/index.html','pay/checkout.html','invoice/view.html','vault/index.html','verify/index.html',
 'conformance/index.html','booking/index.html','meet/room.html','vote/index.html','vote/record.html',
].map(path=>fileURLToPath(new URL('../'+path,import.meta.url))));

export function bankAppearanceHead(){
 const css=appearanceCss(cssUrl);
 return '<style id="bankeiz-appearance">'+css+'</style><script>'+script+'</script>';
}

/** Attach the same local appearance before the first stylesheet can paint. */
export function withAppAppearance(html){
 const theme=/<meta name="theme-color"[^>]*>/;
 if(theme.test(html))return html.replace(theme,tag=>tag+bankAppearanceHead());
 return html.replace('<head>',()=>'<head><meta name="theme-color" content="'+APP_APPEARANCE_COLORS.light+'">'+bankAppearanceHead());
}

export function appAppearancePlugin(){
 return {
  name:'bankeiz-app-appearance',
  transformIndexHtml(html,context){
   if(!entries.has(context.filename))return html;
   // The retained page router installs this exact page-owned style in its head.
   const pageStyle=context.filename===conformanceEntry
    ? '<style data-public-page-style="conformance-appearance">'+appearanceCss(conformanceCssUrl)+'</style>'
    : '';
   return html.replace('</head>',bankAppearanceHead()+pageStyle+'</head>');
  },
 };
}
