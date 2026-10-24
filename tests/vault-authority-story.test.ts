// @vitest-environment happy-dom
import {expect,it} from 'vitest';
import {protectionContent} from '../scripts/vault-protection-page.mjs';
it('makes image-held authority and the precise hosted-database theft boundary visible before optional locks',()=>{
 document.body.innerHTML=protectionContent();
 const story=document.querySelector('#where-the-key-lives');expect(story).not.toBeNull();
 expect(story!.textContent).toContain('private Vault image');
 expect(story!.textContent).toContain('public keys and signed proofs');
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
 expect(identity!.textContent).toContain('does not replace your private Vault original');
 expect(identity!.textContent).toContain('optional passkey');
});
it('sells usable protected custody through the actual supported actions without claiming guaranteed liquidity',()=>{
 document.body.innerHTML=protectionContent();const section=document.querySelector('#protected-and-usable');
 expect(section).not.toBeNull();const text=section!.textContent!;
 for(const phrase of ['Send directly','Receiz ID','without selling','Return to your account','connected','recipient'])expect(text).toContain(phrase);
 expect(section!.querySelector('[data-value-flow]')).not.toBeNull();
 expect(document.body.textContent).not.toMatch(/safest (?:thing|place|system) (?:on|in)|most liquid|cannot be hacked|unhackable|guaranteed liquidity/i);
});
