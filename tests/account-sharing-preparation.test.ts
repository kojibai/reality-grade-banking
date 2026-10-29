import {expect,it,vi} from 'vitest';
import {createAccountProofSharing,type AccountProofSharing} from '../src/receiz/account-proof-sharing';
const status={schema:'bankeiz.account-proof-sharing.v1',sharingHead:'a'.repeat(64),liveUpdates:false,latestSourceDigest:null} as const;
function gate<T>(){let open!:(v:T)=>void,fail!:(cause:Error)=>void;return{wait:new Promise<T>((resolve,reject)=>{open=resolve;fail=reject;}),open:(v:T)=>open(v),fail:(cause:Error)=>fail(cause)};}
function fixture(request:()=>Promise<unknown>,prior?:()=>Promise<any>,assertOpen=()=>{}){const sign=vi.fn(async()=>{throw Error('MUST_NOT_SIGN');}),publish=vi.fn(async()=>{throw Error('MUST_NOT_PUBLISH');}),disable=vi.fn(async()=>{throw Error('MUST_NOT_DISABLE');});const previous:AccountProofSharing|undefined=prior?{status:prior,publish,disable}:undefined;return{api:createAccountProofSharing({keyId:'b'.repeat(64),receizId:'fixture.receiz.id',request,previous,assertOpen,signConsent:sign}),sign,publish,disable};}
it('starts both registration reads together and returns the same combined sharing status',async()=>{
 const current=gate<unknown>(),old=gate<any>(),read=vi.fn(()=>current.wait),prior=vi.fn(()=>old.wait),f=fixture(read,prior);
 const work=f.api.status();const started=prior.mock.calls.length;current.open(status);old.open({...status,otherLiveUpdates:true});expect(await work).toEqual({...status,otherLiveUpdates:true});expect(started).toBe(1);expect(read).toHaveBeenCalledOnce();expect(prior).toHaveBeenCalledOnce();expect(f.sign).not.toHaveBeenCalled();expect(f.publish).not.toHaveBeenCalled();expect(f.disable).not.toHaveBeenCalled();
});
it('keeps a current read failure ahead of an earlier previous-read failure',async()=>{
 const current=gate<unknown>(),prior=vi.fn(async()=>{throw Error('PREVIOUS_REFUSED');}),f=fixture(()=>current.wait,prior),result=f.api.status().then(value=>({value}),error=>({error}));
 await Promise.resolve();current.fail(Error('CURRENT_REFUSED'));expect(await result).toMatchObject({error:Error('CURRENT_REFUSED')});expect(prior).toHaveBeenCalledOnce();
});
it('contains synchronous previous-read failure and preserves current validation first',async()=>{
 const prior=()=>{throw Error('PREVIOUS_REFUSED');},f=fixture(async()=>status,prior);await expect(f.api.status()).rejects.toThrow('PREVIOUS_REFUSED');const invalid=fixture(async()=>({...status,sharingHead:'invalid'}),prior);await expect(invalid.api.status()).rejects.toThrow('ACCOUNT_PROOF_SHARING_UNCONFIRMED');
});
it('does no reads when already closed and cannot return status after the owner closes',async()=>{
 const read=vi.fn(async()=>status),prior=vi.fn(async()=>status),closed=fixture(read,prior,()=>{throw Error('IDENTITY_CLOSED');});await expect(closed.api.status()).rejects.toThrow('IDENTITY_CLOSED');expect(read).not.toHaveBeenCalled();expect(prior).not.toHaveBeenCalled();
 let isClosed=false;const old=gate<any>(),live=fixture(async()=>status,()=>old.wait,()=>{if(isClosed)throw Error('IDENTITY_CLOSED');}),result=live.api.status();await Promise.resolve();isClosed=true;old.open(status);await expect(result).rejects.toThrow('IDENTITY_CLOSED');
});
it('keeps accounts with no earlier registration on one GET with the same exact result',async()=>{
 const request=vi.fn(async()=>status),f=fixture(request);expect(await f.api.status()).toEqual(status);expect(request).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('/api/connect/account-proof/sharing?applicationId='),'GET');
});
