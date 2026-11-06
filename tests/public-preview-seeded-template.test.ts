import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {Window} from 'happy-dom';
import {handleProfilePreview} from '../server/profile-preview';
import {handleAssetPreview} from '../server/asset-preview';
import {parsePublicProfile} from '../src/receiz/public-profile';
import {parsePublicMarket} from '../src/receiz/public-market';
import {assetPagePath} from '../src/receiz/public-asset-page';
import {profileFixture} from './fixtures/public-profile';

const template='<html><head><title>Explore</title></head><body><div id="public-explore-root" data-public-runtime="explore"><main><style>.asset-row{display:block}</style><a class="asset-row">Borrowed Explore row</a></main></div><script id="public-market-seed" type="application/json">{"catalog":{"items":[{"id":"borrowed-explore-catalog"}]}}</script>\n<script id="receiz-navigation" type="application/json">{}</script></body></html>';
function document(html:string){const page=new Window().document;page.write(html);return page;}
function expectOwnEntry(page:ReturnType<typeof document>){expect(page.querySelector('#public-market-seed')).toBeNull();expect(page.querySelector('#public-explore-root .asset-row')).toBeNull();expect(page.querySelector('#public-explore-root')?.textContent).not.toContain('Borrowed Explore row');expect(page.querySelector('#receiz-navigation')).not.toBeNull();}
beforeEach(()=>vi.stubGlobal('fetch',vi.fn(()=>{throw Error('Unexpected Source read');})));
afterEach(()=>{expect(fetch).not.toHaveBeenCalled();vi.unstubAllGlobals();});

it('opens the browser profile placeholder from a seeded Explore template without profile or rendering work',async()=>{
 const profile=vi.fn(),render=vi.fn(),prepareRender=vi.fn(),page=vi.fn(async()=>template),response=await handleProfilePreview(new Request('https://bankeiz.com/alexmorgan/',{headers:{accept:'text/html','user-agent':'Browser'}}),{profile,page,render,prepareRender}),html=await response.text(),view=document(html);
 expect(response.status).toBe(200);expectOwnEntry(view);expect(view.querySelector('#public-explore-root .public-entry-placeholder h1')?.textContent).toBe('Profile');expect(view.querySelector('#public-profile-seed')).toBeNull();expect(view.querySelector('#public-asset-seed')).toBeNull();expect(html.trimEnd()).toMatch(/<\/html>$/);
 expect(profile).not.toHaveBeenCalled();expect(render).not.toHaveBeenCalled();expect(prepareRender).not.toHaveBeenCalled();expect(page).toHaveBeenCalledOnce();
});

it('replaces seeded Explore rows with the crawler profile and only its own profile seed',async()=>{
 const selected=parsePublicProfile(profileFixture(),'alexmorgan'),profile=vi.fn(async()=>selected),render=vi.fn(async()=>'<article><header class="profile-hero"><h1>Alex Morgan</h1></header></article>'),response=await handleProfilePreview(new Request('https://bankeiz.com/alexmorgan/',{headers:{accept:'text/html','user-agent':'Twitterbot'}}),{profile,page:async()=>template,render}),view=document(await response.text());
 expect(response.status).toBe(200);expectOwnEntry(view);expect(view.querySelector('#public-explore-root .profile-hero h1')?.textContent).toBe('Alex Morgan');expect(JSON.parse(view.querySelector('#public-profile-seed')!.textContent!)).toEqual(selected);expect(view.querySelector('#public-asset-seed')).toBeNull();expect(profile).toHaveBeenCalledExactlyOnceWith('alexmorgan');expect(render).toHaveBeenCalledExactlyOnceWith(selected);
});

it('replaces seeded Explore rows with the selected asset and only its own asset seed',async()=>{
 const selected=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:source',receizId:'source',title:'Selected public asset',ownerUsername:'artist',profileOriginal:{media:{kind:'image'}}}]}}).items[0],item=vi.fn(async()=>selected),image=vi.fn(),response=await handleAssetPreview(new Request('https://bankeiz.com'+assetPagePath(selected.id)),{page:async()=>template,item,image}),view=document(await response.text());
 expect(response.status).toBe(200);expectOwnEntry(view);expect(view.querySelector('#public-explore-root .public-entry-placeholder h1')?.textContent).toBe(selected.title);expect(JSON.parse(view.querySelector('#public-asset-seed')!.textContent!)).toEqual(selected);expect(view.querySelector('#public-profile-seed')).toBeNull();expect(item).toHaveBeenCalledExactlyOnceWith(selected.id);expect(image).not.toHaveBeenCalled();
});
