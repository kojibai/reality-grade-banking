import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';

// Test-only rendering gate: no account, authentication, financial or source requests.
const bank=process.cwd(),directory=await mkdtemp(join(tmpdir(),'bank-opening-progress-'));
let server,browser;
const results=[];
try{
 await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import{AccountOpening}from'${bank}/src/features/identity/AccountOpening.tsx';const root=createRoot(document.getElementById('root'));window.renderStage=(stage,inspecting=false)=>flushSync(()=>root.render(React.createElement(AccountOpening,{stage,inspecting})));window.renderStage('identity');`,resolveDir:bank,loader:'tsx'},bundle:true,format:'iife',outfile:directory+'/opening.js',define:{'process.env.NODE_ENV':'"production"'}});
 server=createServer((request,response)=>{
  const path=request.url.split('?')[0];
  if(path==='/'){
   response.setHeader('Content-Type','text/html');
   response.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Account opening checkpoints</title><link rel="stylesheet" href="/opening.css"><div id="root"></div><script src="/opening.js"></script>');return;
  }
  if(!['/opening.js','/opening.css'].includes(path)){response.writeHead(404).end();return;}
  response.setHeader('Content-Type',path.endsWith('.css')?'text/css':'text/javascript');
  void readFile(directory+path).then(bytes=>response.end(bytes),()=>response.writeHead(500).end());
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>{server.off('error',reject);resolve();});});
 browser=await chromium.launch({headless:true,...(process.env.BANK_BROWSER_EXECUTABLE?{executablePath:process.env.BANK_BROWSER_EXECUTABLE}:{})});
 for(const reducedMotion of ['no-preference','reduce']){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('[role=progressbar]').waitFor();
  for(const [stage,inspecting,checkpoint]of [['identity',false,0],['history',false,1],['identity',true,0],['ready',false,2]]){
   await page.evaluate(({stage,inspecting})=>window.renderStage(stage,inspecting),{stage,inspecting});
   const sample=()=>page.locator('.account-opening-progress').evaluate(node=>({now:node.getAttribute('aria-valuenow'),name:getComputedStyle(node,'::after').animationName,transform:getComputedStyle(node,'::after').transform}));
   const first=await sample();await page.waitForTimeout(140);const second=await sample();assert.equal(first.now,String(checkpoint));
   if(stage!=='ready'&&reducedMotion==='no-preference'){
    assert.equal(first.name,'account-opening-activity');assert.notEqual(first.transform,second.transform);
   }else assert.equal(first.name,'none');
   results.push({reducedMotion,stage,inspecting,checkpoint,moving:first.transform!==second.transform,animation:first.name});
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log(JSON.stringify({passed:true,results},null,2));
}finally{
 try{await browser?.close();}
 finally{
  if(server?.listening){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  await rm(directory,{recursive:true,force:true});
 }
}
