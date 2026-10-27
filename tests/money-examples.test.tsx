// @vitest-environment happy-dom
import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {businessFits} from '../src/content/business-fits.mjs';
import {moneyExamples} from '../src/content/money-examples.mjs';
import {ProductScreen} from '../src/presentation/ProductScreen';
import {productMoment} from '../scripts/product-walkthrough.mjs';
// @ts-expect-error Static ESM template.
import {learnHome} from '../scripts/learn-template.mjs';

it('gives each audience a distinct four-turn financial conversation with retained context',()=>{
 const examples=businessFits.map(fit=>moneyExamples[fit.slug]);
 expect(examples.every(Boolean)).toBe(true);
 expect(new Set(examples.map(example=>example.question)).size).toBe(30);
 expect(new Set(examples.map(example=>example.answer)).size).toBe(30);
 expect(new Set(examples.map(example=>example.followupAnswer)).size).toBe(30);
 for(const example of examples){expect(example.followup.length).toBeGreaterThan(10);expect(example.balanceCents).toMatch(/^\d+$/);expect(example.followupAnswer.length).toBeGreaterThan(60);}
});
it('keeps the selected story bound to actual message components and its sample account',()=>{
 const example=moneyExamples.agencies,doc=new DOMParser().parseFromString(renderToStaticMarkup(<ProductScreen screen="messages" example="agencies"/>),'text/html');
 expect(doc.querySelectorAll('[data-example-response]')).toHaveLength(2);
 expect(doc.querySelector('[data-example-scenario="agencies"]')).not.toBeNull();
 expect(doc.body.textContent).toContain(example.question);expect(doc.body.textContent).toContain(example.followupAnswer);
 expect(doc.querySelector('[inert]')).not.toBeNull();expect(doc.querySelector('iframe,script')).toBeNull();
 expect(productMoment({example:'agencies'})).toContain('data-example-scenario="agencies"');
});
it('keeps the learn overview about the actual account and actions, with funding depth one level below',()=>{
 const doc=new DOMParser().parseFromString(learnHome(),'text/html');
 expect(doc.querySelector('.rail-section')).toBeNull();
 expect(doc.querySelector('[data-product-example="account"]')).not.toBeNull();
 expect(doc.querySelector('[data-product-choice="send"]')).not.toBeNull();
 expect(doc.querySelector('a[href="/learn/reserve-and-settlement/"]')?.textContent).toContain('Where your funds come from');
 expect(doc.querySelector('.learn-business-offer')?.textContent).not.toContain('$149');
});

it('makes receiving continuity an institutional requirement without inventing a redemption right',()=>{
 const source=learningPages.find(page=>page.slug==='reserve-and-settlement')!.sections.flat().join(' ');
 expect(source).toContain('source classification follows the funds');
 expect(source).toContain('Conformance demonstrates that preservation for the exact receiving capability, implementation and version.');
 expect(source).toContain('exact source, identity, ownership, value and history');
});
import {learningPages} from '../src/content/learning-pages.mjs';
import {businessContent} from '../scripts/business-page.mjs';
it('pairs a financial decision with a distinct connected client-to-payment workflow',()=>{
 const doc=new DOMParser().parseFromString(businessContent(),'text/html');
 const scenes=[...doc.querySelectorAll('[data-example-scenario]')].map(el=>el.getAttribute('data-example-scenario'));
 expect(scenes).toEqual(['daily-payroll','daily-collect','daily-afford','agent-workflow']);
 expect(doc.querySelector('[data-daily-money="daily-afford"] [data-money-outcome]')?.textContent).toContain('$5,600');
 expect(doc.querySelector('[data-example-scenario="agent-workflow"] .bank-chat-payment')?.textContent).toContain('$300.00');
 expect(doc.querySelector('[data-example-scenario="agent-workflow"] .organizer-agenda-row')?.textContent).toContain('Mia');
 expect(moneyExamples['business-plan'].answer).toContain('$4,000');
 expect(moneyExamples['business-followthrough'].answer).toContain('$4,000');
 expect(moneyExamples['business-plan'].question).not.toBe(moneyExamples['business-followthrough'].question);
});
