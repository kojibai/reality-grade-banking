import {expect,it} from 'vitest';
import {vaultPage,vaultContent} from '../scripts/vault-page.mjs';
import {publicPage} from '../scripts/public-page-metadata.mjs';
it('explains complete private sources, optional protection and independent recovery without a new account or runtime',()=>{
 const page=vaultContent();expect(vaultPage.path).toBe('/vaults/');expect(publicPage(vaultPage.path)).toMatchObject({id:'vaults',description:vaultPage.description});
 for(const text of ['Protect with PBI','Private original','Recovery Original','Notes','Originals','independent','Nothing is sold','one private, portable file','Save private Vault','Open a saved vault'])expect(page).toContain(text);
 expect(page).not.toMatch(/<script|<iframe|unhackable|fraud-proof|prevents all fraud/i);
 expect(page).toContain('/#account/profile/vaults/create');expect(page).toContain('original compatible passkey');expect(page).toContain('scoped');
 expect(page).toContain('/vault-verifier/v1/verify.html');expect(page).toContain('Your Vault from creation to offline recovery');expect(page).toContain('data-source-components="ConsoleShell,VaultExperience,Sheet"');expect(page).toContain('Create your vault.');
});
