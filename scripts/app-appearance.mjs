import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {APP_APPEARANCE_CHANGE,APP_APPEARANCE_COLORS,APP_APPEARANCE_KEY,installAppAppearance} from '../src/core/app-appearance.mjs';

const cssUrl=new URL('../src/styles/appearance.css',import.meta.url);
const entries=new Set([
 'index.html','explore/index.html','discover/index.html','feed/index.html','ledger/index.html',
 'receipt/index.html','pay/checkout.html','invoice/view.html','vault/index.html','verify/index.html',
 'conformance/index.html','booking/index.html','meet/room.html','vote/index.html','vote/record.html',
].map(path=>fileURLToPath(new URL('../'+path,import.meta.url))));

export function bankAppearanceHead(){
 const dark=readFileSync(cssUrl,'utf8');
 const system=dark.replaceAll(':root[data-bank-appearance="dark"]',':root:not([data-bank-appearance])');
 const css=dark+'\n@media(prefers-color-scheme:dark){'+system+'}';
 const parameters=[APP_APPEARANCE_KEY,APP_APPEARANCE_CHANGE,APP_APPEARANCE_COLORS].map(value=>JSON.stringify(value)).join(',');
 const script='('+installAppAppearance.toString()+')(window,'+parameters+');';
 return '<style id="bankeiz-appearance">'+css+'</style><script>'+script+'</script>';
}

export function appAppearancePlugin(){
 return {
  name:'bankeiz-app-appearance',
  transformIndexHtml(html,context){
   return entries.has(context.filename)?html.replace('</head>',bankAppearanceHead()+'</head>'):html;
  },
 };
}
