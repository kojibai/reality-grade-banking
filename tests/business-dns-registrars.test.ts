import {expect,it,vi} from 'vitest';
import {createGoDaddyDnsConnection,createVercelDnsConnection,createDigitalOceanDnsConnection,createDnsimpleDnsConnection,createPorkbunDnsConnection} from '../server/business-dns/registrars';
import type {DnsHttpRequest} from '../server/business-dns/http';
const uid='account-one',zoneName='example.com',hostname='studio.example.com';
const connection={type:'CNAME',name:hostname,value:'profile.receiz.com',purpose:'Connect'},verification={type:'TXT',name:'_verify.'+hostname,value:'exact-native-token',purpose:'Verify'};
const plan={hostname,connectionOptions:[connection],verificationRecords:[verification]};
type Provider='godaddy'|'vercel'|'digitalocean'|'dnsimple'|'porkbun';
const providers:Provider[]=['godaddy','vercel','digitalocean','dnsimple','porkbun'];
function fixture(provider:Provider){
 const raw:Record<string,unknown>[]=[];const calls:{url:string;init:Parameters<DnsHttpRequest>[1]}[]=[];
 const request=vi.fn<DnsHttpRequest>(async(url,init)=>{
  calls.push({url,init});
  if(init.method!=='GET'){
   const body=JSON.parse(init.body!),id=String(raw.length+1),name=body.name as string,type=body.type as string;
   const record=provider==='godaddy'?{recordId:id,name,type,data:body.data}:provider==='vercel'?{id,name,type,value:body.value}:provider==='digitalocean'?{id:Number(id),name,type,data:body.data}:provider==='dnsimple'?{id:Number(id),name,type,content:body.content}:{id,name:name?name+'.'+zoneName:zoneName,type,content:body.content};raw.push(record);
   return Response.json(provider==='godaddy'?record:provider==='vercel'?{uid:id,updated:123}:provider==='digitalocean'?{domain_record:record}:provider==='dnsimple'?{data:record}:{status:'SUCCESS',id},{status:provider==='godaddy'||provider==='digitalocean'||provider==='dnsimple'?201:200});
  }
  return Response.json(provider==='godaddy'?{items:raw,totalItems:raw.length,totalPages:1,links:[]}:provider==='vercel'?{records:raw,pagination:{count:raw.length,next:null,prev:null}}:provider==='digitalocean'?{domain_records:raw,meta:{total:raw.length},links:{}}:provider==='dnsimple'?{data:raw,pagination:{current_page:1,total_pages:1,per_page:100,total_entries:raw.length}}:{status:'SUCCESS',cloudflare:'disabled',records:raw});
 });
 let open=true;const base={accountUid:uid,zoneName,canWrite:true,request,assertOpen(){if(!open)throw Error('Identity disposed');}};
 const adapter=provider==='godaddy'?createGoDaddyDnsConnection(base):provider==='vercel'?createVercelDnsConnection(base):provider==='digitalocean'?createDigitalOceanDnsConnection(base):provider==='dnsimple'?createDnsimpleDnsConnection({...base,providerAccountId:'1234'}):createPorkbunDnsConnection(base);
 return{adapter,raw,calls,request,dispose(){open=false;}};
}
it.each(providers)('%s creates only the two exact native records using its actual API and relative names',async provider=>{
 const f=fixture(provider);expect(f.calls).toEqual([]);const result=await f.adapter.apply(plan);expect(result.status).toBe('applied');expect(result.records.map(row=>row.reference)).toEqual(['1','2']);const writes=f.calls.filter(call=>call.init.method!=='GET');expect(writes).toHaveLength(2);expect(writes.map(call=>JSON.parse(call.init.body!).name)).toEqual(['studio','_verify.studio']);expect(writes.every(call=>call.init.method==='POST'&&call.init.redirect==='error'&&call.init.credentials==='omit')).toBe(true);
 const bodies=writes.map(call=>JSON.parse(call.init.body!));expect(bodies.map(body=>body.value??body.data??body.content)).toEqual([provider==='godaddy'?'profile.receiz.com.':connection.value,verification.value]);expect(JSON.stringify(bodies)).not.toMatch(/apikey|secret|cookie|authorization/i);
 const origins={godaddy:'https://api.godaddy.com',vercel:'https://api.vercel.com',digitalocean:'https://api.digitalocean.com',dnsimple:'https://api.dnsimple.com',porkbun:'https://api.porkbun.com'};expect(f.calls.every(call=>new URL(call.url).origin===origins[provider])).toBe(true);
 if(provider==='dnsimple')expect(bodies[0].integrated_zones).toEqual(['dnsimple']);
});
it.each(providers)('%s stops on refused reads and uncertain writes without retrying',async provider=>{
 const denied=fixture(provider);denied.request.mockResolvedValueOnce(Response.json({error:'scope unavailable'},{status:403}));expect((await denied.adapter.apply(plan)).status).toBe('manual');expect(denied.raw).toEqual([]);
 const lost=fixture(provider),request=lost.request.getMockImplementation()!;lost.request.mockImplementation(async(url,init)=>{if(init.method!=='GET'){await request(url,init);throw Error('provider reply lost');}return request(url,init);});expect((await lost.adapter.apply(plan)).status).toBe('unknown');expect(lost.calls.filter(call=>call.init.method!=='GET')).toHaveLength(1);
});
it('GoDaddy requires complete totals and requests them explicitly, while accepting its documented empty result',async()=>{
 const f=fixture('godaddy');f.request.mockResolvedValueOnce(Response.json({items:[],totalItems:1,totalPages:1,links:[]}));expect((await f.adapter.apply(plan)).status).toBe('manual');expect(f.raw).toEqual([]);
 const empty=fixture('godaddy');empty.request.mockResolvedValueOnce(Response.json({items:[],links:[]}));expect((await empty.adapter.apply(plan)).status).toBe('applied');expect(new URL(empty.calls[0].url).searchParams.get('totalRequired')).toBe('true');
});
it('Vercel follows bounded pagination and refuses repeated cursors before writes',async()=>{
 const f=fixture('vercel');f.request.mockImplementation(async()=>Response.json({records:[],pagination:{count:0,next:12,prev:null}}));expect((await f.adapter.apply(plan)).status).toBe('manual');expect(f.raw).toEqual([]);expect(f.request.mock.calls.length).toBeLessThan(5);
});
it('DigitalOcean rejects pagination that leaves the provider/zone and contradictory totals',async()=>{
 for(const next of ['https://evil.example/collect','https://api.digitalocean.com/v2/domains/other.example/records?page=2']){
  const f=fixture('digitalocean');f.request.mockResolvedValueOnce(Response.json({domain_records:[],meta:{total:1},links:{pages:{next}}}));expect((await f.adapter.apply(plan)).status).toBe('manual');expect(f.request).toHaveBeenCalledOnce();
 }
 const f=fixture('digitalocean');f.request.mockResolvedValueOnce(Response.json({domain_records:[],meta:{total:1},links:{}}));expect((await f.adapter.apply(plan)).status).toBe('manual');
});
it('DNSimple refuses missing pages and restricts creation to the connected DNSimple zone',async()=>{
 const f=fixture('dnsimple');f.request.mockResolvedValueOnce(Response.json({data:[],pagination:{current_page:1,total_pages:1,per_page:100,total_entries:1}}));expect((await f.adapter.apply(plan)).status).toBe('manual');expect(f.raw).toEqual([]);
});
it('Porkbun does not call proxy-enabled or malformed records complete DNS-only setup',async()=>{
 const f=fixture('porkbun');f.request.mockResolvedValueOnce(Response.json({status:'SUCCESS',cloudflare:'enabled',records:[]}));expect((await f.adapter.apply(plan)).status).toBe('manual');expect(f.raw).toEqual([]);
});
it.each(providers)('%s discards results if the admitted owner closes during provider read',async provider=>{
 const f=fixture(provider),request=f.request.getMockImplementation()!;f.request.mockImplementationOnce(async(url,init)=>{const result=await request(url,init);f.dispose();return result;});await expect(f.adapter.apply(plan)).rejects.toThrow('Identity disposed');expect(f.raw).toEqual([]);
});
it.each(['godaddy','vercel','digitalocean','dnsimple'] as const)('%s reads every page and preserves a service record found on a later page before any write',async provider=>{
 const f=fixture(provider);const service={type:'AAAA',name:'studio',data:'2001:db8::1',value:'2001:db8::1',content:'2001:db8::1',id:91,recordId:'91'};
 f.request.mockImplementation(async url=>{
  const parsed=new URL(url),second=parsed.searchParams.get('page')==='2'||parsed.searchParams.has('until');const items=second?[service]:[{...service,name:'other'}];
  return Response.json(provider==='godaddy'?{items,totalItems:2,totalPages:2,links:second?[]:[{rel:'next',href:'https://api.godaddy.com/v3/domains/zones/example.com/dns-records?page=2'}]}:provider==='vercel'?{records:items,pagination:{count:1,next:second?null:12,prev:null}}:provider==='digitalocean'?{domain_records:items,meta:{total:2},links:second?{}:{pages:{next:'https://api.digitalocean.com/v2/domains/example.com/records?per_page=200&page=2'}}}:{data:items,pagination:{current_page:second?2:1,total_pages:2,total_entries:2,per_page:100}});
 });
 expect((await f.adapter.apply(plan)).status).toBe('manual');expect(f.request).toHaveBeenCalledTimes(2);expect(f.request.mock.calls.every(call=>call[1].method==='GET')).toBe(true);
});
it.each(['godaddy','vercel','digitalocean','dnsimple'] as const)('%s never mistakes a relative name ending in the zone for the actual target hostname',async provider=>{
 const f=fixture(provider),rawName=hostname,id=provider==='godaddy'?{recordId:'existing'}:{id:91};f.raw.push({...id,type:'CNAME',name:rawName,data:cnameValue(),value:cnameValue(),content:cnameValue()});const result=await f.adapter.apply({...plan,verificationRecords:[]});expect(result.status).toBe('applied');expect(f.calls.filter(call=>call.init.method==='POST')).toHaveLength(1);
});
function cnameValue(){return connection.value;}
it('GoDaddy rejects a final-page next link contradicting its declared totals',async()=>{
 const f=fixture('godaddy');f.request.mockResolvedValueOnce(Response.json({items:[],totalItems:0,totalPages:1,links:[{rel:'next',href:'https://api.godaddy.com/v3/domains/zones/example.com/dns-records?page=2'}]}));expect((await f.adapter.apply(plan)).status).toBe('manual');expect(f.raw).toEqual([]);
});
it('Porkbun rejects an absolute record outside its connected DNS zone',async()=>{
 const f=fixture('porkbun');f.request.mockResolvedValueOnce(Response.json({status:'SUCCESS',cloudflare:'disabled',records:[{id:'x',type:'CNAME',name:'foreign.example.net',content:connection.value}]}));expect((await f.adapter.apply(plan)).status).toBe('manual');expect(f.raw).toEqual([]);
});

it('GoDaddy supplies unique idempotency keys and absolute CNAME targets required by v3',async()=>{const f=fixture('godaddy');expect((await f.adapter.apply(plan)).status).toBe('applied');const writes=f.calls.filter(call=>call.init.method==='POST');expect(writes.map(call=>JSON.parse(call.init.body!).data)).toEqual(['profile.receiz.com.','exact-native-token']);const keys=writes.map(call=>new Headers(call.init.headers).get('Idempotency-Key'));expect(keys.every(key=>typeof key==='string'&&/^[a-f0-9-]{36}$/.test(key))).toBe(true);expect(new Set(keys).size).toBe(2);});
