import {expect,it} from 'vitest';
import {permittedNativePath} from '../src/receiz/native-transport';
import {nativeRequestPath} from '../server/native-account';
import {BANK_APPLICATION_ID} from '../src/receiz/config';
it('admits only exact opt-in Vault paths through the same cookie-free gateway',()=>{
 for(const path of ['/api/connect/vault/custody',...['prepare','execute','recover','portfolio','source'].map(v=>'/api/connect/vault/market-shares/'+v)]){
  const exact=path+'?applicationId='+BANK_APPLICATION_ID;
  expect(permittedNativePath(exact,'POST')).toBe(true);expect(nativeRequestPath('/api/bank/native'+exact,'POST')).toBe(exact);
  for(const altered of [exact+'&accountId=other',exact+'&applicationId='+BANK_APPLICATION_ID,exact.replace(BANK_APPLICATION_ID,'rc_other'),'https://elsewhere.example'+exact])expect(permittedNativePath(altered,'POST')).toBe(false);
  expect(permittedNativePath(exact,'GET')).toBe(false);
 }
 const read='/api/connect/vault/public?vaultId=1e60455a-a57b-43c7-94a4-cff2ef45db4c&proof='+'a'.repeat(64);
 expect(permittedNativePath(read,'GET')).toBe(true);expect(permittedNativePath(read,'POST')).toBe(false);
 for(const altered of [read+'&access_token=other',read+'&proof='+'b'.repeat(64),read.replace('proof=','source=')])expect(permittedNativePath(altered,'GET')).toBe(false);
});
