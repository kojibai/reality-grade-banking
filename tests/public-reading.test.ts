import {expect,it,vi} from 'vitest';
import {handlePublicReading} from '../server/public-reading';
import {PublicProfileError} from '../server/public-profile';
import {parsePublicMarket} from '../src/receiz/public-market';
import {parsePublicProfile} from '../src/receiz/public-profile';
import {profileFixture} from './fixtures/public-profile';
const item=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:source',receizId:'source',title:'Exact public Original',valueUsd:12.5}]}}).items[0];
const dependencies=()=>({profile:vi.fn(async()=>parsePublicProfile(profileFixture(),'alexmorgan')),original:vi.fn(async()=>item),catalog:vi.fn(async()=>[item])});

it('reads the exact public Original once without opening a profile, catalog or app template',async()=>{
 const deps=dependencies(),response=await handlePublicReading(new Request('https://bankeiz.com/read/assets/'+encodeURIComponent(item.id)+'/'),deps);
 expect(response.status).toBe(200);expect(await response.text()).toContain('Exact public Original');expect(deps.original).toHaveBeenCalledExactlyOnceWith('artist','source');expect(deps.profile).not.toHaveBeenCalled();expect(deps.catalog).not.toHaveBeenCalled();expect(response.headers.get('cache-control')).toBe('no-store');
});

it('reads one public profile and negotiates inert text without forwarding incoming credentials',async()=>{
 const deps=dependencies(),response=await handlePublicReading(new Request('https://bankeiz.com/read/profiles/alexmorgan/',{headers:{accept:'text/plain',cookie:'private',authorization:'Bearer private'}}),deps);
 expect(response.status).toBe(200);expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');expect(await response.text()).toContain('Alex Morgan');expect(deps.profile).toHaveBeenCalledExactlyOnceWith('alexmorgan');expect(deps.original).not.toHaveBeenCalled();expect(response.headers.get('set-cookie')).toBeNull();
});

it.each([403,404,503])('preserves public source refusal %s without falling back to public snapshots',async status=>{
 const deps=dependencies();deps.original.mockRejectedValue(new PublicProfileError('private upstream diagnostic',status));
 const response=await handlePublicReading(new Request('https://bankeiz.com/read/assets/'+encodeURIComponent(item.id)+'/'),deps);
 expect(response.status).toBe(status);expect(await response.text()).not.toContain('private upstream diagnostic');expect(deps.catalog).not.toHaveBeenCalled();
});

it('returns not found for an undisclosed Original, rather than reading the shipped catalog',async()=>{
 const deps={...dependencies(),original:vi.fn(async()=>null)},response=await handlePublicReading(new Request('https://bankeiz.com/read/assets/'+encodeURIComponent(item.id)+'/'),deps);
 expect(response.status).toBe(404);expect(deps.catalog).not.toHaveBeenCalled();
});

it('keeps HEAD, invalid routes and unsupported methods free of source work',async()=>{
 const deps=dependencies();for(const [url,method,status]of [
  ['/read/profiles/alexmorgan/','HEAD',200],['/read/assets/profile%3Aartist%3Asource/','HEAD',200],['/read/','GET',404],['/api/read?kind=asset&id=profile%3Aartist%3Asource','POST',405],['/read/profiles/alexmorgan/?page=0','GET',400],['/read/profiles/alexmorgan/?page=2&page=1','GET',400],['/read/assets/profile%3Aartist%3Asource/?page=1','GET',400],['/read/assets/%2e%2e%2fprivate/','GET',400],['/api/read?kind=asset&id=profile%3Aartist%3Asource&url=https%3A%2F%2Fprivate','GET',400],
 ] as const){const response=await handlePublicReading(new Request('https://bankeiz.com'+url,{method}),deps);expect(response.status,url).toBe(status);}
 expect(deps.profile).not.toHaveBeenCalled();expect(deps.original).not.toHaveBeenCalled();expect(deps.catalog).not.toHaveBeenCalled();
});

it('accepts only agreeing rewrite coordinates and leaves a zero-preference text request as HTML',async()=>{
 const deps=dependencies(),id=encodeURIComponent(item.id);
 expect((await handlePublicReading(new Request('https://bankeiz.com/read/assets/'+id+'/?kind=profile&id=other'),deps)).status).toBe(400);
 const response=await handlePublicReading(new Request('https://bankeiz.com/api/read?kind=asset&id='+id,{headers:{accept:'text/plain;q=0,text/html'}}),deps);expect(response.status).toBe(200);expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
});

it('uses one curated catalog read for a non-profile asset without attempting account or Original reads',async()=>{
 const card={...item,id:'sports:card1'};const deps={...dependencies(),catalog:vi.fn(async()=>[card])},response=await handlePublicReading(new Request('https://bankeiz.com/read/assets/sports%3Acard1/?format=text'),deps);
 expect(response.status).toBe(200);expect(await response.text()).toContain('Exact public Original');expect(deps.catalog).toHaveBeenCalledExactlyOnceWith('sports');expect(deps.original).not.toHaveBeenCalled();expect(deps.profile).not.toHaveBeenCalled();
});
