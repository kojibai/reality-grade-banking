import type {PublicMarketItem,PublicMarketCatalog} from './public-market';
/** Discovery policy only. Raw Original membership, holdings and proof remain intact. */
export function marketDiscoverable(item:PublicMarketItem):boolean{return item.category==='sports'||item.hasPbiSignature===true;}

const scopedCatalogs=new WeakMap<PublicMarketCatalog,PublicMarketCatalog>();
/** A view of complete retained membership. Raw holdings and observations stay intact. */
export function marketDiscoveryCatalog(catalog:PublicMarketCatalog|null):PublicMarketCatalog|null{
 if(!catalog)return null;const held=scopedCatalogs.get(catalog);if(held)return held;
 const items=catalog.items.filter(marketDiscoverable),scoped=items.length===catalog.items.length?catalog:{...catalog,items,sourceCount:items.length};scopedCatalogs.set(catalog,scoped);return scoped;
}
