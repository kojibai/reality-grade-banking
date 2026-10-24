import {expect,it,vi} from 'vitest';
import {inspectVaultDisclosure} from '../src/receiz/vault/disclose';

it('derives the public owner and holdings from admitted native witnesses with no account or financial request',async()=>{
 const native={verifyVaultPublicRecord:vi.fn(async()=>({record:{vaultId:'id',name:'My reserve',kaiUPulse:'100000000',holdings:[{kind:'money'},{kind:'asset'},{kind:'investment'}]},recordSha256:'a'.repeat(64),custody:{ownerReceizId:'owner.receiz.id'},witnesses:[{notes:[{noteId:'note',rail:'reserve',amountUsdCents:'200',amountPhiMicro:'1000',sourceSha256:'b'.repeat(64)}],nativeMoney:null,kaiUPulse:'90000000'},{asset:{id:'asset',quantityMicro:'1000000',headSourceSha256:'c'.repeat(64),definition:{name:'Original'}},issuedAtKaiUPulse:'90000000'},{lotId:'lot',sourceHeadSha256:'d'.repeat(64),recordedAtKaiUPulse:'90000000',holdings:[{positionId:'position',title:'An investment',quantityMicro:'500000'}]}],grantsAccess:false as const,currentUnspentness:false as const}))};
 const result=await inspectVaultDisclosure({},'a'.repeat(64),{native:async()=>native as never});
 expect(result.ownerReceizId).toBe('owner.receiz.id');expect(result.holdings.map(v=>v.kind)).toEqual(['money','asset','investment']);
 expect(result.holdings).toMatchObject([{id:'note',amountUsdCents:'200'},{id:'asset',title:'Original'},{id:'lot:position',quantityMicro:'500000'}]);
 expect(result.grantsAccess).toBe(false);expect(result.currentUnspentness).toBe(false);expect(native.verifyVaultPublicRecord).toHaveBeenCalledOnce();
 await expect(inspectVaultDisclosure({},'e'.repeat(64),{native:async()=>native as never})).rejects.toThrow('LOCATOR_MISMATCH');
});
