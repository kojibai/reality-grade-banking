// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import type {OpenIdentity} from '../src/receiz/native-identity';
import {ProfileEditor} from '../src/features/account/ProfileEditor';
import {QuickProfileEditor} from '../src/features/account/QuickProfileEditor';
import {CertificateManager} from '../src/features/certificates/CertificateManager';
import {parsePublicProfile} from '../src/receiz/public-profile';
import {profileFixture} from './fixtures/public-profile';
const image=vi.hoisted(()=>({prepare:vi.fn()}));
vi.mock('../src/receiz/profile-image',()=>({prepareProfileImage:image.prepare}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
function deferred<T>(){let resolve!:(value:T)=>void,reject!:(cause:unknown)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
let host:HTMLDivElement,root:ReturnType<typeof createRoot>;
afterEach(async()=>{if(root)await act(()=>root.unmount());host?.remove();image.prepare.mockReset();});
function mount(){host=document.createElement('div');document.body.append(host);root=createRoot(host);}
it.each(['full','quick'] as const)('prepares the %s profile API while the selected photo is processing and uploads exactly once after both finish',async kind=>{
 const preparation=deferred<File>(),apiReady=deferred<any>(),upload=vi.fn(async()=>({profile:{profile:{avatarUrl:'https://example.test/photo.png'}}})),profileApi=vi.fn(()=>apiReady.promise),profile=parsePublicProfile(profileFixture(),'alexmorgan');
 image.prepare.mockReturnValue(preparation.promise);const identity={profile:profileApi} as unknown as OpenIdentity;mount();
 await act(()=>root.render(kind==='full'?<ProfileEditor identity={identity} profile={profile} onClose={()=>{}}/>:<QuickProfileEditor identity={identity} username="alexmorgan"/>));
 if(kind==='quick')await act(()=>host.querySelector<HTMLButtonElement>('button')!.click());
 const picker=host.querySelector<HTMLInputElement>('input[type=file]')!,file=new File(['photo'],'selected.png',{type:'image/png'});Object.defineProperty(picker,'files',{configurable:true,value:[file]});
 try{await act(()=>picker.dispatchEvent(new Event('change',{bubbles:true})));expect(image.prepare).toHaveBeenCalledExactlyOnceWith(file,'avatar');expect(profileApi).toHaveBeenCalledOnce();expect(upload).not.toHaveBeenCalled();await act(()=>apiReady.resolve({uploadImage:upload}));expect(upload).not.toHaveBeenCalled();await act(()=>preparation.resolve(file));expect(upload).toHaveBeenCalledExactlyOnceWith(file,'avatar');}
 finally{await act(()=>{apiReady.resolve({uploadImage:upload});preparation.resolve(file);});}
});
it('does not upload a prepared photo after the profile owner changes',async()=>{
 const preparation=deferred<File>(),upload=vi.fn(),profile=parsePublicProfile(profileFixture(),'alexmorgan'),first={profile:async()=>({uploadImage:upload})} as unknown as OpenIdentity,second={} as OpenIdentity;
 image.prepare.mockReturnValue(preparation.promise);mount();await act(()=>root.render(<ProfileEditor identity={first} profile={profile} onClose={()=>{}}/>));const picker=host.querySelector<HTMLInputElement>('input[type=file]')!,file=new File(['photo'],'photo.png',{type:'image/png'});Object.defineProperty(picker,'files',{value:[file]});await act(()=>picker.dispatchEvent(new Event('change',{bubbles:true})));await act(()=>root.render(<ProfileEditor identity={second} profile={profile} onClose={()=>{}}/>));await act(()=>preparation.resolve(file));expect(upload).not.toHaveBeenCalled();
});
it.each(['list','detail'] as const)('starts the existing certificate %s read beside the local checkpoint and keeps pending execution guarded',async mode=>{
 const checkpoint=deferred<any>(),token='same-owner-certificate-order',detail={note:{noteToken:token,title:'Wheat',remainingShareQuantityMicro:'12500000',lastPriceUsdCents:'100'},item:{id:'asset:wheat'},viewer:{isOwner:true}},list=vi.fn(async()=>({certificates:[],nextCursor:null})),state=vi.fn(async()=>detail),api={status:()=>checkpoint.promise,list,state};
 mount();await act(()=>root.render(<CertificateManager identity={{shareCertificates:async()=>api} as never} initialToken={mode==='detail'?token:undefined} embedded onClose={()=>{}}/>));
 try{expect(mode==='detail'?state:list).toHaveBeenCalledOnce();expect(host.textContent).not.toContain('Shares remaining');await act(()=>checkpoint.resolve({status:'pending'}));expect(host.textContent).toContain('Your saved operation is ready to continue.');if(mode==='detail'){expect(state).toHaveBeenCalledExactlyOnceWith(token);expect(host.textContent).toContain('Shares remaining');expect([...host.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent?.trim()==='Deposit shares')?.disabled).toBe(true);}else expect(list).toHaveBeenCalledOnce();}
 finally{await act(()=>checkpoint.resolve(null));}
});
it('does not upload an invalid photo when profile preparation finishes first',async()=>{
 const preparation=deferred<File>(),upload=vi.fn(),profile=parsePublicProfile(profileFixture(),'alexmorgan'),identity={profile:async()=>({uploadImage:upload})} as unknown as OpenIdentity;image.prepare.mockReturnValue(preparation.promise);mount();await act(()=>root.render(<ProfileEditor identity={identity} profile={profile} onClose={()=>{}}/>));const field=host.querySelector<HTMLInputElement>('input[type=file]')!;Object.defineProperty(field,'files',{value:[new File(['bad'],'bad.png',{type:'image/png'})]});await act(()=>field.dispatchEvent(new Event('change',{bubbles:true})));await act(()=>preparation.reject(Error('Invalid selected image')));expect(upload).not.toHaveBeenCalled();expect(host.querySelector('[role=alert]')?.textContent).toContain('could not be updated');
});
it('keeps a certificate checkpoint failure authoritative over a completed detail read',async()=>{
 const checkpoint=deferred<never>(),state=vi.fn(async()=>({note:{title:'Do not publish',remainingShareQuantityMicro:'1000000',lastPriceUsdCents:'100'},item:{id:'same-item'},viewer:{isOwner:true}}));mount();await act(()=>root.render(<CertificateManager identity={{shareCertificates:async()=>({status:()=>checkpoint.promise,state})} as never} initialToken="same-certificate-checkpoint" embedded onClose={()=>{}}/>));await act(()=>checkpoint.reject(Error('CHECKPOINT_SOURCE_INVALID')));expect(state).toHaveBeenCalledOnce();expect(host.textContent).not.toContain('Shares remaining');expect(host.textContent).toContain('Choose the complete, unchanged share certificate.');
});
it('shows pending certificate recovery while its independent list read waits and keeps it after that read fails',async()=>{
 const pendingList=deferred<never>(),list=vi.fn(()=>pendingList.promise);mount();await act(()=>root.render(<CertificateManager identity={{shareCertificates:async()=>({status:async()=>({status:'pending'}),list})} as never} embedded onClose={()=>{}}/>));
 try{expect(list).toHaveBeenCalledOnce();expect(host.textContent).toContain('Your saved operation is ready to continue.');expect([...host.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent==='Continue saved operation')?.disabled).toBe(false);await act(()=>pendingList.reject(Error('Read unavailable')));expect(host.textContent).toContain('Your saved operation is ready to continue.');expect(host.textContent).toContain('Cancel unsubmitted operation');expect(list).toHaveBeenCalledOnce();}
 finally{await act(()=>pendingList.reject(Error('Read unavailable')));}
});
