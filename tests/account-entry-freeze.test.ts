import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {assertFrozenAccountCreation} from '../scripts/check-account-entry.mjs';
const source=readFileSync('src/receiz/native-identity.ts','utf8');
const baseline=readFileSync('tests/fixtures/account-entry-frozen.ts.txt','utf8');
it('preserves the exact working creation path independently of unrelated identity capabilities',()=>{
 expect(()=>assertFrozenAccountCreation(source,baseline)).not.toThrow();
});
it('blocks the exact naming regression before build even if a TypeScript spread bypasses excess-property checks',()=>{
 const regressed=source.replace('sealer.createIdentity({ passphrase: protectionSecret })','sealer.createIdentity({ ...freshAccountIdentityOptions(), passphrase: protectionSecret })');
 expect(regressed).not.toBe(source);
 expect(()=>assertFrozenAccountCreation(regressed,baseline)).toThrow('BANK_ACCOUNT_ENTRY_FROZEN');
});
it('blocks additional onboarding waits and requires the retained no-phrase identity output',()=>{
 for(const changed of [
  source.replace("await atIdentityCreationStage('device-signer'", "await redundantAccountRead(); await atIdentityCreationStage('device-signer'"),
  source.replace("openIdentity(sealed.artifactBytes, '', sealed.filename", "openIdentity(sealed.artifactBytes, protectionSecret, sealed.filename"),
 ]){
  expect(changed).not.toBe(source);
  expect(()=>assertFrozenAccountCreation(changed,baseline)).toThrow('BANK_ACCOUNT_ENTRY_FROZEN');
 }
});
