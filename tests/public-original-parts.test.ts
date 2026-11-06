import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
import {preparePublicOriginalParts} from '../server/public-original-parts';
import {handlePreparedPublicMarket} from '../server/prepared-public-market';
import {parsePublicMarket} from '../src/receiz/public-market';
const row={id:'profile:alice:original',receizId:'original',ownerUserId:'owner-uid',ownerUsername:'alice',ownerDisplayName:'Alice',ownerCreatedAt:'2026-10-20T10:00:00Z',title:'Image and essay',createdAt:'2026-11-02T10:00:00Z',profileOriginal:{hasLongForm:true,hasPbiSignature:false,media:{kind:'image',src:'https://receiz.com/artwork/original.png'}},privateState:'must not travel'};

it('classifies only the supplied changed Original using the existing public curator, including overlapping facets and unsigned public display',()=>{
 const input={selectionKey:'a'.repeat(64),projectOriginals:[{row}]},result=preparePublicOriginalParts(input),part=result.entries[0];
 expect(result.schema).toBe('bank.public-market.original-parts.v1');expect(part.logicalKey).toBe(JSON.stringify([row.ownerUserId,row.receizId]));expect(part.facets).toEqual(['All','Images','Essays']);expect(part.row).not.toHaveProperty('privateState');
 expect(part.inputSha256).toBe(createHash('sha256').update(JSON.stringify(input.projectOriginals[0])).digest('hex'));expect(part.rowSha256).toBe(createHash('sha256').update(JSON.stringify(part.row)).digest('hex'));
 expect(part.row.profileOriginal).toMatchObject({hasPbiSignature:false,hasLongForm:true});
});

it('projects changed Original parts through the existing input endpoint without reading previous material, financial history or Source',async()=>{
 const untouched=vi.fn(async()=>{throw Error('Unchanged data must not be reopened');}),project=vi.fn(preparePublicOriginalParts);
 const response=await handlePreparedPublicMarket(new Request('https://bankeiz.com/api/explore?prepare=input',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({selectionKey:'a'.repeat(64),projectOriginals:[{row}]})}),{build:'fixture',prepared:untouched,render:untouched,readMaterial:untouched,prepareInput:untouched,prepareOriginalParts:project});
 expect(response.status).toBe(200);expect((await response.json()).schema).toBe('bank.public-market.original-parts.v1');expect(project).toHaveBeenCalledTimes(1);expect(untouched).not.toHaveBeenCalled();
});

it.runIf(!!process.env.BANKEIZ_PUBLIC_MEMBERSHIP_FIXTURE&&!!process.env.BANKEIZ_PUBLIC_QUOTES_FIXTURE)('keeps the real bjklock claim, media, content and existing valid share inventory in the new-row projection',()=>{
 const membership=JSON.parse(readFileSync(process.env.BANKEIZ_PUBLIC_MEMBERSHIP_FIXTURE!,'utf8')),snapshot=JSON.parse(readFileSync(process.env.BANKEIZ_PUBLIC_QUOTES_FIXTURE!,'utf8')),original=membership.transport.publicOriginals.find((row:{receizId:string})=>row.receizId==='imported-b69c12eaabfb7e5e2a3875c936a728f2670c007d7ad191471388da23c78e73d4'),quote=snapshot.data.liveMarkets.find((row:{itemId:string})=>row.itemId===original.id);
 const part=preparePublicOriginalParts({selectionKey:'a'.repeat(64),projectOriginals:[{row:original,quote}]}).entries[0],projected=parsePublicMarket({ok:true,transport:{publicOriginals:[part.row]}},{ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[part.quote]}}).items[0],expected=parsePublicMarket(membership,snapshot).items.find(item=>item.id===original.id)!;
 expect(expected.originalDigest).toMatch(/^[a-f0-9]{64}$/);expect(expected.carriedText?.text.length).toBeGreaterThan(100);expect(expected.pbiReceiptHash).toBe('8bc2c5c5ea1a72d47317aded45d0645f75b2bdf0489313004c82400464fcbcd5');expect(projected.hasPbiSignature).toBe(true);expect(projected.pbiReceiptHash).toBe(expected.pbiReceiptHash);expect(projected.originalCreator).toEqual(expected.originalCreator);expect(projected.sourceProvenance).toEqual(expected.sourceProvenance);expect(projected.carriedText).toEqual(expected.carriedText);expect((part.row.profileOriginal as Record<string,unknown>).claimHashHex).toBe('33da91a0486a0ef1402787cdfc8128aef6f0b5048fcf50a2c1a29c7254bedad0');expect(projected.originalDigest).toBe(expected.originalDigest);expect(projected.proofManifestSource?.claimHashHex).toBe(expected.proofManifestSource?.claimHashHex);expect(projected.artworkUrl).toBe(expected.artworkUrl);expect(projected.ownerAvatarUrl).toBe(expected.ownerAvatarUrl);expect(projected.book).toEqual(expected.book);expect(projected.shareInventory).toEqual(expected.shareInventory);expect(projected.livePulseSeed).toEqual(expected.livePulseSeed);
});

it('keeps all 256 existing supported quote samples when projecting a changed row',()=>{
 const chart=Array.from({length:256},(_,value)=>({value:value+1})),part=preparePublicOriginalParts({selectionKey:'a'.repeat(64),projectOriginals:[{row,quote:{itemId:row.id,visibility:'public',priceUsd:256,quoteUsdPerPhi:1,chart}}]}).entries[0];
 expect(part.quote?.chart).toEqual(chart);
});

it('does not open a referenced root from caller JSON/hash without fixed Source selection',async()=>{
 const material=JSON.stringify({schema:'bank.public-market.render-material.refs.v1'}),generation=createHash('sha256').update(material).digest('hex'),render=vi.fn(async()=>'<html>cached private body</html>'),read=vi.fn(async()=>{throw Error('withdrawn');});
 const response=await handlePreparedPublicMarket(new Request('https://bankeiz.com/api/explore?prepare=1',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({schema:'bank.public-market.render-input.v1',material,generation})}),{build:'fixture',prepared:vi.fn(),render,readMaterial:read});
 expect(response.status).toBe(503);expect(read).toHaveBeenCalledWith(generation);expect(render).not.toHaveBeenCalled();
});

it('refuses promotion when a selected referenced root is withdrawn while rendering',async()=>{
 const material=JSON.stringify({schema:'bank.public-market.render-material.refs.v1'}),generation=createHash('sha256').update(material).digest('hex'),read=vi.fn().mockResolvedValueOnce(material).mockRejectedValueOnce(Error('withdrawn')),render=vi.fn(async()=>'<html>must not be promoted</html>');
 const response=await handlePreparedPublicMarket(new Request('https://bankeiz.com/api/explore?prepare=1',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({schema:'bank.public-market.render-input.v1',material,generation})}),{build:'fixture',prepared:vi.fn(),render,readMaterial:read});
 expect(response.status).toBe(503);expect(read).toHaveBeenCalledTimes(2);expect(render).toHaveBeenCalledTimes(1);
});
