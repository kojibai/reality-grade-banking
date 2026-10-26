export {publicIllustration} from '../src/content/public-imagery.mjs';
import {publicIllustration} from '../src/content/public-imagery.mjs';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function endOfElement(html,start,tag){const tokens=new RegExp('<\\/?'+tag+'\\b[^>]*>','gi');tokens.lastIndex=start;let depth=0,match;while((match=tokens.exec(html))){depth+=match[0][1]==='/'?-1:1;if(depth===0)return tokens.lastIndex;}throw Error('PUBLIC_ILLUSTRATION_SLOT_UNCLOSED');}
export function withPublicIllustration(html,page){
 const image=publicIllustration(page);if(!image||html.includes('data-public-imagery'))return html;
 const main=html.indexOf('<main');if(main<0)throw Error('PUBLIC_ILLUSTRATION_MAIN_REQUIRED');
 const heading=/<div\b[^>]*class="[^"]*\barticle-heading\b[^"]*"[^>]*>/g;heading.lastIndex=main;const article=heading.exec(html);
 const section=html.indexOf('<section',main),start=article?.index??section;if(start<0)throw Error('PUBLIC_ILLUSTRATION_SLOT_REQUIRED');
 const at=endOfElement(html,start,article?'div':'section');
 const figure=`<figure class="public-imagery motion-region${article?' public-imagery-article':''}" data-public-imagery="${image.key}"><img src="${image.src}" srcset="${image.src.replace('.webp','-384.webp')} 384w, ${image.src.replace('.webp','-640.webp')} 640w, ${image.src} 1024w" sizes="(max-width: 650px) 100vw, 760px" width="${image.width}" height="${image.height}" loading="lazy" decoding="async" fetchpriority="low" alt="${esc(image.alt)}"></figure>`;
 return html.slice(0,at)+figure+html.slice(at);
}
