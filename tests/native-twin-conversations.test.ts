import {expect,it,vi} from 'vitest';
import {createNativeTwin} from '../src/receiz/native-twin';
import {permittedNativePath} from '../src/receiz/native-transport';
const owner='33333333-3333-4333-8333-333333333333',key=`api:${owner}:11111111-1111-4111-8111-111111111111`;
it('lists and opens only exact same-owner private conversation originals through the existing native adapter',async()=>{
 const request=vi.fn(async(path:string)=>Response.json(path.includes('threadKey=')?{ok:true,ownerUid:owner,threadKey:key,entries:[{id:'22222222-2222-4222-8222-222222222222',threadKey:key,role:'user',body:'Exact earlier text '+'x'.repeat(28000),scope:'relationship',channel:'profile',createdAt:'2026-10-25T10:00:00Z',coordinate:`owner-twin-memory:${owner}:22222222-2222-4222-8222-222222222222`}],hasMore:false,nextCursor:null,sourceDigest:'a'.repeat(64)}:{ok:true,ownerUid:owner,threads:[{threadKey:key,title:'Earlier task',preview:'Exact earlier text',updatedAt:'2026-10-25T10:00:00Z'}],hasMore:false,nextCursor:null}));
 const twin=createNativeTwin({accountUid:owner,username:'owner',assertOpen(){},request});expect(twin.conversations).toBeDefined();const list=await twin.conversations.list();expect(list.threads[0].threadKey).toBe(key);const page=await twin.conversations.read(key);expect(page.entries[0].body).toHaveLength(28019);expect(request.mock.calls[1][0]).toContain('threadKey='+encodeURIComponent(key));
 await expect(twin.conversations.read('api:foreign')).rejects.toThrow('CONVERSATION_INVALID');expect(request).toHaveBeenCalledTimes(2);
});
it('refuses cross-owner history and malformed transport selectors without admitting a source page',async()=>{
 const twin=createNativeTwin({accountUid:owner,username:'owner',assertOpen(){},request:async()=>Response.json({ok:true,ownerUid:'foreign',threads:[],hasMore:false,nextCursor:null})});expect(twin.conversations).toBeDefined();await expect(twin.conversations.list()).rejects.toThrow('CONVERSATION_OWNER_MISMATCH');
 const base='/api/developers/twin/owner/conversations';expect(permittedNativePath(base,'GET')).toBe(true);expect(permittedNativePath(base+'?threadKey='+encodeURIComponent(key),'GET')).toBe(true);for(const query of ['?ownerUid=foreign','?threadKey=public-key','?cursor=bad%20cursor','?cursor=a&cursor=b','?limit=9000'])expect(permittedNativePath(base+query,'GET')).toBe(false);expect(permittedNativePath(base,'POST')).toBe(false);
});
