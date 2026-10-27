import type {PublicMarketItem} from './public-market';
/** Discovery policy only. Raw Original membership, holdings and proof remain intact. */
export function marketDiscoverable(item:PublicMarketItem):boolean{return item.category==='sports'||item.hasPbiSignature===true;}
