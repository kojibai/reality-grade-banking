// @vitest-environment happy-dom
import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {learningPages} from '../src/content/learning-pages.mjs';
import {receivingRequirements,noteRequirements,standardGroups,receivingStages,realityGradeStandardContent} from '../scripts/reality-grade-standard.mjs';
// @ts-expect-error Existing public build template is ESM.
import {learnHeader} from '../scripts/learn-template.mjs';
import {siteFooterHtml} from '../scripts/site-footer.mjs';
import {withPublicIllustration} from '../scripts/public-imagery.mjs';
const page=learningPages.find(page=>page.slug==='standards')!;
const html=()=>realityGradeStandardContent(page,learnHeader(),siteFooterHtml('/standards/'));
const render=()=>new DOMParser().parseFromString(html(),'text/html');

it('publishes the complete exact requirements from the formal sources and preserves the established assessment copy',()=>{
 const doc=render();
 expect(receivingRequirements).toHaveLength(16);expect(noteRequirements).toHaveLength(14);expect(standardGroups).toHaveLength(8);
 for(const [name,copy] of [...receivingRequirements,...noteRequirements]){expect(doc.body.textContent).toContain(name);expect(doc.body.textContent).toContain(copy);}
 for(const [head,copy] of page.sections){expect(doc.body.textContent).toContain(head);expect(doc.body.textContent).toContain(copy);}
 expect(standardGroups.flatMap(group=>group[3]).every(name=>receivingRequirements.some(([key])=>key===name))).toBe(true);
 expect(doc.querySelectorAll('h1')).toHaveLength(1);
 for(const value of ['Bankeiz','Receiz','Reality-Grade Banking','Authenticity','Current authority','Accepted transition'])expect(doc.body.textContent).toContain(value);
});

it('keeps every depth and interaction available in static HTML without a script, account read or financial action',()=>{
 const doc=render();
 expect(doc.querySelector('[data-reality-grade-standard]')).not.toBeNull();
 expect(doc.querySelector('script,iframe,canvas,[data-public-script]')).toBeNull();
 const inputs=[...doc.querySelectorAll<HTMLInputElement>('.rgb-stage-radio')];
 expect(inputs).toHaveLength(6);expect(inputs.filter(input=>input.checked)).toHaveLength(1);
 for(const input of inputs){expect(input.type).toBe('radio');expect(doc.querySelector(`label[for="${input.id}"]`)).not.toBeNull();}
 expect(doc.querySelectorAll('.rgb-stage-panel')).toHaveLength(6);
 expect(receivingStages[4].slice(-2)).toEqual(['Restaurant retains $70','Supplier receives $180']);
 expect(70+180).toBe(250);expect(doc.body.textContent).toContain('Worked example.');
 expect(doc.body.textContent).toContain('they do not perform verification, issue a proof or move funds');
 for(const a of doc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'))expect(doc.getElementById(a.hash.slice(1)),a.hash).not.toBeNull();
 const ids=[...doc.querySelectorAll('[id]')].map(node=>node.id);expect(new Set(ids).size).toBe(ids.length);
});

it('links the exact binding, formal contract and independent assessment without duplicating its illustration',()=>{
 const doc=render();
 const hrefs=[...doc.querySelectorAll<HTMLAnchorElement>('a[href]')].map(a=>a.getAttribute('href'));
 for(const file of ['institution/receiving-standard.md','institution/receiver-profile.json','docs/note-continuity-standard.md','docs/conformance/integration-and-assessment.md','src/conformance/coverage.json'])expect(hrefs).toContain('https://github.com/kojibai/reality-grade-banking/blob/main/'+file);
 const profile=JSON.parse(readFileSync('institution/receiver-profile.json','utf8'));
 for(const value of [profile.schema,profile.profileVersion,profile.receizVersion,profile.ruleset,profile.registryDigest,profile.operationMatrixDigest])expect(doc.body.textContent).toContain(value);
 const content=html();expect(withPublicIllustration(content,page)).toBe(content);
 expect(doc.querySelectorAll('[data-public-imagery]')).toHaveLength(1);
});
