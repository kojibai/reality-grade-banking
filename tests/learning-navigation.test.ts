import {expect,it} from 'vitest';
import {Window} from 'happy-dom';
const window=new Window();
import {learningPages,learningPath} from '../src/content/learning-pages.mjs';
import {publicPages} from '../scripts/public-page-metadata.mjs';
// @ts-expect-error Public build template is standalone ESM.
import {learnHome,learnArticle,learningDirectoryPage} from '../scripts/learn-template.mjs';
import {guideContent} from '../scripts/user-guide-page.mjs';
import {guideArticleUrl} from '../src/content/user-guide.mjs';
import {acceptMoneyContent} from '../scripts/accept-money-page.mjs';
import {independentBankContent} from '../scripts/independent-bank-page.mjs';
import {bookingGuideContent} from '../scripts/booking-guide.mjs';

const main=(html:string)=>(new window.DOMParser().parseFromString(html,'text/html') as unknown as Document).querySelector('main')!;
const destinations=(html:string)=>[...main(html).querySelectorAll<HTMLAnchorElement>('a[href]')].map(a=>a.getAttribute('href'));

it('renders the already-authored standard guides and the three useful product introductions exactly once',()=>{
 const directory=main(learningDirectoryPage());
 const cards=[...directory.querySelectorAll<HTMLAnchorElement>('.learning-group>div>a')];
 const paths=cards.map(a=>a.getAttribute('href'));
 for(const path of ['/accept/','/trust/','/money/','/deposit/','/fees/','/help/','/about/','/in-practice/','/accept-payments/','/start/','/privacy/','/terms/','/pay/','/matter/','/build/'])expect(paths.filter(value=>value===path),path).toHaveLength(1);
 expect(new Set(paths).size).toBe(paths.length);
 const routes=new Set(publicPages.map((p:{path:string})=>p.path));
 for(const path of paths)expect(routes.has(path!),path!).toBe(true);
 for(const page of learningPages)expect(paths).toContain(learningPath(page));
 expect(directory.querySelector('#guides-standards')?.textContent).toContain('Accept the money');
});

it('provides relevant main-content steps across learning, receiving and building without relying on global menus',()=>{
 expect(destinations(learnHome())).toContain('/learn/guides/');
 expect(destinations(guideContent())).toContain('/learn/guides/');
 const article=(slug:string)=>learnArticle(learningPages.find(p=>p.slug===slug)!,learningPages,(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;'));
 expect(destinations(article('get-paid'))).toContain('/pay/');
 expect(destinations(article('proof-objects'))).toContain('/matter/');
 expect(destinations(acceptMoneyContent())).toContain('/build/');
 expect(main(acceptMoneyContent()).querySelector('#keep-moving .am-actions a[href="https://receiz.com/developers"]')?.textContent).toContain('Explore the Receiz SDK');
 expect(destinations(independentBankContent())).toContain('/accept/');
 // Ordinary reading links explain receiving; they do not stage or consume invitations.
 expect(destinations(learningDirectoryPage())).not.toContain('/receive/');
});

it('links both Book calls to the actual sourced calendar chapter rather than an absent local fragment',()=>{
 const preview={screens:new Proxy({} as Record<string,string>,{get:()=>'<div>Example</div>'}),css:''};
 const links=[...main(bookingGuideContent(preview)).querySelectorAll<HTMLAnchorElement>('a')].filter(a=>/Follow the step-by-step guide|Show me the steps/.test(a.textContent??''));
 expect(links).toHaveLength(2);
 for(const link of links)expect(link.getAttribute('href')).toBe(guideArticleUrl('calendar-booking'));
 expect(bookingGuideContent(preview)).not.toContain('/guide/#calendar-booking');
});
