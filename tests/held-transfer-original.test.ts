import {afterEach,expect,it,vi} from 'vitest';
import original from './fixtures/retained-transfer-original.json';
import {createHeldTransferOriginalReader} from '../src/receiz/held-transfer-original';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
export const record=()=>parsePublicNetworkPage('wallet',{ok:true,events:[{id:original.transfer.id,kind:'chat_transfer',amountUsdCents:'1000',transferId:original.transfer.id}]}).records[0];
function fixture(){
 let open=true,uid=original.transfer.senderUserId,saved:unknown=null,send:unknown={schema:'bank.wallet-sends.v1',current:{status:'recorded',record:structuredClone(original)},history:[]};
 const file=new File(['export-test-port'],'retained.receized.json'),ports={assertOpen(){if(!open)throw Error('CLOSED');},accountUid:()=>uid,readSends:vi.fn(async()=>send),readSaved:vi.fn(async()=>saved),save:vi.fn(async(_id:string,value:unknown)=>{saved=value;}),readMissing:vi.fn(async()=>structuredClone(original)),readOriginal:vi.fn(async()=>file)};
 return{ports,reader:createHeldTransferOriginalReader(ports),file,close(){open=false;},owner(value:string){uid=value;},missing(){send=null;},reopen:()=>createHeldTransferOriginalReader(ports)};
}
afterEach(()=>vi.restoreAllMocks());
it('reuses the retained transfer source lazily for repeat downloads without a source call',async()=>{
 const f=fixture();expect(f.ports.readSends).not.toHaveBeenCalled();const r=record();expect(r.sourceId).toBe(original.transfer.id);
 const [a,b]=await Promise.all([f.reader(r),f.reader(r)]);expect(a).toBe(f.file);expect(b).toBe(a);expect(f.ports.readSends).toHaveBeenCalledOnce();expect(f.ports.readMissing).not.toHaveBeenCalled();expect(f.ports.save).not.toHaveBeenCalled();expect(f.ports.readOriginal).toHaveBeenCalledOnce();
 expect(JSON.parse(new TextDecoder().decode((f.ports.readOriginal.mock.calls[0] as any)[0].bytes))).toEqual(original);
 f.close();await expect(f.reader(r)).rejects.toThrow('CLOSED');
});
it('reads a genuinely missing source once, retains it privately, and reopens without a source call',async()=>{
 const f=fixture();f.missing();f.owner(original.transfer.recipientUserId);await f.reader(record());expect(f.ports.readMissing).toHaveBeenCalledOnce();expect(f.ports.save).toHaveBeenCalledOnce();await f.reopen()(record());expect(f.ports.readMissing).toHaveBeenCalledOnce();
});
it('refuses another participant, a changed selected amount and a native-digest downgrade',async()=>{
 const f=fixture();f.owner('10000000-0000-4000-8000-000000000003');await expect(f.reader(record())).rejects.toThrow('ACCOUNT_MISMATCH');expect(f.ports.readOriginal).not.toHaveBeenCalled();
 const g=fixture();await g.reader(record());await expect(g.reader({...record(),amountUsdCents:'1001'})).rejects.toThrow('SELECTED_RECORD_SOURCE_MISMATCH');
 expect(await g.reader({...record(),evidence:{artifactDigest:'a'.repeat(64)}})).toBeNull();
});
it('does not export a source arriving after the identity closes',async()=>{
 const f=fixture();let finish!:(value:unknown)=>void;f.ports.readSends.mockImplementationOnce(()=>new Promise(resolve=>finish=resolve));const pending=f.reader(record());f.close();finish(null);await expect(pending).rejects.toThrow('CLOSED');expect(f.ports.readOriginal).not.toHaveBeenCalled();
});

it('refuses a missing retained artifact without manufacturing a seal from the Original projection',async()=>{
 const f=fixture();f.ports.readOriginal.mockResolvedValueOnce(null as never);
 await expect(f.reader(record())).rejects.toThrow('ORIGINAL_NOT_SUPPLIED');expect(f.ports.readOriginal).toHaveBeenCalledOnce();
});
