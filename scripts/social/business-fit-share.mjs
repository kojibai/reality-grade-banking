import {businessFits} from '../../src/content/business-fits.mjs';
import {businessFitArt} from '../../src/content/business-fit-art.mjs';
import {outcomeObject} from '../business-fit-art.mjs';
import {bankMarkPaths} from '../../branding/bank-mark.mjs';
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function businessFitShareCard(slug){
 const fit=businessFits.find(fit=>fit.slug===slug),model=businessFitArt[slug];
 if(!fit||!model)throw Error('BUSINESS_FIT_SHARE_REQUIRED:'+slug);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1730" height="909" viewBox="0 0 1730 909" data-fit-share="${slug}"><rect width="1730" height="909" fill="#fafbfd"/>
 <g transform="translate(68 48)"><svg width="68" height="68" viewBox="112 112 288 288" fill="#172b45">${bankMarkPaths}</svg></g>
 <text x="160" y="96" font-family="Inter" font-size="24" fill="#527097">${esc(fit.label)}</text>

 <g font-family="Inter" font-weight="600" font-size="76" letter-spacing="-3.4" fill="#172b45">${model.lines.map((text,i)=>`<text x="73" y="${224+i*90}">${esc(text)}</text>`).join('')}</g>
 <path d="M449 555h152m-12-9 12 9-12 9M1003 555h152m-12-9 12 9-12 9" stroke="#a1b8df" stroke-width="2" fill="none"/>
 ${model.objects.map((o,i)=>`<g transform="translate(${35+i*554} 365) scale(1.37)">${outcomeObject(o,`share-${slug}-${i}`)}</g>`).join('')}
 <g font-family="Inter" font-size="24" fill="#355273" text-anchor="middle">${fit.visualLabels.map((text,i)=>`<text x="${309+i*554}" y="815">${esc(text)}</text>`).join('')}</g>
 <text x="74" y="870" font-family="Inter" font-size="17" fill="#7a8ca5">Bankeiz</text><text x="1655" y="870" text-anchor="end" font-family="Inter" font-size="17" fill="#7a8ca5">Illustrative workflow · Your review. Your final say.</text></svg>`;
}
