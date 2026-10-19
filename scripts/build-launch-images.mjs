import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// CSS display sizes and scales, including the 402 × 874 iPhone viewport.
// iOS chooses the image before page scripts or service workers can run.
const screens = [[320,568,2],[375,667,2],[414,736,3],[375,812,3],[390,844,3],[393,852,3],[402,874,3],[414,896,2],[414,896,3],[428,926,3],[430,932,3],[440,956,3],[420,912,3]];
export function phoneLaunchTargets() {
  return screens.flatMap(([width,height,scale]) => ['portrait','landscape'].map(orientation => ({
    width, height, scale, orientation,
    url: `/launch/iphone-${width}-${height}-${scale}-${orientation}.png`,
    media: `screen and (device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${scale}) and (orientation: ${orientation})`,
  })));
}

export async function buildLaunchImages(directory, Opening) {
  const artwork = renderToStaticMarkup(createElement(Opening, { resuming: true })).match(/<svg[\s\S]*?<\/svg>/)?.[0];
  if (!artwork) throw new Error('LAUNCH_ARTWORK_REQUIRED');
  await mkdir(resolve(directory, 'launch'), { recursive: true });
  const targets = phoneLaunchTargets();
  for (const target of targets) {
    const { scale } = target;
    const [width,height] = target.orientation === 'portrait' ? [target.width,target.height] : [target.height,target.width];
    const size = height <= 480 ? Math.min(height * .76,380) : Math.max(280,Math.min(Math.min(width,height) * .83,570));
    const nested = artwork.replace('<svg ', `<svg x="${(width-size)/2}" y="${(height-size)/2-size*.02}" width="${size}" height="${size}" `);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width*scale}" height="${height*scale}" viewBox="0 0 ${width} ${height}"><defs><radialGradient id="launch-ambient"><stop stop-color="#e9eff7"/><stop offset="1" stop-color="#FCFBF8"/></radialGradient></defs><rect width="100%" height="100%" fill="#FCFBF8"/><ellipse cx="${width/2}" cy="${height*.46}" rx="${width*.8}" ry="${height*.45}" fill="url(#launch-ambient)"/>${nested}</svg>`;
    const png = new Resvg(svg, { font: { loadSystemFonts: false } }).render().asPng();
    await writeFile(resolve(directory, target.url.slice(1)), png);
  }
  return targets.map(target => `<link rel="apple-touch-startup-image" href="${target.url}" media="${target.media}">`).join('');
}
