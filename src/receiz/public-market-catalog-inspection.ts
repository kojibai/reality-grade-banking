import type {PublicMarketCatalog} from './public-market.js';
/** Existing carried display guard. No proof, ownership or freshness verdict. */
export function inspectPublicMarketCatalog(value:unknown):PublicMarketCatalog|null{
 try{const catalog=value as PublicMarketCatalog,items=catalog?.items;
  if(catalog.complete!==true||!Array.isArray(items)||items.length>10000||new Set(items.map(item=>item.id)).size!==items.length||items.some(item=>typeof item.id!=='string'||item.authority!=='projection-only'||item.canTrade!==false))return null;
  return catalog;
 }catch{return null;}
}
