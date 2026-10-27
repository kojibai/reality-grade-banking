// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {PublicProfilePage} from '../src/public-explorer/PublicProfilePage';
import {parsePublicProfile,retainPublicProfile} from '../src/receiz/public-profile';
import {profileFixture} from './fixtures/public-profile';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const gate=vi.hoisted(()=>{let ready!:()=>void;const promise=new Promise<void>(resolve=>{ready=resolve;});return{promise,ready};});
const request=vi.hoisted(()=>vi.fn());
vi.mock('../src/receiz/native-transport',()=>({nativeFetch:request}));
vi.mock('../src/features/booking/PublicBookingPage',async()=>{await gate.promise;return vi.importActual('../src/features/booking/PublicBookingPage');});
it('opens the actual booking frame on the first tap and reads offered times while the optional editor code loads',async()=>{
 const config={slotMinutes:30,hourStarts:[9],weekdayIndexes:[1],daysForward:14};
 request.mockResolvedValue(Response.json({ok:true,owner:{username:'alexmorgan',displayName:'Alex Morgan',avatarUrl:null},scheduleConfig:config,savedScheduleConfig:config,customQuestions:[],savedCustomQuestions:[],slots:[{id:'first',startAt:'2026-11-02T14:00:00Z',endAt:'2026-11-02T14:30:00Z'}]}));
 const input=profileFixture();Object.assign(input.profile.profile,{showSchedulerButton:true});const profile=parsePublicProfile(input,'alexmorgan');profile.userId='first-open-owner';retainPublicProfile(profile);
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 const source={catalog:null,status:'ready',pulse:14000000} as unknown as React.ComponentProps<typeof PublicProfilePage>['source'];
 try{
  act(()=>root.render(<PublicProfilePage username="alexmorgan" initialProfile={profile} source={source} active/>));
  expect(request).not.toHaveBeenCalled();
  act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Book a time with Alex Morgan"]')!.click());
  expect(host.querySelector<HTMLDialogElement>('dialog')?.open).toBe(true);
  expect(host.querySelector('.booking-panel')?.textContent??'').toContain('Good things start');
  expect(host.querySelector('.booking-panel')?.textContent??'').toContain('Alex Morgan');
  expect(request).toHaveBeenCalledOnce();
  await act(async()=>{gate.ready();});
  await vi.waitFor(()=>expect(host.querySelector('[data-slot-start]')).not.toBeNull());
  expect(host.querySelector('.booking-panel [role="status"]')).toBeNull();
  expect(request).toHaveBeenCalledOnce();
 }finally{gate.ready();act(()=>root.unmount());host.remove();}
});
it('keeps the same profile frame while the first offered times are still in flight',async()=>{
 let resolve!:(value:Response)=>void;request.mockReset();request.mockImplementation(()=>new Promise<Response>(done=>{resolve=done;}));
 const input=profileFixture();Object.assign(input.profile.profile,{showSchedulerButton:true});const profile=parsePublicProfile(input,'alexmorgan');profile.userId='pending-times-owner';retainPublicProfile(profile);
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 const source={catalog:null,status:'ready',pulse:14000000} as unknown as React.ComponentProps<typeof PublicProfilePage>['source'];
 try{
  await act(async()=>root.render(<PublicProfilePage username="alexmorgan" initialProfile={profile} source={source} active/>));
  await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Book a time with Alex Morgan"]')!.click());
  expect(host.querySelector('.booking-panel')?.textContent??'').toContain('Alex Morgan');
  expect(host.querySelector('.booking-panel')?.textContent??'').toContain('Good things start');
  expect(host.querySelector('.booking-panel')?.textContent??'').not.toMatch(/Opening|Preparing/);
  expect(host.querySelector('.booking-panel [role="status"]')?.getAttribute('aria-label')).toBe('Preparing this calendar');
  expect(host.querySelector('[data-slot-start]')).toBeNull();expect(request).toHaveBeenCalledOnce();
  await act(async()=>resolve(Response.json({ok:false},{status:503})));
  await vi.waitFor(()=>expect(host.querySelector('[role="alert"]')?.textContent).toContain('temporarily unavailable'));
  expect(host.querySelector('.booking-panel [role="status"]')).toBeNull();
  expect(request).toHaveBeenCalledOnce();
 }finally{act(()=>root.unmount());host.remove();}
});
