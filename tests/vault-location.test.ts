import {expect,it} from 'vitest';
import {vaultLocation} from '../src/receiz/vault/location';
const id='10000000-0000-4000-8000-000000000001',proof='a'.repeat(64);
it('routes the exact public proof while keeping social tracking out of the evidence locator',()=>{
 expect(vaultLocation(`https://bankeiz.com/vault/${id}/?proof=${proof}&fbclid=tracking&utm_source=instagram`)).toEqual({vaultId:id,proof});
 expect(vaultLocation(`/vault/${id}/`)).toEqual({vaultId:id,proof:null});
 expect(vaultLocation(`/vault/${id}/?proof=${proof}&proof=${proof}`)).toBeNull();
 expect(vaultLocation(`/vault/${id}/?proof=edited`)).toBeNull();
 expect(vaultLocation('/account/')).toBeNull();
});
