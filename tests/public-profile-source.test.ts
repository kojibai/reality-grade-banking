import {it,expect,vi} from 'vitest';
import {createPublicProfileReader} from '../server/public-profile';
import {profileFixture} from './fixtures/public-profile';
it('coalesces cookie-free first-page reads and does not reuse a previous response after the request',async()=>{
 const fetcher=vi.fn(async(_input:RequestInfo|URL)=>Response.json(profileFixture()));const read=createPublicProfileReader(fetcher);
 const [a,b]=await Promise.all([read('alexmorgan'),read('alexmorgan')]);expect(a).toEqual(b);expect(fetcher).toHaveBeenCalledTimes(1);
 expect(fetcher.mock.calls[0]?.[0]).toBe('https://receiz.com/api/profile/alexmorgan?surface=public-route');
 const [,options]=fetcher.mock.calls[0] as unknown as [string,RequestInit];expect(options.credentials).toBe('omit');expect(options.redirect).toBe('error');expect(new Headers(options.headers).has('authorization')).toBe(false);
 await read('alexmorgan');expect(fetcher).toHaveBeenCalledTimes(2);
});
it('does not serve retained data when a name becomes private or is reassigned',async()=>{
 let value=profileFixture();const read=createPublicProfileReader(async()=>Response.json(value));expect((await read('alexmorgan')).userId).toBe('account-1');
 value=profileFixture();value.profile.profile.userId='account-2';expect((await read('alexmorgan')).userId).toBe('account-2');
 value.profile.profile.isPrivate=true;await expect(read('alexmorgan')).rejects.toThrow('PROFILE_PRIVATE');
});
it('expands through a complete UID-bound snapshot instead of unbound legacy cursor rows',async()=>{
 let attempt=0;const fetcher=vi.fn(async(_input:RequestInfo|URL)=>{const value=profileFixture();if(attempt++>0)value.profile.originalsPage={hasMore:false,nextCursor:''};return Response.json(value);});
 const read=createPublicProfileReader(fetcher),first=await read('alexmorgan');expect(first.nextCursor).toBe('all:account-1');const next=await read('alexmorgan',first.nextCursor!);expect(next.userId).toBe('account-1');expect(next.nextCursor).toBeNull();expect(String(fetcher.mock.calls[1][0])).toContain('?surface=public-route');
 await expect(read('alexmorgan','all:former-owner')).rejects.toMatchObject({status:409,message:'PROFILE_CHANGED'});
});
