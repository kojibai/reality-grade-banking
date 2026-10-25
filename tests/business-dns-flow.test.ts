import {expect,it,vi} from 'vitest';
import {createDnsConnectionSetup,type ConnectedDnsProvider} from '../server/business-dns-providers';
import {createBusinessDnsSetupFlow} from '../server/business-dns/flow';
import type {BusinessSetupResult,BusinessToolName} from '../src/receiz/business-setup';
const uid='account-one',hostname='studio.example.com',zoneName='example.com';
const cname={type:'CNAME',name:hostname,value:'profile.receiz.com',purpose:'Connect'},txt={type:'TXT',name:'_verify.'+hostname,value:'native-token',purpose:'Verify'};
function fixture(){
 let config:ConnectedDnsProvider|null=null,currentHostname=hostname;const rows:{id:string;type:string;name:string;content:string}[]=[];
 const request=vi.fn(async(_url:string,init:{method:string;body?:string})=>{if(init.method==='POST'){const value=JSON.parse(init.body!);rows.push({id:String(rows.length+1),type:value.type,name:value.name+'.'+zoneName,content:value.content});return Response.json({status:'SUCCESS',id:String(rows.length)});}return Response.json({status:'SUCCESS',cloudflare:'disabled',records:rows});});
 const lookup=vi.fn(async()=>config),authorize=vi.fn(async()=>({accountUid:uid,provider:'porkbun',hostname,url:'https://provider-connect.test/authorize'}));
 const connections=createDnsConnectionSetup({accountUid:uid,hostname,authorizationOrigins:['https://provider-connect.test'],lookup,authorize,assertOpen(){}});
 const execute=vi.fn(async(tool:BusinessToolName):Promise<BusinessSetupResult>=>({accountUid:uid,tool,outcome:'accepted',data:{domain:{hostname:currentHostname},setup:{phase:'pending_dns',attached:true,verified:false,misconfigured:true,liveUrl:'https://'+currentHostname,summary:'Waiting for DNS propagation',warning:null,recommendedRecords:[{...cname,name:currentHostname}],verificationRecords:[txt]}}}));
 const flow=createBusinessDnsSetupFlow({accountUid:uid,hostname,provider:'porkbun',connections,execute,assertOpen(){}});
 return{flow,request,rows,authorize,execute,connect(){config={accountUid:uid,provider:'porkbun',zoneName,canWrite:true,request,assertOpen(){}};},changeDomain(){currentHostname='new.example.com';}};
}
it('first returns one Connect action, then automatically performs DNS and native verification after actual authorization',async()=>{
 const f=fixture(),start=await f.flow.start('automatic');expect(start).toMatchObject({status:'connect',action:{label:'Connect Porkbun',href:'https://provider-connect.test/authorize'}});expect(f.rows).toEqual([]);expect((await f.flow.resume()).status).toBe('awaiting-connection');expect(f.rows).toEqual([]);
 f.connect();const result=await f.flow.resume();expect(result.status).toBe('waiting');expect(f.rows).toHaveLength(2);expect(f.execute.mock.calls.some(call=>call[0]==='business_check_domain')).toBe(true);expect(f.authorize).toHaveBeenCalledOnce();
});
it('an existing writable connection performs setup without a Connect action or another approval prompt',async()=>{
 const f=fixture();f.connect();expect((await f.flow.start('automatic')).status).toBe('waiting');expect(f.authorize).not.toHaveBeenCalled();expect(f.rows).toHaveLength(2);
});
it('only explicit manual choice or decline returns instructions instead of attempting a provider write',async()=>{
 const f=fixture();expect(await f.flow.start('manual')).toMatchObject({status:'manual',connectionOptions:[cname],verificationRecords:[txt]});expect(f.authorize).not.toHaveBeenCalled();expect(f.request).not.toHaveBeenCalled();
 const declined=fixture();await declined.flow.start('automatic');expect((await declined.flow.resume({declined:true})).status).toBe('manual');expect(declined.request).not.toHaveBeenCalled();
});
it('a changed saved hostname cannot acquire the authority of an earlier Connect action',async()=>{
 const f=fixture();await f.flow.start('automatic');f.connect();f.changeDomain();expect((await f.flow.resume()).status).toBe('domain_changed');expect(f.request).not.toHaveBeenCalled();
});
it('repeated authorization callbacks reuse the retained result rather than replaying DNS setup',async()=>{
 const f=fixture();await f.flow.start('automatic');f.connect();const first=await f.flow.resume();expect(first.status).toBe('waiting');const requests=f.request.mock.calls.length;expect(await f.flow.resume()).toEqual(first);expect(f.request.mock.calls.length).toBe(requests);
});
it('a retained unknown result stays visible when later callbacks lose or decline the provider connection',async()=>{
 const f=fixture();f.connect();const request=f.request.getMockImplementation()!;f.request.mockImplementation(async(url,init)=>{if(init.method==='POST'){await request(url,init);throw Error('lost write reply');}return request(url,init);});expect((await f.flow.start('automatic')).status).toBe('unknown');const prior=f.request.mock.calls.length;expect((await f.flow.resume({declined:true})).status).toBe('unknown');expect(f.request.mock.calls.length).toBe(prior);
});
