import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { scopeLearnCss } from './scope-learn-css.mjs';
import {transform} from 'esbuild';

// The prerendered pages and service-worker install must request identical URLs.
export async function learnAssets() {
  const css = (await transform(scopeLearnCss(await readFile('public/learn/learn.css', 'utf8')+'\n'+await readFile('src/styles/site-footer.css','utf8')),{loader:'css',minify:true,target:['safari16','chrome100']})).code;
  const js = (await transform(await readFile('public/learn/learn.js', 'utf8'),{loader:'js',minify:true,target:'es2022'})).code;
  const version = text => createHash('sha256').update(text).digest('hex').slice(0, 12);
  return { css, js, cssUrl: `/learn/learn.css?v=${version(css)}`, jsUrl: `/learn/learn.js?v=${version(js)}` };
}
