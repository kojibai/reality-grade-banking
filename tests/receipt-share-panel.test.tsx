// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {ReceiptShare} from '../src/features/receipts/ReceiptShare';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import {completeLedgerReceipt} from '../src/receiz/ledger-receipts';
import {receiptDigest} from '../src/receiz/receipt-snapshot';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
let root:ReturnType<typeof createRoot>|null=null;
afterEach(()=>{if(root)act(()=>root!.unmount());root=null;document.body.replaceChildren();vi.unstubAllGlobals();});
it('prepares the complete receipt only inside the explicitly opened panel and shares from the ready tap',async()=>{
 const receipt=completeLedgerReceipt(parsePublicNetworkPage('wallet',{ok:true,events:[{id:'panel-123',kind:'chat_transfer',amountUsdCents:'2700',privateKey:'PRIVATE'}]}).records[0]);
 const fetcher=vi.fn(async(_url:unknown,init?:RequestInit)=>Response.json({ok:true,sha256:await receiptDigest(new TextEncoder().encode(String(init!.body)))}));vi.stubGlobal('fetch',fetcher);
 const share=vi.fn(async(_data:ShareData)=>{}),writeText=vi.fn(async()=>{});vi.stubGlobal('navigator',{share,clipboard:{writeText}});
 const host=document.createElement('div');document.body.append(host);root=createRoot(host);expect(fetcher).not.toHaveBeenCalled();
 await act(async()=>{root!.render(<ReceiptShare receipt={receipt} onClose={()=>{}}/>);});
 await vi.waitFor(async()=>{await act(async()=>{await new Promise(resolve=>setTimeout(resolve,10));});expect(host.querySelector<HTMLButtonElement>('[aria-label="Share receipt"]')?.disabled,host.textContent??'').toBe(false);});
 expect(fetcher).toHaveBeenCalledOnce();expect(host.textContent).not.toContain('PRIVATE');expect(host.querySelector('a[download]')).not.toBeNull();expect(host.querySelector('a[href*="/ledger/#record="]')).not.toBeNull();expect(share).not.toHaveBeenCalled();
 const button=host.querySelector<HTMLButtonElement>('[aria-label="Share receipt"]')!;
 act(()=>button.click());expect(share).toHaveBeenCalledOnce();expect(share.mock.calls[0][0].url!.length).toBeLessThan(110);
});
it('can copy an already opened short receipt offline without republishing it and closes on Ledger navigation',async()=>{
 const receipt=completeLedgerReceipt(parsePublicNetworkPage('wallet',{ok:true,events:[{id:'already-saved',kind:'chat_transfer',amountUsdCents:'2700'}]}).records[0]),url='https://bankeiz.com/receipt/'+'a'.repeat(64)+'/',fetcher=vi.fn(async()=>{throw Error('offline');}),close=vi.fn(),writeText=vi.fn(async()=>{});vi.stubGlobal('fetch',fetcher);vi.stubGlobal('navigator',{clipboard:{writeText}});
 const host=document.createElement('div');document.body.append(host);root=createRoot(host);await act(async()=>root!.render(<ReceiptShare receipt={receipt} readyUrl={url} onClose={close}/>));
 await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Copy receipt link"]')!.click());expect(writeText).toHaveBeenCalledWith(url);expect(fetcher).not.toHaveBeenCalled();
 act(()=>host.querySelector<HTMLAnchorElement>('a[href*="/ledger/#record="]')!.click());expect(close).toHaveBeenCalledOnce();
});
