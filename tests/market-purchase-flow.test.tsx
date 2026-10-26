// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {LiveActions} from '../src/features/account/LiveActions';
import type {OpenIdentity} from '../src/receiz/native-identity';
import type {SharedWallet} from '../src/receiz/shared-wallet';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const itemId='profile:artist:funded-purchase';
const button=(host:HTMLElement,text:string)=>[...host.querySelectorAll<HTMLButtonElement>('button')].find(value=>value.textContent===text)!;
const enter=async(host:HTMLElement,amount:string)=>act(async()=>{const field=host.querySelector('input')!;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(field,amount);field.dispatchEvent(new Event('input',{bubbles:true}));});
function fixture(balance='5000',side:'buy'|'sell'='buy'){
 let credited=false;
 const refusal=Object.assign(Error('wallet_insufficient_balance'),{status:409,payload:{error:'wallet_insufficient_balance'}});
 const api={status:vi.fn(async()=>null),prepare:vi.fn(async(value:{marketItemId:string;side:string;amountUsdCents?:string})=>{
  if(!credited)throw refusal;
  return{digest:'review',title:'An original',body:{marketItemId:value.marketItemId,side:value.side,amountUsd:'100.00'},observation:{preview:{shareQuantityMicro:'1250000',settlementUsdCents:'10000'}}};
 }),execute:vi.fn(async()=>({status:'recorded',side:'buy',clientNonce:'synthetic-nonce',tradeId:'synthetic-trade',shareQuantityMicro:'1250000',settlementUsdCents:'10000'})),discard:vi.fn()};
 const identity={marketTrade:async()=>api,pendingCardDeposits:async()=>[],beginCardDeposit:vi.fn(async()=>({sessionId:'cs_test_fundedpurchase',clientSecret:'synthetic-only',amountUsdCents:'10000'})),checkCardDeposit:vi.fn(async()=>({status:credited?'credited':'open'}))}as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host),refresh=vi.fn();
 return{api,identity,host,credit(){credited=true;},render:()=>act(async()=>root.render(<LiveActions action={{kind:'market-trade',marketItemId:itemId,side}} identity={identity} wallet={{totalUsdCents:balance}as SharedWallet} marketItems={[{id:itemId,title:'An original'}]as never} onClose={()=>{}} onForget={async()=>{}} onRefresh={refresh}/>)),close:()=>act(()=>root.unmount())};
}
afterEach(()=>sessionStorage.clear());
it('carries an insufficient-balance Buy from the signed-in Market sheet into card funding and completes the approved purchase once',async()=>{
 const f=fixture();try{
  await f.render();await enter(f.host,'100');await act(async()=>button(f.host,'Review trade').click());
  expect(f.host.textContent).toContain('Continue to payment');expect(f.host.querySelector<HTMLInputElement>('input')?.value).toBe('100');expect(f.identity.beginCardDeposit).not.toHaveBeenCalled();expect(f.api.execute).not.toHaveBeenCalled();
  await act(async()=>button(f.host,'Continue to payment').click());expect(f.identity.beginCardDeposit).toHaveBeenCalledExactlyOnceWith('100',true);expect(f.host.querySelector('iframe')?.title).toBe('Secure deposit payment');
  f.credit();await act(async()=>button(f.host,'Check deposit status').click());expect(f.host.textContent).toContain('Purchase complete.');expect(f.api.prepare).toHaveBeenLastCalledWith({marketItemId:itemId,side:'buy',amountUsdCents:'10000'});expect(f.api.execute).toHaveBeenCalledOnce();expect(f.identity.beginCardDeposit).toHaveBeenCalledOnce();
 }finally{f.close();}
});
it('opens the existing funding form immediately for a known empty wallet without requesting a quote',async()=>{
 const f=fixture('0');try{await f.render();expect(f.host.textContent).toContain('Continue to payment');expect(f.api.status).not.toHaveBeenCalled();expect(f.api.prepare).not.toHaveBeenCalled();expect(f.identity.beginCardDeposit).not.toHaveBeenCalled();}finally{f.close();}
});
it('keeps an asset trade-limit refusal in the trade form without opening or charging a card',async()=>{
 const f=fixture();f.api.prepare.mockRejectedValue(Object.assign(Error('market_quote_trade_limit'),{status:409,payload:{error:'market_quote_trade_limit'}}));
 try{await f.render();await enter(f.host,'100');await act(async()=>button(f.host,'Review trade').click());expect(f.host.textContent).toContain('Amount exceeds trade limit');expect(f.host.textContent).not.toContain('Continue to payment');expect(f.identity.beginCardDeposit).not.toHaveBeenCalled();expect(f.api.execute).not.toHaveBeenCalled();}finally{f.close();}
});
it('does not route a Sell or its insufficient-balance error into card funding',async()=>{
 const f=fixture('0','sell');try{await f.render();expect(f.host.textContent).toContain('Sell ownership.');await enter(f.host,'100');await act(async()=>button(f.host,'Review trade').click());expect(f.host.textContent).not.toContain('Continue to payment');expect(f.identity.beginCardDeposit).not.toHaveBeenCalled();}finally{f.close();}
});
