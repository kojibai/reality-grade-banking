import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {productPreviewCss} from './product-walkthrough.mjs';
import {originalsQualificationContent} from './originals-qualification-template.mjs';
export async function writeOriginalsQualificationAssets(directory='dist'){
 const outdir=resolve('originals-explainer-output');
 const result=await build({entryPoints:[resolve('src/qualification/learn.ts')],outdir,entryNames:'originals-qualification-main-[hash]',chunkNames:'originals-qualification-chunk-[hash]',bundle:true,splitting:true,write:false,minify:true,format:'esm',target:'es2022',platform:'browser',legalComments:'none'});
 const modules=result.outputFiles.map(file=>({name:file.path.slice(outdir.length+1),bytes:file.contents}));
 const entry=modules.find(file=>file.name.startsWith('originals-qualification-main-'));if(!entry)throw Error('ORIGINALS_EXPLAINER_ENTRY_MISSING');
 const js=`(()=>{let loaded;const boot=()=>{if(document.querySelector('[data-originals-example]'))loaded??=import('/learn/${entry.name}').catch(()=>{loaded=undefined;});};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();window.addEventListener('receiz-learn:page',boot);})();`;
 const css=await readFile('src/qualification/learn.css','utf8');
 const hash=text=>createHash('sha256').update(text).digest('hex').slice(0,12);
 const jsUrl=`/learn/originals-qualification.js?v=${hash(js)}`,cssUrl=`/learn/originals-qualification.css?v=${hash(css)}`;
 await mkdir(resolve(directory,'learn'),{recursive:true});await writeFile(resolve(directory,'learn/originals-qualification.js'),js);await writeFile(resolve(directory,'learn/originals-qualification.css'),css);
 await Promise.all(modules.map(file=>writeFile(resolve(directory,'learn',file.name),file.bytes)));
 return {head:`<link rel="stylesheet" href="${cssUrl}"><script src="${jsUrl}" type="module"></script>`};
}
export function originalsQualificationDevPlugin(){return {name:'bankeiz-originals-qualification',configureServer(server){server.middlewares.use(async(req,res,next)=>{
 if(req.url?.split('?')[0].replace(/\/$/,'')!=='/learn/earn-from-originals')return next();
 try{const walkthroughCss=productPreviewCss+await readFile('public/learn/product-walkthrough.css','utf8');const html=`<!doctype html><html lang="en" class="learn-surface"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Earn from Originals | Bankeiz</title><link rel="stylesheet" href="/learn/learn.css"><link rel="stylesheet" href="/src/qualification/learn.css"><link rel="stylesheet" href="/src/styles/site-footer.css"><style data-public-page-style="product-walkthrough">${walkthroughCss}</style><script src="/learn/learn.js" defer></script><script type="module" src="/src/qualification/learn.ts"></script></head><body data-bank-surface="learn"><div id="public-learn-root">${originalsQualificationContent()}</div></body></html>`;
 res.setHeader('content-type','text/html; charset=utf-8');res.end(await server.transformIndexHtml(req.url,html));}catch(cause){next(cause);}
 });}};}
