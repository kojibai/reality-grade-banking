import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {verifyProofReadingBytes} from '../src/receiz/proof-reading';
const bytes=new Uint8Array(readFileSync(new URL('./fixtures/public-essay-record.png',import.meta.url)));
const image='d4e40d9ececcc01cd5de77dc340081cb386dbcb68a42c5a7040a7ec1edeab8b1';
const post='https://receiz.com/v/20261012_1401/0C19C291/14611069?a=cd412215&ms=1791828092396';
it('reads the exact essay carried by a real canonically verified record bound to the image',async()=>{
 const reading=await verifyProofReadingBytes(bytes,image,post);
 expect(reading.title).toBe('THEY HAVE NO MACHINE. THEY HAVE NO ANSWER.');expect(reading.text.length).toBe(17952);
 expect(reading.sha256).toBe('d0f7264aaff25046560310af2d082d0ea6bf270e74c66be7dcdc800f29a07620');
 expect(reading.artifactDigest).toBe('7dea328ef9accb1322853b868ec0fbd9a46f644cffbd377763eb08af7fe6784e');
});
it('refuses a verified essay record linked to a different image',async()=>{
 await expect(verifyProofReadingBytes(bytes,'b'.repeat(64),post)).rejects.toThrow('selected original');
});
it('refuses a valid record from a different selected post coordinate',async()=>{
 await expect(verifyProofReadingBytes(bytes,image,post.replace('0C19C291','AB12CD34'))).rejects.toThrow('selected post');
});
it('rejects one changed essay character even when its PNG checksum is repaired',async()=>{
 const changed=new Uint8Array(bytes),view=new DataView(changed.buffer);let at=8,mutated=false;
 while(at+12<=changed.length){const length=view.getUint32(at),type=new TextDecoder().decode(changed.subarray(at+4,at+8)),data=changed.subarray(at+8,at+8+length),text=new TextDecoder().decode(data);
  if(type==='iTXt'&&text.startsWith('receiz_anchor_bundle\0')){const where=text.indexOf('THEY HAVE NO MACHINE. THEY HAVE NO ANSWER.');expect(where).toBeGreaterThan(0);changed[at+8+where]=88;let crc=0xffffffff;for(const byte of changed.subarray(at+4,at+8+length)){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}view.setUint32(at+8+length,(crc^0xffffffff)>>>0);mutated=true;break;}at+=length+12;
 }
 expect(mutated).toBe(true);await expect(verifyProofReadingBytes(changed,image,post)).rejects.toThrow('could not be verified');
});
