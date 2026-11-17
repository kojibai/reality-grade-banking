import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { scopeLearnCss } from './scope-learn-css.mjs';
import {transform,build} from 'esbuild';
import {resolve} from 'node:path';

// The prerendered pages and service-worker install must request identical URLs.
export async function learnAssets() {
  const css = (await transform(scopeLearnCss(await readFile('public/learn/learn.css', 'utf8')+'\n'+await readFile('src/styles/site-footer.css','utf8')),{loader:'css',minify:true,target:['safari16','chrome100']})).code;
  const decoder=await build({stdin:{contents:'import {initPublicAcquisition} from '+JSON.stringify(resolve('src/presentation/public-acquisition.mjs'))+';initPublicAcquisition();export {decodeNavigationEnvelope} from '+JSON.stringify(resolve('src/presentation/navigation-envelope.mjs')),resolveDir:process.cwd()},bundle:true,platform:'browser',format:'iife',globalName:'__bankNavigationEnvelope',minify:true,target:'es2022',write:false});
  const js = (await transform(decoder.outputFiles[0].text+'\n'+await readFile('public/learn/learn.js', 'utf8'),{loader:'js',minify:true,target:'es2022'})).code;
  const version = text => createHash('sha256').update(text).digest('hex').slice(0, 12);
  return { css, js, cssUrl: `/learn/learn.css?v=${version(css)}`, jsUrl: `/learn/learn.js?v=${version(js)}` };
}
