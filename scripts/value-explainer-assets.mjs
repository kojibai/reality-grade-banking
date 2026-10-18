import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { valueExplainerContent, valueExplainerPage } from './value-explainer-template.mjs';

const version = text => createHash('sha256').update(text).digest('hex').slice(0, 12);
export async function buildValueExplainerAssets() {
  const outdir = resolve('value-explainer-output');
  const built = await build({ entryPoints: [resolve('src/value-explainer/main.ts')], outdir, entryNames: 'value-explainer-main-[hash]', chunkNames: 'value-explainer-chunk-[hash]', bundle: true, splitting: true, write: false, minify: true, format: 'esm', target: 'es2022', platform: 'browser', legalComments: 'none' });
  const modules = built.outputFiles.map(file => ({ filename: file.path.slice(outdir.length + 1), bytes: file.contents }));
  const entry = modules.find(file => file.filename.startsWith('value-explainer-main-'));
  if (!entry) throw new Error('VALUE_EXPLAINER_ENTRY_MISSING');
  // Shared Learn navigation retains this tiny detector; SDK modules load only
  // when the value page exists. A cached module registers its own page listener.
  const js = `(()=>{let loaded;const boot=()=>{if(document.querySelector('[data-value-explainer]'))loaded??=import('/learn/${entry.filename}').catch(()=>{loaded=undefined;});};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();window.addEventListener('receiz-learn:page',boot);})();`;
  const css = await readFile(new URL('../src/value-explainer/value-explainer.css', import.meta.url), 'utf8');
  return { js, css, modules, jsUrl: `/learn/value-explainer.js?v=${version(js)}`, cssUrl: `/learn/value-explainer.css?v=${version(css)}` };
}

export async function writeValueExplainerAssets(directory = 'dist') {
  const assets = await buildValueExplainerAssets();
  await mkdir(resolve(directory, 'learn'), { recursive: true });
  await writeFile(resolve(directory, 'learn/value-explainer.js'), assets.js);
  await writeFile(resolve(directory, 'learn/value-explainer.css'), assets.css);
  await Promise.all(assets.modules.map(file => writeFile(resolve(directory, 'learn', file.filename), file.bytes)));
  return assets;
}

/** Dev-only rendering; production prerendering is owned by build-public-pages. */
export function valueExplainerDevPlugin() {
  return {
    name: 'bankeiz-value-explainer',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url?.split('?')[0].replace(/\/$/, '') !== '/learn/how-value-works') return next();
        try {
          const html = `<!doctype html><html lang="en" class="learn-surface"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${valueExplainerPage.title} | Bankeiz</title><meta name="description" content="${valueExplainerPage.description}"><link rel="stylesheet" href="/learn/learn.css"><link rel="stylesheet" href="/src/value-explainer/value-explainer.css"><script src="/learn/learn.js" defer></script><script type="module" src="/src/value-explainer/main.ts"></script></head><body data-bank-surface="learn"><div id="public-learn-root">${valueExplainerContent()}</div></body></html>`;
          const output = await server.transformIndexHtml(request.url, html);
          response.statusCode = 200; response.setHeader('content-type', 'text/html; charset=utf-8'); response.end(output);
        } catch (error) { next(error); }
      });
    },
  };
}
