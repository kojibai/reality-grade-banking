// @vitest-environment happy-dom
import {act} from 'react';import {createRoot} from 'react-dom/client';import {expect,it,vi} from 'vitest';
import {CalendarRecordDetails} from '../src/features/messages/organizer/CalendarRecordDetails';
import {projectCalendarOriginal} from '../src/receiz/calendar-source-projection';
import type {OrganizerEvent,NativeOrganizer} from '../src/receiz/native-organizer';import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('opens the exact already-held Original proof without offering or requesting a synthetic Calendar bundle',async()=>{
 const href='https://receiz.com/v/20261102_0942/21188918/14955302?c=held-proof';
 const event=projectCalendarOriginal('owner',{id:'imported-'+'a'.repeat(64),slug:'20261102_0942',code:'21188918',pulse:'14955302',createdAt:'2026-11-02T14:42:03.163Z',verifyUrl:href})[0];
 const eventProof=vi.fn(),api={accountUid:'owner',eventProof} as unknown as NativeOrganizer,host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<CalendarRecordDetails event={event} identity={{} as OpenIdentity} api={api}/>));expect(host.querySelector('a')?.getAttribute('href')).toBe(href);expect(host.textContent).toContain('View original proof');expect(host.textContent).not.toContain('Calendar proof');expect(eventProof).not.toHaveBeenCalled();}
 finally{act(()=>root.unmount());}
});
it('shows recorded sale results and a receipt immediately without starting an unrequested proof lookup',async()=>{
 const event:OrganizerEvent={id:'00000000-0000-4000-8000-000000000003',ownerUserId:'owner',title:'Market share sell',kind:'traction',source:'system',startAt:'2026-10-26T15:00:00Z',endAt:'2026-10-26T15:10:00Z',location:'',note:'',attendees:[],createdAt:'2026-10-26T15:00:00Z',updatedAt:'2026-10-26T15:00:00Z',metadata:{actionKind:'market.share.sell',ledgerEntryId:'entry-1',pulse:'100',title:'A source object',side:'sell',shareQuantityMicro:'2000000',priceUsdCents:'300',settlementUsdCents:'590',feeUsdCents:'10',realizedCostBasisUsdCents:'400'}};
 let finish:((value:never)=>void)|undefined;const eventProof=vi.fn(()=>new Promise<never>(resolve=>{finish=resolve;})),api={accountUid:'owner',eventProof} as unknown as NativeOrganizer,host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<CalendarRecordDetails event={event} identity={{} as OpenIdentity} api={api}/>));expect(host.textContent).toContain('A source object');expect(host.textContent).toContain('$5.90');expect(host.textContent).toContain('$1.90');expect(host.textContent).toContain('Shares sold');expect(host.querySelector('a[aria-label="View receipt"]')?.getAttribute('href')).toContain('/receipt/');expect(host.textContent).not.toContain('{"');expect(eventProof).not.toHaveBeenCalled();}
 finally{act(()=>root.unmount());finish?.(undefined as never);}
});
it('shows a visitor question, full Twin reply and useful event context immediately without exposing arbitrary metadata',async()=>{
 const event:OrganizerEvent={id:'00000000-0000-4000-8000-000000000004',ownerUserId:'owner',title:'Your agent replied',kind:'traction',source:'system',startAt:'2026-10-26T15:00:00Z',endAt:'2026-10-26T15:10:00Z',location:'',note:'',attendees:[],createdAt:'2026-10-26T15:00:00Z',updatedAt:'2026-10-26T15:00:00Z',metadata:{actionKind:'world.agent.profile.reply',request:'Can we meet tomorrow?',reply:'Yes, here are the available times.',visitorIdentity:{displayName:'Maya Chen',email:'maya@example.test'},status:'confirmed',apiKey:'must-not-display'}};
 let finish:((value:never)=>void)|undefined;const eventProof=vi.fn(()=>new Promise<never>(resolve=>{finish=resolve;})),api={accountUid:'owner',eventProof} as unknown as NativeOrganizer,host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<CalendarRecordDetails event={event} identity={{} as OpenIdentity} api={api}/>));expect(host.textContent).toContain('Can we meet tomorrow?');expect(host.textContent).toContain('Yes, here are the available times.');expect(host.textContent).toContain('Maya Chen');expect(host.textContent).toContain('Confirmed');expect(host.textContent).not.toContain('must-not-display');expect(eventProof).not.toHaveBeenCalled();}
 finally{act(()=>root.unmount());finish?.(undefined as never);}
});

it('names a failed Calendar proof check precisely and retries only when requested while the event stays visible',async()=>{
 const event:OrganizerEvent={id:'00000000-0000-4000-8000-000000000005',ownerUserId:'owner',title:'Live meeting',kind:'appointment',source:'manual',startAt:'2026-10-26T15:00:00Z',endAt:'2026-10-26T16:00:00Z',location:'',note:'',attendees:[],createdAt:'2026-10-26T15:00:00Z',updatedAt:'2026-10-26T15:00:00Z',metadata:{request:'Meet now'}};
 const eventProof=vi.fn().mockRejectedValueOnce(Error('calendar_bundle_failed')).mockImplementation(()=>new Promise(()=>{})),api={accountUid:'owner',eventProof} as unknown as NativeOrganizer,host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<CalendarRecordDetails event={event} identity={{} as OpenIdentity} api={api}/>));
  expect(eventProof).not.toHaveBeenCalled();
  await act(async()=>{const details=host.querySelector<HTMLDetailsElement>('.organizer-record-proof')!;details.open=true;details.dispatchEvent(new Event('toggle'));});
  expect(host.textContent).toContain('Calendar proof check failed');expect(host.textContent).toContain('Meet now');expect(host.textContent).not.toContain('Proof record is temporarily unavailable');
  expect(eventProof).toHaveBeenCalledTimes(1);const retry=host.querySelector<HTMLButtonElement>('button[aria-label="Retry Calendar proof check"]')!;expect(retry).not.toBeNull();
  await act(async()=>retry.click());expect(eventProof).toHaveBeenCalledTimes(2);expect(host.textContent).toContain('Meet now');expect(host.textContent).not.toContain('Calendar proof check failed');
 }finally{act(()=>root.unmount());}
});

it.each([['world_profile_agent','Twin booking'],['calendar_embed','Booking page'],['email','Email'],['sms','SMS'],['app-webhook','Connected app'],['partner_portal','Partner portal']] as const)('shows the consumer channel label for %s while preserving the exact recorded metadata',async(channel,label)=>{
 const event:OrganizerEvent={id:'00000000-0000-4000-8000-000000000006',ownerUserId:'owner',title:'Appointment',kind:'appointment',source:'embed',startAt:'2026-11-14T20:30:00Z',endAt:'2026-11-14T21:00:00Z',location:'',note:'',attendees:[],createdAt:'2026-11-13T12:00:00Z',updatedAt:'2026-11-13T12:00:00Z',metadata:{channel,status:'confirmed',recordedSource:{channel,coordinate:'exact-original'}}};
 const original=structuredClone(event),eventProof=vi.fn(),api={accountUid:'owner',eventProof}as unknown as NativeOrganizer,host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<CalendarRecordDetails event={event} identity={{}as OpenIdentity} api={api}/>));
  const field=[...host.querySelectorAll('dt')].find(node=>node.textContent==='Channel');expect(field?.parentElement?.querySelector('dd')?.textContent).toBe(label);expect(event).toEqual(original);expect(event.metadata.channel).toBe(channel);expect(eventProof).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});
