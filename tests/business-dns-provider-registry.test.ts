import {expect,it,vi} from 'vitest';
import {businessDnsProviderCatalog,createConnectedDnsProvider,createDnsConnectionSetup,type ConnectedDnsProvider} from '../server/business-dns-providers';
const uid='account-one',hostname='studio.example.com',zoneName='example.com';
function connection(){const request=vi.fn(async()=>Response.json({status:'SUCCESS',cloudflare:'disabled',records:[]}));return{provider:'porkbun' as const,accountUid:uid,zoneName,canWrite:true,request,assertOpen(){}};}
it('prepares ten concrete providers including Namecheap and Cloudflare without starting any work',()=>{
 expect(businessDnsProviderCatalog.map(row=>row.id)).toEqual(['cloudflare','godaddy','vercel','digitalocean','dnsimple','porkbun','route53','google-cloud-dns','azure-dns','namecheap']);const config=connection(),result=createConnectedDnsProvider(config,{accountUid:uid,hostname});expect(result?.provider).toBe('Porkbun');expect(config.request).not.toHaveBeenCalled();
});
it('the registry accepts only an actual same-owner connection for the requested hostname',()=>{
 const config=connection();expect(()=>createConnectedDnsProvider({...config,accountUid:'foreign'},{accountUid:uid,hostname})).toThrow('BUSINESS_DNS_OWNER_MISMATCH');expect(createConnectedDnsProvider(config,{accountUid:uid,hostname:'other.example.net'})).toBeNull();expect(createConnectedDnsProvider({...config,provider:'unsupported'} as never,{accountUid:uid,hostname})).toBeNull();expect(config.request).not.toHaveBeenCalled();
});
it('returns one real Connect action, resumes the same saved hostname and keeps provider credentials out of the public result',async()=>{
 let connected:ConnectedDnsProvider|null=null;const lookup=vi.fn(async(_provider:string,_hostname:string)=>connected),authorize=vi.fn(async()=>({accountUid:uid,provider:'namecheap',hostname,url:'https://provider-connect.test/authorize?opaque=real-host-issued'}));
 const setup=createDnsConnectionSetup({accountUid:uid,hostname,authorizationOrigins:['https://provider-connect.test'],lookup,authorize,assertOpen(){}});
 expect(await setup.connect('namecheap')).toEqual({status:'connect',provider:'namecheap',action:{label:'Connect Namecheap',href:'https://provider-connect.test/authorize?opaque=real-host-issued'}});expect(authorize).toHaveBeenCalledExactlyOnceWith('namecheap',hostname);expect(await setup.connection('namecheap')).toBeNull();
 connected=connection();expect((await setup.connect('porkbun')).status).toBe('ready');expect(authorize).toHaveBeenCalledOnce();const result=await setup.connection('porkbun');expect(result?.provider).toBe('Porkbun');expect(lookup.mock.calls.every(call=>call[1]===hostname)).toBe(true);
});
it('declined or unavailable connections yield fallback without asking for keys or inventing an authorization link',async()=>{
 const setup=createDnsConnectionSetup({accountUid:uid,hostname,authorizationOrigins:['https://provider-connect.test'],lookup:async()=>null,authorize:async()=>null,assertOpen(){}});expect(await setup.connect('namecheap')).toEqual({status:'manual',provider:'namecheap'});expect(await setup.connection('namecheap')).toBeNull();
});
it('rejects a foreign-owner callback, wrong provider/hostname, unsafe URL or stale identity',async()=>{
 for(const changed of [{accountUid:'foreign'},{provider:'godaddy'},{hostname:'other.example.com'},{url:'https://evil.example/collect'},{url:'javascript:alert(1)'}]){
  const setup=createDnsConnectionSetup({accountUid:uid,hostname,authorizationOrigins:['https://provider-connect.test'],lookup:async()=>null,authorize:async()=>({accountUid:uid,provider:'namecheap',hostname,url:'https://provider-connect.test/authorize',...changed}),assertOpen(){}});await expect(setup.connect('namecheap')).rejects.toThrow();
 }
 let open=true;const setup=createDnsConnectionSetup({accountUid:uid,hostname,authorizationOrigins:['https://provider-connect.test'],lookup:async()=>{open=false;return null;},authorize:vi.fn(),assertOpen(){if(!open)throw Error('Identity disposed');}});await expect(setup.connect('namecheap')).rejects.toThrow('Identity disposed');
});
it('offers Connect again for an existing read-only grant instead of treating it as setup permission',async()=>{
 const authorize=vi.fn(async()=>({accountUid:uid,provider:'porkbun',hostname,url:'https://provider-connect.test/authorize'}));const setup=createDnsConnectionSetup({accountUid:uid,hostname,authorizationOrigins:['https://provider-connect.test'],lookup:async()=>({...connection(),canWrite:false}),authorize,assertOpen(){}});expect((await setup.connect('porkbun')).status).toBe('connect');expect(authorize).toHaveBeenCalledOnce();
});
it('never emits a credential-bearing authorization URL as a Connect action',async()=>{
 const setup=createDnsConnectionSetup({accountUid:uid,hostname,authorizationOrigins:['https://provider-connect.test'],lookup:async()=>null,authorize:async()=>({accountUid:uid,provider:'namecheap',hostname,url:'https://provider-connect.test/authorize?ApiKey=must-stay-private'}),assertOpen(){}});await expect(setup.connect('namecheap')).rejects.toThrow('BUSINESS_DNS_AUTHORIZATION_URL_INVALID');
});
