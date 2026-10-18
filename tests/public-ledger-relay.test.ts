import {it,expect,vi} from 'vitest';
import {resolvePublicLedgerTarget,relayPublicLedger} from '../server/public-ledger-proof';
it('fixes all public Ledger requests to one host and rejects selectors, URLs and duplicate parameters',()=>{
 expect(resolvePublicLedgerTarget('/api/bank/ledger-proof?source='+'a'.repeat(64))?.href).toBe('https://receiz.com/api/ledger/proof?source='+'a'.repeat(64));
 for(const query of ['?source=https://evil.test','?accountUid=private','?source='+'a'.repeat(64)+'&source='+'b'.repeat(64),'?discovery=1&limit=101','?cursor=1'])expect(resolvePublicLedgerTarget('/api/bank/ledger-proof'+query)).toBeNull();
});
it('omits credentials, redirects and private headers; bounds writes and requires a same-origin action',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response('public exact bytes',{headers:{'Content-Type':'application/octet-stream'}}));
 try{
  const response=await relayPublicLedger(new Request('https://bankeiz.com/api/bank/ledger-proof?source='+'a'.repeat(64),{headers:{Cookie:'private',Authorization:'Bearer private'}}));expect(response.status).toBe(200);
  const [,options]=fetch.mock.calls[0];expect(options?.credentials).toBe('omit');expect(options?.redirect).toBe('error');expect(new Headers(options?.headers).has('cookie')).toBe(false);expect(new Headers(options?.headers).has('authorization')).toBe(false);
  expect((await relayPublicLedger(new Request('https://bankeiz.com/api/bank/ledger-proof',{method:'POST',headers:{origin:'https://evil.test','content-type':'application/json'},body:'{}'}))).status).toBe(403);expect(fetch).toHaveBeenCalledTimes(1);
  expect((await relayPublicLedger(new Request('https://bankeiz.com/api/bank/ledger-proof',{method:'POST',headers:{origin:'https://bankeiz.com','content-type':'application/json','content-length':String(5*1024*1024)},body:'{}'}))).status).toBe(413);
 }finally{fetch.mockRestore();}
});

it('refuses unexpected HTML and redirect responses without relaying provider headers',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValueOnce(new Response('<html>provider error</html>',{status:404,headers:{'Content-Type':'text/html','Set-Cookie':'private=secret'}})).mockResolvedValueOnce(new Response('moved',{status:302,headers:{'Content-Type':'application/json',Location:'https://other.test'}}));
 try{for(let i=0;i<2;i++){const response=await relayPublicLedger(new Request('https://bankeiz.com/api/bank/ledger-proof'));expect(response.status).toBe(503);expect(response.headers.get('set-cookie')).toBeNull();expect(response.headers.get('location')).toBeNull();expect(await response.json()).toEqual({error:'PUBLIC_LEDGER_SOURCE_UNAVAILABLE'});}}
 finally{fetch.mockRestore();}
});
