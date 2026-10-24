// @vitest-environment happy-dom
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {reservePbiAccountPopup,runPbiAccountBridge} from '../src/receiz/pbi-account-bridge';

const key={keyId:'a'.repeat(64),alg:'Ed25519',publicKeyRawB64u:'fixture',localUid:'local-device'};
let popup:{closed:boolean;location:{replace:ReturnType<typeof vi.fn>};close:ReturnType<typeof vi.fn>;postMessage:ReturnType<typeof vi.fn>};
beforeEach(()=>{popup={closed:false,location:{replace:vi.fn()},close:vi.fn(),postMessage:vi.fn()};vi.spyOn(window,'open').mockReturnValue(popup as unknown as Window);});
afterEach(()=>{vi.restoreAllMocks();});
function receive(data:unknown,origin='https://receiz.com',source:unknown=popup){window.dispatchEvent(new MessageEvent('message',{data,origin,source:source as Window}));}
it('reserves only on explicit interaction and rejects a blocked popup before any account work',()=>{
 expect(window.open).not.toHaveBeenCalled();reservePbiAccountPopup();expect(window.open).toHaveBeenCalledTimes(1);
 vi.mocked(window.open).mockReturnValue(null);expect(()=>reservePbiAccountPopup()).toThrow('PBI_POPUP_BLOCKED');
});
it('binds the exact popup, canonical origin, state and local public key before accepting the original source',async()=>{
 const signing=vi.fn(async()=>({challengeB64Url:'challenge',signatureB64Url:'signature'}));
 const reserved=reservePbiAccountPopup();const result=runPbiAccountBridge(reserved,key,signing);
 const url=new URL(popup.location.replace.mock.calls[0][0]);const state=url.searchParams.get('state')!;
 const base={source:'receiz-account-pbi-bridge',state,kind:'recovered',accountUid:'original-account'};
 receive(base,'https://evil.test');receive(base,'https://receiz.com',{});receive({...base,state:'wrong'});
 expect(signing).not.toHaveBeenCalled();receive(base);await vi.waitFor(()=>expect(signing).toHaveBeenCalledOnce());
 expect(signing).toHaveBeenCalledWith('original-account');expect(popup.postMessage).toHaveBeenCalledWith(expect.objectContaining({kind:'bind',state,...key,challengeB64Url:'challenge'}),'https://receiz.com');
 receive({...base,kind:'bound',ok:true,sourceB64u:'b3JpZ2luYWwtc291cmNl'});
 expect(await result).toEqual({accountUid:'original-account',sourceB64u:'b3JpZ2luYWwtc291cmNl',request:expect.objectContaining({...key,challengeB64Url:'challenge',signatureB64Url:'signature'})});expect(popup.close).toHaveBeenCalledOnce();
});
it('cancellation closes the popup and cannot create an ordinary or replacement account',async()=>{
 const signing=vi.fn();const result=runPbiAccountBridge(reservePbiAccountPopup(),key,signing);const rejected=expect(result).rejects.toThrow('passkey_cancelled');
 const state=new URL(popup.location.replace.mock.calls[0][0]).searchParams.get('state');
 receive({source:'receiz-account-pbi-bridge',state,kind:'error',error:'passkey_cancelled'});await rejected;expect(signing).not.toHaveBeenCalled();expect(popup.close).toHaveBeenCalledOnce();
});
