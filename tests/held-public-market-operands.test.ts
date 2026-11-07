import {expect,it,vi} from 'vitest';
import {handlePreparedPublicMarket} from '../server/prepared-public-market';
it('exports only a requested held public operand through the existing write-side preparer',async()=>{
 const held={schema:'bank.public-market.operand.v1',selectionKey:'a'.repeat(64),operand:'membership',body:{ok:true},generation:'b'.repeat(64),build:'c'.repeat(64),heldFamily:{schema:'bank.public-market.held-family.v1',generation:'d'.repeat(64),build:'c'.repeat(64),marketGeneration:'e'.repeat(64),ledgerGeneration:'f'.repeat(64)}},prepareHeldOperand=vi.fn(async()=>held),unused=vi.fn(async()=>{throw Error('UNREQUESTED_SOURCE_READ');});
 const response=await handlePreparedPublicMarket(new Request('https://bankeiz.com/api/explore?prepare=input',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({selectionKey:'a'.repeat(64),projectHeldOperand:'membership'})}),{build:'c'.repeat(64),prepared:unused,render:unused,prepareInput:unused,prepareOperand:unused,readMaterial:unused,prepareHeldOperand} as never);
 expect(response.status).toBe(200);expect(await response.json()).toEqual(held);expect(prepareHeldOperand).toHaveBeenCalledOnce();expect(unused).not.toHaveBeenCalled();
});
it.each([{projectHeldOperand:'private'},{projectHeldOperand:'membership',username:'owner'},{projectHeldOperand:'membership',previousGeneration:'b'.repeat(64)}])('refuses unrelated capture or private selectors in held bootstrap: %j',async fields=>{
 const prepareHeldOperand=vi.fn(),unused=vi.fn(async()=>{throw Error('UNREQUESTED_READ');});
 const response=await handlePreparedPublicMarket(new Request('https://bankeiz.com/api/explore?prepare=input',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({selectionKey:'a'.repeat(64),...fields})}),{build:'c'.repeat(64),prepared:unused,render:unused,prepareHeldOperand} as never);
 expect(response.status).toBe(400);expect(prepareHeldOperand).not.toHaveBeenCalled();expect(unused).not.toHaveBeenCalled();
});

it('bootstraps the real complete shipped family in separate bounded operands, with no Source reads or invented financial heads',async()=>{
 const {readFile}=await import('node:fs/promises'),{createHash}=await import('node:crypto'),{gunzipSync}=await import('node:zlib'),{createHeldPublicMarketOperandPreparer,HELD_PUBLIC_OPERANDS}=await import('../server/held-public-market-operands');
 const paths=['public/receiz-public-market.json','public/receiz-public-sports.json','public/receiz-public-capitalization.json','public/receiz-public-share-chart-history.json','public/receiz-public-ledger.json.gz.bin'],bytes=await Promise.all(paths.map(path=>readFile(path))),hash=createHash('sha256').update('bank.public-market.static.v1');for(const part of bytes.slice(0,4))hash.update('\0').update(part);
 const market=JSON.parse(bytes[0].toString()),{snapshot,...membership}=market,marketGeneration=hash.digest('hex'),ledgerGeneration=createHash('sha256').update(JSON.stringify({membership,snapshot,ledgerCacheGzipB64u:bytes[4].toString('base64url')})).digest('hex'),files=new Map(paths.map((path,index)=>[path,new Uint8Array(bytes[index])]));
 for(const [path,id,schema,generation]of [['explore','public-market-seed','bank.public-market.document.v1',marketGeneration],['ledger','public-ledger-document-seed','bank.public-ledger.document.v1',ledgerGeneration]])files.set('dist/'+path+'/index.html',new TextEncoder().encode('<html><script id="'+id+'" type="application/json">'+JSON.stringify({schema,generation,path})+'</script></html>'));
 const read=vi.fn(async(path:string)=>{const body=files.get(path);if(!body)throw Error('UNEXPECTED_FILE:'+path);return body;}),prepare=createHeldPublicMarketOperandPreparer({read}),fetcher=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('SOURCE_READ_FORBIDDEN'));
 try{
  const parts=await Promise.all(HELD_PUBLIC_OPERANDS.map(projectHeldOperand=>prepare({selectionKey:'a'.repeat(64),projectHeldOperand},'c'.repeat(64))));
  expect(read).toHaveBeenCalledTimes(7);expect(parts.every(part=>JSON.stringify(part.heldFamily)===JSON.stringify(parts[0].heldFamily))).toBe(true);
  for(const part of parts){const text=JSON.stringify(part.body);expect(Buffer.byteLength(text)).toBeLessThanOrEqual(32*1024*1024);expect(createHash('sha256').update(text).digest('hex')).toBe(part.generation);}
  const held=Object.fromEntries(parts.map(part=>[part.operand,part.body])) as Record<string,any>;
  expect(held.membership.transport.publicOriginals.map((row:{id:string})=>row.id)).toEqual(membership.transport.publicOriginals.map((row:{id:string})=>row.id));
  expect(held.sports).toEqual(JSON.parse(bytes[1].toString()));expect(held.capitalization).toEqual(JSON.parse(bytes[2].toString()));expect(held.history).toEqual(JSON.parse(bytes[3].toString()));
  const records=JSON.parse(gunzipSync(Buffer.from(held.preparedLedger.ledgerCacheGzipB64u,'base64url')).toString()).records;expect(records.length).toBeGreaterThan(40000);expect(records.every((row:{source:string})=>row.source!=='proofs')).toBe(true);expect(held.preparedLedger.heads).toBeUndefined();
  expect(fetcher).not.toHaveBeenCalled();
  const corrupt=new Map(files);corrupt.set('public/receiz-public-sports.json',new TextEncoder().encode('{}'));
  await expect(createHeldPublicMarketOperandPreparer({read:async path=>corrupt.get(path)!})({selectionKey:'a'.repeat(64),projectHeldOperand:'membership'},'c'.repeat(64))).rejects.toThrow('PUBLIC_HELD_FAMILY_COHORT_MISMATCH');
 }finally{fetcher.mockRestore();}
},30000);
