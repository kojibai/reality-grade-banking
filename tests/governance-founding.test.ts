import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {constitutionEdition,foundingRules} from '../src/features/voting/founding/charters';

it('binds both founding drafts to the same complete Constitution edition and opens reviewer qualification to participants',()=>{
 const file=(name:string)=>readFileSync('public/vote/constitution-zero/'+name);
 expect(createHash('sha256').update(file('source.txt')).digest('hex')).toBe(constitutionEdition.textSha256);
 expect(createHash('sha256').update(file('Constitution-Zero.pdf')).digest('hex')).toBe(constitutionEdition.pdfSha256);
 for(const org of ['Receiz','Bankeiz'] as const){
  const charter=foundingRules(org);
  expect(charter.articles.some(article=>article.text.includes(constitutionEdition.claim))).toBe(true);
  expect(charter.offices.find(office=>office.name==='Roll registrar')).toMatchObject({selection:'Election',eligibility:'Open',seats:3});
  expect(charter.purpose).toContain(org);
  expect(charter.treasury).toContain('This founding charter authorizes no payment.');
 }
});
