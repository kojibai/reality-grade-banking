import {expect,it,vi} from 'vitest';
import * as accountProof from '../src/receiz/account-proof';
import {BANK_APPLICATION_ID} from '../src/receiz/config';

it('requests the authenticated native source before applying canonical financial verification',async()=>{
  const read=Reflect.get(accountProof,'readAccountProof');
  expect(typeof read).toBe('function');
  const request=vi.fn(async()=>({verified:true,balance:'999999'}));
  await expect(read({request,assertOpen(){},owner:{keyId:'a'.repeat(64),artifactOwnerReceizId:'example.receiz.id'}})).rejects.toThrow();
  expect(request).toHaveBeenCalledExactlyOnceWith(`/api/connect/account-proof?applicationId=${BANK_APPLICATION_ID}`);
});

it('never requests or returns an account proof after its identity is closed',async()=>{
  const read=Reflect.get(accountProof,'readAccountProof');
  expect(typeof read).toBe('function');
  const request=vi.fn(async()=>({}));
  await expect(read({request,assertOpen(){throw Error('IDENTITY_CLOSED');},owner:{keyId:'a'.repeat(64),artifactOwnerReceizId:'example.receiz.id'}})).rejects.toThrow('IDENTITY_CLOSED');
  expect(request).not.toHaveBeenCalled();
  let closed=false;
  await expect(read({request:async()=>{closed=true;return{};},assertOpen(){if(closed)throw Error('IDENTITY_CLOSED');},owner:{keyId:'a'.repeat(64),artifactOwnerReceizId:'example.receiz.id'}})).rejects.toThrow('IDENTITY_CLOSED');
});
