import {it,expect} from 'vitest';
import {sealMeetingRecord} from '../src/receiz/sealed-meeting-record';
it('preserves exact canonically verified large output and its canonical filename and type',async()=>{
 const bytes=new Uint8Array(17*1024*1024);bytes.set([80,75,3,4]);let calls=0;
 const sealer={seal:async(input:{bytes:Uint8Array;filename:string;mimeType?:string})=>{calls++;expect(input.bytes).toBe(bytes);expect(input.mimeType).toBe('application/zip');return{artifactBytes:bytes,filename:'meeting-record.receized.zip',mimeType:'application/octet-stream',verification:{ok:true}};}};
 const file=await sealMeetingRecord(sealer as never,bytes,'meeting-record.zip');expect(calls).toBe(1);expect(file.name).toBe('meeting-record.receized.zip');expect(file.type).toBe('application/octet-stream');expect(Buffer.from(await file.arrayBuffer()).equals(Buffer.from(bytes))).toBe(true);
});
it('does not manufacture a meeting proof when the canonical sealer refuses it',async()=>{
 await expect(sealMeetingRecord({seal:async()=>({verification:{ok:false}})} as never,new Uint8Array([1]),'meeting-record.zip')).rejects.toThrow('MEETING_RECORD_PROOF_INVALID');
 await expect(sealMeetingRecord({seal:async()=>{throw Error('canonical seal failed');}} as never,new Uint8Array([1]),'meeting-record.zip')).rejects.toThrow('canonical seal failed');
});
