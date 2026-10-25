import {twinSalesPages} from '../../src/content/twin-pages.mjs';
import {twinArt} from '../twin-art.mjs';
import {bankMarkPaths} from '../../branding/bank-mark.mjs';
const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export function twinShareCard(page){
 const source=twinSalesPages.find(p=>p.slug===page.id);if(!source)throw Error('TWIN_SHARE_REQUIRED');
 const lines=source.key==='your-twin'?['Your presence.','Beyond your','availability.']:['Their next step.','Your context.','Connected.'];
 const art=twinArt(source.key,'share').replace('<svg ','<svg x="837" y="122" width="850" height="680" ');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1730" height="909" viewBox="0 0 1730 909" data-twin-share="${source.key}"><rect width="1730" height="909" fill="#fbfcfe"/><svg x="75" y="53" width="66" height="66" viewBox="112 112 288 288" fill="#172e4b">${bankMarkPaths}</svg><text x="1653" y="94" text-anchor="end" font-family="Inter" font-size="18" letter-spacing="3" fill="#577493">REALITY-GRADE BANKING</text><g font-family="Inter SemiBold" font-weight="600" font-size="88" letter-spacing="-4" fill="#172e4b">${lines.map((line,i)=>`<text x="77" y="${303+i*101}">${esc(line)}</text>`).join('')}</g><g font-family="Inter" fill="#5c7899"><text x="80" y="611" font-size="25">Their question. Your answer. A useful next step.</text><text x="80" y="683" font-size="22">Contacts, context and calendar.</text><text x="80" y="720" font-size="22">One connected relationship.</text></g>${art}<path d="M77 837h1576" stroke="#d9e3ef"/><text x="77" y="879" font-family="Inter" font-size="16" fill="#7c90aa">Bankeiz · Powered by Receiz</text><text x="1653" y="879" text-anchor="end" font-family="Inter" font-size="15" fill="#7c90aa">bankeiz.com${source.path} · Illustrative workflow</text></svg>`;
}
