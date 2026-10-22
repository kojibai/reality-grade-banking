import {resolve} from 'node:path';
import {Resvg} from '@resvg/resvg-js';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AudioLines, BookOpen, Box, FileText, Image, Play, Sparkles} from 'lucide-react';
import {marketContentLabel} from '../src/receiz/market-categories';
import type {PublicMarketItem} from '../src/receiz/public-market';

export const assetCardFont = {
  fontFiles: ['Inter-SemiBold.ttf', 'Inter-Regular.ttf'].map(name => resolve('scripts/social/fonts', name)),
  loadSystemFonts: false,
  defaultFontFamily: 'Inter',
};

const bank = '<path d="m256 117 123 67v17H133v-17l123-67Zm0 26-75 40h150l-75-40Z" fill-rule="evenodd"/><rect x="146" y="215" width="28" height="110" rx="2"/><rect x="210" y="215" width="28" height="110" rx="2"/><rect x="274" y="215" width="28" height="110" rx="2"/><rect x="338" y="215" width="28" height="110" rx="2"/><rect x="133" y="337" width="246" height="18" rx="2"/><rect x="119" y="367" width="274" height="18" rx="3"/>';
const clean = (value: string) => value.replace(/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g, ' ').replace(/\s+/g, ' ').trim();
const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

