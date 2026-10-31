import type {PublicMarketItem} from '../src/receiz/public-market';
import type {PublicRecord} from '../src/receiz/public-network';
export function readingPageContent(content:string,canonical:string):{html:string;text:string};
export function writePublicReadingPages(input:{outdir:string;pages:Record<string,{title:string;description?:string;content:string}>;catalog:{items:PublicMarketItem[];observedAt:string|null};ledger:{records:PublicRecord[];capturedAt:string|null}}):Promise<{pages:number;assets:number;publicRecords:number}>;
