import {expect,it,vi} from 'vitest';
import {createGoogleCloudDnsConnection,createAzureDnsConnection,createRoute53DnsConnection} from '../server/business-dns/cloud';
import {decodeDnsTxt,encodeDnsTxt,type DnsHttpRequest} from '../server/business-dns/http';
const uid='account-one',zoneName='example.com',hostname='studio.example.com';
const cname={type:'CNAME',name:hostname,value:'profile.receiz.com',purpose:'Connect'},txt={type:'TXT',name:'_verify.'+hostname,value:'exact native "quoted" token',purpose:'Verify'};
const plan={hostname,connectionOptions:[cname],verificationRecords:[txt]};
function google(){
 const rrsets:Record<string,unknown>[]=[];const request=vi.fn<DnsHttpRequest>(async(_url,init)=>{if(init.method==='POST'){const row=JSON.parse(init.body!);rrsets.push(row);return Response.json(row);}return Response.json({rrsets});});
 const adapter=createGoogleCloudDnsConnection({accountUid:uid,zoneName,canWrite:true,projectId:'project-one',managedZone:'zone-one',request,assertOpen(){}});return{adapter,request,rrsets};
}
function azure(){
 const rows:Record<string,unknown>[]=[];const request=vi.fn<DnsHttpRequest>(async(url,init)=>{if(init.method==='PUT'){const parts=new URL(url).pathname.split('/'),type=parts.at(-2)!,name=decodeURIComponent(parts.at(-1)!);const row={id:url.split('?')[0],type:'Microsoft.Network/dnsZones/'+type,name,...JSON.parse(init.body!)};rows.push(row);return Response.json(row,{status:201});}return Response.json({value:rows});});
 const adapter=createAzureDnsConnection({accountUid:uid,zoneName,canWrite:true,subscriptionId:'11111111-1111-4111-8111-111111111111',resourceGroup:'owner-group',request,assertOpen(){}});return{adapter,request,rows};
}
function aws(){
 const sets:Record<string,unknown>[]=[];const listResourceRecordSets=vi.fn(async(_input:Record<string,unknown>)=>({ResourceRecordSets:sets,IsTruncated:false}));const changeResourceRecordSets=vi.fn(async(input:Record<string,unknown>)=>{const batch=input.ChangeBatch as {Changes:{Action:string;ResourceRecordSet:Record<string,unknown>}[]};for(const change of batch.Changes){expect(change.Action).toBe('CREATE');sets.push(change.ResourceRecordSet);}return{ChangeInfo:{Id:'/change/change-'+sets.length,Status:'PENDING'}};});
 const adapter=createRoute53DnsConnection({accountUid:uid,zoneName,canWrite:true,hostedZoneId:'ZONE123',api:{listResourceRecordSets,changeResourceRecordSets},assertOpen(){}});return{adapter,listResourceRecordSets,changeResourceRecordSets,sets};
}
it('Google Cloud uses new rrset creation with FQDN and quoted TXT, never patch/deletion',async()=>{
 const f=google();expect((await f.adapter.apply(plan)).status).toBe('applied');const writes=f.request.mock.calls.filter(call=>call[1].method==='POST');expect(writes).toHaveLength(2);expect(writes.map(call=>JSON.parse(call[1].body!))).toEqual([{name:hostname+'.',type:'CNAME',ttl:300,rrdatas:[cname.value+'.']},{name:txt.name+'.',type:'TXT',ttl:300,rrdatas:[encodeDnsTxt(txt.value)]}]);expect(writes.every(call=>call[0]==='https://dns.googleapis.com/dns/v1/projects/project-one/managedZones/zone-one/rrsets')).toBe(true);
});
it('Azure uses If-None-Match and a single named record-set path without replacing existing records',async()=>{
 const f=azure();expect((await f.adapter.apply(plan)).status).toBe('applied');const writes=f.request.mock.calls.filter(call=>call[1].method==='PUT');expect(writes).toHaveLength(2);expect(writes.every(call=>call[1].headers?.['If-None-Match']==='*')).toBe(true);expect(JSON.parse(writes[0][1].body!)).toEqual({properties:{TTL:300,CNAMERecord:{cname:cname.value+'.'}}});expect(JSON.parse(writes[1][1].body!)).toEqual({properties:{TTL:300,TXTRecords:[{value:[txt.value]}]}});expect(writes[0][0]).toContain('/CNAME/studio?api-version=2018-05-01');
});
it('Route 53 uses exact SDK commands with CREATE only, native zone binding and actual current records',async()=>{
 const f=aws(),result=await f.adapter.apply(plan);expect(result.status).toBe('applied');expect(f.changeResourceRecordSets).toHaveBeenCalledTimes(2);expect(f.changeResourceRecordSets.mock.calls[0][0]).toMatchObject({HostedZoneId:'ZONE123',ChangeBatch:{Changes:[{Action:'CREATE',ResourceRecordSet:{Name:hostname+'.',Type:'CNAME',TTL:300,ResourceRecords:[{Value:cname.value+'.'}]}}]}});expect(f.listResourceRecordSets.mock.calls.every(call=>call[0].HostedZoneId==='ZONE123')).toBe(true);
});
it('cloud record-set APIs preserve an existing verification set rather than upserting over it',async()=>{
 const g=google();g.rrsets.push({name:txt.name+'.',type:'TXT',ttl:300,rrdatas:['"existing-verification"']});expect((await g.adapter.apply(plan)).status).toBe('manual');expect(g.request.mock.calls.every(call=>call[1].method==='GET')).toBe(true);
 const a=azure();a.rows.push({id:'existing',name:'_verify.studio',type:'Microsoft.Network/dnsZones/TXT',properties:{TXTRecords:[{value:['existing-verification']}],TTL:300}});expect((await a.adapter.apply(plan)).status).toBe('manual');expect(a.request.mock.calls.every(call=>call[1].method==='GET')).toBe(true);
});
it('cloud pagination cannot loop, leave the connected zone or silently truncate before writing',async()=>{
 const g=google();g.request.mockResolvedValue(Response.json({rrsets:[],nextPageToken:'repeat'}));expect((await g.adapter.apply(plan)).status).toBe('manual');expect(g.rrsets).toEqual([]);
 const a=azure();a.request.mockResolvedValueOnce(Response.json({value:[],nextLink:'https://evil.example/collect'}));expect((await a.adapter.apply(plan)).status).toBe('manual');expect(a.request).toHaveBeenCalledOnce();
 const r=aws();r.listResourceRecordSets.mockResolvedValue({ResourceRecordSets:[],IsTruncated:true} as never);expect((await r.adapter.apply(plan)).status).toBe('manual');expect(r.changeResourceRecordSets).not.toHaveBeenCalled();
});
it('Route 53 preserves weighted/alias routing and lost changes stay unknown without replay',async()=>{
 const special=aws();special.sets.push({Name:hostname+'.',Type:'A',AliasTarget:{DNSName:'another.example.net.',HostedZoneId:'OTHER',EvaluateTargetHealth:false}});expect((await special.adapter.apply(plan)).status).toBe('manual');expect(special.changeResourceRecordSets).not.toHaveBeenCalled();
 const lost=aws(),change=lost.changeResourceRecordSets.getMockImplementation()!;lost.changeResourceRecordSets.mockImplementationOnce(async input=>{await change(input);throw Error('reply lost');});expect((await lost.adapter.apply(plan)).status).toBe('unknown');expect(lost.changeResourceRecordSets).toHaveBeenCalledOnce();
});
it('DNS TXT presentation roundtrips quoted segments, escapes, UTF-8 and decimal octets exactly',()=>{
 for(const value of ['plain','a "quote" and \\ slash','é'.repeat(180),''])expect(decodeDnsTxt(encodeDnsTxt(value))).toBe(value);expect(decodeDnsTxt('"part-one" "part-two\\033"')).toBe('part-onepart-two!');for(const bad of ['unquoted','"unterminated','"bad\\999"'])expect(()=>decodeDnsTxt(bad)).toThrow();
});
it('Azure divides long TXT values into legal UTF-8 segments without losing the exact native value',async()=>{
 const f=azure(),long={...txt,value:'é'.repeat(180)};expect((await f.adapter.apply({...plan,verificationRecords:[long]})).status).toBe('applied');const write=f.request.mock.calls.find(call=>call[1].method==='PUT'&&call[0].includes('/TXT/'))!;const segments=JSON.parse(write[1].body!).properties.TXTRecords[0].value as string[];expect(segments.length).toBeGreaterThan(1);expect(segments.every(segment=>new TextEncoder().encode(segment).length<=255)).toBe(true);expect(segments.join('')).toBe(long.value);
});
it('cloud APIs inspect the later page before a conflicting website record can be overlooked',async()=>{
 const g=google();g.request.mockImplementation(async url=>Response.json(new URL(url).searchParams.has('pageToken')?{rrsets:[{name:hostname+'.',type:'AAAA',rrdatas:['2001:db8::1'] }]}:{rrsets:[],nextPageToken:'page-2'}));expect((await g.adapter.apply(plan)).status).toBe('manual');expect(g.request).toHaveBeenCalledTimes(2);
 const a=azure();a.request.mockImplementation(async url=>Response.json(new URL(url).searchParams.has('$skipToken')?{value:[{id:'ipv6',name:'studio',type:'Microsoft.Network/dnsZones/AAAA',properties:{AAAARecords:[{ipv6Address:'2001:db8::1'}]}}]}:{value:[],nextLink:'https://management.azure.com/subscriptions/11111111-1111-4111-8111-111111111111/resourceGroups/owner-group/providers/Microsoft.Network/dnsZones/example.com/all?api-version=2018-05-01&$skipToken=next'}));expect((await a.adapter.apply(plan)).status).toBe('manual');expect(a.request).toHaveBeenCalledTimes(2);
 const r=aws();r.listResourceRecordSets.mockImplementation(async args=>args.StartRecordName?{ResourceRecordSets:[{Name:hostname+'.',Type:'AAAA',ResourceRecords:[{Value:'2001:db8::1'}]}],IsTruncated:false}:{ResourceRecordSets:[],IsTruncated:true,NextRecordName:hostname+'.',NextRecordType:'AAAA'} as never);expect((await r.adapter.apply(plan)).status).toBe('manual');expect(r.listResourceRecordSets).toHaveBeenCalledTimes(2);expect(r.listResourceRecordSets.mock.calls[1][0]).toMatchObject({StartRecordName:hostname+'.',StartRecordType:'AAAA'});
});
