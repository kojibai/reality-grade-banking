import {expect,it,vi} from 'vitest';
import {parsePublicOriginal} from '../src/receiz/public-profile';
import {createPublicOriginalReader} from '../server/public-profile';
const original={id:'imported-work',showOnProfile:true,assetTitle:'New Original',claim:'A public work',hasPbiSignature:false,media:null,marketPreview:{priceUsd:12},longForm:{text:'Complete text'}};
const value=()=>({ok:true,viewer:{profile:{userId:'owner',username:'artist',displayName:'Artist',isPrivate:false},originals:[original]}});
it('projects the exact anonymous Original without requiring PBI or processing the global catalogue',()=>{
 expect(parsePublicOriginal(value(),'artist','imported-work')).toMatchObject({id:'profile:artist:imported-work',title:'New Original',priceUsd:12,ownerUsername:'artist',hasLongForm:true});
});
it('refuses private profiles, hidden or substituted Originals and changed profile names',()=>{
 const input=value();input.viewer.profile.isPrivate=true;expect(()=>parsePublicOriginal(input,'artist','imported-work')).toThrow('PROFILE_ORIGINAL_UNAVAILABLE');
 expect(()=>parsePublicOriginal(value(),'other','imported-work')).toThrow('PROFILE_ORIGINAL_UNAVAILABLE');
 expect(()=>parsePublicOriginal(value(),'artist','another')).toThrow('PROFILE_ORIGINAL_UNAVAILABLE');
 const hidden=value();hidden.viewer.originals[0]={...original,showOnProfile:false};expect(()=>parsePublicOriginal(hidden,'artist','imported-work')).toThrow('PROFILE_ORIGINAL_UNAVAILABLE');
 const duplicates=value();duplicates.viewer.originals.push(original);expect(()=>parsePublicOriginal(duplicates,'artist','imported-work')).toThrow('PROFILE_ORIGINAL_UNAVAILABLE');
});
it('uses one bounded credential-free exact-coordinate read and respects missing or private responses',async()=>{
 const network=vi.fn<typeof fetch>().mockResolvedValue(Response.json(value()));
 const read=createPublicOriginalReader(network);
 expect((await read('artist','imported-work'))?.id).toBe('profile:artist:imported-work');
 expect(network).toHaveBeenCalledExactlyOnceWith('https://receiz.com/api/profile/artist/originals/imported-work/verified',expect.objectContaining({credentials:'omit',redirect:'error',signal:expect.any(AbortSignal)}));
 for(const status of [403,404]){network.mockResolvedValue(new Response(null,{status}));expect(await read('artist','imported-work')).toBeNull();}
 network.mockClear();await expect(read('artist','../private')).rejects.toThrow();expect(network).not.toHaveBeenCalled();
});
