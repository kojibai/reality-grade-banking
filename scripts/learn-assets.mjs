import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { scopeLearnCss } from './scope-learn-css.mjs';

// The prerendered pages and service-worker install must request identical URLs.
export async function learnAssets() {
  const css = scopeLearnCss(await readFile('public/learn/learn.css', 'utf8'));
  const js = await readFile('public/learn/learn.js', 'utf8');
  const version = text => createHash('sha256').update(text).digest('hex').slice(0, 12);
  return { css, cssUrl: `/learn/learn.css?v=${version(css)}`, jsUrl: `/learn/learn.js?v=${version(js)}` };
}
