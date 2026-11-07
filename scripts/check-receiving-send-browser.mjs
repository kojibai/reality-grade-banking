import assert from 'node:assert/strict';
import {createServer as createHttpServer} from 'node:http';
import {mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createServer} from 'vite';
import {build} from 'esbuild';
import {chromium} from 'playwright';

// Actual Send and receiving sheet. Only private draft storage is an in-memory
// browser fixture; payment preparation/execution throws if accidentally used.
const output=process.env.BANK_RECEIVING_BROWSER_OUTPUT??'/private/tmp/bankeiz-adoption-browser/send';
const directory=await mkdtemp(join(tmpdir(),'bank-receiving-send-'));
let server,browser;
try{
 const source=`import React from 'react';import{createRoot}from'react-dom/client';import{LiveSend}from'./src/features/account/LivePayments';
 import './src/styles/tokens.css';import './src/styles/app.css';import './src/styles/features.css';
 const counts={status:0,prepare:0,execute:0,connect:0};window.counts=counts;
 const identity={binding:{artifactSha256:'a'.repeat(64)},username:'restaurant',knownProfile:()=>({displayName:'Restaurant'}),knownOrganizerDisplay:()=>null,walletSend:async()=>{counts.connect++;return{status:async()=>{counts.status++;return null;},prepare:async()=>{counts.prepare++;throw Error('No financial operation in presentation fixture');},execute:async()=>{counts.execute++;throw Error('No financial operation in presentation fixture');},discard:()=>{}};}};
 Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.copied=text;}}});
 createRoot(document.getElementById('root')).render(<div className="console"><main style={{maxWidth:540,margin:'auto',padding:24}}><LiveSend identity={identity} wallet={null} initialRequest={{recipient:'supplier@example.com',amount:'250.00'}} onClose={()=>{}}/></main></div>);`;
 // Reuse the real build-provenance plugin outputs without starting the app.
 const compiler=await createServer({server:{middlewareMode:true,hmr:false,ws:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'}),virtuals=new Map();
 try{for(const name of ['virtual:receiz-receiver-build','virtual:receiz-conformance-suite-build']){const id=await compiler.pluginContainer.resolveId(name),module=await compiler.pluginContainer.load(id.id);virtuals.set(name,typeof module==='string'?module:module.code);}}finally{await compiler.close();}
 await build({stdin:{contents:source,resolveDir:process.cwd(),sourcefile:'receiving-send-fixture.tsx',loader:'tsx'},bundle:true,format:'esm',platform:'browser',target:'es2022',outdir:directory,entryNames:'fixture',external:['/notes/*'],logLevel:'silent',plugins:[{name:'receiving-browser-inputs',setup(builder){builder.onResolve({filter:/^virtual:/},args=>({path:args.path,namespace:'actual-provenance'}));builder.onLoad({filter:/.*/,namespace:'actual-provenance'},args=>({contents:virtuals.get(args.path),loader:'js'}));builder.onLoad({filter:/[/\\]src[/\\]adoption[/\\]workspace\.ts$/},()=>({loader:'ts',contents:`let drafts=[];export async function openReceivingWork(){return{known:()=>structuredClone(drafts),save:async next=>{const index=drafts.findIndex(value=>value.id===next.id);if(index<0)drafts.push(structuredClone(next));else drafts[index]=structuredClone(next);},remove:async id=>{drafts=drafts.filter(value=>value.id!==id);}};}`}));}}]});
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Receiving options | Bankeiz fixture</title><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>';
 server=createHttpServer((request,response)=>{const path=new URL(request.url,'http://localhost').pathname;if(path==='/__receiving-fixture/'){response.writeHead(200,{'Content-Type':'text/html'}).end(html);return;}if(path==='/fixture.js'||path==='/fixture.css'){void readFile(join(directory,path.slice(1))).then(bytes=>response.writeHead(200,{'Content-Type':path.endsWith('.css')?'text/css':'application/javascript'}).end(bytes));return;}response.writeHead(404).end();});
 await new Promise((yes,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',yes);});const origin=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({headless:true,...(process.env.BANK_BROWSER_EXECUTABLE?{executablePath:process.env.BANK_BROWSER_EXECUTABLE}:{})});await mkdir(output,{recursive:true});const results=[];
 for(const [width,height]of[[390,844],[1440,1000]]){
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),requests=[],errors=[];page.on('pageerror',error=>errors.push(error.message));await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===origin&&!url.pathname.startsWith('/api/'))return route.continue();requests.push(url.origin+url.pathname);return route.abort();});
  await page.goto(origin+'/__receiving-fixture/');await page.getByRole('button',{name:'Review payment',exact:true}).waitFor();await page.screenshot({path:join(output,`${width}-send.png`),fullPage:true});
  assert.equal(await page.getByRole('button',{name:'Help someone receive',exact:true}).isVisible(),false);await page.locator('summary').filter({hasText:'More receiving options'}).click();await page.screenshot({path:join(output,`${width}-receiving-disclosure.png`),fullPage:true});await page.getByRole('button',{name:'Help someone receive',exact:true}).click();await page.getByRole('heading',{name:'Receive it. Keep it moving.',exact:true}).waitFor();await page.screenshot({path:join(output,`${width}-options.png`),fullPage:true});
  assert.deepEqual(await page.evaluate(()=>window.counts),{status:1,connect:1,prepare:0,execute:0});
  await page.getByRole('button',{name:/Prepare a receiving invitation/}).click();await page.screenshot({path:join(output,`${width}-editor.png`),fullPage:true});await page.getByRole('button',{name:'Review invitation',exact:true}).click();await page.getByRole('heading',{name:'Ready to share.',exact:true}).waitFor();await page.screenshot({path:join(output,`${width}-invitation.png`),fullPage:true});
  await page.getByRole('button',{name:'Copy invitation',exact:true}).click();await page.getByRole('status').filter({hasText:'Invitation link copied.'}).waitFor();assert.ok((await page.evaluate(()=>window.copied)).includes('I’m ready to pay you.'));assert.ok(!(await page.evaluate(()=>window.copied)).includes('supplier@example.com'));
  await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'Help someone receive',exact:true}).focus();await page.keyboard.press('Enter');await page.getByRole('button',{name:'Continue to payment',exact:true}).click();assert.equal(await page.getByRole('combobox').inputValue(),'supplier@example.com');
  assert.deepEqual(await page.evaluate(()=>window.counts),{status:1,connect:1,prepare:0,execute:0});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);
  results.push({width,height,noExtraPaymentReads:true,paymentActions:0,privateInvitation:true,keyboardAndClose:true,noOverflow:true,apiOrExternalRequests:0});await context.close();
 }
 await writeFile(join(output,'report.json'),JSON.stringify({passed:true,scope:'Actual production Send and receiving sheet with controlled private storage and no financial execution',results},null,2)+'\n');console.log(JSON.stringify({passed:true,results}));
}finally{await browser?.close();if(server){server.closeAllConnections();await new Promise(yes=>server.close(yes));}await rm(directory,{recursive:true,force:true});}
