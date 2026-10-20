import {afterEach,expect,it,vi} from 'vitest';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import {receiptLink,readReceiptLink} from '../src/receiz/ledger-receipts';
import {encodeReceiptPacket,decodeReceiptPacket} from '../src/receiz/receipt-packet';
import {deflateSync} from 'fflate';
const row=()=>parsePublicNetworkPage('wallet',{ok:true,events:[{id:'transfer-123',kind:'chat_transfer',summary:'Alex paid Sam',pulse:14692714,kaiUpulse:'14692714000000',createdAt:'2026-10-19T20:00:00Z',amountUsdCents:'12500',amountPhiMicro:'5000000',sender:{displayName:'Alex'},recipient:{displayName:'Sam'},entryHash:'a'.repeat(64),privateKey:'DO_NOT_SHARE'}]}).records[0];
afterEach(()=>vi.unstubAllGlobals());
async function compact(){const mod=await import('../src/receiz/receipt-sharing').catch(()=>null);expect(typeof mod?.compactReceiptLink).toBe('function');return mod!;}
it('losslessly shortens the current shareable receipt without fetching, storing or broadening its disclosure',async()=>{
 const {compactReceiptLink}=await compact(),legacy=receiptLink(row())!,fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 const link=compactReceiptLink(legacy);expect(link.length).toBeLessThan(legacy.length*.7);expect(link.length).toBeLessThan(1000);expect(new URL(link).hash).toBe('');expect(new URL(link).searchParams.has('r')).toBe(true);expect(readReceiptLink(link)).toEqual(readReceiptLink(legacy));expect(JSON.stringify(readReceiptLink(link))).not.toContain('DO_NOT_SHARE');expect(compactReceiptLink(link)).toBe(link);expect(fetch).not.toHaveBeenCalled();
});
it('round-trips Unicode, exact large amounts, original source links and all existing technical fields',async()=>{
 const {compactReceiptLink}=await compact();
 const record=row();record.title='Mémoire · 日本語 · Φ';record.amountUsdCents='999999999999999999999999999999';record.sourceUrl='https://receiz.com/t/20261019_1200/ABCDEF123456/123';
 const original=receiptLink(record)!;
 expect(readReceiptLink(compactReceiptLink(original))).toEqual(readReceiptLink(original));
});
it('rejects ambiguous query packets, corrupt data and decompression lengths outside the fixed bound',async()=>{
 const {compactReceiptLink}=await compact(),link=compactReceiptLink(receiptLink(row())!);
 for(const bad of [link+'&r=bad',link+'&unknown=1',link+'#r=bad',link.replace('/receipt/','/other/'),link.replace(/r=.*/, 'r='+'A'.repeat(32001))])expect(()=>readReceiptLink(bad)).toThrow();
 const encode=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 const compressed=deflateSync(new TextEncoder().encode('x'.repeat(200000))),packet=new Uint8Array(compressed.length+3);packet.set([1,0,10]);packet.set(compressed,3);
 expect(()=>decodeReceiptPacket(encode(packet))).toThrow();
 packet[1]=255;expect(()=>decodeReceiptPacket(encode(packet))).toThrow();
 const valid=encodeReceiptPacket(readReceiptLink(link));expect(()=>decodeReceiptPacket(valid.slice(0,8))).toThrow();
});
it('preserves clipboard fallback and never reports an aborted native share as a failure',async()=>{
 const {shareReceiptLink,copyReceiptLink}=await compact(),writeText=vi.fn().mockResolvedValue(undefined),share=vi.fn().mockRejectedValue(new DOMException('cancelled','AbortError'));
 vi.stubGlobal('navigator',{clipboard:{writeText},share});const link=receiptLink(row())!;
 expect(await shareReceiptLink(link)).toBe('cancelled');expect(writeText).not.toHaveBeenCalled();
 vi.stubGlobal('navigator',{clipboard:{writeText}});expect(await shareReceiptLink(link)).toBe('copied');expect(readReceiptLink(writeText.mock.calls[0][0])).toEqual(readReceiptLink(link));
 await copyReceiptLink(link);expect(writeText).toHaveBeenCalledTimes(2);
});
