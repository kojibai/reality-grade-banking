import {expect,it,vi} from 'vitest';
import {createVaultPublicReader,type VaultDisclosure} from '../src/receiz/vault/public-reader';
const vaultId='10000000-0000-4000-8000-000000000001',proof='a'.repeat(64);
const admitted={vaultId,recordSha256:proof,record:{schema:'fixture'},grantsAccess:false,currentUnspentness:false} as unknown as VaultDisclosure;
it('shares exact immutable public evidence once and never starts an account request',async()=>{
 const fetch=vi.fn(async()=>new Response(JSON.stringify({fixture:'exact-public-source'}))),inspect=vi.fn(async()=>admitted),reader=createVaultPublicReader({fetch:fetch as typeof globalThis.fetch,inspect});
 const [one,two]=await Promise.all([reader.load({vaultId,proof}),reader.load({vaultId,proof})]);
 expect(one).toBe(two);expect(fetch).toHaveBeenCalledOnce();expect(inspect).toHaveBeenCalledExactlyOnceWith({fixture:'exact-public-source'},proof);
 expect(fetch.mock.calls[0]).toEqual([`https://receiz.com/api/connect/vault/public?vaultId=${vaultId}&proof=${proof}`,expect.objectContaining({credentials:'omit',redirect:'error'})]);
 await reader.load({vaultId,proof});expect(fetch).toHaveBeenCalledOnce();
});
it('rejects locator substitution and retries an unavailable exact original without caching a false result',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(new Response('unavailable',{status:503})).mockResolvedValue(new Response('{}')),inspect=vi.fn(async()=>({...admitted,vaultId:'20000000-0000-4000-8000-000000000001'})),reader=createVaultPublicReader({fetch,inspect});
 await expect(reader.load({vaultId,proof})).rejects.toThrow('UNAVAILABLE');
 await expect(reader.load({vaultId,proof})).rejects.toThrow('LOCATOR_MISMATCH');
 expect(fetch).toHaveBeenCalledTimes(2);
});
