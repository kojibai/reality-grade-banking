// @vitest-environment happy-dom
import {expect,it} from 'vitest';
import {docsArticles} from '../src/content/banking-docs.mjs';
import {docsDocument} from '../scripts/docs-app.mjs';
it('opens a readable store integration guide with installable package and existing checkout without the account runtime',()=>{
 const page=docsArticles.find(p=>p.slug==='order-payments');expect(page).toBeDefined();
 const doc=new DOMParser().parseFromString(docsDocument(page).replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g,''),'text/html');expect(doc.querySelector('h1')?.textContent).toBe('Connect a store or app');
 expect(doc.querySelector('a[href="https://bankeiz.com/integrations/bankeiz-payments-0.1.0.tgz"]')).not.toBeNull();
 expect(doc.body.textContent).toContain('Reviewed 2026-11-16');
 expect([...doc.querySelectorAll('.docs-sources a')].every(a=>a.getAttribute('href')?.includes('/blob/main/'))).toBe(true);
 expect(doc.body.textContent).toContain('Source links retain revision main');
 expect(doc.querySelector('script[type="module"],iframe')).toBeNull();expect(doc.body.textContent).toContain('idempotencyKey');
});
