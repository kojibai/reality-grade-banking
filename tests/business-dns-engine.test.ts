import {expect,it,vi} from 'vitest';
import {createDnsProviderConnection,type DnsExistingRecord} from '../server/business-dns/engine';
const hostname='studio.example.com',uid='account-one';
const cname={type:'CNAME',name:hostname,value:'profile.receiz.com',purpose:'Connect profile'};
const address={type:'A',name:hostname,value:'192.0.2.4',purpose:'Alternative'};
const txt={type:'TXT',name:'_verify.'+hostname,value:'native-token',purpose:'Verify ownership'};
const plan={hostname,connectionOptions:[cname,address],verificationRecords:[txt]};
function fixture(initial:DnsExistingRecord[]=[],options:{canWrite?:boolean;recordSets?:boolean}={}){
 let open=true;const records=[...initial],list=vi.fn(async()=>structuredClone(records));
 const create=vi.fn(async(row:typeof cname)=>{const reference='provider-'+(records.length+1);records.push({...row,reference});return{reference};});
 const connection=createDnsProviderConnection({accountUid:uid,zoneName:'example.com',canWrite:options.canWrite!==false,assertOpen(){if(!open)throw Error('Identity disposed');},driver:{provider:'Provider',recordSets:options.recordSets,list,create}});
 return{connection,records,list,create,dispose(){open=false;}};
}
it('does nothing at construction, creates only native required records and confirms actual readback',async()=>{
 const f=fixture();expect(f.list).not.toHaveBeenCalled();const result=await f.connection.apply(plan);expect(result.status).toBe('applied');expect(f.create.mock.calls.map(call=>call[0])).toEqual([cname,txt]);expect(result.records.map(row=>row.reference)).toEqual(['provider-1','provider-2']);
});
it('reuses an exact existing A alternative instead of forcing CNAME or replacing unrelated email records',async()=>{
 const existing=[{...address,reference:'existing-address'},{type:'MX',name:'example.com',value:'mail.example.com',reference:'mail'}];const f=fixture(existing);const result=await f.connection.apply(plan);expect(result.status).toBe('applied');expect(f.create.mock.calls.map(call=>call[0])).toEqual([txt]);expect(f.records.slice(0,2)).toEqual(existing);
});
it.each(['AAAA','ALIAS','ANAME','NS'])('stops before writes when %s would route or delegate the hostname elsewhere',async type=>{
 const f=fixture([{type,name:hostname,value:type==='AAAA'?'2001:db8::1':'other.example.com'}]);expect((await f.connection.apply(plan)).status).toBe('manual');expect(f.create).not.toHaveBeenCalled();
});
it('allows native apex A alongside existing apex SOA/NS/email without modifying those records',async()=>{
 const rows=[{type:'NS',name:'example.com',value:'ns.example.net'},{type:'SOA',name:'example.com',value:'native authority'},{type:'MX',name:'example.com',value:'mail.example.com'}],f=fixture(rows);const result=await f.connection.apply({hostname:'example.com',connectionOptions:[{...cname,name:'example.com'},{...address,name:'example.com'}],verificationRecords:[]});expect(result.status).toBe('applied');expect(f.create.mock.calls[0][0].type).toBe('A');expect(f.records.slice(0,3)).toEqual(rows);
});
it('rejects outside-zone/malformed plans and read-only grants without any provider calls',async()=>{
 for(const input of [{...plan,hostname:'elsewhere.test'}, {...plan,verificationRecords:[{...txt,name:'_verify.evil.test'}]}, {...plan,connectionOptions:[{...address,value:'not-an-ip'}]}]){const f=fixture();expect((await f.connection.apply(input)).status).toBe('manual');expect(f.list).not.toHaveBeenCalled();}
 const f=fixture([],{canWrite:false});expect((await f.connection.apply(plan)).status).toBe('manual');expect(f.list).not.toHaveBeenCalled();
});
it('keeps an uncertain or malformed write unknown, retains confirmed references and never retries',async()=>{
 const f=fixture();f.create.mockImplementationOnce(async row=>{f.records.push(row);throw Error('lost acknowledgement');});expect((await f.connection.apply(plan)).status).toBe('unknown');expect(f.create).toHaveBeenCalledOnce();
 const partial=fixture();partial.create.mockImplementationOnce(async row=>{partial.records.push({...row,reference:'first'});return{reference:'first'};}).mockRejectedValueOnce(Error('second reply lost'));const result=await partial.connection.apply(plan);expect(result.status).toBe('unknown');expect(result.records).toEqual([{...cname,reference:'first'}]);expect(partial.create).toHaveBeenCalledTimes(2);
});
it('does not call a provider result accepted without exact readback or after disposal',async()=>{
 const f=fixture();f.create.mockResolvedValueOnce({reference:'wrong'});expect((await f.connection.apply(plan)).status).toBe('unknown');expect(f.create).toHaveBeenCalledOnce();
 const disposed=fixture();disposed.list.mockImplementationOnce(async()=>{disposed.dispose();return[];});await expect(disposed.connection.apply(plan)).rejects.toThrow('Identity disposed');expect(disposed.create).not.toHaveBeenCalled();
});
it('detects conflicts introduced between inspection and write and refuses replacing an existing record set',async()=>{
 const f=fixture();f.list.mockResolvedValueOnce([]).mockResolvedValueOnce([{type:'AAAA',name:hostname,value:'2001:db8::1'}]);expect((await f.connection.apply(plan)).status).toBe('manual');expect(f.create).not.toHaveBeenCalled();
 const set=fixture([{...txt,value:'keep-existing-verification'}],{recordSets:true});expect((await set.connection.apply(plan)).status).toBe('manual');expect(set.create).not.toHaveBeenCalled();
});
it('detects delegated ancestors rather than creating ineffective records in the parent zone',async()=>{
 const f=fixture([{type:'NS',name:'sub.example.com',value:'ns.other.example.net'}]);expect((await f.connection.apply({hostname:'studio.sub.example.com',connectionOptions:[{...cname,name:'studio.sub.example.com'}],verificationRecords:[]})).status).toBe('manual');expect(f.create).not.toHaveBeenCalled();
});
it('reuses an existing required TXT value within a multi-value set without replacing other values',async()=>{
 const f=fixture([{...txt,reference:'required-txt'},{...txt,value:'unrelated-verification',reference:'keep-txt'}],{recordSets:true});expect((await f.connection.apply(plan)).status).toBe('applied');expect(f.create.mock.calls.map(call=>call[0])).toEqual([cname]);expect(f.records.some(row=>row.value==='unrelated-verification')).toBe(true);
});
