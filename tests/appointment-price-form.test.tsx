// @vitest-environment happy-dom
import {act} from 'react';import {createRoot} from 'react-dom/client';import {it,expect,vi} from 'vitest';
import {AppointmentForm} from '../src/features/messages/organizer/CalendarViews';
import {createNativeOrganizer} from '../src/receiz/native-organizer';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('keeps free creation unchanged and sends one explicit price per guest for a priced meeting',async()=>{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host),save=vi.fn();
 try{await act(async()=>root.render(<AppointmentForm day="2030-01-01" busy={false} onBack={()=>{}} onSave={save}/>));
 const form=host.querySelector('form')!;expect(host.querySelector('[aria-label="Price per guest in USD"]')).toBeNull();
 host.querySelector<HTMLInputElement>('[name="title"]')!.value='Consultation';await act(async()=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));expect(save.mock.calls[0][0]).not.toHaveProperty('meetingPriceUsdCents');
 await act(async()=>host.querySelector<HTMLButtonElement>('.organizer-link-row')!.click());const price=host.querySelector<HTMLInputElement>('[aria-label="Price per guest in USD"]')!;expect(price.value).toBe('0.00');
 await act(async()=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;setter.call(price,'75.00');price.dispatchEvent(new Event('input',{bubbles:true}));price.dispatchEvent(new Event('change',{bubbles:true}));});
 await act(async()=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));expect(save.mock.calls.at(-1)?.[0]).toMatchObject({meeting:true,meetingPriceUsdCents:'7500'});
 }finally{act(()=>root.unmount());host.remove();}
});
it('does not acknowledge a priced appointment when an older service omits the accepted price',async()=>{
 const uid='11111111-1111-4111-8111-111111111111',request=vi.fn(async()=>Response.json({ok:true,event:{id:uid,ownerUserId:uid,title:'Consultation',kind:'appointment',source:'manual',startAt:'2030-01-01T12:00:00Z',endAt:'2030-01-01T13:00:00Z',location:'',note:'',attendees:[],metadata:{},createdAt:'2030-01-01T10:00:00Z',updatedAt:'2030-01-01T10:00:00Z'}}));
 const api=createNativeOrganizer({accountUid:uid,request});await expect(api.saveEvent({title:'Consultation',startAt:'2030-01-01T12:00:00Z',endAt:'2030-01-01T13:00:00Z',meeting:true,meetingPriceUsdCents:'7500'})).rejects.toThrow('ORGANIZER_WRITE_UNCONFIRMED');expect(api.known().events).toBeNull();
});
