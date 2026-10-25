// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {PaymentScanner} from '../src/features/account/PaymentScanner';
const {detect,close}=vi.hoisted(()=>({detect:vi.fn(),close:vi.fn()}));
vi.mock('../src/receiz/payment-decoder',()=>({paymentDecoder:()=>({detect}),openQrImage:async()=>({source:{},close})}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const fixed='https://bankeiz.com/pay/merchant/?fixed=1&sale=20000000-0000-4000-8000-000000000001&recipient=10000000-0000-4000-8000-000000000002&amount=10.00';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();detect.mockReset();close.mockReset();});
const button=(host:HTMLElement,text:string)=>[...host.querySelectorAll('button')].find(button=>button.textContent===text)!;
async function paste(host:HTMLElement,value:string){const field=host.querySelector<HTMLInputElement>('[placeholder="Paste a payment link"]')!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(field,value);field.dispatchEvent(new Event('input',{bubbles:true}));});await act(async()=>button(host,'Use payment link').click());}
it('routes a pasted fixed request to its exact checkout while ordinary requests keep Send behavior',async()=>{
 const request=vi.fn(),checkout=vi.fn(),host=document.createElement('div'),root=createRoot(host);try{await act(async()=>root.render(<PaymentScanner onRequest={request} onCheckout={checkout}/>));await paste(host,fixed);expect(checkout).toHaveBeenCalledExactlyOnceWith(fixed);expect(request).not.toHaveBeenCalled();await paste(host,'https://bankeiz.com/?to=merchant&amount=10.00');expect(request).toHaveBeenCalledExactlyOnceWith({recipient:'merchant',amount:'10.00'});await paste(host,fixed.replace('fixed=1&',''));expect(checkout).toHaveBeenCalledOnce();expect(request).toHaveBeenCalledOnce();expect(host.textContent).toContain('Scan or paste a payment link.');}finally{await act(async()=>root.unmount());}
});
it('preserves the fixed request from an uploaded QR and releases its image',async()=>{
 detect.mockResolvedValue([{rawValue:fixed}]);const request=vi.fn(),checkout=vi.fn(),host=document.createElement('div'),root=createRoot(host);try{await act(async()=>root.render(<PaymentScanner onRequest={request} onCheckout={checkout}/>));const file=host.querySelector<HTMLInputElement>('input[type="file"]')!;Object.defineProperty(file,'files',{value:[new File(['synthetic'],'qr.png')]});await act(async()=>file.dispatchEvent(new Event('change',{bubbles:true})));expect(checkout).toHaveBeenCalledExactlyOnceWith(fixed);expect(request).not.toHaveBeenCalled();expect(close).toHaveBeenCalledOnce();}finally{await act(async()=>root.unmount());}
});
it('stops the camera before navigating from a fixed camera QR',async()=>{
 const stop=vi.fn(),frames:FrameRequestCallback[]=[],checkout=vi.fn(()=>expect(stop).toHaveBeenCalledOnce()),request=vi.fn();vi.stubGlobal('isSecureContext',true);vi.stubGlobal('navigator',{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop}]})}});vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{frames.push(callback);return frames.length;});vi.stubGlobal('cancelAnimationFrame',vi.fn());vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue();detect.mockResolvedValue([{rawValue:fixed}]);const host=document.createElement('div'),root=createRoot(host);try{await act(async()=>root.render(<PaymentScanner onRequest={request} onCheckout={checkout}/>));Object.defineProperty(host.querySelector('video'),'readyState',{value:2});Object.defineProperty(host.querySelector('video'),'srcObject',{value:null,writable:true});await act(async()=>button(host,'Scan QR').click());expect(frames,host.textContent??'camera').toHaveLength(1);await act(async()=>{await frames[0](300);});expect(checkout).toHaveBeenCalledExactlyOnceWith(fixed);expect(request).not.toHaveBeenCalled();expect(host.querySelector('video')?.hidden).toBe(true);}finally{await act(async()=>root.unmount());}
});
