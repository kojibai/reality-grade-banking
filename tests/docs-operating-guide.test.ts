import {expect,it} from 'vitest';
import {docsArticles,docsPaths,docsEdition,articleText} from '../src/content/banking-docs.mjs';
const original=['getting-started','infrastructure','concepts','trust','glossary','reserve-settlement','funding','payments','receiving','fees','notes','offline','recovery','identity','backup','security','permissions','vaults','disclosure','assets','backing','publication','ownership','market-trading','market-records','market-value','records','verification','agents','agent-continuity','integrations','sdk','mcp','ai-skills','merchant-checkout','conformance','compatibility'];
const operating={
 messages:['New conversation','Start conversation','Voice call','Enable notifications','Delivery not confirmed'],
 contacts:['Save contact','Import contacts','CSV, vCard or JSON','Confirm archive contact','History'],
 'calendar-booking':['Create appointment','Save availability','Create a custom link','Book this time','Download proof record'],
 meetings:['Meet now','Join with audio','Send money','Seal meeting history','Check payment'],
 'twin-workspace':['Save changes','Mind','Work','Copy Twin embed','Review current settings'],
 'business-setup':['Connect your provider','DNS saved','Profile verified','Run this action','Check result'],
 credits:['Manage existing plan','Add credits','Check this same top-up','Resume money task','7,500'],
 certificates:['Review certificate','Copy purchase link','issuing owner','Deposit shares','Continue saved operation'],
};
it('keeps all 37 published paths and adds eight complete practical operating chapters',()=>{
 expect(docsArticles).toHaveLength(47);
 expect(docsArticles.map(p=>p.slug)).toEqual(expect.arrayContaining([...original,...Object.keys(operating)]));
 expect(new Set(docsArticles.map(p=>p.slug)).size).toBe(47);
 expect(docsEdition.packages).toBe('129.0.0');
 for(const [slug,actions] of Object.entries(operating)){
  const article=docsArticles.find(p=>p.slug===slug)!;
  expect(article.sections.length,slug).toBeGreaterThanOrEqual(5);
  const text=articleText(article);
  for(const action of actions)expect(text,slug+': '+action).toContain(action);
  expect(article.sections.some(s=>s.blocks.some(b=>b.type==='steps')),slug+' steps').toBe(true);
  expect(article.sections.some(s=>/inspect|result|confirm/i.test(s.title)),slug+' result/evidence').toBe(true);
  expect(text,slug+' interruption handling').toMatch(/pending|unknown|not confirmed|unavailable|interrupted/i);
 }
});
it('makes daily money, people, owned sources and Business findable without replacing depth',()=>{
 const linked=docsPaths.flatMap(p=>p.slugs);
 for(const slug of ['payments','receiving','funding',...Object.keys(operating),'ownership','vaults','notes','records','conformance'])expect(linked).toContain(slug);
 expect(docsPaths[0].slugs).toEqual(expect.arrayContaining(['payments','receiving','funding']));
});
it('teaches current creation, shipped transfer and distinct certificate authority',()=>{
 const text=(slug:string)=>articleText(docsArticles.find(p=>p.slug===slug)!);
 expect(text('assets')).toContain('Add backing');expect(text('publication')).toContain('Sign');
 expect(text('publication')).toContain('Bankeiz Market listing is separate');
 for(const phrase of ['Ownership to send','Review ownership transfer','Send ownership','Transaction complete.'])expect(text('ownership')).toContain(phrase);
 expect(text('certificates')).toContain('Only the issuing owner can deposit');
 expect(text('certificates')).toContain('total ownership stays the same');
 expect(text('market-value')).toContain('Shares & market cap');
 expect(text('market-value')).toContain('remaining buying capacity');
 expect(text('identity')).toContain('Continue with PBI');
 const all=docsArticles.map(articleText).join(' ');
 expect(all).not.toMatch(/choose the Shares or Originals picker|chat-first booking|pay to book/i);
});

it('teaches private meeting downloads without equating a browser request to an OS save',()=>{
 const text=articleText(docsArticles.find(p=>p.slug==='meetings')!);
 for(const phrase of ['Download meeting & ID','Identity Record','unlock phrase','End or Leave','historical ended room','browser download request','same retained proof'])expect(text).toContain(phrase);
 expect(text).not.toContain('Download your proof object');
});
