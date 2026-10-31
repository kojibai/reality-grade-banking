import {expect,it} from 'vitest';
import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
import {publicReadingLinks,stripPublicReadingLinks} from '../server/public-reading-links';
import {profilePagePath} from '../src/receiz/public-profile';
import {assetPreviewHtml} from '../server/asset-preview';
import {profilePreviewHtml} from '../server/profile-preview';
import {parsePublicMarket} from '../src/receiz/public-market';
import {parsePublicProfile} from '../src/receiz/public-profile';
import {profileFixture} from './fixtures/public-profile';

it('adds only inert alternate metadata and removes inherited reading destinations',()=>{
 const existing='<html><head><title>Existing</title></head><body><main>Same experience</main><script type="module" src="/app.js"></script></body></html>',links=publicReadingLinks('page','/guide/'),candidate=existing.replace('</head>',links+'</head>');
 expect(stripPublicReadingLinks(candidate)).toBe(existing);const window=new Window({settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true,disableIframePageLoading:true}});window.document.body.innerHTML=candidate;
 expect(window.document.querySelector('[rel="preload"],[rel="prefetch"],iframe')).toBeNull();expect(links).toContain('rel="alternate"');expect(links).toContain('/read/pages/guide/index.txt');
 const item=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:source',receizId:'source',title:'Public work'}]}}).items[0];
 const template='<html><head>'+links+'</head><body><div id="public-explore-root"></div><script id="receiz-navigation" type="application/json">{}</script></body></html>';
 const asset=assetPreviewHtml(template,item.id,item),profile=profilePreviewHtml(template,'alexmorgan',parsePublicProfile(profileFixture(),'alexmorgan'));
 expect(asset).not.toContain('/read/pages/guide/');expect(asset).toContain('/read/assets/profile%3Aartist%3Asource/');expect(profile).not.toContain('/read/pages/guide/');expect(profile).toContain('/read/profiles/alexmorgan/');
});

it('uses new subpaths without taking over a profile handle or another app route',()=>{
 const deployment=JSON.parse(readFileSync('vercel.json','utf8'));
 expect(profilePagePath('read')).toBe('/read/');expect(deployment.rewrites.some((route:{source:string})=>route.source==='/read/')).toBe(false);
 expect(deployment.rewrites.find((route:{source:string})=>route.source==='/read/assets/:asset/')?.destination).toBe('/api/read?kind=asset&id=:asset');
 for(const header of deployment.headers)expect(header.source).toMatch(/^\/read\/(?:pages|public|catalog|ledger)\//);
});
