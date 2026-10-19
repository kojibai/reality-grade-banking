import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/** Paint the same entrance before modules, stylesheets or saved custody open. */
export function openingShellHtml(html, Opening) {
  if (!html.includes('<div id="root"></div>')) throw new Error('OPENING_SHELL_ROOT_REQUIRED');
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../src/features/identity/account-opening.css'), 'utf8');
  const artwork = renderToStaticMarkup(createElement(Opening, { resuming: true }));
  return html.replace('</head>', `<style id="bankeiz-opening-critical">html,body{margin:0;background:#FCFBF8}${css}</style></head>`)
    .replace('<div id="root"></div>', `<div id="root">${artwork}</div><noscript><style>.account-opening-screen{display:none}</style><p style="padding:24px;text-align:center;font-family:system-ui">Enable JavaScript to open your account. You can read the <a href="/learn/">public bank guides</a> without JavaScript.</p></noscript>`);
}
