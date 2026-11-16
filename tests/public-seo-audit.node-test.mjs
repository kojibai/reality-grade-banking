import assert from 'node:assert/strict';
import {after,before,test} from 'node:test';
import {createServer} from 'node:http';
import {auditPublicPage} from '../scripts/public-seo-audit.mjs';

let server,origin;
const head=path=>`<head><title>Useful client work</title><meta name="description" content="A complete useful public example"><meta name="robots" content="index,follow"><link rel="canonical" href="https://bankeiz.com${path}"></head>`;
before(async()=>{
 server=createServer((req,res)=>{
  res.setHeader('Content-Type','text/html; charset=utf-8');
  if(req.url==='/missing/'){res.writeHead(404);res.end('Not found');return;}
  if(req.url==='/blocked/')res.setHeader('X-Robots-Tag','none');
  if(req.url==='/incomplete/'){res.end('<head><title></title></head>');return;}
  if(req.url==='/empty-canonical/'){res.end(head(req.url).replace(/href="[^"]*"/,'href=""'));return;}
  if(req.url==='/missing-canonical-href/'){res.end(head(req.url).replace(/ href="[^"]*"/,''));return;}
  if(req.url==='/unquoted/'){res.end(head(req.url).replace('name="robots" content="index,follow"','name=robots content=noindex'));return;}
  if(req.url==='/encoded/'){res.end(head(req.url).replace('index,follow','no&#105;ndex,follow'));return;}
  if(req.url==='/image-preview/'){res.end(head(req.url).replace('index,follow','index,follow,max-image-preview: none'));return;}
  if(req.url==='/conflict/'){res.end(head('/different/'));return;}
  if(req.url==='/meta-blocked/'){res.end(head(req.url).replace('index,follow','noindex,follow'));return;}
  if(req.url==='/stream/'){res.write(head(req.url));return;}
  res.end(head(req.url)+'<body><main>Already available content</main></body>');
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 origin='http://127.0.0.1:'+server.address().port;
});
after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});

test('accepts useful public metadata while treating the published origin as canonical',async()=>{
 const result=await auditPublicPage(origin,'/healthy/');
 assert.equal(result.ok,true);assert.deepEqual(result.issues,[]);assert.equal(result.canonical,'https://bankeiz.com/healthy/');
});
test('detects a restrictive storage header even when the HTML says index',async()=>{
 const result=await auditPublicPage(origin,'/blocked/');
 assert.equal(result.ok,false);assert.ok(result.issues.includes('http_noindex'));
});
test('reports unreleased pages and contradictory canonical destinations',async()=>{
 const missing=await auditPublicPage(origin,'/missing/'),conflict=await auditPublicPage(origin,'/conflict/');
 assert.equal(missing.status,404);assert.ok(missing.issues.includes('http_status_404'));assert.ok(conflict.issues.includes('canonical_mismatch'));
});
test('detects missing useful metadata and an explicit HTML index exclusion',async()=>{
 const incomplete=await auditPublicPage(origin,'/incomplete/'),blocked=await auditPublicPage(origin,'/meta-blocked/');
 assert.ok(incomplete.issues.includes('missing_title'));assert.ok(incomplete.issues.includes('missing_description'));assert.ok(incomplete.issues.includes('canonical_count_0'));assert.ok(blocked.issues.includes('html_noindex'));
});
test('finishes at the response head without waiting for an unfinished application body',async()=>{
 const result=await auditPublicPage(origin,'/stream/',{timeoutMs:2000});
 assert.equal(result.ok,true);assert.ok(result.headBytes<1000);
});
test('rejects canonical elements without a nonempty preferred address',async()=>{
 for(const path of ['/empty-canonical/','/missing-canonical-href/']){
  const result=await auditPublicPage(origin,path);assert.equal(result.ok,false);assert.ok(result.issues.includes('canonical_missing_href'));
 }
});
test('reads valid unquoted and encoded robots attributes',async()=>{
 for(const path of ['/unquoted/','/encoded/']){const result=await auditPublicPage(origin,path);assert.equal(result.ok,false);assert.ok(result.issues.includes('html_noindex'));}
});
test('does not confuse an image-preview restriction with a page index exclusion',async()=>{
 const result=await auditPublicPage(origin,'/image-preview/');assert.equal(result.ok,true);
});
