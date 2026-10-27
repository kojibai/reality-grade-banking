import {expect,it} from 'vitest';
import {parsePublicMarket} from '../src/receiz/public-market';
import {marketDiscoverable} from '../src/receiz/market-pbi-publication';
const raw=(id:string,profileOriginal:Record<string,unknown>)=>({id,receizId:id,title:id,visibility:'public',profileOriginal});
it('shows only PBI-signed proof Originals, while preserving raw membership for holdings and cards',()=>{
 const catalog=parsePublicMarket({ok:true,transport:{publicOriginals:[raw('unsigned',{}),raw('signed',{hasPbiSignature:true}),raw('receipt',{pbiReceiptHash:'a'.repeat(64)})]}});
 expect(catalog.items).toHaveLength(3);
 expect(catalog.items.filter(marketDiscoverable).map(item=>item.id)).toEqual(['signed','receipt']);
 expect(marketDiscoverable({...catalog.items[0],category:'sports'})).toBe(true);
 expect(catalog.items.find(item=>item.id==='unsigned')).toBeDefined();
});
it('does not confuse creator verification, ordinary proof signatures or funding with object PBI',()=>{
 const catalog=parsePublicMarket({ok:true,transport:{publicOriginals:[raw('ordinary',{creatorVerified:true,proof:{groth16Id:'proof'},pbiReceiptHash:'invalid'})]}});
 expect(catalog.items.filter(marketDiscoverable)).toEqual([]);
});
