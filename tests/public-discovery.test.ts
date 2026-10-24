// @vitest-environment happy-dom
import {expect,it} from 'vitest';
import {learningPages,learningPath} from '../src/content/learning-pages.mjs';
import {businessFitPages,directoryPage} from '../src/content/business-fits.mjs';
import {cooperativePages,cooperativeContent} from '../scripts/cooperative-page.mjs';
import {businessContent} from '../scripts/business-page.mjs';
import {vaultContent} from '../scripts/vault-page.mjs';
import {protectionContent,protectionPage} from '../scripts/vault-protection-page.mjs';
// @ts-expect-error Static public templates are plain ESM.
import {learningDirectoryPage,learnArticle,learnHome} from '../scripts/learn-template.mjs';
import {publicPages} from '../scripts/public-page-metadata.mjs';
const doc=(html:string)=>new DOMParser().parseFromString(html,'text/html');
const paths=(root:ParentNode,selector:string)=>new Set([...root.querySelectorAll<HTMLAnchorElement>(selector)].map(a=>a.getAttribute('href')));
const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');

it('exposes the solution hubs through the shared footer and keeps each directory exhaustive',()=>{
 const footer=paths(doc(protectionContent()),'.site-footer a');
 expect(footer.has('/business/')).toBe(false);expect(footer.has(protectionPage.path)).toBe(false);
 for(const path of ['/for/businesses/',directoryPage.path,'/coops/','/vaults/'])expect(footer.has(path),path).toBe(true);
 const directory=doc(learningDirectoryPage()),links=paths(directory,'main a');
 for(const path of [...learningPages.map(learningPath),'/business/',directoryPage.path,'/vaults/',protectionPage.path,...businessFitPages.map(p=>p.path),...cooperativePages.map(p=>p.path)])expect(links.has(path),'Guide directory: '+path).toBe(true);
 const known=new Set(publicPages.map(p=>p.path));for(const path of links)if(path?.startsWith('/')&&!path.includes('#'))expect(known.has(path),path).toBe(true);
});

it('links readers from relevant existing guides without removing their related destinations',()=>{
 const expected={
  security:['/protect/','/vaults/'],
  'receiz-id':['/vaults/','/protect/'],
  'proof-objects':['/vaults/'],ownership:['/vaults/'],
  'physical-assets':['/coops/'],
  'proof-native-economy':['/coops/'],
  institutions:['/cooperatives/infrastructure/'],
  messages:['/business/','/fit/'],
  'for-businesses':['/business/','/fit/'],
  'for-communities':['/coops/']
 };
 for(const [slug,extra] of Object.entries(expected)){
  const page=learningPages.find(p=>p.slug===slug)!;expect(page,slug).toBeTruthy();
  const article=doc(learnArticle(page,learningPages,escape)),links=paths(article,'main nav[aria-label="Related guides"] a');
  for(const path of [...page.related,...extra])expect(links.has(path),slug+': '+path).toBe(true);
 }
});

it('connects the solution story to the guide and existing banking contexts in both directions',()=>{
 expect(paths(doc(learnHome()),'main a').has('/protect/')).toBe(true);
 expect(paths(doc(learnHome()),'main a').has('/coops/')).toBe(true);
 expect(paths(doc(vaultContent()),'main a').has(protectionPage.path)).toBe(true);
 expect(paths(doc(protectionContent()),'main a').has('/vaults/')).toBe(true);
 expect(paths(doc(businessContent()),'main a').has(protectionPage.path)).toBe(true);
 expect(paths(doc(cooperativeContent()),'main a').has(protectionPage.path)).toBe(true);
});
