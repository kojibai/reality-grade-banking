import {expect,it} from 'vitest';
import {receizBase64UrlDecode,sha256ReceizBytes} from '@receiz/sdk';
import {prepareAssetMoment,readAssetMoment,MAX_MOMENT_BYTES,MAX_MOMENT_FILES} from '../src/receiz/asset-moment';
const file=new File([new Uint8Array([0,255,128,1,2])],'original.bin',{type:'application/octet-stream'});
it('carries exact original bytes, their digests and optional long-form text together without uploading anything',async()=>{
 const value=await prepareAssetMoment({files:[file],title:'A moment',text:'First paragraph.\n\nSecond paragraph.',metadata:{creator:'Artist',tags:'memory, art'}});
 expect(value?.schema).toBe('receiz.bank.moment-content.v1');expect(value?.files).toHaveLength(1);
 expect(receizBase64UrlDecode(value!.files[0].bytesB64u)).toEqual(new Uint8Array(await file.arrayBuffer()));
 expect(value!.files[0].sha256).toBe(await sha256ReceizBytes(new Uint8Array(await file.arrayBuffer())));
 const reopened=await readAssetMoment(JSON.parse(JSON.stringify(value)));
 expect(reopened.files[0]).toMatchObject({filename:'original.bin',mimeType:'application/octet-stream',bytes:new Uint8Array(await file.arrayBuffer())});
 expect(reopened).toMatchObject({title:'A moment',text:'First paragraph.\n\nSecond paragraph.',metadata:{creator:'Artist',tags:'memory, art'}});
});
it('keeps a plain definition small when no original or long-form text was supplied',async()=>{
 expect(await prepareAssetMoment()).toBeNull();expect(await prepareAssetMoment({files:[],title:'',text:'  ',metadata:{}})).toBeNull();
});
it('checks combined capacity and file count before reading any selected originals',async()=>{
 const oversized=new File(['small'],'oversized.bin');Object.defineProperty(oversized,'size',{value:MAX_MOMENT_BYTES+1});Object.defineProperty(oversized,'arrayBuffer',{value:()=>{throw Error('should not read');}});
 await expect(prepareAssetMoment({files:[oversized]})).rejects.toThrow('6 MB');
 await expect(prepareAssetMoment({files:Array.from({length:MAX_MOMENT_FILES+1},()=>file)})).rejects.toThrow('8 originals');
 await expect(prepareAssetMoment({files:[],text:'x'.repeat(100001)})).rejects.toThrow('100,000');
});
it.each(['digest','size','encoding','metadata','count'] as const)('refuses malformed %s in a carried moment before rendering media',async kind=>{
 const value=(await prepareAssetMoment({files:[file]}))!;
 if(kind==='digest')value.files[0].sha256='0'.repeat(64);
 if(kind==='size')value.files[0].size++;
 if(kind==='encoding')value.files[0].bytesB64u+='=';
 if(kind==='metadata')Object.assign(value.metadata,{creator:{untrusted:'object'}});
 if(kind==='count')value.files=Array.from({length:MAX_MOMENT_FILES+1},()=>value.files[0]);
 await expect(readAssetMoment(value)).rejects.toThrow('moment');
});
