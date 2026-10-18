import {beforeEach,expect,it,vi} from 'vitest';
import {retainAccountArtifactSource} from '../src/receiz/account-proof-sources';
const p=vi.hoisted(()=>({identity:vi.fn(),encode:vi.fn(()=> 'AQID'),hash:vi.fn(async()=> 'a'.repeat(64))}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>({readReceizIdentityArtifact:p.identity,receizBase64UrlEncode:p.encode,sha256ReceizBytes:p.hash})}));
beforeEach(()=>{vi.clearAllMocks();p.identity.mockRejectedValue(Error('not identity'));});
it('retains only the explicitly chosen exact bytes without publishing them',async()=>{
 const request=vi.fn(async(_path:string,_body:unknown)=>({schema:'bankeiz.account-private-source-retained.v1',sourceSha256:'a'.repeat(64)})),assertOpen=vi.fn();
 expect(await retainAccountArtifactSource({file:new File([new Uint8Array([1,2,3])],'owner.zip'),request,assertOpen})).toBe('a'.repeat(64));
 expect(request).toHaveBeenCalledOnce();expect(request.mock.calls[0][0]).toContain('/account-proof/sources?applicationId=');expect(request.mock.calls[0][1]).toEqual({archiveBytesB64u:'AQID'});
});
it('does not send an Identity Seal or an oversized file',async()=>{
 const request=vi.fn(),assertOpen=vi.fn();p.identity.mockResolvedValue({});
 await expect(retainAccountArtifactSource({file:new File(['private'],'identity.receiz'),request,assertOpen})).rejects.toThrow(/IDENTITY_FORBIDDEN/);
 await expect(retainAccountArtifactSource({file:new File([new Uint8Array(3*1024*1024+1)],'large.zip'),request,assertOpen})).rejects.toThrow(/CAPACITY/);expect(request).not.toHaveBeenCalled();
});
it('refuses an unconfirmed source digest and stops when identity closes',async()=>{
 const request=vi.fn(async()=>({schema:'bankeiz.account-private-source-retained.v1',sourceSha256:'b'.repeat(64)}));
 await expect(retainAccountArtifactSource({file:new File(['source'],'owner.zip'),request,assertOpen:()=>{}})).rejects.toThrow(/UNVERIFIED/);
 request.mockClear();await expect(retainAccountArtifactSource({file:new File(['source'],'owner.zip'),request,assertOpen:()=>{throw Error('closed');}})).rejects.toThrow('closed');expect(request).not.toHaveBeenCalled();
});
