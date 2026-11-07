export const PUBLIC_MARKET_PREPARED_PATHS=['explore','explore/music','explore/images','explore/videos','explore/books','explore/essays','explore/moments','explore/collectibles','explore/documents','market-cap'] as const;
export function publicMarketPreparedPath(input:unknown):string|null{
 return typeof input==='string'&&(PUBLIC_MARKET_PREPARED_PATHS as readonly string[]).includes(input)?input:null;
}
export function preparedPublicPagePath(input:unknown):string|null{
 if(input==='bank'||input==='bank-entry')return input;
 const market=publicMarketPreparedPath(input);if(market)return market;
 if(typeof input!=='string'||input.length>256)return null;
 if(/^profile\/[a-z0-9_]{3,24}$/.test(input))return input;
 return input==='ledger'||input==='ledger/proofs'||input==='feed'||input==='discover'?input:null;
}
