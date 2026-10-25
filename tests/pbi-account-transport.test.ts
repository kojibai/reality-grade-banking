import {afterEach,expect,it,vi} from 'vitest';
import {relayPbiAccount} from '../server/pbi-account-transport';
const path='https://bankeiz.com/api/bank/native/pbi/';
const token=(iat=Math.floor(Date.now()/1000))=>`e30.${Buffer.from(JSON.stringify({iat})).toString('base64url')}.signature`;
afterEach(()=>vi.unstubAllGlobals());
it('keeps the canonical session HttpOnly and temporary without exposing it to the client',async()=>{
 const jwt=token(),send=vi.fn(async(_input:RequestInfo|URL,_init?:RequestInit)=>new Response(JSON.stringify({ok:true,session:{uid:'account'}}),{headers:{'content-type':'application/json','set-cookie':`receiz_session=${jwt}; HttpOnly; Secure; Path=/`}}));vi.stubGlobal('fetch',send);
 const result=await relayPbiAccount(new Request(path+'finish',{method:'POST',headers:{origin:'https://bankeiz.com','content-type':'application/json'},body:'{"challengeId":"held"}'}));
 expect(send.mock.calls[0][0]).toBe('https://receiz.com/api/auth/passkey/finish');expect(result.headers.get('set-cookie')).toContain('HttpOnly; Secure; SameSite=Strict; Path=/api/bank/native/pbi; Max-Age=300');expect(await result.text()).not.toContain(jwt);
});
it('forwards only the bounded canonical cookie to the closed ceremony endpoints',async()=>{
 const jwt=token(),send=vi.fn(async(_input:RequestInfo|URL,_init?:RequestInit)=>Response.json({ok:true}));vi.stubGlobal('fetch',send);
 await relayPbiAccount(new Request(path+'enroll',{method:'POST',headers:{origin:'https://bankeiz.com','content-type':'application/json',cookie:`other=secret; __Secure-bankeiz-pbi=${jwt}`},body:'{}'}));
 expect(send.mock.calls[0][1]?.headers).toMatchObject({Cookie:`receiz_session=${jwt}`,Origin:'https://bankeiz.com'});expect(JSON.stringify(send.mock.calls)).not.toContain('other=secret');
});
it('refuses cross-origin, arbitrary routes, expired cookies and unbounded bodies before upstream',async()=>{
 const send=vi.fn();vi.stubGlobal('fetch',send);
 for(const request of [new Request(path+'finish',{method:'POST',headers:{origin:'https://wrong.test','content-type':'application/json'},body:'{}'}),new Request(path+'../../wallet',{method:'POST'}),new Request(path+'enroll',{method:'POST',headers:{origin:'https://bankeiz.com','content-type':'application/json',cookie:`__Secure-bankeiz-pbi=${token(1)}`},body:'{}'}),new Request(path+'begin',{method:'POST',headers:{origin:'https://bankeiz.com','content-type':'application/json'},body:'x'.repeat(32769)})])expect((await relayPbiAccount(request)).ok).toBe(false);
 expect(send).not.toHaveBeenCalled();
});
it('clears only the temporary ceremony cookie locally',async()=>{
 const send=vi.fn();vi.stubGlobal('fetch',send);const result=await relayPbiAccount(new Request(path+'close',{method:'POST',headers:{origin:'https://bankeiz.com'}}));expect(result.ok).toBe(true);expect(result.headers.get('set-cookie')).toContain('Max-Age=0');expect(send).not.toHaveBeenCalled();
});

it('allows a same-origin browser GET without an Origin header and rejects cross-site reads',async()=>{
 const send=vi.fn(async()=>Response.json({credential:null}));vi.stubGlobal('fetch',send);
 const headers={cookie:`__Secure-bankeiz-pbi=${token()}`,'sec-fetch-site':'same-origin'};
 expect((await relayPbiAccount(new Request(path+'credential',{headers}))).ok).toBe(true);
 expect((await relayPbiAccount(new Request(path+'credential',{headers:{...headers,'sec-fetch-site':'cross-site'}}))).status).toBe(403);
 expect(send).toHaveBeenCalledOnce();
});
it('does not renew the ceremony deadline when binding rotates the canonical session',async()=>{
 const send=vi.fn(async()=>Response.json({ok:true},{headers:{'set-cookie':`receiz_session=${token()}; HttpOnly; Path=/`}}));vi.stubGlobal('fetch',send);
 const result=await relayPbiAccount(new Request(path+'bind',{method:'POST',headers:{origin:'https://bankeiz.com','content-type':'application/json',cookie:`__Secure-bankeiz-pbi=${token(Math.floor(Date.now()/1000)-290)}`},body:'{}'}));
 expect(result.ok).toBe(true);expect(result.headers.get('set-cookie')).toBeNull();
});
