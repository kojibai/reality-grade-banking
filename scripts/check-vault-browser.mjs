import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';

// Synthetic credential and plaintext only. The fixture imports the real
// encryption/presence/storage modules; no app identity or service is contacted.
const directory=await mkdtemp(join(tmpdir(),'bank-vault-browser-'));
let browser,server;
try{
 const fixture=await readFile(resolve('tests/browser/vault-protection.html'),'utf8'),script=fixture.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script,'Vault browser qualification fixture is missing');
 await build({stdin:{contents:script.replaceAll("from '/src/","from './src/"),resolveDir:process.cwd(),sourcefile:'vault-qualification.ts'},bundle:true,platform:'browser',format:'esm',outfile:join(directory,'qualification.js'),logLevel:'silent'});
 const javascript=await readFile(join(directory,'qualification.js')),html=fixture.replace(/<script type="module">[\s\S]*?<\/script>/,'<script type="module" src="/qualification.js"></script>');
 server=createServer((request,response)=>{
  if(request.url==='/'){response.writeHead(200,{'Content-Type':'text/html'}).end(html);return;}
  if(request.url==='/qualification.js'){response.writeHead(200,{'Content-Type':'application/javascript'}).end(javascript);return;}
  response.writeHead(404).end();
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const origin=`http://localhost:${server.address().port}`;
 browser=await chromium.launch({headless:true,...(process.env.BANK_BROWSER_EXECUTABLE?{executablePath:process.env.BANK_BROWSER_EXECUTABLE}:{})});
 const context=await browser.newContext(),page=await context.newPage(),errors=[],external=[];
 await context.route('**/*',route=>{if(new URL(route.request().url()).origin===origin)return route.continue();external.push(route.request().url());return route.abort();});
 page.on('pageerror',error=>errors.push(error.message));
 const cdp=await context.newCDPSession(page);await cdp.send('WebAuthn.enable');
 await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',ctap2Version:'ctap2_1',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true,hasPrf:true,defaultBackupEligibility:true,defaultBackupState:true}});
 await page.goto(origin+'/');await page.locator('#qualify').click();
 await page.waitForFunction(()=>Boolean(window.qualification),{timeout:30000});
 const result=await page.evaluate(()=>window.qualification);
 assert.equal(result.passed,true,JSON.stringify(result));assert.equal(result.encryptedStorage,true);assert.equal(result.concurrentConflictRefused,true);assert.equal(result.financialActions,0);
 assert.deepEqual(errors,[]);assert.deepEqual(external,[],'Vault qualification attempted an external service');
 console.log(JSON.stringify(result));
}finally{
 await browser?.close();if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 await rm(directory,{recursive:true,force:true});
}
