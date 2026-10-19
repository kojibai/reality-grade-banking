import {expect,it,vi} from 'vitest';
import {ReceizHttpError} from '@receiz/sdk';
import {bankOperationError,bankOperationFailureDetails,createBankOperations} from '../src/receiz/bank-operations';
it.each([['Klok','klok'],['@Klok','@klok'],['Klok.Receiz.ID','klok.receiz.id'],['public-coordinate','public-coordinate']])('normalizes only a supported profile address %s before preparing its exact review',async(recipient,expected)=>{
 const prepare=vi.fn().mockRejectedValue(Error('STOP_BEFORE_NETWORK'));
 const api=createBankOperations({ownerReceizId:'sender.receiz.id',assertOpen(){},store:{load:async()=>null}as never,context:async()=>{throw Error('NO_GENERIC_ADAPTER');},lock:async fn=>fn(),payments:{prepare,execute:vi.fn(),discard:vi.fn()}});
 await expect(api.prepare({kind:'send-value',rail:'settlement',amountUsdCents:'100',recipient})).rejects.toThrow('STOP_BEFORE_NETWORK');expect(prepare.mock.calls[0][0].recipient).toBe(expected);
});
it('preserves a bounded HTTP service failure without exposing the response payload',()=>{
 const error=new ReceizHttpError(503,{error:'native_payment_unavailable',ticket:'private-ticket',accountUserId:'private-account'});
 expect(bankOperationFailureDetails(error)).toEqual({code:'native_payment_unavailable',status:503});expect(bankOperationError(error)).toContain('payment service');expect(JSON.stringify(bankOperationFailureDetails(error))).not.toContain('private');
});
it('reports explicit rail/recipient/access failures without calling them a generic receiving-service outage',()=>{
 expect(bankOperationError(new Error('BANK_NATIVE_WALLET_INSUFFICIENT_SETTLEMENT'))).toContain('available Settlement');
 expect(bankOperationError(new Error('BANK_NATIVE_WALLET_INSUFFICIENT_RESERVE'))).toContain('available Reserve');
 expect(bankOperationError(new Error('BANK_PAYMENT_RECIPIENT_UNAVAILABLE'))).toContain('recipient');
 expect(bankOperationError(new ReceizHttpError(403,{error:'payment_access_denied'}))).toContain('account access');
});
it('never echoes unknown messages, payloads, exception names or account identifiers into details',()=>{
 const error=Object.assign(new Error('private-token'),{name:'private-name',status:409,payload:{error:'private-token'}});
 expect(bankOperationFailureDetails(error)).toEqual({code:'HTTP_409',status:409});expect(bankOperationFailureDetails(new Error('BANK_PAYMENT_PRIVATE_CREDENTIAL_VALUE'))).toEqual({code:'BANK_OPERATION_UNAVAILABLE',status:null});
});
it('reports the known Note checkpoint failure as local custody rather than a receiving-service outage',async()=>{
 const {atNoteStage}=await import('../src/receiz/note-stage');
 const error=await atNoteStage('offline-note-checkpoint',async()=>{throw new DOMException('private cipher detail','OperationError');}).catch(cause=>cause);
 expect(bankOperationError(error)).toContain('Saved Offline Note custody');
 expect(bankOperationError(error)).not.toContain('receiving service');
 expect(bankOperationFailureDetails(error)).toEqual({code:'BROWSER_OPERATION_ERROR',status:null,stage:'offline-note-checkpoint',errorName:'OperationError'});
 expect(JSON.stringify(bankOperationFailureDetails(error))).not.toContain('private cipher detail');
});
it('does not describe an unclassified browser OperationError as service unavailability',()=>{
 expect(bankOperationError(new DOMException('private operation','OperationError'))).toContain('browser operation');
 expect(bankOperationError(new DOMException('private operation','OperationError'))).not.toContain('receiving service');
});
it('does not describe a signer or identity-transport failure as an unreadable saved Note checkpoint',async()=>{
 const {atNoteStage}=await import('../src/receiz/note-stage');for(const stage of ['identity-transport','device-signer']as const){const cause=await atNoteStage(stage,async()=>{throw new DOMException('private','OperationError');}).catch(error=>error);expect(bankOperationError(cause)).toContain('protected browser operation');expect(bankOperationError(cause)).not.toContain('Offline Note custody');expect(bankOperationFailureDetails(cause)).toMatchObject({stage,errorName:'OperationError'});}
});

it('classifies browser exceptions even when Safari does not expose them as Error instances',()=>{const cause={name:'OperationError',message:'private browser detail'};expect(bankOperationError(cause)).toContain('protected browser operation');expect(bankOperationError(cause)).not.toContain('receiving service');expect(bankOperationFailureDetails(cause)).toEqual({code:'BROWSER_OPERATION_ERROR',status:null});});

it('retains the exact public deployment-guard failure without leaking service payloads',()=>{const error=new ReceizHttpError(503,{error:'wallet_send_guard_required',detail:'private service detail'});expect(bankOperationFailureDetails(error)).toEqual({code:'wallet_send_guard_required',status:503});expect(bankOperationError(error)).toContain('service update');expect(JSON.stringify(bankOperationFailureDetails(error))).not.toContain('private');});

it('directs a held Note attempt to its existing recovery controls without treating it as an unknown payment',()=>{const cause=new Error('BANK_NOTE_ATTEMPT_PENDING');expect(bankOperationFailureDetails(cause)).toEqual({code:'BANK_NOTE_ATTEMPT_PENDING',status:null});expect(bankOperationError(cause)).toContain('Create note');expect(bankOperationError(cause)).toContain('if offered');expect(bankOperationError(cause)).not.toContain('Bank connection');});
