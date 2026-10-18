import { readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

// One font-free vector supplies the browser, PWA, and iOS home-screen mark.
// Its opaque background reaches every edge; platforms apply their own masks.
const source = await readFile(new URL('../public/icon.svg', import.meta.url));
const variants = [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]];
const check = process.argv.includes('--check');
for (const [name, size] of variants) {
  const bytes = new Resvg(source, {
    fitTo: { mode: 'width', value: size },
    font: { loadSystemFonts: false },
  }).render().asPng();
  const target = new URL(`../public/${name}`, import.meta.url);
  if (check) {
    if (!(await readFile(target)).equals(bytes)) throw new Error(`APP_ICON_OUT_OF_DATE:${name}`);
  } else await writeFile(target, bytes);
}
console.log(`${check ? 'Verified' : 'Generated'} Bankeiz PWA 192/512 and Apple 180 icons from public/icon.svg.`);
