// @vitest-environment happy-dom
import {expect,it} from 'vitest';
// @ts-expect-error Static ESM template has no declaration.
import {learnHome} from '../scripts/learn-template.mjs';
import {standardPages} from '../src/content/standard-pages.mjs';
import {standardContent} from '../scripts/standard-page.mjs';
import {businessBenefits,businessQuestions} from '../src/content/business-offer.mjs';
const parse=(s:string)=>new DOMParser().parseFromString(s,'text/html');
it('makes Learn a price-free view of money outcomes and the optional addition to core banking',()=>{
 const doc=parse(learnHome()),section=doc.querySelector('.learn-business-offer')!;
 expect(section.textContent).not.toMatch(/\$149|\$1,499|credits|An assistant for your business/i);
 expect(section.textContent).toContain('payment requests');expect(section.textContent).toContain('client');expect(section.textContent).toContain('without Business');expect(section.querySelector('a[href="/business/"]')).not.toBeNull();
 expect(doc.querySelector('main')?.textContent).not.toContain('Business · $149/month');
});
it('describes Business as additional work outcomes with the actual plan in its decision details',()=>{
 const copy=[...businessBenefits.flat(),...businessQuestions.flat()].join(' ');expect(copy).not.toMatch(/\bassistant\b/i);expect(copy).toContain('optional');expect(copy).toContain('$149/month');expect(copy).toContain('same account');
});
it('puts the next decision and exact supporting instructions on Start, Trust, Deposit and Help',()=>{
 const links:Record<string,string[]>={start:['/docs/getting-started/','/docs/backup/'],trust:['/docs/trust/','/docs/security/'],deposit:['/docs/funding/','/docs/offline/'],help:['/docs/recovery/','/docs/backup/']};
 for(const [key,paths] of Object.entries(links)){const doc=parse(standardContent(standardPages.find(p=>p.key===key)!));for(const href of paths)expect(doc.querySelector('main a[href="'+href+'"]'),key+':'+href).not.toBeNull();}
});
