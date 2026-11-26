// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {SendOriginal} from '../src/features/assets/SendOriginal';
import {ReceivedOriginal} from '../src/features/deposit/ReceivedOriginal';
import type {OpenIdentity} from '../src/receiz/native-identity';
import type {HeldDeposit} from '../src/receiz/deposit-source';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const address = 'receiz_abcdefghijklmnopqr.receiz.id#'+'a'.repeat(64);

function enter(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);
  input.dispatchEvent(new Event('input',{bubbles:true}));
}

it('keeps exact bytes under Advanced and uses one confirmed transfer', async () => {
  const host=document.createElement('div'), root=createRoot(host), refreshed=vi.fn();
  const button=(label:string)=>[...host.querySelectorAll('button')].find(item=>item.textContent===label)!;
  const source={title:'Fixture Original',filename:'fixture.receiz',bytes:new Uint8Array(256)} as HeldDeposit;
  const ranges=[{offset:0,byteLength:4},{offset:99,byteLength:2}];
  const review={recipient:address,confirmationDigest:'b'.repeat(64),command:{ranges}};
  const packet=new File(['accepted exact Original transfer'],'fixture.receizpieces');
  const prepare=vi.fn(async()=>review),send=vi.fn(async()=>({file:packet}));
  const identity={originalPieces:async()=>({pending:async()=>null,prepare,send})} as unknown as OpenIdentity;
  try {
    await act(async()=>root.render(<SendOriginal identity={identity} source={source} onRefresh={refreshed}/>));
    const advanced=host.querySelector('details')!;
    expect(advanced.open).toBe(false);
    await act(async()=>{
      enter(host.querySelector<HTMLInputElement>('input[placeholder="Original receiving address"]')!,address);
      advanced.open=true;
      enter(advanced.querySelector('input')!,'1–4, 100–101');
    });
    await act(async()=>button('Review transfer').click());
    expect(prepare).toHaveBeenCalledWith({original:expect.any(File),recipient:address,ranges});
    expect(host.textContent).toContain('1–4, 100–101');
    expect(send).not.toHaveBeenCalled();
    await act(async()=>button('Confirm transfer').click());
    expect(send).toHaveBeenCalledExactlyOnceWith(review,review.confirmationDigest);
    expect(host.textContent).toContain('Original transfer recorded.');
    expect(button('Save transfer file')).toBeDefined();
    expect(refreshed).toHaveBeenCalledOnce();
  } finally {act(()=>root.unmount());}
});

it('uses the existing asset picker to review and keep the original piece package', async () => {
  const host=document.createElement('div'), root=createRoot(host), refreshed=vi.fn();
  const file=new File(['selected bytes'],'fixture.receizpieces');
  const delivery={head:{filename:'A held Original',layout:{byteLength:40}},pieces:[{byteLength:6}]};
  const inspect=vi.fn(async()=>delivery),receive=vi.fn(async()=>({file,delivery}));
  const inspectWhole=vi.fn();
  const identity={originalPieces:async()=>({inspect,receive}),receivedProof:async()=>({status:async()=>null,inspect:inspectWhole})} as unknown as OpenIdentity;
  try {
    await act(async()=>root.render(<ReceivedOriginal identity={identity} onRefresh={refreshed} onClose={()=>{}}/>));
    const picker=host.querySelector<HTMLInputElement>('[aria-label="Choose original proof object"]')!;
    Object.defineProperty(picker,'files',{value:[file]});
    await act(async()=>picker.dispatchEvent(new Event('change',{bubbles:true})));
    expect(inspect).toHaveBeenCalledExactlyOnceWith(file);
    expect(inspectWhole).not.toHaveBeenCalled();
    expect(host.textContent).toContain('A held Original');
    const confirm=[...host.querySelectorAll('button')].find(button=>button.textContent==='Receive Original bytes')!;
    expect(confirm.disabled).toBe(true);
    await act(async()=>host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
    await act(async()=>confirm.click());
    expect(receive).toHaveBeenCalledExactlyOnceWith(file);
    expect(host.textContent).toContain('Your Original bytes are held.');
    expect(refreshed).toHaveBeenCalledOnce();
  } finally {act(()=>root.unmount());}
});
