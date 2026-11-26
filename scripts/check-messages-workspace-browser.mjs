import assert from 'node:assert/strict';
import {writeFile,mkdtemp,mkdir,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer} from 'vite';
import {chromium,webkit} from 'playwright';
const cache=await mkdtemp(join(tmpdir(),'bank-messages-browser-')),evidence=process.env.MESSAGES_VISUAL_EVIDENCE;
if(evidence)await mkdir(evidence,{recursive:true});
const server=await createServer({cacheDir:cache,server:{host:'127.0.0.1',port:5184,strictPort:true,hmr:false,ws:false},optimizeDeps:{noDiscovery:true,include:['react','react-dom/client','lucide-react','fflate']}});
await server.listen();const origin=server.resolvedUrls.local[0].replace(/\/$/,'');
const results=[];
try{
for(const [engine,type] of Object.entries(process.env.MESSAGES_BROWSER_ENGINES==='all'?{chromium,webkit}:{chromium})){
 const browser=await type.launch({headless:true,...(engine==='chromium'&&process.env.BANK_BROWSER_EXECUTABLE?{executablePath:process.env.BANK_BROWSER_EXECUTABLE}:{})});
 try{for(const width of [320,390,440,1280]){
  for(const channel of ['email','own']){
  const context=await browser.newContext({viewport:{width,height:950},serviceWorkers:'block'}),page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**',r=>r.abort());
  try{
   await page.goto(origin+'/tests/browser/messages-retained.html?appointment&'+channel);
   await page.getByRole('button',{name:'Open conversation Mira',exact:true}).click();
   const sheet=page.locator('.bank-messages-sheet[open]'),bounds=await sheet.boundingBox();
   assert.ok(bounds);
   if(width<=600){
    assert.deepEqual(bounds,{x:0,y:0,width,height:950},'Messages fills the phone viewport');
    if(channel==='own'){
     const composer=page.getByRole('textbox',{name:'Message…',exact:true});
     await composer.fill('Draft stays above the keyboard');
     await page.setViewportSize({width,height:540});
     await page.waitForFunction(()=>document.querySelector('.bank-messages-sheet').getBoundingClientRect().height===540);
     const field=await composer.boundingBox();
     assert.ok(field&&field.y+field.height<=540);
     assert.equal(await composer.inputValue(),'Draft stays above the keyboard');
     await composer.fill('');
     await composer.blur();
     await page.setViewportSize({width,height:950});
    }
   }else{
    assert.equal(bounds.width,480,'Desktop keeps the compact Messages dialog');
    assert.ok(bounds.x>0&&bounds.y>0);
   }
   await page.getByRole('button',{name:'Review appointment from message',exact:true}).click();
   const form=page.locator('.bank-message-appointment-form');
   assert.equal(await form.locator('[name=attendees]').inputValue(),channel==='email'?'mira@example.test':'');
   const layout=await form.evaluate(el=>{
    const bubble=el.closest('[data-chat-message]').getBoundingClientRect();
    return {bubble:{left:bubble.left,right:bubble.right},bounds:[el,...el.querySelectorAll('input,select,button')].map(n=>{const r=n.getBoundingClientRect();return {name:n.getAttribute('name')||n.tagName,left:r.left,right:r.right,width:r.width};})};
   });
   assert.ok(layout.bubble.left>=0&&layout.bubble.right<=width,JSON.stringify({engine,width,layout}));
   for(const r of layout.bounds)assert.ok(r.left>=layout.bubble.left&&r.right<=layout.bubble.right,JSON.stringify({engine,width,r,bubble:layout.bubble}));
   assert.equal(await page.evaluate(()=>window.calendarWrites.length),0);
   if(evidence)await page.screenshot({path:join(evidence,`appointment-${channel}-${engine}-${width}.png`)});
   await form.getByRole('button',{name:'Confirm appointment',exact:true}).click();
   await page.getByText('Saved to Calendar',{exact:true}).waitFor();
   const writes=await page.evaluate(()=>window.calendarWrites);assert.equal(writes.length,1);assert.equal(writes[0].metadata.sourceMessageId,'44444444-4444-4444-8444-444444444444');assert.equal(writes[0].metadata.conversationId,'33333333-3333-4333-8333-333333333333');
   await page.getByRole('button',{name:'Schedule appointment',exact:true}).click();await page.getByRole('textbox',{name:'Appointment title',exact:true}).waitFor();assert.equal(await page.locator('.organizer-form [name=attendees]').inputValue(),channel==='email'?'mira@example.test':'');
   await sheet.locator(':scope > .sheet-header').getByRole('button',{name:'Close',exact:true}).click();
   await sheet.waitFor({state:'hidden'});
   assert.deepEqual(errors,[]);results.push({engine,width,channel,layout,calendarWrites:1});
  }finally{await context.close();}}
  const ctx=await browser.newContext({viewport:{width,height:950},serviceWorkers:'block'}),twin=await ctx.newPage();
  try{
   await twin.route('https://**',r=>r.abort());await twin.goto(origin+'/tests/browser/messages-retained.html?twin&pending-history');await twin.getByRole('button',{name:'Messages',exact:true}).click();await twin.getByRole('button',{name:'Open conversation Mira',exact:true}).click();await twin.getByRole('button',{name:'Open relationship workspace',exact:true}).click();
   const mark=twin.locator('.bank-twin-welcome .bank-twin-mark'),heading=twin.locator('.bank-twin-welcome h3'),input=twin.getByRole('textbox',{name:'Ask your agent…',exact:true});
   assert.ok(await input.isEnabled());await input.fill('Keep this draft');assert.ok(await twin.getByRole('button',{name:'Ask your agent',exact:true}).isDisabled());await twin.evaluate(()=>window.heldInput=document.querySelector('[aria-label="Ask your agent…"]'));
   const a=await mark.boundingBox(),ha=await heading.boundingBox();assert.equal(a.width,36);assert.equal(a.height,36);assert.ok(Math.abs(a.y+a.height/2-ha.y-ha.height/2)<1);assert.ok(Math.abs(ha.x-a.x-a.width-13)<1);
   const svg=await mark.locator('svg').first().boundingBox();assert.equal(svg.width,22);assert.equal(await mark.evaluate(el=>getComputedStyle(el).transform),'none');assert.equal(await twin.getByText('Reading earlier messages…',{exact:true}).count(),0);
   if(evidence)await twin.screenshot({path:join(evidence,`twin-pending-${engine}-${width}.png`)});
   await twin.evaluate(()=>window.releaseWorkspaceHistory());await twin.locator('.bank-twin-mark.is-reading').waitFor({state:'detached'});await twin.waitForFunction(()=>!document.querySelector('[aria-label="Ask your agent"]').disabled);
   assert.deepEqual(await mark.boundingBox(),a);assert.deepEqual(await heading.boundingBox(),ha);assert.equal(await input.inputValue(),'Keep this draft');assert.ok(await twin.evaluate(()=>window.heldInput===document.querySelector('[aria-label="Ask your agent…"]')));
   if(evidence)await twin.screenshot({path:join(evidence,`twin-ready-${engine}-${width}.png`)});results.push({engine,width,mark:a,logoSvg:svg,unchangedAfterRecovery:true});
  }finally{await ctx.close();}
 }
 }finally{await browser.close();}
}
if(evidence)await writeFile(join(evidence,'results.json'),JSON.stringify({passed:true,results},null,2));console.log('PASS',results.length,'email/native appointments and stable Twin header states');
}finally{await server.close();await rm(cache,{recursive:true,force:true});}
