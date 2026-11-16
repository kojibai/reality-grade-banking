import {proposalPages} from '../src/content/proposal-pages.mjs';
import {agreementPages} from '../src/content/agreement-pages.mjs';
import {clientWorkProductPages} from '../src/content/client-work-product-pages.mjs';
import {businessFitPages} from '../src/content/business-fits.mjs';
import {packExampleBanks} from './product-preview-bank.mjs';

// Direct marketing visits use native links. The existing app still carries the
// same full pages in its retained navigation, with its Bank and public state.
export const directMarketingEntryPaths=Object.freeze(['/business/',...[...proposalPages,...agreementPages,...clientWorkProductPages,...businessFitPages].map(page=>page.path)]);
export const DIRECT_MARKETING_ENTRY_MAX_BYTES=2*1024*1024;
const paths=new Set(directMarketingEntryPaths);
export function assertDirectMarketingEntry(path,html){
 if(!paths.has(path))throw Error('MARKETING_ENTRY_PATH_INVALID:'+path);
 if(/\bid="(?:receiz-navigation|public-market-seed|public-discovery-seed|public-feed-seed|public-ledger-document-seed|bank-public-market-(?:seed|hint))"|\bclass="[^"]*account-opening-screen/.test(html))throw Error('MARKETING_ENTRY_UNRELATED_PAYLOAD:'+path);
 const bytes=Buffer.byteLength(html);
 if(bytes>DIRECT_MARKETING_ENTRY_MAX_BYTES)throw Error('MARKETING_ENTRY_HTML_BUDGET:'+path+':'+bytes);
 return bytes;
}
/** Capture before global example packing replaces page-local destinations with
 * references into the all-site bank. Intern only this page's existing examples;
 * the same walkthrough runtime resolves their exact local shared destinations. */
export function captureDirectMarketingEntries(pages){
 return new Map(directMarketingEntryPaths.map(path=>{
  const page=pages[path];
  if(!page||page.runtime||typeof page.head!=='string'||!page.head||typeof page.content!=='string'||!page.content)throw Error('MARKETING_ENTRY_REQUIRED:'+path);
  const local=packExampleBanks({[path]:page}),content=local.pages[path].content;
  const html=`<!doctype html><html lang="en" class="learn-surface"><head>${page.head}</head><body data-bank-surface="learn"><div id="public-learn-root">${content}</div>${local.shared}</body></html>`;
  assertDirectMarketingEntry(path,html);
  return[path,html];
 }));
}
