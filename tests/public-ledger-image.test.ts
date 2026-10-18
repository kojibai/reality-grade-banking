import {it,expect} from 'vitest';
import {publicLedgerCrystalArtwork,publicLedgerProofUrl} from '../src/receiz/public-ledger-crystal-image';
import {embedPublicLedgerPng,readPublicLedgerPng} from '../src/receiz/public-ledger-png';
it('never produces a claimed verified Crystal from printed rows, a JSON clone or a fake custody handle',()=>{
 expect(()=>publicLedgerCrystalArtwork({snapshot:{records:Array(600).fill({})}} as never)).toThrow(/CUSTODY/);
 expect(()=>publicLedgerProofUrl('https://evil.test')).toThrow();
 expect(()=>embedPublicLedgerPng(new Uint8Array([1,2,3]),new Uint8Array([4]))).toThrow(/INVALID/);
 expect(()=>readPublicLedgerPng(new Uint8Array([1,2,3]))).toThrow(/INVALID/);
});
