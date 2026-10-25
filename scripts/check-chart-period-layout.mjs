import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';

// Exercise the delivered stylesheet order without opening an account or making
// service requests. Component behavior is covered by chart-periods.test.tsx.
const directory=resolve(process.env.BANK_REGRESSION_DIST??'dist');
const html=await readFile(resolve(directory,'index.html'),'utf8');
const styles=[...html.matchAll(/<style\b[^>]*data-bank-stylesheet=[^>]*>[\s\S]*?<\/style>/g)].map(match=>match[0]).join('\n');
assert.ok(styles.includes('.periods'),'Delivered Account styles are required');
const browser=await chromium.launch({headless:true,...(process.env.BANK_BROWSER_EXECUTABLE?{executablePath:process.env.BANK_BROWSER_EXECUTABLE}:{})});
const results=[];
try{
 for(const width of [280,320,390,440,480,720,1440]){
  const page=await browser.newPage({viewport:{width,height:844}});
  try{
   await page.setContent(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<main class="main-panel"><section class="account-primary"><div class="balance-chart-panel"><div class="periods" aria-label="Chart period">${['All','1D','1W','1M','3M','1Y'].map(label=>`<button class="${label==='1Y'?'active':''}">${label}</button>`).join('')}</div></div></section></main>`);
   const buttons=await page.locator('.periods button').evaluateAll(elements=>elements.map(element=>{const box=element.getBoundingClientRect(),style=getComputedStyle(element);return {label:element.textContent,top:box.top,left:box.left,right:box.right,height:box.height,fontSize:style.fontSize};}));
   assert.equal(buttons.length,6);
   assert.ok(buttons.every(button=>button.top===buttons[0].top),`Account periods wrapped at ${width}px: ${JSON.stringify(buttons)}`);
   assert.ok(buttons.every(button=>button.fontSize==='12px'&&Math.abs(button.height-32)<0.01),`Account period sizing changed at ${width}px: ${JSON.stringify(buttons)}`);
   assert.ok(buttons.every(button=>button.left>=0&&button.right<=width),`Account periods overflowed at ${width}px`);
   // The same controls serve Market and object charts. Their scoped compact
   // sizing is intentional; their six ranges must also remain on one row.
   const assetButtons=await page.locator('.balance-chart-panel').evaluate(element=>{
    element.className='asset-chart';return [...element.querySelectorAll('.periods button')].map(button=>{const box=button.getBoundingClientRect();return {top:box.top,left:box.left,right:box.right};});
   });
   assert.ok(assetButtons.every(button=>button.top===assetButtons[0].top&&button.left>=0&&button.right<=width),`Object chart periods wrapped or overflowed at ${width}px`);
   results.push({width,buttons,assetButtons});
  }finally{await page.close();}
 }
 const output=resolve('test-results/browser-regressions');await mkdir(output,{recursive:true});
 await writeFile(resolve(output,'chart-period-layout.json'),JSON.stringify(results,null,2));
 console.log(`Account chart periods: one subtle row at ${results.map(result=>result.width).join(', ')}px.`);
}finally{await browser.close();}
