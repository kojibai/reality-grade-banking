import {expect,it,vi} from 'vitest';
import {createReceivingUsernamePreparation} from '../src/receiz/receiving-username';

it('bounds pending profile retries and permits an explicit retry without guessing the SDK default name',async()=>{
 const signal=new AbortController().signal,wait=vi.fn(async()=>{}),publish=vi.fn();let ready=false;
 const read=vi.fn(async()=>({uid:'same-account',username:ready?'canonical_default_2':'receiz_123456789012345678',profileProjectionPending:!ready}));
 const prepare=createReceivingUsernamePreparation({signal,confirmed:()=>null,connect:async()=> 'same-account',read,publish,wait});
 const first=prepare(),second=prepare();expect(first).toBe(second);
 await expect(first).rejects.toThrow('RECEIVING_USERNAME_PENDING');expect(read).toHaveBeenCalledTimes(3);expect(publish).not.toHaveBeenCalled();
 ready=true;expect(await prepare()).toBe('canonical_default_2');expect(publish).toHaveBeenCalledWith('canonical_default_2','same-account');
});
it('refuses a public username returned for another account',async()=>{
 const publish=vi.fn(),prepare=createReceivingUsernamePreparation({signal:new AbortController().signal,confirmed:()=>null,connect:async()=> 'expected-account',read:async()=>({uid:'another-account',username:'another_person',profileProjectionPending:false}),publish,wait:async()=>{}});
 await expect(prepare()).rejects.toThrow('RECEIVING_USERNAME_IDENTITY_CHANGED');expect(publish).not.toHaveBeenCalled();
});
it('cannot publish a delayed public username after the identity is disposed',async()=>{
 const controller=new AbortController(),publish=vi.fn();let finish!:(value:{uid:string;username:string;profileProjectionPending:boolean})=>void;
 const read=vi.fn(()=>new Promise<{uid:string;username:string;profileProjectionPending:boolean}>(resolve=>{finish=resolve;}));
 const prepare=createReceivingUsernamePreparation({signal:controller.signal,confirmed:()=>null,connect:async()=> 'same-account',read,publish,wait:async()=>{}});
 const work=prepare();await vi.waitFor(()=>expect(read).toHaveBeenCalledOnce());controller.abort();finish({uid:'same-account',username:'confirmed_name',profileProjectionPending:false});
 await expect(work).rejects.toBe(controller.signal.reason);expect(publish).not.toHaveBeenCalled();
});
