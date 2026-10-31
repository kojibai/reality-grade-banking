// @vitest-environment happy-dom
import {readFileSync,existsSync} from 'node:fs';
import {expect,it} from 'vitest';
import {merchantPage,merchantContent} from '../scripts/merchant-page.mjs';
import {publicPage} from '../scripts/public-page-metadata.mjs';
import {profilePagePath} from '../src/receiz/public-profile';
it('ships a public merchant document with truthful implemented screens and the existing Receive entry',()=>{
 const doc=new DOMParser().parseFromString(merchantContent(),'text/html');expect(merchantPage.path).toBe('/merchant/');expect(publicPage('/merchant')?.id).toBe('merchant');expect(doc.querySelectorAll('main section').length).toBeGreaterThanOrEqual(7);expect(doc.querySelector('canvas,iframe,form,script')).toBeNull();expect(doc.querySelectorAll('main a[href="/#account/receive"]').length).toBeGreaterThanOrEqual(2);
 for(const img of doc.querySelectorAll<HTMLImageElement>('main img')){expect(existsSync('public'+img.getAttribute('src'))).toBe(true);expect(Number(img.getAttribute('width'))).toBeGreaterThan(0);expect(Number(img.getAttribute('height'))).toBeGreaterThan(0);}
 expect(doc.querySelector('main')?.textContent).toMatch(/example business/i);expect(doc.querySelector('main')?.textContent).toContain('XLSX');expect(doc.querySelector('main')?.textContent).toContain('accepted payment');expect(profilePagePath('merchant')).toBe('/u/merchant/');
 const config=JSON.parse(readFileSync('vercel.json','utf8'));for(const source of ['/merchant','/merchant/'])expect(config.rewrites.find((row:{source:string})=>row.source===source)?.destination).toBe('/merchant/index.html');
});
