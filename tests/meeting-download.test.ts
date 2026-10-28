import {it,expect} from 'vitest';
import {zipSync,unzipSync,strToU8} from 'fflate';
import {buildMeetingDownload} from '../src/features/meeting/meeting-download';
it('puts the exact meeting proof, playable contents and current Identity Record in one ordinary ZIP folder',async()=>{
 const original=zipSync({'meeting.json':strToU8(JSON.stringify({schema:'bankeiz.meeting.record.v1',evidence:{messages:['Agreed a follow-up']}})),'recording-1.webm':new Uint8Array([4,8,15,16,23,42])},{level:0});
 const identity=new Uint8Array([137,80,78,71,1,2,3]);const meeting=new File([original],'meeting-record.receized.zip',{type:'application/octet-stream'});
 const result=await buildMeetingDownload({meeting,title:'Launch / review',identity:{bytes:identity,filename:'my-identity.png',phrase:'NEVER PUT MY PHRASE IN THE ARCHIVE'}});
 expect(result.type).toBe('application/zip');expect(result.name).toMatch(/\.zip$/);const files=unzipSync(new Uint8Array(await result.arrayBuffer())),keys=Object.keys(files);const roots=new Set(keys.map(k=>k.split('/')[0]));expect(roots.size).toBe(1);
 expect(keys.some(k=>k.endsWith('/Meeting/meeting.json'))).toBe(true);expect(keys.some(k=>k.endsWith('/Meeting/recording-1.webm'))).toBe(true);
 expect(files[keys.find(k=>k.endsWith('/Proof/meeting-record.receized.zip'))!]).toEqual(original);expect(files[keys.find(k=>k.endsWith('/Identity/my-identity.png'))!]).toEqual(identity);
 expect(new TextDecoder().decode(files[keys.find(k=>k.endsWith('/Read me.txt'))!])).toContain('Identity');expect(keys.some(k=>k.includes('..'))).toBe(false);
 expect(Object.values(files).some(v=>new TextDecoder().decode(v).includes('NEVER PUT MY PHRASE'))).toBe(false);
});
it('refuses an unsafe extracted entry without producing an incomplete or path-escaping archive',async()=>{const meeting=new File([zipSync({'../outside.txt':strToU8('bad')})],'meeting.zip');await expect(buildMeetingDownload({meeting,title:'Review',identity:{bytes:new Uint8Array([1]),filename:'identity.png',phrase:''}})).rejects.toThrow('MEETING_DOWNLOAD_PATH_INVALID');});
it('does not turn a missing Identity Record or unreadable meeting source into a successful package',async()=>{const meeting=new File([zipSync({'meeting.json':strToU8('{}')})],'meeting.zip');await expect(buildMeetingDownload({meeting,title:'Review',identity:{bytes:new Uint8Array(),filename:'identity.png',phrase:''}})).rejects.toThrow('MEETING_DOWNLOAD_IDENTITY_REQUIRED');await expect(buildMeetingDownload({meeting:new File(['invalid'],'meeting.zip'),title:'Review',identity:{bytes:new Uint8Array([1]),filename:'identity.png',phrase:''}})).rejects.toThrow();});
