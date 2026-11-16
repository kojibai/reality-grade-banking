// @vitest-environment happy-dom
import {act} from 'react';
import {gzipSync} from 'node:zlib';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {Root} from 'react-dom/client';
import type {PublicMarketDocumentSeed} from '../src/receiz/public-market-document-seed';
import capInput from '../public/receiz-public-capitalization.json';
import historyInput from '../public/receiz-public-share-chart-history.json';
import {profileFixture} from './fixtures/public-profile';
const state=vi.hoisted(()=>({roots:[] as Root[],creates:0,hydrates:0,prepares:0,gate:undefined as Promise<void>|undefined,release:undefined as (()=>void)|undefined,decode:undefined as Promise<unknown>|undefined}));
vi.mock('react-dom/client',async original=>{const actual=await original<typeof import('react-dom/client')>();return{...actual,createRoot:(...args:Parameters<typeof actual.createRoot>)=>{state.creates++;const root=actual.createRoot(...args);state.roots.push(root);return root;},hydrateRoot:(...args:Parameters<typeof actual.hydrateRoot>)=>{state.hydrates++;const root=actual.hydrateRoot(...args);state.roots.push(root);return root;}};});
vi.mock('../src/receiz/public-market-document-seed',async original=>{const actual=await original<typeof import('../src/receiz/public-market-document-seed')>();return{...actual,preparePublicMarketDocumentSeed:(...args:Parameters<typeof actual.preparePublicMarketDocumentSeed>)=>{state.prepares++;const pending=(async()=>{await state.gate;return actual.preparePublicMarketDocumentSeed(...args);})();state.decode=pending;return pending;}};});
// Directory delivery is independent of Source profile hydration/media.
vi.mock('../src/receiz/public-profile-directory',async original=>({...await original<typeof import('../src/receiz/public-profile-directory')>(),subscribePublicProfileDirectory:()=>()=>{}}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
beforeEach(()=>{
 vi.resetModules();state.gate=new Promise(resolve=>{state.release=resolve;});vi.stubGlobal('Worker',undefined);vi.stubGlobal('DecompressionStream',undefined);
 localStorage.clear();history.replaceState(null,'','/');document.body.innerHTML='<script id="receiz-navigation" type="application/json">{}</script>';
 vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(()=>{})));
 vi.spyOn(HTMLMediaElement.prototype,'play').mockImplementation(function(this:HTMLMediaElement){Object.defineProperty(this,'paused',{configurable:true,value:false});this.dispatchEvent(new Event('play'));return Promise.resolve();});
 vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(function(this:HTMLMediaElement){Object.defineProperty(this,'paused',{configurable:true,value:true});this.dispatchEvent(new Event('pause'));});
});
afterEach(async()=>{await act(async()=>{state.release?.();await state.decode;});for(const root of state.roots.splice(0))await act(()=>root.unmount());state.creates=0;state.hydrates=0;state.prepares=0;state.gate=undefined;state.release=undefined;state.decode=undefined;document.body.replaceChildren();localStorage.clear();vi.unstubAllGlobals();vi.restoreAllMocks();});
async function fixture(){
 const profiles=await import('../src/receiz/public-profile'),{renderPublicProfile}=await import('../server/profile-document'),{profilePreviewHtml}=await import('../server/profile-preview'),{parsePublicMarket}=await import('../src/receiz/public-market'),{parseMarketCapSource}=await import('../src/receiz/market-projection/source'),{publicMarketDocumentSeedScript}=await import('../src/receiz/public-market-document-seed');
 const raw=profileFixture();raw.profile.originalsPage={hasMore:false,nextCursor:''};const profile=profiles.parsePublicProfile(raw,'alexmorgan');
 profile.items=[{...profile.items[0],title:'Source song',mediaKind:'audio',hasLongForm:false,playback:{url:'https://receiz.com/source-song.mp3',mimeType:'audio/mpeg'}}];profile.stats.originals=1;
 const cap=parseMarketCapSource(capInput),catalog=parsePublicMarket({ok:true,transport:{publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:1,revision:'unrelated-cohort'},publicOriginals:[{id:'other-owner',receizId:'other-owner',title:'Other owner'}]}}),seed={schema:'bank.public-market.document.v1' as const,path:'explore',generation:'a'.repeat(64),catalog,capitalization:cap,history:historyInput as PublicMarketDocumentSeed['history'],asOfPulse:Math.max(historyInput.summary.serverPulse,cap.serverPulse),visibleCount:1,format:{locale:'en-US',timeZone:'UTC'}};
 const bytes=Buffer.from(JSON.stringify(catalog)),family=publicMarketDocumentSeedScript(seed,{gzipB64u:gzipSync(bytes).toString('base64url'),bytes:bytes.length}),shell='<html><head></head><body><div id="public-explore-root" data-public-runtime="explore">Previous catalog</div>'+family+'<script id="receiz-navigation" type="application/json">{}</script></body></html>';
 const html=profilePreviewHtml(shell,'alexmorgan',profile,undefined,renderPublicProfile(profile),true,undefined,true);profiles.forgetPublicProfile('alexmorgan');
 document.body.innerHTML=/<body>([\s\S]*?)<\/body>/.exec(html)![1];history.replaceState(null,'','/alexmorgan/');
 return{host:document.getElementById('public-explore-root')!,profile,seed};
}
it('hydrates the Source profile and plays its audio before unrelated cohort decoding, then preserves the same DOM/player',async()=>{
 const {host,profile}=await fixture(),first=host.firstElementChild,hero=host.querySelector('.profile-hero'),article=host.querySelector('.profile-asset'),errors=vi.spyOn(console,'error');
 let main!:typeof import('../src/public-explorer/main'),mounted:ReturnType<typeof main.mountPublicDocument>;
 await act(async()=>{main=await import('../src/public-explorer/main');mounted=main.mountPublicDocument(host);});
 expect(state.prepares).toBe(1);expect(state.hydrates).toBe(1);expect(state.creates).toBe(0);expect(host.firstElementChild).toBe(first);expect(host.querySelector('.profile-hero')).toBe(hero);
 const tabs=()=>[...host.querySelectorAll<HTMLButtonElement>('.profile-tabs button')];
 await act(()=>tabs().find(button=>button.textContent==='Public Activity')!.click());expect(tabs().find(button=>button.textContent==='Public Activity')?.getAttribute('aria-selected')).toBe('true');
 await act(()=>tabs().find(button=>button.textContent==='Assets')!.click());expect(host.querySelector('.profile-asset')).toBe(article);
 await act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Experience Source song"]')!.click());
 const play=host.querySelector<HTMLButtonElement>('[aria-label="Play audio"]');expect(play).not.toBeNull();await act(()=>play!.click());
 const audio=host.querySelector('audio')!;expect(audio.getAttribute('src')).toBe('https://receiz.com/source-song.mp3');expect(audio.paused).toBe(false);
 const before=(fetch as ReturnType<typeof vi.fn>).mock.calls.map(([path])=>String(path));expect(before.some(path=>path.startsWith('/api/bank/public-profile/'))).toBe(false);
 const inline=host.querySelector('.profile-inline-media');await act(async()=>{state.release!();await state.decode;});
 const reader=await import('../src/receiz/prepared-bank-catalog');expect(reader.preparedBankCatalogState().carried?.seed.catalog.revision).toBe('unrelated-cohort');
 expect(main.mountPublicDocument(host)).toBe(mounted!);expect(state.hydrates).toBe(1);expect(state.creates).toBe(0);expect(state.prepares).toBe(1);
 expect(host.firstElementChild).toBe(first);expect(host.querySelector('.profile-hero')).toBe(hero);expect(host.querySelector('.profile-asset')).toBe(article);expect(host.querySelector('.profile-inline-media')).toBe(inline);expect(host.querySelector('audio')).toBe(audio);expect(audio.paused).toBe(false);
 expect((await import('../src/receiz/public-profile')).retainedPublicProfile('alexmorgan')?.items).toEqual(profile.items);expect(errors).not.toHaveBeenCalled();
});
