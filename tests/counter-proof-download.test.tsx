// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {MerchantCounter} from '../src/features/account/MerchantCounter';
import {CounterSaleDetail} from '../src/features/account/counter/CounterActivity';
import {createMerchantCounter} from '../src/receiz/merchant-counter';
import {inspectMerchantPayment} from '../src/receiz/merchant-receive';
import {fixedSalePaymentNote} from '../src/receiz/fixed-checkout';
import {emptyCart,calculateCart} from '../src/receiz/counter/domain';
import {syntheticWalletRecord} from './fixtures/wallet-send';
import type {OpenIdentity} from '../src/receiz/native-identity';
import type {RecordProofExportInput} from '../src/receiz/record-proof-export';
import type {CounterRegisterController} from '../src/receiz/counter/controller';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
let downloads:Array<{file:Blob;name:string}>,current:Blob;
beforeEach(()=>{downloads=[];vi.spyOn(URL,'createObjectURL').mockImplementation(value=>{current=value as Blob;return'blob:counter-proof';});vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(this:HTMLAnchorElement){downloads.push({file:current,name:this.download});});});
afterEach(()=>vi.restoreAllMocks());
const selected=new File(['synthetic-sdk-selected-file'],'selected-proof.receizbundle',{type:'application/vnd.receiz.bundle+json'});
async function source(){
 const uid='10000000-0000-4000-8000-000000000002';let state:unknown=null,evidence:Awaited<ReturnType<typeof inspectMerchantPayment>>|null=null;
 const receive={check:vi.fn(async()=>evidence?[{saleId:counter.snapshot().active!.request.saleId,evidence}]:[]),remember(){},unresolved:()=>false};
 const counter=createMerchantCounter({identityDigest:'a'.repeat(64),accountUid:uid,username:'merchant',assertCurrent(){},receive,store:{read:async()=>structuredClone(state),write:async(next,expected)=>{expect(expected).toEqual(state);state=structuredClone(next);}},lock:work=>work()});await counter.ready;await counter.create('1000');
 const request=counter.snapshot().active!.request,nonce='20000000-0000-4000-8000-000000000001',raw=syntheticWalletRecord({conversationId:'10000000-0000-4000-8000-000000000003',recipientUserId:uid,unit:'usd',amountUsd:'10.00',clientNonce:nonce,note:fixedSalePaymentNote(request,nonce),noteVisibility:'public'},'10000000-0000-4000-8000-000000000001');
 evidence=await inspectMerchantPayment(raw,request,uid);await counter.check(new AbortController().signal);const payment=structuredClone(counter.snapshot().active!);
 const cart={...emptyCart(),customer:'Synthetic table',note:'Complete item record',lines:[{id:'synthetic-line',itemId:null,variantId:null,name:'Synthetic service',variantName:'',unit:'each',unitPriceUsdCents:'1000',quantityMicros:'1000000',modifiers:[]}]};
 return{counter,receive,payment,sale:{request,cart,amounts:calculateCart(cart),createdAt:payment.createdAt,status:'paid' as const}};
}
const button=(host:HTMLElement,label:string)=>[...host.querySelectorAll('button')].find(value=>value.textContent===label)!;
async function mount(kind:'merchant'|'detail',sealRecordExport:(input:RecordProofExportInput)=>Promise<File>){
 const s=await source(),host=document.createElement('div'),root=createRoot(host),identity={username:'merchant',merchantCounter:async()=>s.counter,sealRecordExport}as unknown as OpenIdentity;
 const render=(seal:(input:RecordProofExportInput)=>Promise<File>,owner=identity)=>kind==='merchant'?<MerchantCounter identity={owner} onBack={()=>{}}/>:<CounterSaleDetail counter={s.counter} sale={s.sale} onShowCheckout={()=>{}} sealRecordExport={seal}/>;
 await act(async()=>root.render(render(sealRecordExport)));
 return{...s,host,root,label:kind==='merchant'?'Save payment evidence':'Save complete record',expected:kind==='merchant'?s.payment:{sale:s.sale,payment:s.payment},async changeOwner(seal:(input:RecordProofExportInput)=>Promise<File>){await act(async()=>root.render(render(seal,{...identity,sealRecordExport:seal})));},async close(){await act(async()=>root.unmount());s.counter.dispose();}};
}
it.each(['merchant','detail']as const)('%s captures the exact complete retained packet once and downloads the SDK-selected File',async kind=>{
 let finish!:(file:File)=>void;const seal=vi.fn((_input:RecordProofExportInput)=>new Promise<File>(resolve=>{finish=resolve;})),f=await mount(kind,seal);
 try{expect(seal).not.toHaveBeenCalled();const reads=f.receive.check.mock.calls.length;await act(async()=>{button(f.host,f.label).click();button(f.host,f.label)?.click();});expect(seal).toHaveBeenCalledOnce();expect(JSON.parse(new TextDecoder().decode(seal.mock.calls[0][0].bytes))).toEqual(f.expected);expect(seal.mock.calls[0][0]).toMatchObject({filename:`checkout-${f.payment.request.saleId}.json`,mimeType:'application/json'});expect(downloads).toHaveLength(0);await act(async()=>finish(selected));expect(downloads).toEqual([{file:selected,name:selected.name}]);expect(f.receive.check).toHaveBeenCalledTimes(reads);expect(f.counter.snapshot().active).toEqual(f.payment);}finally{await f.close();}
});
it.each(['merchant','detail']as const)('%s keeps the private record when capture fails and offers no raw fallback',async kind=>{
 const seal=vi.fn(async()=>{throw Error('SIGNER_UNAVAILABLE');}),f=await mount(kind,seal);
 try{await act(async()=>button(f.host,f.label).click());expect(downloads).toHaveLength(0);expect(kind==='merchant'?f.host.querySelector('.counter-attention')?.textContent:f.host.querySelector('.error-message')?.textContent).toMatch(/saved|remains/i);expect(f.counter.snapshot().active).toEqual(f.payment);}finally{await f.close();}
});
it.each(['merchant','detail']as const)('%s suppresses a late previous-owner export',async kind=>{
 let finish!:(file:File)=>void;const seal=vi.fn((_input:RecordProofExportInput)=>new Promise<File>(resolve=>{finish=resolve;})),f=await mount(kind,seal);
 try{await act(async()=>button(f.host,f.label).click());await f.changeOwner(vi.fn(async()=>selected));await act(async()=>finish(selected));expect(downloads).toHaveLength(0);}finally{await f.close();}
});
it('waits for already-requested saved cart metadata before exporting the complete register record',async()=>{
 const s=await source(),seal=vi.fn(async(_input:RecordProofExportInput)=>selected),host=document.createElement('div'),root=createRoot(host);let finish!:(value:typeof s.sale)=>void;
 const register={savedSale:vi.fn(()=>new Promise<typeof s.sale>(resolve=>{finish=resolve;}))}as unknown as CounterRegisterController;
 try{await act(async()=>root.render(<CounterSaleDetail counter={s.counter} register={register} sale={undefined} saleId={s.payment.request.saleId} sealRecordExport={seal} onShowCheckout={()=>{}}/>));expect(button(host,'Save complete record').disabled).toBe(true);expect(seal).not.toHaveBeenCalled();await act(async()=>finish(s.sale));expect(button(host,'Save complete record').disabled).toBe(false);await act(async()=>button(host,'Save complete record').click());expect(JSON.parse(new TextDecoder().decode(seal.mock.calls[0][0].bytes))).toEqual({sale:s.sale,payment:s.payment});}finally{await act(async()=>root.unmount());s.counter.dispose();}
});
