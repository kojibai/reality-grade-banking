export function handleAssetPreview(request:Request):Promise<Response>;

export function assetPreviewItem(id:string,options?:{shippedOnly?:boolean}):Promise<import('../../src/receiz/public-market.js').PublicMarketItem|null>;
