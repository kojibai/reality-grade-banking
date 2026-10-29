import {afterEach,expect,it,vi} from 'vitest';
import {handleAssetPreview,assetPreviewHtml} from '../server/asset-preview';
import {handleReceiptPreview} from '../server/receipt-preview';
import {parsePublicMarket} from '../src/receiz/public-market';
import {completeLedgerReceipt} from '../src/receiz/ledger-receipts';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
const ports=vi.hoisted(()=>({snapshot:vi.fn()}));
vi.mock('../src/receiz/receipt-snapshot',async original=>({...await original<typeof import('../src/receiz/receipt-snapshot')>(),readReceiptSnapshot:ports.snapshot}));
const deferred=<T,>()=>{let resolve!:(v:T)=>void,reject!:(e:unknown)=>void;return{promise:new Promise<T>((a,b)=>{resolve=a;reject=b;}),resolve,reject};};
const template='<html><head></head><body><div id="public-explore-root"></div></body></html>',asset=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:source',receizId:'source',title:'Exact Original',summary:'Carried source'}]}}).items[0],receipt=completeLedgerReceipt(parsePublicNetworkPage('wallet',{ok:true,events:[{id:'t',kind:'chat_transfer',summary:'Exact payment',amountUsdCents:'12500',pulse:'123',sender:{displayName:'Alex'},recipient:{displayName:'Sam'}}]}).records[0]);
afterEach(()=>{ports.snapshot.mockReset();vi.restoreAllMocks();});
it('starts the asset template and source together and returns the same complete HTML',async()=>{
 const source=deferred<typeof asset>(),page=vi.fn(async()=>template),item=vi.fn(()=>source.promise),image=vi.fn(),response=handleAssetPreview(new Request('https://bankeiz.com/api/asset?asset='+encodeURIComponent(asset.id)),{page,item,image});
 try{expect(item).toHaveBeenCalledOnce();expect(page).toHaveBeenCalledOnce();}finally{source.resolve(asset);}
 const actual=await response;expect(actual.status).toBe(200);expect(await actual.text()).toBe(assetPreviewHtml(template,asset.id,asset));expect(image).not.toHaveBeenCalled();
});
it('starts the short receipt template beside its existing source read',async()=>{
 const source=deferred<typeof receipt>(),page=vi.fn(async()=>template);ports.snapshot.mockReturnValue(source.promise);const response=handleReceiptPreview(new Request('https://bankeiz.com/receipt/'+'a'.repeat(64)+'/'),{page,image:vi.fn()});
 try{expect(ports.snapshot).toHaveBeenCalledExactlyOnceWith('a'.repeat(64));expect(page).toHaveBeenCalledOnce();}finally{source.resolve(receipt);}
 const actual=await response;expect(actual.status).toBe(200);expect(actual.headers.get('cache-control')).toBe('public, max-age=60, s-maxage=300');expect(await actual.text()).toContain('id="receipt-snapshot"');
});
it('keeps source-not-found precedence when an independent receipt template fails first',async()=>{
 const source=deferred<typeof receipt>(),page=vi.fn(async()=>{throw Error('template unavailable');});ports.snapshot.mockReturnValue(source.promise);const response=handleReceiptPreview(new Request('https://bankeiz.com/receipt/'+'b'.repeat(64)+'/'),{page,image:vi.fn()});
 source.reject(Error('RECEIPT_NOT_FOUND'));const actual=await response;expect(actual.status).toBe(404);expect(await actual.text()).toBe('Receipt not found.');expect(actual.headers.get('cache-control')).toBe('no-store');
});
it('preserves a template failure after a successful exact receipt read',async()=>{
 ports.snapshot.mockResolvedValue(receipt);const actual=await handleReceiptPreview(new Request('https://bankeiz.com/receipt/'+'c'.repeat(64)+'/'),{page:async()=>{throw Error('template unavailable');},image:vi.fn()});expect(actual.status).toBe(503);expect(actual.headers.get('cache-control')).toBe('no-store');
});
it('keeps asset HEAD, PNG and player requests outside HTML preparation',async()=>{
 const page=vi.fn(async()=>template),item=vi.fn(async()=>asset),image=vi.fn(async()=>new Uint8Array([1]));
 await handleAssetPreview(new Request('https://bankeiz.com/api/asset?asset='+encodeURIComponent(asset.id),{method:'HEAD'}),{page,item,image});expect(item).not.toHaveBeenCalled();
 await handleAssetPreview(new Request('https://bankeiz.com/api/asset?asset='+encodeURIComponent(asset.id)+'&image=1'),{page,item,image});await handleAssetPreview(new Request('https://bankeiz.com/api/asset?asset='+encodeURIComponent(asset.id)+'&player=1'),{page,item,image});expect(page).not.toHaveBeenCalled();expect(image).toHaveBeenCalledOnce();
});
it('keeps receipt HEAD and PNG outside HTML preparation',async()=>{
 const page=vi.fn(async()=>template),image=vi.fn(async()=>new Uint8Array([1]));ports.snapshot.mockResolvedValue(receipt);const url='https://bankeiz.com/receipt/'+'d'.repeat(64)+'/';
 await handleReceiptPreview(new Request(url,{method:'HEAD'}),{page,image});expect(ports.snapshot).not.toHaveBeenCalled();await handleReceiptPreview(new Request(url+'?image=1'),{page,image});expect(page).not.toHaveBeenCalled();expect(image).toHaveBeenCalledOnce();
});
