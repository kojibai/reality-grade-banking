import {afterEach,expect,it,vi} from 'vitest';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import {receiptLink,readReceiptLink} from '../src/receiz/ledger-receipts';
afterEach(()=>vi.unstubAllGlobals());
const source=()=>parsePublicNetworkPage('wallet',{ok:true,events:[{id:'t',kind:'chat_transfer',summary:'Alex & Sam <record>',amountUsdCents:'12500',pulse:'123',sender:{displayName:'Alex'},recipient:{displayName:'Sam'}}]}).records[0];
async function preview(){const mod=await import('../server/receipt-preview').catch(()=>null);expect(typeof mod?.handleReceiptPreview).toBe('function');return mod!;}
it('serves crawler-visible receipt metadata with the same complete packet and no upstream or account access',async()=>{
 const {handleReceiptPreview}=await preview(),{compactReceiptLink}=await import('../src/receiz/receipt-sharing');
 const link=compactReceiptLink(receiptLink(source())!),page=vi.fn(async()=>'<html><head><title>Generic</title></head><body><div id="root"></div><script type="module" src="/assets/receipt.js"></script></body></html>'),image=vi.fn(),fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{const response=await handleReceiptPreview(new Request(link),{page,image});expect(response.status).toBe(200);const html=await response.text();expect(html).toContain('property="og:image"');expect(html).toContain('name="twitter:card" content="summary_large_image"');expect(html).toContain('$125.00');expect(html).toContain('/assets/receipt.js');expect(html).toContain('noindex,nofollow');expect(html).not.toContain('<record>');expect(image).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();}finally{vi.unstubAllGlobals();}
});
it('renders a real receipt PNG at the advertised dimensions using carried data only',async()=>{
 const {handleReceiptPreview}=await preview(),{compactReceiptLink}=await import('../src/receiz/receipt-sharing');
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 const response=await handleReceiptPreview(new Request(compactReceiptLink(receiptLink(source())!)+'&image=1'));
 expect(response.status).toBe(200);expect(response.headers.get('content-type')).toBe('image/png');
 const png=new Uint8Array(await response.arrayBuffer());expect([...png.slice(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
 const view=new DataView(png.buffer);expect(view.getUint32(16)).toBe(1730);expect(view.getUint32(20)).toBe(909);expect(fetch).not.toHaveBeenCalled();
});
it('escapes packet text, replaces generic metadata and keeps a single specific image for crawlers',async()=>{
 const {handleReceiptPreview}=await preview(),{compactReceiptLink}=await import('../src/receiz/receipt-sharing');
 const link=compactReceiptLink(receiptLink(source())!);
 const page=async()=>'<html><head><meta name="robots" content="index"><meta property="og:image" content="generic.png"><meta name="twitter:title" content="Generic"><link rel="canonical" href="https://bankeiz.com/receipt/"></head><body>App</body></html>';
 const response=await handleReceiptPreview(new Request(link),{page,image:vi.fn()});const html=await response.text();
 expect(html.match(/property="og:image" /g)).toHaveLength(1);expect(html).not.toContain('generic.png');expect(html).not.toContain('content="Generic"');expect(html).toContain('noindex,nofollow');expect(html).toContain('image=1');expect(response.headers.get('referrer-policy')).toBe('no-referrer');
});
it('refuses duplicate parameters, unknown options and mutations without invoking renderers',async()=>{
 const {handleReceiptPreview}=await preview(),{compactReceiptLink}=await import('../src/receiz/receipt-sharing'),link=compactReceiptLink(receiptLink(source())!),page=vi.fn(),image=vi.fn();
 for(const suffix of ['&r=bad','&image=2','&unknown=1','&image=1&image=1'])expect((await handleReceiptPreview(new Request(link+suffix),{page,image})).status).toBe(400);
 expect((await handleReceiptPreview(new Request(link,{method:'POST'}),{page,image})).status).toBe(405);expect(page).not.toHaveBeenCalled();expect(image).not.toHaveBeenCalled();
});
it('keeps card valuation distinct from consideration and never substitutes an unavailable value',async()=>{
 const {receiptPreviewText}=await preview();
 const record=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'card',kind:'sports_card_transfer',pulse:120,amountUsdCents:'100',cardValueUsdCents:'9900'}]}).records[0];
 const card=receiptPreviewText(readReceiptLink(receiptLink(record)!));expect(card.amount).toBe('$99.00');expect(card.valueLabel).toBe('Card value at transfer');
 const unavailable=receiptPreviewText(readReceiptLink(receiptLink(record,{basis:'unavailable',amountUsdCents:null,pulse:'120',considerationUsdCents:'100'})!));
 expect(unavailable.amount).toBe('Source record');expect(unavailable.valueLabel).toBe('Value unavailable');
});
it('does no image rendering or template work for HEAD and refuses malformed packets before rendering',async()=>{
 const {handleReceiptPreview}=await preview(),{compactReceiptLink}=await import('../src/receiz/receipt-sharing'),link=compactReceiptLink(receiptLink(source())!),page=vi.fn(),image=vi.fn();
 for(const url of [link,link+'&image=1']){const response=await handleReceiptPreview(new Request(url,{method:'HEAD'}),{page,image});expect(response.status).toBe(200);expect(await response.text()).toBe('');}
 expect(page).not.toHaveBeenCalled();expect(image).not.toHaveBeenCalled();expect((await handleReceiptPreview(new Request('https://bankeiz.com/receipt/?r=bad'),{page,image})).status).toBe(400);expect(image).not.toHaveBeenCalled();
});
it('opens a short receipt with one digest-bound source read and carries escaped full initial data',async()=>{
 const {completeLedgerReceipt}=await import('../src/receiz/ledger-receipts'),{receiptDigest}=await import('../src/receiz/receipt-snapshot');
 const receipt=completeLedgerReceipt(source());receipt.title='</script><script>bad()</script>';
 const bytes=new TextEncoder().encode(JSON.stringify(receipt)),digest=await receiptDigest(bytes),fetcher=vi.fn(async()=>new Response(bytes));vi.stubGlobal('fetch',fetcher);
 const {handleReceiptPreview}=await preview();const res=await handleReceiptPreview(new Request('https://bankeiz.com/receipt/'+digest+'/'),{page:async()=>'<html><head></head><body><div id="root"></div></body></html>',image:vi.fn()});
 expect(res.status).toBe(200);const html=await res.text();expect(html).toContain('id="receipt-snapshot"');expect(html).not.toContain('<script>bad()');expect(html).toContain('data-digest="'+digest+'"');expect(fetcher).toHaveBeenCalledOnce();expect(html).toContain('/api/receipt?s='+digest+'&amp;image=1');
});
it('accepts the same short digest carried by both the public path and hosting rewrite',async()=>{
 const {completeLedgerReceipt}=await import('../src/receiz/ledger-receipts'),{receiptDigest}=await import('../src/receiz/receipt-snapshot');
 const receipt=completeLedgerReceipt(source()),bytes=new TextEncoder().encode(JSON.stringify(receipt)),digest=await receiptDigest(bytes),fetcher=vi.fn(async()=>new Response(bytes));vi.stubGlobal('fetch',fetcher);
 const {handleReceiptPreview}=await preview(),deps={page:async()=>'<html><head></head><body></body></html>',image:vi.fn()};
 const response=await handleReceiptPreview(new Request(`https://bankeiz.com/receipt/${digest}/?s=${digest}`),deps);
 expect(response.status).toBe(200);expect(await response.text()).toContain('id="receipt-snapshot"');expect(fetcher).toHaveBeenCalledOnce();
 expect((await handleReceiptPreview(new Request(`https://bankeiz.com/receipt/${digest}/?s=${'a'.repeat(64)}`),deps)).status).toBe(400);expect(fetcher).toHaveBeenCalledOnce();
});
it('preserves literal replacement metacharacters in a saved receipt seed',async()=>{
 const {completeLedgerReceipt}=await import('../src/receiz/ledger-receipts'),{receiptDigest}=await import('../src/receiz/receipt-snapshot');
 const receipt=completeLedgerReceipt(source());receipt.title="Price $$100 $& $` $'";
 const bytes=new TextEncoder().encode(JSON.stringify(receipt)),digest=await receiptDigest(bytes);vi.stubGlobal('fetch',vi.fn(async()=>new Response(bytes)));
 const {handleReceiptPreview}=await preview(),res=await handleReceiptPreview(new Request('https://bankeiz.com/receipt/'+digest+'/'),{page:async()=>'<html><head></head><body><div id="root"></div></body></html>',image:vi.fn()});
 const html=await res.text(),json=html.match(/id="receipt-snapshot"[^>]*>([\s\S]*?)<\/script>/)![1];expect(JSON.parse(json).title).toBe(receipt.title);
});
it('accepts the exact named route parameter from hosting and rejects a conflicting digest',async()=>{
 const {handleReceiptPreview}=await preview(),digest='a'.repeat(64),page=vi.fn(),image=vi.fn();
 for(const path of [`/receipt/${digest}/?s=${digest}&digest=${digest}`,`/api/receipt?s=${digest}&digest=${digest}`]){
  expect((await handleReceiptPreview(new Request('https://bankeiz.com'+path,{method:'HEAD'}),{page,image})).status).toBe(200);
 }
 for(const path of [`/receipt/${digest}/?s=${digest}&digest=${'b'.repeat(64)}`,`/api/receipt?digest=${digest}`,`/api/receipt?s=${digest}&digest=${digest}&digest=${digest}`]){
  expect((await handleReceiptPreview(new Request('https://bankeiz.com'+path,{method:'HEAD'}),{page,image})).status).toBe(400);
 }
 expect(page).not.toHaveBeenCalled();expect(image).not.toHaveBeenCalled();
});
it('rejects an empty snapshot selector mixed into a legacy receipt request',async()=>{
 const {handleReceiptPreview}=await preview(),{compactReceiptLink}=await import('../src/receiz/receipt-sharing');expect((await handleReceiptPreview(new Request(compactReceiptLink(receiptLink(source())!)+'&s='))).status).toBe(400);
});
it('carries the same verified short receipt before unrelated navigation so early entry never reads it again',async()=>{
 const {completeLedgerReceipt}=await import('../src/receiz/ledger-receipts'),{receiptDigest}=await import('../src/receiz/receipt-snapshot');
 const receipt=completeLedgerReceipt(source()),bytes=new TextEncoder().encode(JSON.stringify(receipt)),digest=await receiptDigest(bytes),fetcher=vi.fn(async()=>new Response(bytes));vi.stubGlobal('fetch',fetcher);
 const {handleReceiptPreview}=await preview(),template='<html><head></head><body><div id="public-receipt-root">Complete receipt view</div><script id="receiz-navigation" type="application/json">{"all":"existing navigation"}</script></body></html>';
 const response=await handleReceiptPreview(new Request('https://bankeiz.com/receipt/'+digest+'/'),{page:async()=>template,image:vi.fn()}),html=await response.text();
 expect(response.status).toBe(200);expect(html.indexOf('id="receipt-snapshot"')).toBeLessThan(html.indexOf('id="receiz-navigation"'));expect(JSON.parse(html.match(/id="receipt-snapshot"[^>]*>([\s\S]*?)<\/script>/)![1])).toEqual(receipt);expect(html).toContain('{"all":"existing navigation"}');expect(fetcher).toHaveBeenCalledOnce();
});
