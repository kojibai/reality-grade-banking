import {build} from 'esbuild';
import {mkdir,readdir,unlink} from 'node:fs/promises';
const outdir='server/profile-runtime';await mkdir(outdir,{recursive:true});
for(const name of await readdir(outdir))if(name.endsWith('.mjs'))await unlink(`${outdir}/${name}`);
await build({entryPoints:['server/profile-document.tsx'],outdir,entryNames:'profile-document',chunkNames:'[name]-[hash]',outExtension:{'.js':'.mjs'},bundle:true,splitting:true,format:'esm',platform:'node',target:'node24',define:{'process.env.NODE_ENV':'"production"'},banner:{js:"import {createRequire as profileCreateRequire} from 'node:module'; const require=profileCreateRequire(import.meta.url);"},loader:{'.css':'empty'},plugins:[{name:'browser-only-pdf-reader',setup(build){build.onResolve({filter:/^\.\/ProofPdfReader$/},args=>({path:args.path,namespace:'browser-pdf-placeholder'}));build.onLoad({filter:/.*/,namespace:'browser-pdf-placeholder'},()=>({contents:'export default function BrowserPdfReader(){return null;}',loader:'js'}));}}],jsx:'automatic',logLevel:'warning'});
console.log('Built the shared profile components for settled document first paint.');
