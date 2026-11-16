import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {proposalPages} from '../src/content/proposal-pages.mjs';
import {agreementPages} from '../src/content/agreement-pages.mjs';
import {clientWorkProductPages} from '../src/content/client-work-product-pages.mjs';
import {businessFitPages} from '../src/content/business-fits.mjs';
import {businessContent} from '../scripts/business-page.mjs';
import {fitContent} from '../scripts/business-fit-pages.mjs';
// @ts-expect-error Build-only page template.
import {proposalContent} from '../scripts/proposal-pages.mjs';
// @ts-expect-error Build-only page template.
import {agreementContent} from '../scripts/agreement-pages.mjs';
// @ts-expect-error Build-only page template.
import {clientWorkProductContent} from '../scripts/client-work-product-pages.mjs';
import {packExampleBanks} from '../scripts/product-preview-bank.mjs';
// @ts-expect-error Build-only document helper.
import {captureDirectMarketingEntries,assertDirectMarketingEntry,directMarketingEntryPaths,DIRECT_MARKETING_ENTRY_MAX_BYTES} from '../scripts/direct-marketing-entry.mjs';

const decode=(value:string)=>value.replaceAll('&quot;','"').replaceAll('&gt;','>').replaceAll('&lt;','<').replaceAll('&amp;','&');
function exampleBanks(html:string){
 const shared=JSON.parse(decode(html.match(/<template data-shared-example-views>([^<]*)<\/template>/)?.[1]??'[]'));
 return [...html.matchAll(/<template data-example-views>([^<]*)<\/template>/g)].map(match=>Object.fromEntries(Object.entries(JSON.parse(decode(match[1]))).map(([name,view])=>[name,typeof view==='number'?shared[view]:view])));
}
const visibleMarkup=(html:string)=>html.replace(/<template data-(?:shared-)?example-views>[^<]*<\/template>/g,'');
const taskPages=[...proposalPages,...agreementPages,...clientWorkProductPages];
const rawPages=Object.fromEntries([
 ['/business/',businessContent()],
 ...proposalPages.map(page=>[page.path,proposalContent(page)]),
 ...agreementPages.map(page=>[page.path,agreementContent(page)]),
 ...clientWorkProductPages.map(page=>[page.path,clientWorkProductContent(page)]),
 ...businessFitPages.map(page=>[page.path,fitContent(page.fit)]),
].map(([path,content])=>[path,{head:`<title>${path}</title><link rel="canonical" href="https://bankeiz.com${path}"><script src="/learn/learn.js?v=held" defer></script>`,content}]));

it('limits independent delivery to the forty marketing owners and leaves application navigation untouched',()=>{
 expect(directMarketingEntryPaths).toHaveLength(40);
 expect(new Set(directMarketingEntryPaths)).toEqual(new Set(['/business/',...taskPages.map(page=>page.path),...businessFitPages.map(page=>page.path)]));
 for(const path of ['/','/learn/','/learn/guides/','/explore/','/feed/','/ledger/','/fit/'])expect(directMarketingEntryPaths).not.toContain(path);
 const before=JSON.stringify(rawPages),entries=captureDirectMarketingEntries(rawPages);
 expect(JSON.stringify(rawPages)).toBe(before);
 const carried=packExampleBanks(rawPages);
 for(const path of directMarketingEntryPaths){
  expect(exampleBanks(entries.get(path)!)).toEqual(exampleBanks(rawPages[path].content));
  expect(exampleBanks(carried.pages[path].content+carried.shared)).toEqual(exampleBanks(rawPages[path].content));
 }
});

it('keeps every real first frame, exact head, local example destination and native account link without a global carrier',()=>{
 const entries=captureDirectMarketingEntries(rawPages);
 for(const [path,html]of entries){
  expect(html.match(/<head>([\s\S]*?)<\/head>/)![1]).toBe(rawPages[path].head);
  const body=html.match(/<div id="public-learn-root">([\s\S]*?)<\/div>(?:<template data-shared-example-views>[^<]*<\/template>)?<\/body>/)![1];
  expect(visibleMarkup(body)).toBe(visibleMarkup(rawPages[path].content));
  expect(html).toContain('href="/#account/messages"');
  expect(html).not.toMatch(/receiz-navigation|public-market-seed|public-discovery-seed|public-feed-seed|public-ledger-document-seed|bank-public-market-seed|account-opening-screen/);
  expect(assertDirectMarketingEntry(path,html)).toBeLessThanOrEqual(DIRECT_MARKETING_ENTRY_MAX_BYTES);
 }
 const business=entries.get('/business/')!;
 expect(exampleBanks(business)).toHaveLength(2);
 expect((business.match(/data-shared-example-views/g)??[])).toHaveLength(1);
 expect(Buffer.byteLength(business)).toBeLessThan(Buffer.byteLength(rawPages['/business/'].content)-500_000);
 const runtime=readFileSync('public/learn/learn.js','utf8');
 expect(runtime.indexOf("loadPublic('client-work-demo')")).toBeLessThan(runtime.indexOf("getElementById('receiz-navigation')"));
 expect(runtime).toContain("if (!element?.textContent) return;");
});

it('refuses missing marketing content, accidental app payloads and byte-budget regressions',()=>{
 expect(()=>captureDirectMarketingEntries({...rawPages,'/business/':undefined})).toThrow(/MARKETING_ENTRY_REQUIRED/);
 const html=captureDirectMarketingEntries(rawPages).get('/proposals/')!;
 expect(()=>assertDirectMarketingEntry('/proposals/',html+'😀'.repeat(DIRECT_MARKETING_ENTRY_MAX_BYTES/4))).toThrow(/MARKETING_ENTRY_HTML_BUDGET/);
 for(const id of ['receiz-navigation','public-market-seed','public-ledger-document-seed'])expect(()=>assertDirectMarketingEntry('/proposals/',html+`<script id="${id}" type="application/json">{}</script>`)).toThrow(/MARKETING_ENTRY_UNRELATED_PAYLOAD/);
 expect(()=>assertDirectMarketingEntry('/learn/',html)).toThrow(/MARKETING_ENTRY_PATH_INVALID/);
});
