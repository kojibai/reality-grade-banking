import {expect,it} from 'vitest';
import {atIdentityCreationStage} from '../src/receiz/identity-creation-stage';
it('identifies the exact local seal check without exposing identity material',async()=>{
 await expect(atIdentityCreationStage('device-signer',async()=>{throw Error('offline_seal_certificate_invalid');})).rejects.toThrow('Stage: device-signer · offline_seal_certificate_invalid');
});
it('keeps arbitrary server or crypto error text out of account diagnostics',async()=>{
 await expect(atIdentityCreationStage('identity-seal',async()=>{throw new DOMException('private material that must not be displayed','OperationError');})).rejects.toThrow('Stage: identity-seal · OperationError');
});
it('returns the original successful operation once',async()=>{
 let calls=0;const result={sealed:true};
 expect(await atIdentityCreationStage('identity-seal',async()=>{calls++;return result;})).toBe(result);
 expect(calls).toBe(1);
});
