import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import postcss from 'postcss';
import {moneyExamples} from '../src/content/money-examples.mjs';
import {transform} from 'esbuild';
const styles=['src/styles/tokens.css','src/styles/app.css','src/styles/features.css','src/components/kai-klok.css','src/features/messages/messages.css','src/features/ledger/ledger-inspector.css','src/features/ledger/ledger-value.css','src/features/vault/vault.css'];
export function scopeProductCss(css){
 const root=postcss.parse(css),names=new Map();root.walkAtRules(/keyframes$/,rule=>{names.set(rule.params,'product-example-'+rule.params);rule.params='product-example-'+rule.params;});
 root.walkDecls(/^animation/,decl=>{for(const [from,to] of names)decl.value=decl.value.replace(new RegExp('(?<![\\w-])'+from+'(?![\\w-])','g'),to);});
 root.walkAtRules('media',rule=>{if(/^(?:\(m(?:in|ax)-width:[^)]+\))(?:\s+and\s+\(m(?:in|ax)-width:[^)]+\))*$/.test(rule.params)){rule.name='container';rule.params='product-screen '+rule.params;}});
 root.walkRules(rule=>{if(rule.parent?.type==='atrule'&&/keyframes$/.test(rule.parent.name))return;rule.selectors=rule.selectors.map(s=>{if(s===':root'||s==='body'||s==='html')return '.product-screen';return '.product-screen '+s.replace(/^html[^ ]*\s*/, '');});});
 root.walkDecls(decl=>{decl.value=decl.value.replace(/100d?vh/g,'680px').replace(/100vw/g,'100cqw');});return root.toString();
}
if(process.argv[1]?.endsWith('build-product-previews.mjs')){
 const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
 try{
  const {ProductScreen,productScreenNames}=await server.ssrLoadModule('/src/presentation/ProductScreen.tsx');
  const {paymentQr,paymentQrPath}=await server.ssrLoadModule('/src/receiz/payment-qr.ts');
  const screens={};const now=Date.now;Date.now=()=>Date.parse('2026-10-20T12:00:00Z');
  try{for(const [name,example] of [...productScreenNames.map(name=>[name,undefined]),...Object.keys(moneyExamples).map(key=>['messages',key]),...['account','receive','record'].map(name=>[name,'action-followthrough'])]){let html=renderToStaticMarkup(createElement(ProductScreen,{screen:name,example}));
   // The enclosing illustration is inert. Keep every SVG/ARIA ID local, and
   // make its illustrative receiving QR resolve to a reserved invalid domain.
   html=html.replace(/<video\b[^>]*>[\s\S]*?<\/video>/g,'').replace(/<dialog /g,'<dialog open ').replace(/\bid="([^"]+)"/g,(_,id)=>`id="example-${name}-${id}"`).replace(/\b(aria-labelledby|aria-describedby|aria-controls)="([^"]+)"/g,(_,attr,ids)=>`${attr}="${ids.split(' ').map(id=>'example-'+name+'-'+id).join(' ')}"`).replace(/url\(#([^)]+)\)/g,(_,id)=>`url(#example-${name}-${id})`);
   if(name==='receive')html=html.replace(/(<svg[^>]*class="[^"]*payment-qr[^>]*>[\s\S]*?<path[^>]*d=")[^"]+/,`$1${paymentQrPath(paymentQr('https://example.invalid/'))}`);
   screens[example?name+':'+example:name]=html;
  }}finally{Date.now=now;}
  const css=(await transform(scopeProductCss((await Promise.all(styles.map(path=>readFile(path,'utf8')))).join('\n')),{loader:'css',minify:true,target:['safari16','chrome100']})).code;
  const output=JSON.stringify({notice:'Actual product components rendered as read-only examples. No proof, identity or financial authority.',screens,css})+'\n';
  const file='src/content/product-ui.generated.json';if(process.argv.includes('--check')){if(await readFile(file,'utf8')!==output)throw Error('PRODUCT_UI_PREVIEW_OUT_OF_DATE');}else await writeFile(file,output);
  console.log('Rendered 8 source-bound product screens and '+Object.keys(moneyExamples).length+' distinct read-only money conversations.');
 }finally{await server.close();}
}
