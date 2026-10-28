// @vitest-environment happy-dom
import{expect,it,vi}from'vitest';
import{renderToStaticMarkup}from'react-dom/server';
import{existsSync}from'node:fs';
import{ProductScreen,productScreenNames}from'../src/presentation/ProductScreen';
import{MeetingStartPreview}from'../src/presentation/MeetingStartPreview';
import{exampleAssets}from'../src/content/product-example-assets.mjs';
// @ts-expect-error Build-only ESM helper deliberately has no application declaration.
import{exampleNavigation}from'../scripts/product-preview-navigation.mjs';
const parse=(html:string)=>new DOMParser().parseFromString(html,'text/html');
const render=(screen:string)=>parse(renderToStaticMarkup(<ProductScreen screen={screen}/>));
function populatedAccount(doc:Document){
 const total=doc.querySelector('.account-investment-total');expect(total?.querySelector('.account-investment-total-copy strong')?.textContent).toBe('$1,000.00');expect(total?.textContent).toContain('Invested $910.00');
 expect(doc.querySelectorAll('.account-investment-row')).toHaveLength(3);expect(doc.querySelector('.account-assets-summary .empty-state')).toBeNull();
 for(const row of doc.querySelectorAll('.account-investment-row')){expect(row.querySelector('img')).not.toBeNull();expect(row.querySelector('[aria-label="Current holding value"]')?.textContent).not.toMatch(/^(?:—|\$0\.00)$/);}
}
it('paints the account investment total and owned assets from the shared example holdings on first render',()=>{
 const doc=render('account');populatedAccount(doc);expect(doc.querySelector('.balance-amount')?.textContent).toBe('$1,125.00');expect(doc.body.textContent).toContain('Actual interface · Example data');
});
it('fills Assets with priced investments, held source rows, distinct showcase images and deterministic history',()=>{
 const doc=render('assets');expect(doc.querySelectorAll('.investment-row')).toHaveLength(3);expect(doc.querySelector('.investment-summary strong')?.textContent).toBe('$1,000.00');
 expect(doc.querySelector('.investment-summary')?.textContent).toContain('+$90.00');expect(doc.querySelectorAll('.investment-chart .periods button')).toHaveLength(6);expect(doc.querySelector('.investment-chart svg')).not.toBeNull();
 expect(doc.querySelector('.investment-empty')).toBeNull();expect(doc.querySelectorAll('.assets-summary + .section-heading + .rows-surface .asset-row').length).toBeGreaterThan(0);
 expect(doc.querySelectorAll('.market-rows .asset-row')).toHaveLength(8);expect(doc.querySelectorAll('.market-rows img')).toHaveLength(8);expect(doc.body.textContent).not.toContain('Your deposited proof objects will appear here.');expect(doc.body.textContent).not.toContain('Your purchased shares will appear here.');
 expect(doc.querySelector('summary')?.textContent).not.toBe('');expect(doc.body.textContent).toContain('Trade history');
});
it('keeps every shared Account background and meeting start stage populated without transport',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NO_EXAMPLE_TRANSPORT'));
 try{for(const screen of productScreenNames){const doc=render(screen);expect(doc.querySelector('[inert]')).not.toBeNull();if(doc.querySelector('.live-account'))populatedAccount(doc);expect(doc.querySelector('iframe,script')).toBeNull();}
 for(const screen of ['start-account','start-holdings','start-messages','start-calendar','start-event']){const doc=parse(renderToStaticMarkup(<MeetingStartPreview screen={screen}/>));populatedAccount(doc);for(const image of doc.querySelectorAll('img'))expect(exampleAssets.some(asset=>asset.image===image.getAttribute('src'))).toBe(true);}
 expect(fetch).not.toHaveBeenCalled();}finally{fetch.mockRestore();}
});
it('normalizes only the shared example art and opens investments through the existing Assets destination',async()=>{
 for(const screen of ['account','assets','market',...exampleAssets.map(asset=>'asset-detail-'+asset.id)]){
  const doc=parse(await exampleNavigation(renderToStaticMarkup(<ProductScreen screen={screen}/>),screen));
  for(const img of doc.querySelectorAll<HTMLImageElement>('img')){const src=img.getAttribute('src')!;expect(exampleAssets.some(asset=>asset.image===src)).toBe(true);expect(existsSync('public'+src)).toBe(true);}
  const investments=doc.querySelector('[aria-label="View investments"]');if(investments)expect(investments.getAttribute('data-example-action')).toBe('assets');
  expect(doc.querySelectorAll('.market-rows .asset-row').length===0||doc.querySelectorAll('.market-rows img').length===8).toBe(true);
 }
});

it('keeps sample arithmetic consistent and carries no fabricated Original or financial authority',async()=>{
 const {productExamplePortfolio:portfolio,productExampleCatalog:catalog,productExampleInvestmentHistory:history,productExampleWallet:wallet,productExampleHeldSources:held}=await import('../src/presentation/product-fixtures');
 const {portfolioValue}=await import('../src/receiz/market-portfolio-value');expect(portfolioValue(portfolio,catalog.items)).toMatchObject({valueUsdCents:'100000',costBasisUsdCents:'91000',pnlUsdCents:'9000'});expect(wallet.totalUsdCents).toBe('112500');expect(history.series.ALL.at(-1)?.usdCents).toBe('100000');
 for(const position of portfolio.positions){const buys=portfolio.trades.filter(trade=>trade.marketItemId===position.marketItemId);expect(buys.reduce((sum,trade)=>sum+BigInt(trade.shareQuantityMicro),0n)).toBe(BigInt(position.shareQuantityMicro));expect(buys.reduce((sum,trade)=>sum+BigInt(trade.settlementUsdCents!),0n)).toBe(BigInt(position.costBasisUsdCents!));}
 for(const [index,item]of catalog.items.entries()){expect(item.priceUsd).toBe(exampleAssets[index].value);expect(item.authority).toBe('projection-only');expect(item.canTrade).toBe(false);expect(item.originalUrl).toBeNull();expect(item.originalDigest).toBeNull();expect(item.nativeAsset).toBeUndefined();expect(item.proofManifest?.some(row=>row.value.includes('not an Original proof'))).toBe(true);}
 expect(held.length).toBeGreaterThan(0);for(const row of held){expect(row.bytes).toHaveLength(0);expect(row.digest).toMatch(/^illustrative-/);expect(row.nativeAsset).toBeUndefined();}
});

it('keeps demo artwork localization closed to the exact illustrative image allowlist',async()=>{
 const {localizeProductExampleArtwork}=await import('../src/presentation/product-example-artwork.mjs');
 const image=exampleAssets[0].image,canonical='https://receiz.com'+image,source='<img src="'+canonical+'"><link rel="preload" href="'+canonical+'">';expect(localizeProductExampleArtwork(source)).toBe('<img src="'+image+'"><link rel="preload" href="'+image+'">');
 for(const url of ['https://receiz.com/api/account','https://receiz.com/api/proof-material/packages/'+'ab'.repeat(32)+'/artifact','https://other.example'+image,'https://receiz.com/art/unknown.png']){const html='<img src="'+url+'"><a href="'+url+'">Source</a>';expect(localizeProductExampleArtwork(html)).toBe(html);}
});
