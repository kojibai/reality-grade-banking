import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {APP_APPEARANCE_CHANGE,APP_APPEARANCE_COLORS,APP_APPEARANCE_KEY,installAppAppearance} from '../src/core/app-appearance.mjs';

const cssUrl=new URL('../src/styles/appearance.css',import.meta.url);
const conformanceEntry=fileURLToPath(new URL('../conformance/index.html',import.meta.url));
const conformanceCssUrl=new URL('../src/styles/conformance-appearance.css',import.meta.url);

function appearanceCss(url){
 const dark=readFileSync(url,'utf8');
 const system=dark.replaceAll(':root[data-bank-appearance="dark"]',':root:not([data-bank-appearance])');
 return dark+'\n@media(prefers-color-scheme:dark){'+system+'}';
}
const entries=new Set([
 'index.html','explore/index.html','discover/index.html','feed/index.html','ledger/index.html',
 'receipt/index.html','pay/checkout.html','invoice/view.html','vault/index.html','verify/index.html',
 'conformance/index.html','booking/index.html','meet/room.html','vote/index.html','vote/record.html',
].map(path=>fileURLToPath(new URL('../'+path,import.meta.url))));

export function bankAppearanceHead(){
 const css=appearanceCss(cssUrl);
 const parameters=[APP_APPEARANCE_KEY,APP_APPEARANCE_CHANGE,APP_APPEARANCE_COLORS].map(value=>JSON.stringify(value)).join(',');
 const script='('+installAppAppearance.toString()+')(window,'+parameters+');';
 return '<style id="bankeiz-appearance">'+css+'</style><script>'+script+'</script>';
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
