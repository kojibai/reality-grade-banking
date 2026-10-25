import {expect,it,vi} from 'vitest';
import {createCloudflareBusinessDnsConnection} from '../server/business-dns-cloudflare';
const uid='account-one',hostname='studio.example.com',zoneId='a'.repeat(32);
const cname={type:'CNAME',name:hostname,value:'profile.receiz.com',purpose:'Connect profile.'};
const address={type:'A',name:hostname,value:'192.0.2.4',purpose:'Use instead.'};
const txt={type:'TXT',name:'_verify.'+hostname,value:'exact-native-token',purpose:'Verify ownership.'};
const plan={hostname,connectionOptions:[cname,address],verificationRecords:[txt]};
function fixture(existing:unknown[]=[],options:{readonly?:boolean;lostWrite?:boolean}={}){
 const records=[...existing];let sequence=0;
 const request=vi.fn(async(path:string,init?:{method:'GET'|'POST';body?:string})=>{
  if(init?.method==='POST'){const body=JSON.parse(init.body!);records.push({id:'record-'+ ++sequence,...body});if(options.lostWrite)throw Error('reply lost');return Response.json({success:true,result:{id:'record-'+sequence,...body}});}
  const name=new URL(path,'https://api.cloudflare.com').searchParams.get('name');return Response.json({success:true,result:records.filter(row=>(row as {name:string}).name===name),result_info:{total_pages:1,page:1,count:records.filter(row=>(row as {name:string}).name===name).length,total_count:records.filter(row=>(row as {name:string}).name===name).length,per_page:100}});
 });
 const connection=createCloudflareBusinessDnsConnection({accountUid:uid,zoneId,zoneName:'example.com',canWrite:!options.readonly,request,assertOpen(){}});
 return{connection,request,records};
}
it('creates the actual selected CNAME and verification TXT, never both connection alternatives or credential arguments',async()=>{
 const f=fixture(),result=await f.connection.apply(plan);expect(result.status).toBe('applied');const writes=f.request.mock.calls.filter(call=>call[1]?.method==='POST');expect(writes).toHaveLength(2);expect(writes.map(call=>JSON.parse(call[1]!.body!))).toEqual([{type:'CNAME',name:hostname,content:cname.value,ttl:1,proxied:false},{type:'TXT',name:txt.name,content:txt.value,ttl:1}]);expect(result.records.map(row=>row.reference)).toEqual(['record-1','record-2']);expect(f.request.mock.calls.every(call=>call[0].startsWith('/zones/'+zoneId+'/dns_records'))).toBe(true);
});
it('preserves website/email/NS records and returns a manual decision on a conflicting hostname before any write',async()=>{
 const existing=[{id:'website',type:'A',name:hostname,content:'192.0.2.9'},{id:'mail',type:'MX',name:'example.com',content:'mail.example.com'}];const f=fixture(existing),result=await f.connection.apply(plan);expect(result.status).toBe('manual');expect(f.records).toEqual(existing);expect(f.request.mock.calls.some(call=>call[1]?.method==='POST')).toBe(false);
});
it('reuses exact existing records after an explicit new request and never repeats a lost write automatically',async()=>{
 const f=fixture([{id:'existing-cname',type:'CNAME',name:hostname,content:cname.value,proxied:false},{id:'existing-txt',type:'TXT',name:txt.name,content:txt.value}]);expect((await f.connection.apply(plan)).status).toBe('applied');expect(f.request.mock.calls.some(call=>call[1]?.method==='POST')).toBe(false);
 const lost=fixture([],{lostWrite:true}),result=await lost.connection.apply(plan);expect(result.status).toBe('unknown');expect(lost.request.mock.calls.filter(call=>call[1]?.method==='POST')).toHaveLength(1);expect(lost.records).toHaveLength(1);
});
it('returns manual fallback for read-only connections, outside zones and unsupported record types without requests',async()=>{
 const f=fixture([],{readonly:true});expect((await f.connection.apply(plan)).status).toBe('manual');expect(f.request).not.toHaveBeenCalled();
 const outside=fixture();expect((await outside.connection.apply({...plan,verificationRecords:[{...txt,name:'_verify.other.example.net'}]})).status).toBe('manual');expect(outside.request).not.toHaveBeenCalled();
 const unsupported=fixture();expect((await unsupported.connection.apply({...plan,connectionOptions:[{...cname,type:'ALIAS'}]})).status).toBe('manual');expect(unsupported.request).not.toHaveBeenCalled();
});
it('chooses the native A alternative for an apex and refuses incomplete lists or malformed write acknowledgements',async()=>{
 const f=fixture();expect((await f.connection.apply({hostname:'example.com',connectionOptions:[{...cname,name:'example.com'},{...address,name:'example.com'}],verificationRecords:[]})).status).toBe('applied');expect(f.records[0]).toMatchObject({type:'A',name:'example.com',content:address.value});
 const incomplete=fixture();incomplete.request.mockResolvedValueOnce(Response.json({success:true,result:[],result_info:{total_pages:2,page:1}}));expect((await incomplete.connection.apply(plan)).status).toBe('manual');expect(incomplete.request).toHaveBeenCalledOnce();
 const bad=fixture();bad.request.mockImplementation(async(_path,init)=>init?.method==='POST'?Response.json({success:true,result:{id:'unrelated',type:'TXT',name:'other',content:'other'}}):Response.json({success:true,result:[],result_info:{total_pages:1,page:1,count:0,total_count:0,per_page:100}}));expect((await bad.connection.apply(plan)).status).toBe('unknown');expect(bad.request.mock.calls.filter(call=>call[1]?.method==='POST')).toHaveLength(1);
});
it.each([
 {hostname:'example.com',existing:{id:'old-ipv6',type:'AAAA',name:'example.com',content:'2001:db8::1'},wanted:{...address,name:'example.com'}},
 {hostname,existing:{id:'old-ipv4',type:'A',name:hostname,content:'192.0.2.9'},wanted:{...address,type:'AAAA',value:'2001:db8::4'}},
])('keeps the other IP family from silently routing some visitors to an old site',async({hostname:target,existing,wanted})=>{
 const f=fixture([existing]),result=await f.connection.apply({hostname:target,connectionOptions:[wanted],verificationRecords:[]});expect(result.status).toBe('manual');expect(f.records).toEqual([existing]);expect(f.request.mock.calls.some(call=>call[1]?.method==='POST')).toBe(false);
});

it.each([{page:1,total_pages:1,count:0,total_count:1,per_page:100},{page:1,total_pages:1}])('refuses a provider list that declares missing records or cannot establish completeness',async result_info=>{
 const f=fixture();f.request.mockImplementation(async()=>Response.json({success:true,result:[],result_info}));const result=await f.connection.apply(plan);expect(result.status).toBe('manual');expect(f.request.mock.calls.some(call=>call[1]?.method==='POST')).toBe(false);
});
