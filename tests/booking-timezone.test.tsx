// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {AvailabilityForm} from '../src/features/messages/organizer/BookingSettings';
import {createNativeOrganizer} from '../src/receiz/native-organizer';
import {bankBookingLink,bookingOverrides} from '../src/receiz/booking-link';
import {permittedOrganizerPath} from '../src/receiz/organizer-paths';
const config={slotMinutes:30,hourStarts:[9],weekdayIndexes:[1],daysForward:14};
const availability={ok:true,owner:{username:'bjklock',displayName:'BJ Klock',avatarUrl:null},scheduleConfig:config,savedScheduleConfig:config,customQuestions:[],savedCustomQuestions:[],slots:[]};
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});const cleanups:Array<()=>void>=[];afterEach(()=>{cleanups.splice(0).forEach(run=>run());vi.restoreAllMocks();});
it('resolves owner availability and its automatic device timezone in the single existing request and reuses it',async()=>{
 const request=vi.fn(async()=>Response.json(availability)),api=createNativeOrganizer({accountUid:'owner',request});
 await Promise.all([api.availability('bjklock'),api.availability('bjklock')]);await api.availability('bjklock');
 expect(request).toHaveBeenCalledOnce();expect(request).toHaveBeenCalledWith('/api/calendar/embed/bjklock',expect.objectContaining({method:'PUT',body:JSON.stringify({action:'availability',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone})}));
});
it('defaults the owner to the device timezone and preserves an explicit manual selection on save',async()=>{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host),save=vi.fn();cleanups.push(()=>{act(()=>root.unmount());host.remove();});
 await act(async()=>root.render(<AvailabilityForm initial={availability} custom={false} busy={false} username="bjklock" onBack={()=>{}} onSave={save} onError={()=>{}}/>));
 const select=host.querySelector<HTMLSelectElement>('[aria-label="Availability timezone"]');expect(select).not.toBeNull();expect(select!.value).toBe('auto');
 await act(async()=>{select!.value='Asia/Tokyo';select!.dispatchEvent(new Event('change',{bubbles:true}));});
 await act(async()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 expect(save).toHaveBeenCalledWith({...config,timezone:'Asia/Tokyo',timezoneMode:'manual'},[]);
});
it('keeps a custom link’s owner timezone separate from the visitor’s display zone without an extra lookup',()=>{
 const link=new URL(bankBookingLink('bjklock',{scheduleConfig:{...config,timezone:'America/New_York',timezoneMode:'manual'},customQuestions:[]}));
 expect(link.searchParams.get('timezone')).toBe('America/New_York');const overrides=bookingOverrides(link.searchParams);expect(overrides.get('timezone')).toBe('America/New_York');
 expect(permittedOrganizerPath(new URL('/api/calendar/embed/bjklock?'+overrides,'https://receiz.com'),'GET')).toBe(true);
 expect(permittedOrganizerPath(new URL('https://receiz.com/api/calendar/embed/bjklock?timezone=Not/AZone'),'GET')).toBe(false);
});
it('uses the current device zone for held automatic settings and keeps the label and saved zone together while editing',async()=>{
 const resolved=Intl.DateTimeFormat.prototype.resolvedOptions,device=vi.spyOn(Intl.DateTimeFormat.prototype,'resolvedOptions').mockImplementation(function(this:Intl.DateTimeFormat){return {...resolved.call(this),timeZone:'America/Los_Angeles'};});
 const initial={...availability,savedScheduleConfig:{...config,timezone:'America/New_York',timezoneMode:'auto' as const}};
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host),save=vi.fn();cleanups.push(()=>{act(()=>root.unmount());host.remove();});
 const render=()=>root.render(<AvailabilityForm initial={initial} custom={false} busy={false} username="bjklock" onBack={()=>{}} onSave={save} onError={()=>{}}/>);
 await act(async()=>render());expect(host.querySelector('option[value="auto"]')!.textContent).toContain('America/Los Angeles');
 device.mockImplementation(function(this:Intl.DateTimeFormat){return {...resolved.call(this),timeZone:'Asia/Tokyo'};});
 await act(async()=>render());expect(host.querySelector('option[value="auto"]')!.textContent).toContain('America/Los Angeles');
 await act(async()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 expect(save).toHaveBeenCalledWith({...config,timezone:'America/Los_Angeles',timezoneMode:'auto'},[]);
});
it('retains a manually saved owner zone even when the device is elsewhere',async()=>{
 const initial={...availability,savedScheduleConfig:{...config,timezone:'Asia/Tokyo',timezoneMode:'manual' as const}};
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host),save=vi.fn();cleanups.push(()=>{act(()=>root.unmount());host.remove();});
 await act(async()=>root.render(<AvailabilityForm initial={initial} custom={false} busy={false} username="bjklock" onBack={()=>{}} onSave={save} onError={()=>{}}/>));
 expect(host.querySelector<HTMLSelectElement>('[aria-label="Availability timezone"]')!.value).toBe('Asia/Tokyo');
 await act(async()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 expect(save).toHaveBeenCalledWith(initial.savedScheduleConfig,[]);
});
it('reuses the current automatic zone but resolves it again after returning from another zone',async()=>{
 const resolved=Intl.DateTimeFormat.prototype.resolvedOptions;let zone='America/New_York';
 vi.spyOn(Intl.DateTimeFormat.prototype,'resolvedOptions').mockImplementation(function(this:Intl.DateTimeFormat){return {...resolved.call(this),timeZone:zone};});
 const request=vi.fn(async(_path:string,_init?:RequestInit)=>Response.json({...availability,savedScheduleConfig:{...config,timezone:zone,timezoneMode:'auto'}})),api=createNativeOrganizer({accountUid:'owner',request});
 await api.availability('bjklock');await api.availability('bjklock');expect(request).toHaveBeenCalledTimes(1);
 zone='America/Los_Angeles';await api.availability('bjklock');await api.availability('bjklock');expect(request).toHaveBeenCalledTimes(2);
 zone='America/New_York';await api.availability('bjklock');await api.availability('bjklock');expect(request).toHaveBeenCalledTimes(3);
 expect(request.mock.calls.map(([,init])=>JSON.parse(init!.body as string).timezone)).toEqual(['America/New_York','America/Los_Angeles','America/New_York']);
});
