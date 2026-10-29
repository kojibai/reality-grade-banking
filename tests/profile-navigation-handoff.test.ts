// @vitest-environment happy-dom
import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
import {parsePublicProfile,retainPublicProfile,forgetPublicProfile} from '../src/receiz/public-profile';
import {profileFixture} from './fixtures/public-profile';
it('adopts an already-interactive profile without resetting its carried head, focused control, scroll or later return',()=>{
 const ready=vi.spyOn(document,'readyState','get').mockReturnValue('loading');history.replaceState({},'', '/bjklock/');
 document.head.innerHTML='<title>BJ Klock | Bankeiz</title><meta name="description" content="Original work, together."><meta property="og:title" content="BJ Klock | Bankeiz"><meta property="og:description" content="Original work, together."><meta property="og:image" content="https://receiz.com/portrait.png"><link rel="canonical" href="https://bankeiz.com/bjklock/">';
 document.body.dataset.bankSurface='explore';document.body.innerHTML='<div id="public-explore-root" data-public-runtime="explore"><main><header class="profile-hero"><h1>BJ Klock</h1></header><input aria-label="Search this collection" value="already chosen"><img src="https://receiz.com/original-cover.png"><button aria-pressed="true">Chosen view</button><a href="/learn/">Learn</a></main></div>';
 const root=document.getElementById('public-explore-root')!,field=root.querySelector('input')!,image=root.querySelector('img')!;field.focus();
 // The existing profile runtime already dispatched this before deferred navigation.
 retainPublicProfile({...parsePublicProfile(profileFixture(),'alexmorgan'),username:'bjklock',displayName:'BJ Klock',bio:'Original work, together.',bannerUrl:'https://receiz.com/portrait.png'});
 const nav=document.createElement('script');nav.id='receiz-navigation';nav.type='application/json';nav.textContent=JSON.stringify({pages:{'/explore/':{runtime:'explore',entry:'/explore.js',head:'<title>Explore</title><meta name="description" content="Generic"><meta property="og:image" content="explore.png"><link rel="canonical" href="https://bankeiz.com/explore/">',content:'<main>Explore</main>'},'/learn/':{head:'<title>Learn</title>',content:'<main>Learn<a href="/bjklock/">Return to BJ</a></main>'}},bank:{head:'<title>Bank</title>',entry:'/bank.js',styles:[],content:''}});document.body.append(nav);
 const source='// All public guides'+readFileSync('public/learn/learn.js','utf8').split('// All public guides')[1],load=vi.fn(),scroll=vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 try{
  new Function('loadModule',source.replaceAll('import(','loadModule('))(load);
  expect(document.title).toBe('BJ Klock | Bankeiz');expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Original work, together.');expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('https://receiz.com/portrait.png');
  expect(document.activeElement).toBe(field);expect(scroll).not.toHaveBeenCalled();expect(root.querySelector('img')).toBe(image);expect(field.value).toBe('already chosen');expect(load).not.toHaveBeenCalled();
  document.dispatchEvent(new Event('DOMContentLoaded'));expect(document.activeElement).toBe(field);expect(scroll).not.toHaveBeenCalled();
  root.querySelector<HTMLAnchorElement>('a')!.click();document.querySelector<HTMLAnchorElement>('#public-learn-root a')!.click();
  expect(document.title).toBe('BJ Klock | Bankeiz');expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('https://receiz.com/portrait.png');expect(document.getElementById('public-explore-root')).toBe(root);expect(root.querySelector('input')).toBe(field);expect(root.querySelector('img')).toBe(image);expect(field.value).toBe('already chosen');expect(load).not.toHaveBeenCalled();
 }finally{scroll.mockRestore();ready.mockRestore();forgetPublicProfile('bjklock');}
});
