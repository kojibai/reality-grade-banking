// @vitest-environment happy-dom
import {act} from 'react';import {createRoot} from 'react-dom/client';import {expect,it,vi} from 'vitest';
import {CalendarRecordDetails} from '../src/features/messages/organizer/CalendarRecordDetails';
import type {OrganizerEvent,NativeOrganizer} from '../src/receiz/native-organizer';import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('shows recorded sale results and a receipt immediately while its native proof is still pending',async()=>{
 const event:OrganizerEvent={id:'00000000-0000-4000-8000-000000000003',ownerUserId:'owner',title:'Market share sell',kind:'traction',source:'system',startAt:'2026-10-26T15:00:00Z',endAt:'2026-10-26T15:10:00Z',location:'',note:'',attendees:[],createdAt:'2026-10-26T15:00:00Z',updatedAt:'2026-10-26T15:00:00Z',metadata:{actionKind:'market.share.sell',ledgerEntryId:'entry-1',pulse:'100',title:'A source object',side:'sell',shareQuantityMicro:'2000000',priceUsdCents:'300',settlementUsdCents:'590',feeUsdCents:'10',realizedCostBasisUsdCents:'400'}};
 let finish!:(value:never)=>void;const eventProof=vi.fn(()=>new Promise<never>(resolve=>{finish=resolve;})),api={accountUid:'owner',eventProof} as unknown as NativeOrganizer,host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<CalendarRecordDetails event={event} identity={{} as OpenIdentity} api={api}/>));expect(host.textContent).toContain('A source object');expect(host.textContent).toContain('$5.90');expect(host.textContent).toContain('$1.90');expect(host.textContent).toContain('Shares sold');expect(host.querySelector('a[aria-label="View receipt"]')?.getAttribute('href')).toContain('/receipt/');expect(host.textContent).not.toContain('{"');expect(eventProof).toHaveBeenCalledTimes(1);}
 finally{act(()=>root.unmount());finish(undefined as never);}
});
it('shows a visitor question, full Twin reply and useful event context immediately without exposing arbitrary metadata',async()=>{
 const event:OrganizerEvent={id:'00000000-0000-4000-8000-000000000004',ownerUserId:'owner',title:'Your agent replied',kind:'traction',source:'system',startAt:'2026-10-26T15:00:00Z',endAt:'2026-10-26T15:10:00Z',location:'',note:'',attendees:[],createdAt:'2026-10-26T15:00:00Z',updatedAt:'2026-10-26T15:00:00Z',metadata:{actionKind:'world.agent.profile.reply',request:'Can we meet tomorrow?',reply:'Yes, here are the available times.',visitorIdentity:{displayName:'Maya Chen',email:'maya@example.test'},status:'confirmed',apiKey:'must-not-display'}};
 let finish!:(value:never)=>void;const eventProof=vi.fn(()=>new Promise<never>(resolve=>{finish=resolve;})),api={accountUid:'owner',eventProof} as unknown as NativeOrganizer,host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<CalendarRecordDetails event={event} identity={{} as OpenIdentity} api={api}/>));expect(host.textContent).toContain('Can we meet tomorrow?');expect(host.textContent).toContain('Yes, here are the available times.');expect(host.textContent).toContain('Maya Chen');expect(host.textContent).toContain('Confirmed');expect(host.textContent).not.toContain('must-not-display');expect(eventProof).toHaveBeenCalledTimes(1);}
 finally{act(()=>root.unmount());finish(undefined as never);}
});
