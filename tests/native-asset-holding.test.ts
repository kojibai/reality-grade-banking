import {expect,it} from 'vitest';
import {selectNativeAssetHoldings,openNativeAssetHolding} from '../src/receiz/native-asset-holding';
import type {HeldDeposit} from '../src/receiz/deposit-source';
const held=(digest:string,issuedAtKaiUPulse:string,quantityMicro='1',status:'active'|'redeemed'='active'):HeldDeposit=>({digest,executionDigest:digest,filename:'native-asset-holding.receizbundle',title:'Units',kind:'proof',status:'held-proof',bytes:new Uint8Array([1]),pulse:'1',nativeAsset:{assetId:'asset-one',quantityMicro,lockedQuantityMicro:'0',supplyMicro:'1',symbol:'UNIT',backingRail:'reserve',backingUsdCents:'100',backingPhiMicro:'1000',status,sourceKaiUPulse:issuedAtKaiUPulse,issuedAtKaiUPulse}});
it('keeps the latest verified position per asset and hides accepted zero-quantity successors',()=>{
 const old=held('a','1'),partial=held('b','2');expect(selectNativeAssetHoldings([old,partial])).toEqual([partial]);
 expect(selectNativeAssetHoldings([old,partial,held('c','3','0')])).toEqual([]);
 expect(selectNativeAssetHoldings([old,held('d','4','0','redeemed')])).toEqual([]);
 expect(()=>selectNativeAssetHoldings([old,held('b','1')])).toThrow(/CONFLICT/);
});
it('does not accept unsealed position metadata as a held native asset',async()=>{
 await expect(openNativeAssetHolding(new TextEncoder().encode(JSON.stringify({schema:'receiz.bank.native-asset-holding.v1',verified:true,quantityMicro:'1000000'})),'holding.receizbundle',{artifactOwnerReceizId:'owner.receiz.id',keyId:'a'.repeat(64)})).rejects.toThrow();
});

it('does not let a later-issued certificate for an older accepted source replace a newer position',()=>{const current=held('b','2');const delayed=held('a','3');delayed.nativeAsset!.sourceKaiUPulse='1';expect(selectNativeAssetHoldings([current,delayed])).toEqual([current]);});
