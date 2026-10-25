// @vitest-environment happy-dom
import {expect,it} from 'vitest';
import {protectionPage,protectionContent} from '../scripts/vault-protection-page.mjs';
import {publicPage} from '../scripts/public-page-metadata.mjs';
it('sells the actual protection with the bearer and passkey boundaries visible and no universal theft guarantee',()=>{
 document.body.innerHTML=protectionContent();const text=document.body.textContent??'';
 expect(protectionPage.path).toBe('/protect/');expect(document.querySelector('h1')?.textContent).toContain('Keep it yours.');
 expect(text).toContain('Without passkey protection');expect(text).toContain('anyone with the private original');expect(text).toContain('original passkey');expect(text).toContain('Public proof grants no access');expect(text).toContain('compromised device');expect(text).toContain('an action you approve');
 expect(text).not.toMatch(/hack.proof|theft.proof|impossible to steal|cannot be stolen/i);
 expect(document.querySelector('.learn-brand svg')).not.toBeNull();expect(document.querySelector('a[href="/#account/profile/vaults/create"]')).not.toBeNull();expect(document.querySelector('a[href="/vaults/"]')).not.toBeNull();expect(document.querySelector('script')).toBeNull();expect(document.querySelector('form')).toBeNull();
 expect(publicPage(protectionPage.path)?.description).toBe(protectionPage.description);
});
it('provides real native scenario selection without an assistant, financial control or private runtime',()=>{
 document.body.innerHTML=protectionContent();const choices=[...document.querySelectorAll<HTMLInputElement>('input[name="vault-protection-scenario"]')];expect(choices).toHaveLength(3);expect(choices.filter(x=>x.checked)).toHaveLength(1);
 for(const input of choices){expect(document.querySelector(`label[for="${input.id}"]`)?.textContent?.trim()).toBeTruthy();expect(document.querySelector(`[data-protection-case="${input.value}"]`)).not.toBeNull();}
 const copy=document.querySelector<HTMLInputElement>('#protect-copy')!;copy.click();expect(copy.checked).toBe(true);expect(choices[0].checked).toBe(false);
 expect(document.querySelector('[data-coop-twin]')).toBeNull();expect(document.querySelector('iframe')).toBeNull();
});
