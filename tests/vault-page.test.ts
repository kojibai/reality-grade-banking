import {expect,it} from 'vitest';
import {vaultPage,vaultContent} from '../scripts/vault-page.mjs';
import {publicPage} from '../scripts/public-page-metadata.mjs';
it('explains optional protection and private versus shared originals without runtime or exaggerated protection claims',()=>{
 const page=vaultContent();expect(vaultPage.path).toBe('/vaults/');expect(publicPage(vaultPage.path)).toMatchObject({id:'vaults'});
 for(const text of ['Add a passkey','Private original','Shared proof','Open saved contents offline','Nothing is sold','No access to your account'])expect(page).toContain(text);
 expect(page).not.toMatch(/<script|<iframe|unhackable|fraud-proof|prevents all fraud/i);
 expect(page).toContain('/#account/profile/vaults/create');expect(page).toContain('passkey provider');expect(page).toContain('connected');
 expect(page).toContain('/vault-verifier/v1/verify.html');
});
