import {expect,it} from 'vitest';
import {createReceizIdIdentity,projectReceizIdentityAccount} from '@receiz/sdk';
import {initializeFreshBankAccount} from '../src/receiz/new-account-genesis';
import {readVerifiedOwnerProfileHeader} from '../src/receiz/profile-owner-header';
import {readCarriedWalletObservation} from '../src/receiz/wallet-observation';
import type {OpenIdentity} from '../src/receiz/native-identity';
it('opens the genuine SDK-created initial profile from its admitted account without a public projection',async()=>{
 const created=await createReceizIdIdentity({createdAt:'2026-11-09T06:00:00.000Z'});
 const file=await initializeFreshBankAccount(created.keyFile),localHistory=await projectReceizIdentityAccount(file),wallet=readCarriedWalletObservation(localHistory);
 const identity={binding:{keyId:file.keyId,identityOwnerReceizId:file.owner.uid},username:file.owner.username,accountUsername:()=>file.owner.username,localHistory,knownWallet:()=>wallet} as unknown as OpenIdentity;
 const receivingUid='01234567-0123-4123-8123-0123456789ab';
 Object.assign(identity,{walletReceivingAddress:()=>receivingUid});
 expect(readVerifiedOwnerProfileHeader(identity,receivingUid)).toMatchObject({userId:receivingUid,stats:{originals:0}});
 expect(readVerifiedOwnerProfileHeader(identity,'wrong-connected-account')).toBeNull();
 expect(wallet?.source).toBe('account-genesis');
 expect(readVerifiedOwnerProfileHeader(identity,file.owner.uid)).toMatchObject({userId:file.owner.uid,stats:{originals:0}});
});
