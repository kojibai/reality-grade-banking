import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {expect,it,vi} from 'vitest';
import {renderPublicMarketDocument} from '../server/public-market-document';
import {parseMarketCapSource} from '../src/receiz/market-projection/source';
import {parseMarketHistory} from '../src/receiz/market-projection/history';
import {preparePublicMarketSeedText} from '../src/receiz/public-market-document-seed';
it('saves a full production-sized catalog plus the new Original within the existing HTML limit, preserving every prior row',async()=>{
 const files=await Promise.all(['market','sports','capitalization','share-chart-history'].map(async name=>JSON.parse(await readFile('public/receiz-public-'+name+'.json','utf8'))));
 const [market,sports,capitalization,history]=files,{snapshot,...membership}=market,priorIds=membership.transport.publicOriginals.map((row:{id:string})=>row.id),id='profile:bjklock:accepted-recovery';
 membership.transport.publicOriginals.unshift({id,receizId:'accepted-recovery',title:'Accepted recovery Original',valueUsd:10,visibility:'public',ownerUsername:'bjklock',ownerUserId:'eecb99a0-9c6a-4e89-813b-f76331ea9c41',ownerCreatedAt:'2026-01-01T00:00:00Z',pulse:'16000000',createdAt:'2026-11-07T12:00:00Z',profileOriginal:{hasPbiSignature:true,pbiReceiptHash:'e'.repeat(64),media:{kind:'file',originalDownloadSha256Hex:'a'.repeat(64)}}});
 membership.transport.publicMembership.itemCount++;
 const material=JSON.stringify({membership,snapshot,sports,capitalization,history,marketPrepared:{schema:'bank.public-market.prepared.v1',asOfPulse:Math.max(parseMarketHistory(history).summary.serverPulse,parseMarketCapSource(capitalization).serverPulse)}}),generation=createHash('sha256').update(material).digest('hex');
 expect(Buffer.byteLength(material)).toBeLessThan(32*1024*1024);
 // The existing complete navigation payload is about8MB in the real deployed
 // document. It is immutable held content and must survive this transition.
 const navigation=JSON.stringify({pages:{},bank:{content:'x'.repeat(8*1024*1024)}}),template='<html><head></head><body><div id="public-explore-root">Old family</div><script id="receiz-navigation" type="application/json">'+navigation+'</script></body></html>',fetcher=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('SOURCE_READ_FORBIDDEN'));
 try{
  const html=await renderPublicMarketDocument({material,generation,template});
  expect(Buffer.byteLength(html)).toBeLessThanOrEqual(32*1024*1024);
  const raw=html.match(/<script id="public-market-seed" type="application\/json">([\s\S]*?)<\/script>/)![1];
  expect(JSON.parse(raw).catalogGzip).toBeDefined();
  const selected=await preparePublicMarketSeedText(raw);expect(selected?.generation).toBe(generation);expect(selected?.catalog.complete).toBe(true);
  const ids=new Set(selected!.catalog.items.map(item=>item.id));for(const prior of priorIds)expect(ids.has(prior)).toBe(true);
  expect(selected!.catalog.items.find(item=>item.id===id)).toMatchObject({originalDigest:'a'.repeat(64),hasPbiSignature:true,pbiReceiptHash:'e'.repeat(64)});
  expect(html).toContain(navigation);expect(fetcher).not.toHaveBeenCalled();
 }finally{fetcher.mockRestore();}
},30000);
