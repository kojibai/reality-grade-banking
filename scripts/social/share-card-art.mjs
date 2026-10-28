import {momentsShareCard} from './moments-share.mjs';
import {meetingShareCard} from './meeting-share.mjs';
import {productShareCard} from './product-share.mjs';
import {portabilityShareCard} from './portability-share.mjs';
import {economyShareCard} from './economy-share.mjs';
import {standardShareCard} from './standard-share.mjs';
import {outcomeShareCard} from './outcome-share.mjs';
import {identityContinuityShareCard} from './identity-continuity-share.mjs';
import {twinShareCard} from './twin-share.mjs';
import {togetherShareCard} from './together-share.mjs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Fingerprint,Layers3,Box,ShieldCheck,KeyRound,Landmark,ChartNoAxesCombined,BadgeCheck,ScanLine,NotebookTabs,Globe2,Braces,BookOpen,ReceiptText} from 'lucide-react';
import {escapeMetadata as esc} from '../public-page-metadata.mjs';
import {cooperativeShareCard} from './cooperative-share-art.mjs';
import {protectionShareCard} from './vault-protection-share.mjs';
import {businessFitShareCard} from './business-fit-share.mjs';
const icons={layers:Layers3,fingerprint:Fingerprint,cube:Box,shield:ShieldCheck,key:KeyRound,bank:Landmark,valuation:ChartNoAxesCombined,badge:BadgeCheck,scan:ScanLine,ledger:NotebookTabs,globe:Globe2,code:Braces,book:BookOpen,receipt:ReceiptText};
const bank='<path d="m256 117 123 67v17H133v-17l123-67Zm0 26-75 40h150l-75-40Z" fill-rule="evenodd"/><rect x="146" y="215" width="28" height="110" rx="2"/><rect x="210" y="215" width="28" height="110" rx="2"/><rect x="274" y="215" width="28" height="110" rx="2"/><rect x="338" y="215" width="28" height="110" rx="2"/><rect x="133" y="337" width="246" height="18" rx="2"/><rect x="119" y="367" width="274" height="18" rx="3"/>';
export function shareCardSvg(page){
 if(page.id==='moments')return momentsShareCard();
 if(page.id==='meet')return meetingShareCard();
 if(page.id==='banking'||page.id==='in-action')return productShareCard(page);
 if(page.id?.startsWith('portability-'))return portabilityShareCard(page);
 if(page.id?.startsWith('economy-'))return economyShareCard(page);
 if(page.id?.startsWith('standard-'))return standardShareCard(page);
 if(page.id?.startsWith('solution-'))return outcomeShareCard(page);
 if(page.id==='identity-continuity')return identityContinuityShareCard();
 if(page.id==='your-twin'||page.id==='in-action')return twinShareCard(page);
 if(page.id==='together'||page.id?.startsWith('together-'))return togetherShareCard(page);
 if(page.id?.startsWith('business-fit-'))return businessFitShareCard(page.id.slice('business-fit-'.length));
 if(page.id==='protect-your-value')return protectionShareCard();
 if(page.id?.startsWith('cooperatives'))return cooperativeShareCard(page);
 const business=/^(?:business|cooperatives|vaults$)/.test(page.id??'');
 const size=page.size??(Math.max(...page.lines.map(line=>line.length))>17?92:108);
 const icon=page.motif==='rails'?'<text x="124" y="229" font-family="Inter" font-size="115" font-weight="500" fill="white">Φ</text><path d="M238 210h59m-15-15 15 15-15 15" fill="none" stroke="white" stroke-width="5" stroke-linecap="round"/><text x="305" y="226" font-family="Inter" font-size="87" fill="white">$</text>':renderToStaticMarkup(createElement(icons[page.motif]??Layers3,{x:112,y:125,width:196,height:196,color:'#ffffff',strokeWidth:1.05}));
 const accent=page.motif==='globe'?'<circle cx="210" cy="223" r="142" fill="none" stroke="#e2ecff" stroke-opacity=".4" stroke-width="1.5" stroke-dasharray="3 12"/>':page.motif==='valuation'?'<path d="M60 355h300M60 315h300M60 275h300" stroke="#b8d0ff" stroke-opacity=".3"/>':'';
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1730" height="909" viewBox="0 0 1730 909"><defs>
 <linearGradient id="paper" x2="1" y2="1"><stop stop-color="#fffefd"/><stop offset="1" stop-color="#f8f8f7"/></linearGradient>
 <radialGradient id="halo"><stop stop-color="#c2d4f4" stop-opacity=".38"/><stop offset="1" stop-color="#fdfcf9" stop-opacity="0"/></radialGradient>
 <linearGradient id="navy" x1="0" x2="1" y2="1"><stop stop-color="#253d5b"/><stop offset=".48" stop-color="#10243d"/><stop offset="1" stop-color="#04142e"/></linearGradient>
 <linearGradient id="cobalt" x1="0" x2="1" y2="1"><stop stop-color="#497ff2"/><stop offset=".38" stop-color="#245bdc"/><stop offset=".75" stop-color="#103cb7"/><stop offset="1" stop-color="#09267e"/></linearGradient>
 <linearGradient id="glass" x2="1" y2=".7"><stop stop-color="#fcffff" stop-opacity=".98"/><stop offset=".18" stop-color="#9db6d7" stop-opacity=".24"/><stop offset=".42" stop-color="#fff" stop-opacity=".7"/><stop offset=".63" stop-color="#d7e5f8" stop-opacity=".1"/><stop offset="1" stop-color="#a4bedf" stop-opacity=".72"/></linearGradient>
 <linearGradient id="edge" x2="1" y2="1"><stop stop-color="#fff"/><stop offset=".26" stop-color="#779ad8"/><stop offset=".48" stop-color="#fcffff"/><stop offset=".72" stop-color="#507bbf"/><stop offset="1" stop-color="#fff"/></linearGradient>
 <linearGradient id="sheen" x2=".9" y2="1"><stop stop-color="#fff" stop-opacity=".40"/><stop offset=".38" stop-color="#fff" stop-opacity=".02"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#8ab2ff" stop-opacity=".22"/></linearGradient>
 <filter id="blur"><feGaussianBlur stdDeviation="24"/></filter><filter id="lift" x="-.3" y="-.3" width="1.7" height="1.8"><feDropShadow dx="12" dy="22" stdDeviation="20" flood-color="#102642" flood-opacity=".22"/></filter>
 </defs><rect width="1730" height="909" fill="url(#paper)"/><ellipse cx="1325" cy="650" rx="560" ry="350" fill="url(#halo)"/>
 <g fill="#10243d"><svg x="74" y="113" width="105" height="105" viewBox="112 112 288 288">${bank}</svg>${business?'':'<text x="201" y="190" font-family="Inter SemiBold" font-weight="600" font-size="70" letter-spacing="-2.7">Bankeiz</text>'}</g>
 <g font-family="Inter SemiBold" fill="#09203f" font-size="${size}" font-weight="600" letter-spacing="-5">${page.lines.map((line,i)=>`<text x="74" y="${447+i*122}"${page.sizes?` font-size="${page.sizes[i]}" letter-spacing="-.04em"`:''}>${esc(line)}</text>`).join('')}</g>
 <text x="77" y="778" font-family="Inter" font-size="31" font-weight="400" letter-spacing="-.7" fill="#243c5b">${esc(page.caption)}</text>
 <ellipse cx="1350" cy="774" rx="265" ry="49" fill="#284d8a" opacity=".17" filter="url(#blur)"/>
 <g transform="matrix(.93 .25 -.11 .95 1254 135)" filter="url(#lift)"><rect x="8" y="5" width="366" height="480" rx="63" fill="#061632" stroke="#5377a5" stroke-width="2"/><rect width="366" height="480" rx="63" fill="url(#navy)" stroke="url(#edge)" stroke-width="3"/><rect x="9" y="9" width="348" height="462" rx="55" fill="none" stroke="#738caf" stroke-opacity=".5" stroke-width="1.5"/><path d="M46 10h258q55 0 55 55v140" fill="none" stroke="#c8dcf9" stroke-opacity=".5" stroke-width="2"/></g>
 <g transform="matrix(.93 .25 -.11 .95 1152 198)" filter="url(#lift)"><rect x="9" y="7" width="395" height="466" rx="62" fill="url(#glass)" stroke="url(#edge)" stroke-width="3"/><rect width="395" height="466" rx="62" fill="url(#glass)" stroke="url(#edge)" stroke-width="4"/><rect x="12" y="12" width="371" height="442" rx="51" fill="none" stroke="white" stroke-opacity=".7" stroke-width="2"/><path d="M26 75q0-49 49-49h175" fill="none" stroke="white" stroke-width="5" opacity=".8"/></g>
 <g transform="matrix(.93 .25 -.11 .95 1058 275)" filter="url(#lift)"><rect x="10" y="7" width="420" height="450" rx="61" fill="#062c9c" stroke="#547fce" stroke-width="2"/><rect width="420" height="450" rx="61" fill="url(#cobalt)" stroke="#163d9b" stroke-width="2"/><rect x="7" y="7" width="406" height="436" rx="56" fill="url(#sheen)" stroke="#accaff" stroke-opacity=".55" stroke-width="2"/><rect x="18" y="18" width="384" height="414" rx="45" fill="none" stroke="#071c68" stroke-opacity=".36" stroke-width="2"/>${accent}<g opacity=".90">${icon}</g><path d="M35 67q0-32 33-32h180" fill="none" stroke="#ecf4ff" stroke-width="3" opacity=".55"/><path d="M393 128v233q0 53-53 53H113" fill="none" stroke="#82aaff" stroke-opacity=".32" stroke-width="2"/></g>
 ${business?'<text x="77" y="840" font-family="Inter" font-size="18" fill="#60738d">Bankeiz</text>':''}
 </svg>`;
}
