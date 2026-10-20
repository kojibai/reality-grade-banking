// @vitest-environment happy-dom
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {LiveAccount} from '../src/features/account/LiveAccount';
import type {SharedWallet} from '../src/receiz/shared-wallet';
it('shows received Note value beside balance without counting it twice as confirmed wallet credit',()=>{
 const wallet={userId:'receiver',totalUsdCents:'500',reserveUsdCents:'500',settlementUsdCents:'0',balancePhiMicro:'1',portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,projectionComplete:true,pulse:null,kaiUpulse:null}as SharedWallet;
 const noop=()=>{},props={wallet,busy:false,error:null,observedAt:null,onRefresh:noop,onSend:noop,onReceive:noop,onBalance:noop,onAssets:noop,onLedger:noop};
 const held={noteId:'held',status:'received' as const,rail:'reserve' as const,amountUsdCents:'200',amountPhiMicro:'100',proofBytes:new Uint8Array([1])};
 const host=document.createElement('div');host.innerHTML=renderToStaticMarkup(<LiveAccount {...props} receivedNotes={[held]}/>);
 expect(host.querySelector('.balance-amount')?.textContent).toBe('$5.00');
 expect(host.querySelector('.received-note-balance')?.textContent??'').toContain('$2.00');expect(host.querySelector('.received-note-balance')?.textContent??'').toContain('Received Notes');
 host.innerHTML=renderToStaticMarkup(<LiveAccount {...props} receivedNotes={[{...held,status:'confirmed',reserveAfterUsdCents:'700'}]}/>);
 expect(host.querySelector('.received-note-balance')).toBeNull();
});
