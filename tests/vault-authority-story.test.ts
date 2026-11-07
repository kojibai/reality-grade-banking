// @vitest-environment happy-dom
import {expect,it} from 'vitest';
import {protectionContent} from '../scripts/vault-protection-page.mjs';
it('makes exact private sources and the precise copied-service-record boundary visible before optional locks',()=>{
 document.body.innerHTML=protectionContent();
 const story=document.querySelector('#where-the-key-lives');expect(story).not.toBeNull();
 expect(story!.textContent).toContain('private Vault image');
 expect(story!.textContent).toContain('scoped Note key');expect(story!.textContent).toContain('ordinary account signing key is not included');
 expect(story!.textContent).toContain('hosted database');
 expect(story!.textContent).toContain('locally on your device');
 expect(story!.querySelectorAll('[data-authority-route]')).toHaveLength(2);
 expect(story!.querySelector('[data-authority-route="vault"]')?.textContent).toContain('No private key');
 expect(document.querySelector('.vp-lead')?.textContent).toContain('private Vault image');
});
it('distinguishes PBI account continuity, the private Vault original and optional passkey encryption',()=>{
 document.body.innerHTML=protectionContent();const identity=document.querySelector('#proof-of-you');
 expect(identity).not.toBeNull();expect(identity!.textContent).toContain('PBI');
 expect(identity!.textContent).toContain('existing account');expect(identity!.textContent).toContain('device key');
 expect(identity!.textContent).toContain('not another account');expect(identity!.textContent).toContain('private recovery copy');
 expect(identity!.textContent).toContain('optional passkey');
});
it('shows complete source storage and recovery without turning the Vault into a transfer account',()=>{
 document.body.innerHTML=protectionContent();const section=document.querySelector('#protected-and-usable');
 expect(section).not.toBeNull();const text=section!.textContent!;
 for(const phrase of ['Keep complete Notes.','Keep the Original','Recover the source.','independent reader','private storage','not a second account balance'])expect(text).toContain(phrase);
 expect(text).not.toMatch(/Send directly|Return to your account|Move investments/);
 expect(section!.querySelector('[data-value-flow]')).not.toBeNull();
 expect(document.body.textContent).not.toMatch(/safest (?:thing|place|system) (?:on|in)|most liquid|cannot be hacked|unhackable|guaranteed liquidity/i);
});
