// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {PublicProfilePage} from '../src/public-explorer/PublicProfilePage';
import {parsePublicProfile,retainPublicProfile} from '../src/receiz/public-profile';
import {profileFixture} from './fixtures/public-profile';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const request=vi.hoisted(()=>vi.fn());vi.mock('../src/receiz/native-transport',()=>({nativeFetch:request}));
afterEach(()=>{vi.restoreAllMocks();request.mockReset();});
it('opens the existing booking experience from the quiet banner-side icon without navigating or rereading a retained calendar',async()=>{
 const config={slotMinutes:30,hourStarts:[9],weekdayIndexes:[1],daysForward:14};
 request.mockResolvedValue(Response.json({ok:true,owner:{username:'alexmorgan',displayName:'Alex Morgan',avatarUrl:null},scheduleConfig:config,savedScheduleConfig:config,customQuestions:[],savedCustomQuestions:[],slots:[]}));
 const input=profileFixture();Object.assign(input.profile.profile,{showSchedulerButton:true});const profile=parsePublicProfile(input,'alexmorgan');profile.userId='booking-profile-owner';retainPublicProfile(profile);
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host),fetcher=vi.spyOn(globalThis,'fetch');
 const source={catalog:null,status:'ready',pulse:14000000} as unknown as React.ComponentProps<typeof PublicProfilePage>['source'];
 try{
  await act(async()=>root.render(<PublicProfilePage username="alexmorgan" initialProfile={profile} source={source} active/>));
  const button=host.querySelector<HTMLButtonElement>('[aria-label="Book a time with Alex Morgan"]');expect(button).not.toBeNull();expect(button!.closest('.profile-hero')).not.toBeNull();expect(request).not.toHaveBeenCalled();
  await act(async()=>button!.click());await vi.waitFor(()=>expect(host.querySelector('.booking-panel')).not.toBeNull());
  const panel=host.querySelector('.booking-panel');expect(host.querySelector<HTMLDialogElement>('dialog')?.open).toBe(true);expect(host.querySelector('.booking-page-brand')).toBeNull();expect(host.querySelector('.booking-panel main')).toBeNull();expect(request).toHaveBeenCalledOnce();expect(request.mock.calls[0][0]).toBe('https://receiz.com/api/calendar/embed/alexmorgan');
  await act(async()=>host.querySelector<HTMLButtonElement>('dialog [aria-label="Go back"]')!.click());expect(host.querySelector<HTMLDialogElement>('dialog')?.open).toBe(false);
  await act(async()=>button!.click());await vi.waitFor(()=>expect(host.querySelector('.booking-panel')).not.toBeNull());expect(host.querySelector('.booking-panel')).toBe(panel);expect(host.querySelector<HTMLDialogElement>('dialog')?.open).toBe(true);expect(request).toHaveBeenCalledOnce();expect(fetcher).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());host.remove();}
});
it('preserves the native profile choice to keep scheduling hidden',()=>{
 const input=profileFixture();Object.assign(input.profile.profile,{showSchedulerButton:false});expect(parsePublicProfile(input,'alexmorgan').bookingEnabled).toBe(false);
});
