import {expect,it} from 'vitest';
import {createReceizIdentityKeyFile} from '@receiz/sdk';
// Exercise the shipped composition, rather than a substitute crypto adapter.
// @ts-expect-error Generated native module has its typed application port in src/receiz/offline-notes.ts.
import * as notes from '../public/native/offline-notes.v129.mjs';

it('creates an identity-bound account receiving request without device qualification or network',async()=>{
 const uid='22222222-2222-4222-8222-222222222222',passphrase='test-only-receiving-request';
 const identity=await createReceizIdentityKeyFile({passphrase,owner:{uid,username:'receiver'},portableState:{schema:'receiz.account.state.v3',snapshot:{schema:'receiz.account.state.v3',account:{userId:uid}}}});
 expect(typeof notes.createBankNoteAccountReceivingRequest).toBe('function');
 const bytes=await notes.createBankNoteAccountReceivingRequest({identity:identity.keyFile,passphrase,accountUserId:uid});
 const request=await notes.verifyBankNoteAccountReceivingRequest(bytes);
 expect(request.receiverUserId).toBe(uid);expect(request.receiverKeyId).toBe(identity.keyId);
 const text=new TextDecoder().decode(bytes);
 expect(text).not.toContain(passphrase);expect(text).not.toContain('privateKey');expect(text).not.toContain('qualificationDigest');
 for(const field of ['receiverUserId','receiverKeyId','nonce']){
  const changed=JSON.parse(text);changed[field]=field==='receiverKeyId'?'a'.repeat(64):field==='receiverUserId'?'33333333-3333-4333-8333-333333333333':'different-request';
  await expect(notes.verifyBankNoteAccountReceivingRequest(new TextEncoder().encode(JSON.stringify(changed)))).rejects.toThrow();
 }
});

it('refuses a receiving request for a different carried account and never exports its key',async()=>{
 const identity=await createReceizIdentityKeyFile({owner:{uid:'receiver'},portableState:{schema:'receiz.account.state.v3',snapshot:{schema:'receiz.account.state.v3',account:{userId:'22222222-2222-4222-8222-222222222222'}}}});
 expect(typeof notes.createBankNoteAccountReceivingRequest).toBe('function');
 await expect(notes.createBankNoteAccountReceivingRequest({identity:identity.keyFile,accountUserId:'33333333-3333-4333-8333-333333333333'})).rejects.toThrow('BANK_NOTE_IDENTITY_BINDING_REQUIRED');
});

it('uses a fresh SDK device Identity Seal with the already known native account destination, without another login',async()=>{
 const {createReceizIdIdentity}=await import('@receiz/sdk'),identity=await createReceizIdIdentity({passphrase:'synthetic-bootstrap-receiver'});
 const uid='22222222-2222-4222-8222-222222222222';
 const request=await notes.verifyBankNoteAccountReceivingRequest(await notes.createBankNoteAccountReceivingRequest({identity:identity.keyFile,passphrase:'synthetic-bootstrap-receiver',accountUserId:uid}));
 expect(request.receiverUserId).toBe(uid);expect(request.receiverKeyId).toBe(identity.keyFile.keyId);
 expect(request.identityPortableStateDigest).toBe(identity.keyFile.portableState?.proof?.digestSha256Hex);
},30000);

it('uses the actual Bank-created empty genesis with its subsequently bound native destination',async()=>{
 const {createReceizIdIdentity}=await import('@receiz/sdk'),{initializeFreshBankAccount}=await import('../src/receiz/new-account-genesis');
 const identity=await createReceizIdIdentity({passphrase:'synthetic-bank-genesis'});
 const keyFile=await initializeFreshBankAccount(identity.keyFile,'synthetic-bank-genesis');
 const uid='22222222-2222-4222-8222-222222222222';
 const request=await notes.verifyBankNoteAccountReceivingRequest(await notes.createBankNoteAccountReceivingRequest({identity:keyFile,passphrase:'synthetic-bank-genesis',accountUserId:uid}));
 expect(request.receiverUserId).toBe(uid);expect(request.receiverKeyId).toBe(identity.keyFile.keyId);
},30000);
