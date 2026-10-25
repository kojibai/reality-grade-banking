import {expect,it,vi} from 'vitest';
import {createNamecheapDnsConnection,type NamecheapHostRecord} from '../server/business-dns/namecheap';
const zoneName='example.co.uk',hostname='studio.example.co.uk';
const cname={type:'CNAME',name:hostname,value:'profile.receiz.com',purpose:'Connect'},txt={type:'TXT',name:'_verify.'+hostname,value:'native-token',purpose:'Verify'};
const plan={hostname,connectionOptions:[cname],verificationRecords:[txt]};
function fixture(){
 let records:NamecheapHostRecord[]=[{HostId:'1',Name:'@',Type:'MX',Address:'mail.example.net',MXPref:'10',TTL:'1800'},{HostId:'2',Name:'@',Type:'TXT',Address:'v=spf1 include:example.net ~all',MXPref:'0',TTL:'600'},{HostId:'3',Name:'other',Type:'A',Address:'192.0.2.1',MXPref:'0',TTL:'3600'}];
 const getHosts=vi.fn(async(_args:Record<string,string>)=>({Domain:zoneName,IsUsingOurDNS:true,EmailType:'MX',Hosts:structuredClone(records)}));
 const setHosts=vi.fn(async(args:Record<string,string>)=>{expect(args.EmailType).toBe('MX');const next:NamecheapHostRecord[]=[];for(let i=1;args['HostName'+i]!==undefined;i++)next.push({HostId:String(i),Name:args['HostName'+i],Type:args['RecordType'+i],Address:args['Address'+i],MXPref:args['MXPref'+i],TTL:args['TTL'+i]});records=next;return{Domain:zoneName,IsSuccess:true};});
 const adapter=createNamecheapDnsConnection({accountUid:'account-one',zoneName,canWrite:true,allowFullZoneSave:true,sld:'example',tld:'co.uk',api:{getHosts,setHosts},assertOpen(){}});
 return{adapter,getHosts,setHosts,records:()=>records};
}
it('Namecheap saves all existing host records, email mode, TTL and MX preferences alongside exact native additions',async()=>{
 const f=fixture(),before=structuredClone(f.records());expect((await f.adapter.apply(plan)).status).toBe('applied');expect(f.setHosts).toHaveBeenCalledTimes(2);expect(f.records().slice(0,3)).toEqual(before);const saved=f.setHosts.mock.calls.at(-1)![0];expect(saved).toMatchObject({SLD:'example',TLD:'co.uk',EmailType:'MX',HostName1:'@',RecordType1:'MX',Address1:'mail.example.net',MXPref1:'10',TTL1:'1800',HostName4:'studio',RecordType4:'CNAME',Address4:cname.value,HostName5:'_verify.studio',RecordType5:'TXT',Address5:txt.value});expect(JSON.stringify(saved)).not.toMatch(/apikey|secret|password|username/i);
});
it('Namecheap requires actual permission covering its full-zone save, not just a connected account',async()=>{
 const f=fixture(),adapter=createNamecheapDnsConnection({accountUid:'account-one',zoneName,canWrite:true,allowFullZoneSave:false,sld:'example',tld:'co.uk',api:{getHosts:f.getHosts,setHosts:f.setHosts},assertOpen(){}});expect((await adapter.apply(plan)).status).toBe('manual');expect(f.getHosts).not.toHaveBeenCalled();expect(f.setHosts).not.toHaveBeenCalled();
});
it('Namecheap refuses incomplete email state, foreign nameservers and unknown record attributes before saving',async()=>{
 for(const overrides of [{EmailType:undefined},{IsUsingOurDNS:false},{Domain:'foreign.example'},{Hosts:[{HostId:'x',Name:'keep',Type:'A',Address:'192.0.2.9',TTL:'1800',MXPref:'0',UnknownAuthority:'do not discard'}]}]){
  const f=fixture(),get=f.getHosts.getMockImplementation()!;f.getHosts.mockImplementation(async args=>({...await get(args),...overrides}) as never);expect((await f.adapter.apply(plan)).status).toBe('manual');expect(f.setHosts).not.toHaveBeenCalled();
 }
});
it('Namecheap detects changed snapshots and never overwrites a change observed just before saving',async()=>{
 const f=fixture(),get=f.getHosts.getMockImplementation()!;let reads=0;f.getHosts.mockImplementation(async args=>{const result=await get(args);if(++reads===3)result.Hosts[0].Address='new-mail.example.net';return result;});expect((await f.adapter.apply(plan)).status).toBe('unknown');expect(f.setHosts).not.toHaveBeenCalled();
});
it('Namecheap keeps missing/lost acknowledgements and damaged readback unknown without replay or rollback',async()=>{
 const f=fixture(),save=f.setHosts.getMockImplementation()!;f.setHosts.mockImplementationOnce(async args=>{await save(args);throw Error('reply lost');});expect((await f.adapter.apply(plan)).status).toBe('unknown');expect(f.setHosts).toHaveBeenCalledOnce();
 const missing=fixture();missing.setHosts.mockResolvedValueOnce(null as never);expect((await missing.adapter.apply(plan)).status).toBe('unknown');expect(missing.setHosts).toHaveBeenCalledOnce();
 const damaged=fixture(),get=damaged.getHosts.getMockImplementation()!;damaged.getHosts.mockImplementation(async args=>{const result=await get(args);if(damaged.setHosts.mock.calls.length)result.Hosts=result.Hosts.slice(1);return result;});expect((await damaged.adapter.apply(plan)).status).toBe('unknown');expect(damaged.setHosts).toHaveBeenCalledOnce();
});
it('Namecheap serializes separate adapters for the same zone so both natural requests finish without losing records',async()=>{
 const f=fixture(),get=f.getHosts.getMockImplementation()!;let resume!:()=>void;const waiting=new Promise<void>(resolve=>{resume=resolve;});f.getHosts.mockImplementationOnce(async args=>{await waiting;return get(args);});
 const other=createNamecheapDnsConnection({accountUid:'account-one',zoneName,canWrite:true,allowFullZoneSave:true,sld:'example',tld:'co.uk',api:{getHosts:f.getHosts,setHosts:f.setHosts},assertOpen(){}});
 const first=f.adapter.apply(plan),target='second.example.co.uk',second=other.apply({hostname:target,connectionOptions:[{...cname,name:target}],verificationRecords:[]});resume();const result=await Promise.all([first,second]);expect(result.map(row=>row.status)).toEqual(['applied','applied']);expect(f.records().some(row=>row.Name==='studio')).toBe(true);expect(f.records().some(row=>row.Name==='second')).toBe(true);expect(f.getHosts.mock.calls.every(call=>call[0].SLD==='example'&&call[0].TLD==='co.uk')).toBe(true);
});