// Measure with the same retained font used for the final PNG, so wide glyphs,
// long titles and large exact values cannot run into the glass composition.
function textWidth(value: string, size: number, weight = 600, spacing = -.04 * size): number {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="10000" height="300"><text x="0" y="200" font-family="Inter" font-size="${size}" font-weight="${weight}" letter-spacing="${spacing}">${escape(value)}</text></svg>`;
  return new Resvg(svg, {font: assetCardFont}).getBBox()?.width ?? 0;
}

function ellipsis(value: string, width: number, size: number, weight = 600): string {
  if (textWidth(value, size, weight) <= width) return value;
  const characters = Array.from(value);
  let low = 0, high = characters.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (textWidth(characters.slice(0, mid).join('') + '…', size, weight) <= width) low = mid;
    else high = mid - 1;
  }
  return characters.slice(0, low).join('').trimEnd() + '…';
}

function titleLines(title: string): string[] {
  if (textWidth(title, 100) <= 900) return [title];
  const words = title.split(' ');
  let split = 0, first = '';
  while (split < words.length && textWidth((first + ' ' + words[split]).trim(), 100) <= 900) {
    first = (first + ' ' + words[split++]).trim();
  }
  if (!first) return [ellipsis(title, 900, 100)];
  return [first, ellipsis(words.slice(split).join(' '), 900, 100)];
}

function ownership(item: PublicMarketItem): {label: string; value: string} {
  if (item.category === 'sports' && item.circulationCount !== 1) {
    const count = item.circulationCount;
    return {label: 'Collection', value: Number.isSafeInteger(count) && Number(count) > 1
      ? `${new Intl.NumberFormat('en-US').format(count!)} copies in circulation` : 'Copy ownership varies'};
  }
  const owner = item.ownerUsername ? '@' + item.ownerUsername : clean(item.ownerDisplayName ?? '');
  return {label: 'Owner', value: owner || 'Owner unavailable'};
}

/** Metadata and an optional prepared cover; no remote locator is embedded. */
export function assetShareCardSvg(item: PublicMarketItem, cover:string|null=null): string {
  cover=cover&&cover.length<=2*1024*1024&&/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(cover)?cover:null;
  const title = clean(item.title) || 'Untitled asset', category = marketContentLabel(item);
  const lines = titleLines(title.slice(0, 256));
  const value = item.priceUsd !== null && Number.isFinite(item.priceUsd) && item.priceUsd >= 0
    ? new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 20}).format(item.priceUsd)
    : 'Value unavailable';
  const valueSize = Math.min(value === 'Value unavailable' ? 54 : 84, 84 * 895 / Math.max(1, textWidth(value, 84)));
  const owner = ownership(item);
  const ownerLine = owner.value === 'Owner unavailable' ? owner.value : `${owner.label} · ${ellipsis(owner.value, 650, 25, 400)}`;
  const icon = item.category === 'sports' ? Box : ({audio: AudioLines, image: Image, video: Play, epub: BookOpen, pdf: FileText, file: FileText, moment: Sparkles}[item.mediaKind ?? 'moment'] ?? Sparkles);
  const motif = renderToStaticMarkup(createElement(icon, {x: 126, y: 126, width: 168, height: 168, color: '#ffffff', strokeWidth: 1.05}));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1730" height="909" viewBox="0 0 1730 909" role="img" aria-labelledby="asset-title asset-description">
<title id="asset-title">${escape(title)} | Bankeiz</title><desc id="asset-description">${escape(category)}. Market Value: ${escape(value)}. ${escape(owner.label)}: ${escape(owner.value)}.</desc>
<defs>
<linearGradient id="paper" x2="1" y2="1"><stop stop-color="#fffefd"/><stop offset="1" stop-color="#f8f8f7"/></linearGradient>
<radialGradient id="halo"><stop stop-color="#bfd1f5" stop-opacity=".48"/><stop offset="1" stop-color="#fdfcf9" stop-opacity="0"/></radialGradient>
<linearGradient id="navy" x1="0" x2="1" y2="1"><stop stop-color="#253d5b"/><stop offset=".48" stop-color="#10243d"/><stop offset="1" stop-color="#04142e"/></linearGradient>
<linearGradient id="cobalt" x1="0" x2="1" y2="1"><stop stop-color="#497ff2"/><stop offset=".38" stop-color="#245bdc"/><stop offset=".75" stop-color="#103cb7"/><stop offset="1" stop-color="#09267e"/></linearGradient>
<linearGradient id="glass" x2="1" y2=".7"><stop stop-color="#fcffff" stop-opacity=".98"/><stop offset=".18" stop-color="#9db6d7" stop-opacity=".24"/><stop offset=".42" stop-color="#fff" stop-opacity=".7"/><stop offset=".63" stop-color="#d7e5f8" stop-opacity=".1"/><stop offset="1" stop-color="#a4bedf" stop-opacity=".72"/></linearGradient>
<linearGradient id="edge" x2="1" y2="1"><stop stop-color="#fff"/><stop offset=".26" stop-color="#779ad8"/><stop offset=".48" stop-color="#fcffff"/><stop offset=".72" stop-color="#507bbf"/><stop offset="1" stop-color="#fff"/></linearGradient>
<linearGradient id="sheen" x2=".9" y2="1"><stop stop-color="#fff" stop-opacity=".40"/><stop offset=".38" stop-color="#fff" stop-opacity=".02"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#8ab2ff" stop-opacity=".22"/></linearGradient>
<filter id="blur"><feGaussianBlur stdDeviation="24"/></filter><filter id="lift" x="-.3" y="-.3" width="1.7" height="1.8"><feDropShadow dx="12" dy="22" stdDeviation="20" flood-color="#102642" flood-opacity=".22"/></filter>
${cover?'<clipPath id="album-cover"><rect x="18" y="33" width="384" height="384" rx="43"/></clipPath>':''}
</defs>
<rect width="1730" height="909" fill="url(#paper)"/><ellipse cx="1340" cy="650" rx="510" ry="350" fill="url(#halo)"/>
<rect x="76" y="103" width="105" height="105" rx="23" fill="url(#navy)"/><svg x="92" y="118" width="73" height="73" viewBox="112 112 288 288" fill="#ffffff">${bank}</svg>
<text x="207" y="182" font-family="Inter" font-weight="600" font-size="67" letter-spacing="-2.7" fill="#09203f">Bankeiz</text>
<rect x="78" y="273" width="5" height="27" rx="2.5" fill="#245bdc"/><text x="99" y="296" font-family="Inter" font-size="25" font-weight="400" fill="#304c70">${escape(category)}</text>
<g font-family="Inter" font-weight="600" font-size="100" letter-spacing="-4" fill="#09203f">${lines.map((line, index) => `<text x="74" y="${lines.length === 1 ? 435 : 405 + index * 111}">${escape(line)}</text>`).join('')}</g>
<path d="M78 572H954" stroke="#cbd5e3" stroke-width="1.5"/>
<text x="78" y="629" font-family="Inter" font-size="25" font-weight="400" letter-spacing="-.4" fill="#4b6380">Market Value</text>
<text x="74" y="724" font-family="Inter" font-size="${valueSize}" font-weight="600" letter-spacing="${-.04 * valueSize}" fill="#09203f">${escape(value)}</text>
<text x="78" y="823" font-family="Inter" font-size="25" font-weight="400" letter-spacing="-.5" fill="#304c70">${escape(ownerLine)}</text>
<ellipse cx="1350" cy="774" rx="265" ry="49" fill="#284d8a" opacity=".17" filter="url(#blur)"/>
<g transform="matrix(.93 .25 -.11 .95 1254 135)" filter="url(#lift)"><rect x="8" y="5" width="366" height="480" rx="63" fill="#061632" stroke="#5377a5" stroke-width="2"/><rect width="366" height="480" rx="63" fill="url(#navy)" stroke="url(#edge)" stroke-width="3"/><rect x="9" y="9" width="348" height="462" rx="55" fill="none" stroke="#738caf" stroke-opacity=".5" stroke-width="1.5"/><path d="M46 10h258q55 0 55 55v140" fill="none" stroke="#c8dcf9" stroke-opacity=".5" stroke-width="2"/></g>
<g transform="matrix(.93 .25 -.11 .95 1152 198)" filter="url(#lift)"><rect x="9" y="7" width="395" height="466" rx="62" fill="url(#glass)" stroke="url(#edge)" stroke-width="3"/><rect width="395" height="466" rx="62" fill="url(#glass)" stroke="url(#edge)" stroke-width="4"/><rect x="12" y="12" width="371" height="442" rx="51" fill="none" stroke="white" stroke-opacity=".7" stroke-width="2"/><path d="M26 75q0-49 49-49h175" fill="none" stroke="white" stroke-width="5" opacity=".8"/></g>
<g transform="matrix(.93 .25 -.11 .95 1058 275)" filter="url(#lift)"><rect x="10" y="7" width="420" height="450" rx="61" fill="#062c9c" stroke="#547fce" stroke-width="2"/><rect width="420" height="450" rx="61" fill="url(#cobalt)" stroke="#163d9b" stroke-width="2"/><rect x="7" y="7" width="406" height="436" rx="56" fill="url(#sheen)" stroke="#accaff" stroke-opacity=".55" stroke-width="2"/><rect x="18" y="18" width="384" height="414" rx="45" fill="none" stroke="#071c68" stroke-opacity=".36" stroke-width="2"/>
${cover?`<image x="18" y="33" width="384" height="384" preserveAspectRatio="xMidYMid meet" clip-path="url(#album-cover)" href="${escape(cover)}"/><rect x="18" y="33" width="384" height="384" rx="43" fill="none" stroke="#ecf4ff" stroke-opacity=".65" stroke-width="2"/>`:`<text x="52" y="82" font-family="Inter" font-size="17" font-weight="400" letter-spacing="3" fill="#dce8ff">PUBLIC ASSET</text><g opacity=".9">${motif}</g>
<path d="M52 330H367" stroke="#d1e1ff" stroke-opacity=".28"/><text x="52" y="377" font-family="Inter" font-size="31" font-weight="600" letter-spacing="-.9" fill="#fff">Bankeiz</text><text x="52" y="409" font-family="Inter" font-size="20" font-weight="400" fill="#dce8ff">${escape(category)}</text>
`}
<path d="M35 67q0-32 33-32h180" fill="none" stroke="#ecf4ff" stroke-width="3" opacity=".55"/><path d="M393 128v233q0 53-53 53H113" fill="none" stroke="#82aaff" stroke-opacity=".32" stroke-width="2"/></g>
</svg>`;
}
