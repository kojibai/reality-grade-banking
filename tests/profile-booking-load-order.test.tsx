// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {PublicProfilePage} from '../src/public-explorer/PublicProfilePage';
import {parsePublicProfile,retainPublicProfile,forgetPublicProfile} from '../src/receiz/public-profile';
import {profileFixture} from './fixtures/public-profile';
const view=vi.hoisted(()=>({loads:0,renders:0}));
vi.mock('../src/features/booking/BookingConversation',async()=>{view.loads++;const actual=await vi.importActual<typeof import('../src/features/booking/BookingConversation')>('../src/features/booking/BookingConversation');return{default:(props:React.ComponentProps<typeof actual.default>)=>{view.renders++;return <actual.default {...props}/>;}};});
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('keeps booking code off profile entry, then loads its conversation while the one availability read is still pending',async()=>{
 let resolve!:(value:Response)=>void;
 const request=vi.spyOn(globalThis,'fetch').mockImplementation(()=>new Promise<Response>(done=>{resolve=done;}));
 const input=profileFixture();Object.assign(input.profile.profile,{showSchedulerButton:true});const profile=parsePublicProfile(input,'alexmorgan');profile.userId='booking-load-owner';retainPublicProfile(profile);
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 const source={catalog:null,status:'ready',pulse:14000000} as unknown as React.ComponentProps<typeof PublicProfilePage>['source'];
 try{
  await act(async()=>root.render(<PublicProfilePage username="alexmorgan" initialProfile={profile} source={source} active/>));
  expect(view.loads).toBe(0);expect(request).not.toHaveBeenCalled();
  await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Book a time with Alex Morgan"]')!.click());
  expect(host.querySelector<HTMLDialogElement>('dialog')?.open).toBe(true);expect(request).toHaveBeenCalledOnce();
  await act(async()=>{await vi.waitFor(()=>expect(view.loads).toBe(1));});
  expect(view.renders).toBe(0);expect(host.querySelector('[aria-label="Your reply"]')).toBeNull();
  const config={slotMinutes:30,hourStarts:[9],weekdayIndexes:[1],daysForward:14};
  await act(async()=>resolve(Response.json({ok:true,bookingOffers:[],owner:{userId:profile.userId,username:profile.username,displayName:profile.displayName,avatarUrl:null},scheduleConfig:config,savedScheduleConfig:config,customQuestions:[],savedCustomQuestions:[],slots:[],conversation:{state:'ready',ownerUserId:profile.userId,username:profile.username}})));
  await vi.waitFor(()=>expect(host.querySelector('[aria-label="Your reply"]')).not.toBeNull());
  expect(view.loads).toBe(1);expect(view.renders).toBeGreaterThan(0);expect(request).toHaveBeenCalledOnce();
 }finally{act(()=>root.unmount());host.remove();request.mockRestore();forgetPublicProfile(profile.username);}
});
