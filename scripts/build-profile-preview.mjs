import {build} from 'esbuild';
import {resolve} from 'node:path';
import {access,readFile,mkdir,readdir,unlink} from 'node:fs/promises';
await (await import('./build-profile-share-history.mjs')).buildProfileShareHistory();
const outdir='server/profile-runtime';await mkdir(outdir,{recursive:true});
for(const name of await readdir(outdir))if(name.endsWith('.mjs'))await unlink(`${outdir}/${name}`);
// Feed opens only after user intent; profile first paint carries its icon, not
// the browser-only feed, payments or decoder runtime.
const entryPoints=['server/receipt-document.tsx','server/profile-document.tsx','server/public-market-document.tsx','server/public-page-preparation.ts'];try{await access('server/prepared-dependent-documents.tsx');entryPoints.push('server/prepared-dependent-documents.tsx');}catch{}
await build({entryPoints,outdir,entryNames:'[name]',chunkNames:'[name]-[hash]',outExtension:{'.js':'.mjs'},bundle:true,splitting:true,format:'esm',platform:'node',target:'node24',define:{'process.env.NODE_ENV':'"production"'},banner:{js:"import {createRequire as profileCreateRequire} from 'node:module'; const require=profileCreateRequire(import.meta.url);"},loader:{'.css':'empty'},plugins:[{name:'browser-only-profile-panels',setup(build){build.onResolve({filter:/\?raw$/},args=>({path:resolve(args.resolveDir,args.path.replace(/\?raw$/,'')),namespace:'public-source-text'}));build.onLoad({filter:/.*/,namespace:'public-source-text'},async args=>({contents:await readFile(args.path,'utf8'),loader:'text'}));build.onResolve({filter:/(?:^|\/)MarketFeedPopover$/},args=>({path:args.path,namespace:'browser-feed-placeholder'}));build.onLoad({filter:/.*/,namespace:'browser-feed-placeholder'},()=>({contents:'export function MarketFeedPopover(){return null;}',loader:'js'}));build.onResolve({filter:/(?:^|\/)ProofPdfReader$/},args=>({path:args.path,namespace:'browser-pdf-placeholder'}));build.onLoad({filter:/.*/,namespace:'browser-pdf-placeholder'},()=>({contents:'export default function BrowserPdfReader(){return null;}',loader:'js'}));}}],jsx:'automatic',logLevel:'warning'});
console.log('Built the shared profile components for settled document first paint.');
