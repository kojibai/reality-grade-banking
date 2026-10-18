import { readFileSync, existsSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { expect, it } from 'vitest';

const root = new URL('../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root));
const variants = [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]] as const;

it('keeps the complete Bankeiz mark opaque and inside the installed-app mask safe area', () => {
  const source = read('public/icon.svg').toString();
  const rendered = new Resvg(source, { font: { loadSystemFonts: false } }).render();
  const background = new Resvg(source.replace(/<g id="bank-mark"[\s\S]*?<\/g>/, ''), { font: { loadSystemFonts: false } }).render().pixels;
  const pixels = rendered.pixels;
  let transparentPixels = 0, unsafeMarkPixels = 0;
  for (let y = 0; y < rendered.height; y++) for (let x = 0; x < rendered.width; x++) {
    const offset = (y * rendered.width + x) * 4;
    if (pixels[offset + 3] !== 255) transparentPixels++;
    if (Math.hypot(x + .5 - 256, y + .5 - 256) > 512 * .4 &&
      [0,1,2].some(channel => pixels[offset + channel] !== background[offset + channel])) unsafeMarkPixels++;
  }
  expect(transparentPixels, 'installed icons need an opaque full-bleed background').toBe(0);
  expect(unsafeMarkPixels, 'the mark must survive circular and squircle masks').toBe(0);
  expect(source).not.toMatch(/<(?:image|text|script|foreignObject)\b|(?:href|filter)=/);
});

it('ships reproducible PWA and Apple sizes from the same original vector', () => {
  const source = read('public/icon.svg');
  for (const [file, size] of variants) {
    expect(existsSync(new URL(`public/${file}`, root)), `${file} must be shipped`).toBe(true);
    const png = read(`public/${file}`);
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([size, size]);
    expect(png.equals(new Resvg(source, { fitTo: { mode: 'width', value: size }, font: { loadSystemFonts: false } }).render().asPng()), `${file} must match the vector`).toBe(true);
  }
  const manifest = JSON.parse(read('public/manifest.webmanifest').toString());
  for (const size of [192, 512]) expect(manifest.icons).toContainEqual({ src: `/icon-${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any maskable' });
  const page = read('index.html').toString();
  expect(page).toContain('<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />');
  expect(read('scripts/build-offline-shell.mjs').toString()).toContain("'/apple-touch-icon.png'");
  expect(JSON.parse(read('package.json').toString()).scripts.build).toContain('node scripts/build-icons.mjs');
});
