import {beforeAll,expect,it} from 'vitest';
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
const sharedExamples=(html:string)=>JSON.parse(decode(html.match(/<template data-shared-example-views>([^<]*)<\/template>/)?.[1]??'[]'));
function exampleBanks(html:string,shared=sharedExamples(html)){
 return [...html.matchAll(/<template data-example-views>([^<]*)<\/template>/g)].map(match=>Object.fromEntries(Object.entries(JSON.parse(decode(match[1]))).map(([name,view])=>{
  const source=typeof view==='number'?shared[view]:view;
  return[name,Array.isArray(source.html)?{...source,html:source.html.map((part:string|number)=>typeof part==='number'?shared[part]:part).join('')}:source];
 })));
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
let entries:ReturnType<typeof captureDirectMarketingEntries>,carried:ReturnType<typeof packExampleBanks>,before:string,shared:ReturnType<typeof sharedExamples>;
// Generate the unchanged forty-page corpus once. Each assertion still opens
// its exact emitted bytes; fixture preparation is not a page-latency budget.
beforeAll(()=>{before=JSON.stringify(rawPages);entries=captureDirectMarketingEntries(rawPages);carried=packExampleBanks(rawPages);shared=sharedExamples(carried.shared);});

it('limits independent delivery to the forty marketing owners and leaves application navigation untouched',()=>{
 expect(directMarketingEntryPaths).toHaveLength(40);
 expect(new Set(directMarketingEntryPaths)).toEqual(new Set(['/business/',...taskPages.map(page=>page.path),...businessFitPages.map(page=>page.path)]));
 for(const path of ['/','/learn/','/learn/guides/','/explore/','/feed/','/ledger/','/fit/'])expect(directMarketingEntryPaths).not.toContain(path);
 expect(JSON.stringify(rawPages)).toBe(before);
 for(const path of directMarketingEntryPaths){
  const expected=exampleBanks(rawPages[path].content);
  expect(exampleBanks(entries.get(path)!)).toEqual(expected);
  expect(exampleBanks(carried.pages[path].content,shared)).toEqual(expected);
 }
});

it('keeps every real first frame, exact head, local example destination and native account link without a global carrier',()=>{
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
 expect(runtime).toContain("if (!element?.firstChild) return;");
 expect(runtime).not.toContain("if (!element?.textContent) return;");
});

it('refuses missing marketing content, accidental app payloads and byte-budget regressions',()=>{
 expect(()=>captureDirectMarketingEntries({...rawPages,'/business/':undefined})).toThrow(/MARKETING_ENTRY_REQUIRED/);
 const html=entries.get('/proposals/')!;
 expect(()=>assertDirectMarketingEntry('/proposals/',html+'😀'.repeat(DIRECT_MARKETING_ENTRY_MAX_BYTES/4))).toThrow(/MARKETING_ENTRY_HTML_BUDGET/);
 for(const id of ['receiz-navigation','public-market-seed','public-ledger-document-seed'])expect(()=>assertDirectMarketingEntry('/proposals/',html+`<script id="${id}" type="application/json">{}</script>`)).toThrow(/MARKETING_ENTRY_UNRELATED_PAYLOAD/);
 expect(()=>assertDirectMarketingEntry('/learn/',html)).toThrow(/MARKETING_ENTRY_PATH_INVALID/);
});
