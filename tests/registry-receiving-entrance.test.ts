import {expect,it} from 'vitest';
import {Window} from 'happy-dom';
import {institutionScorecardContent} from '../scripts/institution-scorecard-page.mjs';
it('keeps an invitation-selected institution directly addressable by its Registry anchor',()=>{
 const window=new Window(),document=window.document;
 document.body.innerHTML=institutionScorecardContent([{id:'example-institution',name:'Example institution',website:'https://example.org',assessment:null}]);
 expect(document.getElementById('example-institution')?.getAttribute('data-institution-id')).toBe('example-institution');
});
it('quietly connects each institution to its own receiving guide without changing conformance evidence or implying participation',()=>{
 const window=new Window(),document=window.document;
 document.body.innerHTML=institutionScorecardContent([{id:'example-institution',name:'Example & Co. · Institution',country:'Canada',region:'North America',kind:'Bank',website:'https://example.org',assessment:null}]);
 const card=document.querySelector('[data-institution-id="example-institution"]')!,link=card.querySelector('[data-receiving-institution]');
 expect(link?.textContent).toContain('Bring the standard to your institution');expect(link).not.toBeNull();
 const url=new URL(link!.getAttribute('href')!,'https://bankeiz.com'),payload=JSON.parse(Buffer.from(url.hash.slice('#invite='.length),'base64url').toString('utf8'));
 expect(url.pathname).toBe('/invitation/');expect(payload.institution).toEqual({name:'Example & Co. · Institution',id:'example-institution'});expect(payload.schema).toBe('bankeiz.receiving-invitation.v1');
 expect(card.getAttribute('data-qualification')).toBe('FAIL');expect(card.textContent).toContain('Conformance not demonstrated');expect(document.querySelector('.isc-hero-moral')?.textContent).toBe('Prestige is not proof.');
 const unlisted=document.querySelector('[data-receiving-unlisted]');expect(unlisted?.getAttribute('href')).toBe('/receiving/');expect(unlisted?.textContent).toContain('Institution not listed');
});
