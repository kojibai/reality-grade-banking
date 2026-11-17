// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {encodeNavigationEnvelope} from '../scripts/navigation-envelope.mjs';
import {decodeNavigationEnvelope,sharedExampleMarkup} from '../src/presentation/navigation-envelope.mjs';
import {alignPreparedPublicNavigation} from '../server/prepared-public-navigation';
import {profileNavigationHtml} from '../server/profile-navigation';
const source='// All public guides'+readFileSync('public/learn/learn.js','utf8').split('// All public guides')[1];
const nav=()=>({pages:{'/learn/offline-banking/':{head:'<title>Offline banking</title>',content:'<header class="learn-header">Bankeiz</header><main><h1>Offline banking</h1><a href="/learn/notes/">Notes</a></main>'},'/learn/notes/':{head:'<title>Notes</title>',content:'<header class="learn-header">Bankeiz</header><main><h1>Notes</h1><a href="/#account">Account</a></main>'},'/explore/':{runtime:'explore',head:'<title>Explore</title>',content:'<main>Held collection</main>'}},bank:{head:'<title>Bank</title>',entry:'/bank.js',styles:[]},unknown:{original:'exact original bytes 🌊',history:[1,2,3]}});
const script=(value:unknown)=>'<script id="receiz-navigation" type="application/json">'+JSON.stringify(value)+'</script>';
const read=(html:string)=>decodeNavigationEnvelope(html.match(/<script id="receiz-navigation" type="application\/json">([\s\S]*?)<\/script>/)![1]);
afterEach(()=>{document.body.innerHTML='';document.head.innerHTML='';history.replaceState({},'','/');vi.restoreAllMocks();vi.unstubAllGlobals();});
it('opens the existing packed reader synchronously and returns to the exact held Bank DOM without a request',()=>{
 const shared=sharedExampleMarkup(['exact walkthrough bytes & <source>']),value=nav();document.body.innerHTML='<div id="root"><input value="Retained pending work"><a href="/learn/offline-banking/">Offline guide</a></div>'+script(encodeNavigationEnvelope(value,shared));history.replaceState({},'','/#account');const root=document.getElementById('root'),input=root!.querySelector('input'),fetch=vi.fn();vi.stubGlobal('fetch',fetch);vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 new Function('__bankNavigationEnvelope',source)({decodeNavigationEnvelope});
 expect(document.querySelector<HTMLTemplateElement>('template[data-shared-example-views]')?.content.textContent).toBe(JSON.stringify(['exact walkthrough bytes & <source>']));root!.querySelector('a')!.click();expect(document.querySelector('#public-learn-root h1')?.textContent).toBe('Offline banking');document.querySelector<HTMLAnchorElement>('#public-learn-root a')!.click();expect(document.title).toBe('Notes');document.querySelector<HTMLAnchorElement>('#public-learn-root a')!.click();expect(document.getElementById('root')).toBe(root);expect(root!.querySelector('input')).toBe(input);expect(root!.hidden).toBe(false);expect(input!.value).toBe('Retained pending work');expect(fetch).not.toHaveBeenCalled();vi.unstubAllGlobals();
});
it('keeps accepted prepared input and unknown held history through the common packed reader',()=>{
 const value=nav();value.pages['/explore/'].content+='<template data-example-views>{"example":0}</template>';const shared=sharedExampleMarkup(['exact held example']),html='<html><body>'+script(encodeNavigationEnvelope(value,shared))+'</body></html>';const opened=read(alignPreparedPublicNavigation(html,'explore','Accepted next collection'));
 expect(opened.navigation.pages['/explore/'].content).toBe('Accepted next collection');expect(opened.navigation.unknown).toEqual(value.unknown);expect(opened.navigation.bank).toEqual(value.bank);expect(opened.shared).toBe(shared);
});
it('retains the existing profile navigation contract and hashes examples from the packed input',()=>{
 const value=nav();value.pages['/learn/notes/'].content+='<template data-example-views>{"example":0}</template>';const shared=sharedExampleMarkup([{html:'Exact full walkthrough'}]);const opened=read(profileNavigationHtml('<html><body>'+script(encodeNavigationEnvelope(value,shared))+'</body></html>'));
 expect(opened.navigation.unknown).toEqual(value.unknown);expect(opened.navigation.pages['/learn/notes/']).toMatchObject({content:'',sharedExampleSha256:expect.stringMatching(/^[a-f0-9]{64}$/)});expect(opened.navigation.pages['/explore/'].content).toBe('<main>Held collection</main>');
});
