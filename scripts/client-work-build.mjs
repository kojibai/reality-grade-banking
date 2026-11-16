import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
const require=createRequire(import.meta.url);
export async function buildClientWorkRuntime(outdir='dist/learn'){
 return build({entryPoints:{'client-work-demo':'src/adoption/client-work-public.tsx'},bundle:true,splitting:true,platform:'browser',format:'esm',target:'es2022',minify:true,outdir,chunkNames:'client-work-chunk-[hash]',assetNames:'client-work-file-[hash]',publicPath:'/learn',metafile:true,define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'public-example-assets',setup(builder){
  // The exact critical styles are already in the first HTML and its carried head.
  builder.onLoad({filter:/\.css$/},()=>({contents:'',loader:'js'}));
  builder.onResolve({filter:/\?url(?:&inline)?$/},args=>({path:args.path.startsWith('.')?resolve(args.resolveDir,args.path.split('?')[0]):require.resolve(args.path.split('?')[0]),namespace:args.path.endsWith('&inline')?'demo-inline-asset':'demo-file-asset'}));
  builder.onLoad({filter:/.*/,namespace:'demo-inline-asset'},async args=>({contents:'export default '+JSON.stringify('data:font/ttf;base64,'+(await readFile(args.path)).toString('base64')),loader:'js',resolveDir:dirname(args.path)}));
  builder.onLoad({filter:/.*/,namespace:'demo-file-asset'},async args=>({contents:await readFile(args.path),loader:'file',resolveDir:dirname(args.path)}));
 }}]});
}
