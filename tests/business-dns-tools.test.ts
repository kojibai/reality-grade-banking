import {expect,it,vi} from 'vitest';
import {createBusinessDnsTools,type BusinessDnsConnection} from '../src/receiz/business-dns-tools';
const uid='account-one',hostname='studio.example.com';
const cname={type:'CNAME',name:hostname,value:'profile.receiz.com',purpose:'Use CNAME where supported.'};
const address={type:'A',name:hostname,value:'192.0.2.4',purpose:'Use instead of CNAME.'};
const txt={type:'TXT',name:'_verify.'+hostname,value:'exact-native-verification',purpose:'Verify ownership.'};
function fixture(){
 let open=true;
 const execute=vi.fn(async(tool:string)=>({accountUid:uid,tool,outcome:'accepted',data:{domain:{hostname},setup:{phase:'pending_dns',verified:false,attached:true,misconfigured:true,liveUrl:'https://'+hostname,summary:'Waiting for DNS',warning:'Native route delivery still needs checking.',recommendedRecords:[cname,address],verificationRecords:[txt]}}}));
 const connection=vi.fn(async(_hostname:string):Promise<BusinessDnsConnection|null>=>null);
 const tools=createBusinessDnsTools({accountUid:uid,execute:execute as never,connection,assertOpen(){if(!open)throw Error('Identity disposed');}});
 return{tools,execute,connection,dispose(){open=false;}};
}
it('returns exact copyable native records and explains alternatives for any provider without requesting permission',async()=>{
 const f=fixture(),result=await f.tools.instructions('My registrar');expect(result.status).toBe('manual');expect(result.connectionOptions).toEqual([cname,address]);expect(result.verificationRecords).toEqual([txt]);expect(result.steps.join(' ')).toMatch(/one connection option/i);expect(result.steps.join(' ')).toMatch(/email|MX/);expect(result.warning).toContain('route delivery');expect(f.connection).not.toHaveBeenCalled();
});
it('uses manual instructions when access is declined, unsupported or read-only',async()=>{
 for(const mode of ['manual','automatic'] as const){const f=fixture();expect((await f.tools.configure(mode)).status).toBe('manual');expect(f.connection).toHaveBeenCalledTimes(mode==='manual'?0:1);}
 const f=fixture(),apply=vi.fn();f.connection.mockResolvedValueOnce({accountUid:uid,provider:'Provider',canWrite:false,apply} as never);expect((await f.tools.configure('automatic')).status).toBe('manual');expect(apply).not.toHaveBeenCalled();
});
it('passes only actual native records to an owner-bound connection and verifies after a confirmed provider change',async()=>{
 const f=fixture(),apply=vi.fn(async()=>({status:'applied' as const,records:[{...cname,reference:'provider-record-1'}]}));f.connection.mockResolvedValueOnce({accountUid:uid,provider:'Provider',canWrite:true,apply});const result=await f.tools.configure('automatic');expect(apply).toHaveBeenCalledExactlyOnceWith({hostname,connectionOptions:[cname,address],verificationRecords:[txt]});expect(f.execute.mock.calls.map(c=>c[0])).toEqual(['business_inspect_domain','business_check_domain']);expect(result.status).toBe('waiting');expect(result.warning).toContain('route delivery');expect(result.providerResult?.status).toBe('applied');
});
it('preserves provider conflicts and unknown partial writes without verification, retry or false live status',async()=>{
 for(const status of ['manual','unknown'] as const){const f=fixture(),apply=vi.fn(async()=>({status,records:[],reason:'Existing website record needs an owner decision.'}));f.connection.mockResolvedValueOnce({accountUid:uid,provider:'Provider',canWrite:true,apply});const result=await f.tools.configure('automatic');expect(result.status).toBe(status);expect(result.providerResult?.reason).toContain('owner decision');expect(apply).toHaveBeenCalledOnce();expect(f.execute).toHaveBeenCalledOnce();}
 const f=fixture(),apply=vi.fn(async()=>{throw Error('lost reply');});f.connection.mockResolvedValueOnce({accountUid:uid,provider:'Provider',canWrite:true,apply});expect((await f.tools.configure('automatic')).status).toBe('unknown');expect(apply).toHaveBeenCalledOnce();
});
it('rejects foreign owners, discards disposed completions, and never calls a connector for malformed native records',async()=>{
 const f=fixture(),apply=vi.fn();f.connection.mockResolvedValueOnce({accountUid:'another',provider:'Provider',canWrite:true,apply} as never);await expect(f.tools.configure('automatic')).rejects.toThrow('BUSINESS_DNS_OWNER_MISMATCH');expect(apply).not.toHaveBeenCalled();
 const malformed=fixture();malformed.execute.mockResolvedValueOnce({accountUid:uid,tool:'business_inspect_domain',outcome:'accepted',data:{domain:{hostname},setup:{recommendedRecords:[{...cname,name:'elsewhere.test'}],verificationRecords:[]}}} as never);await expect(malformed.tools.configure('automatic')).rejects.toThrow('BUSINESS_DNS_NATIVE_RESULT_INVALID');expect(malformed.connection).not.toHaveBeenCalled();
 const disposed=fixture();disposed.connection.mockImplementationOnce(async()=>{disposed.dispose();return null;});await expect(disposed.tools.configure('automatic')).rejects.toThrow('Identity disposed');
});
it('keeps verified-with-warning distinct from a clear live result and notices a concurrently changed saved hostname',async()=>{
 const f=fixture();f.execute.mockResolvedValueOnce({accountUid:uid,tool:'business_check_domain',outcome:'accepted',data:{domain:{hostname},setup:{phase:'live',verified:true,attached:true,misconfigured:false,liveUrl:'https://'+hostname,warning:'Profile delivery not confirmed.',recommendedRecords:[],verificationRecords:[]}}} as never);expect((await f.tools.check()).status).toBe('attention');
 const changed=fixture();changed.connection.mockResolvedValueOnce({accountUid:uid,provider:'Provider',canWrite:true,apply:async()=>({status:'applied',records:[]})});changed.execute.mockResolvedValueOnce(await fixture().execute('business_inspect_domain')).mockResolvedValueOnce({accountUid:uid,tool:'business_check_domain',outcome:'accepted',data:{domain:{hostname:'new.example.com'},setup:{phase:'live',verified:true,attached:true,misconfigured:false,recommendedRecords:[],verificationRecords:[]}}} as never);const result=await changed.tools.configure('automatic');expect(result.status).toBe('domain_changed');expect(result.hostname).toBe('studio.example.com');expect(result.summary).toContain('new.example.com');expect(result.providerResult?.status).toBe('applied');
});

it('refuses a pending DNS operation after its approved hostname changes before Connect returns',async()=>{
 const connection=vi.fn(),tools=createBusinessDnsTools({accountUid:uid,expectedHostname:'first.example.com',assertOpen(){},execute:async()=>({accountUid:uid,tool:'business_inspect_domain',outcome:'accepted',data:{domain:{hostname:'second.example.com'},setup:{phase:'pending_dns',verified:false,attached:true,misconfigured:true,recommendedRecords:[{type:'CNAME',name:'second.example.com',value:'target.example.net',purpose:'Connect'}],verificationRecords:[]}}}),connection});const result=await tools.configure('automatic');expect(result.status).toBe('domain_changed');expect(connection).not.toHaveBeenCalled();
});
