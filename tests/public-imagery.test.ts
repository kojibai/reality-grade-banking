// @vitest-environment happy-dom
import {expect,it} from 'vitest';
import {publicIllustration,withPublicIllustration} from '../scripts/public-imagery.mjs';
import {learningPages} from '../src/content/learning-pages.mjs';
import {businessFitPages} from '../src/content/business-fits.mjs';
import {portabilityPages} from '../src/content/portability-pages.mjs';
import {economyPages} from '../src/content/existing-economy.mjs';
import {standardPages} from '../src/content/standard-pages.mjs';
it('uses the asset and outcome of each explainer without changing native/runtime entry surfaces',()=>{
 for(const page of [...learningPages,...businessFitPages,...portabilityPages,...economyPages,...standardPages])expect(publicIllustration(page),page.slug).toBeTruthy();
 expect(publicIllustration(portabilityPages[0])!.key).toBe('deposit-source');expect(publicIllustration(portabilityPages[1])!.key).toBe('proof-nft');
 for(const page of [{path:'/'},{path:'/verify/'},{path:'/ledger/'},{path:'/receipt/'},{path:'/vault/original/'},{kind:'account-notice'}])expect(publicIllustration(page)).toBeNull();
});
it('inserts a single transparent image after a complete nested hero, preserves all original bytes and retains native animations',()=>{
 const before='<header>Header</header><main><section class="hero"><h1>Source</h1><section><svg data-native-art></svg></section></section><section id="real-source">Native source</section></main>';
 const result=withPublicIllustration(before,{path:'/crypto/',portability:true,key:'crypto',slug:'crypto'});
 const doc=new DOMParser().parseFromString(result,'text/html'),figure=doc.querySelector('[data-public-imagery]')!;
 expect(figure.previousElementSibling?.className).toBe('hero');expect(figure.nextElementSibling?.id).toBe('real-source');
 expect(result.replace(figure.outerHTML,'')).toBe(before);expect(doc.querySelectorAll('[data-native-art]')).toHaveLength(1);
 const img=figure.querySelector('img')!;expect(img.getAttribute('width')).toBe('1024');expect(img.getAttribute('height')).toBe('896');expect(img.getAttribute('loading')).toBe('lazy');expect(img.getAttribute('alt')).toMatch(/illustration/i);expect(figure.querySelector('script,iframe,canvas,button')).toBeNull();
 expect(withPublicIllustration(result,{path:'/crypto/',portability:true,key:'crypto'})).toBe(result);
});
it('adds the scene after guide heading and before the existing article body',()=>{
 const before='<main class="article-main"><div class="article-heading"><div>Banking</div><h1>Payments</h1><p>Keep the source.</p></div><div class="article-layout">Exact original article</div></main>';
 const doc=new DOMParser().parseFromString(withPublicIllustration(before,learningPages.find(page=>page.slug==='payments')),'text/html');
 expect(doc.querySelector('[data-public-imagery]')?.previousElementSibling?.className).toBe('article-heading');
 expect(doc.querySelector('[data-public-imagery]')?.nextElementSibling?.className).toBe('article-layout');
});
