// @vitest-environment happy-dom
import {it,expect,vi} from 'vitest';
import {downloadMeetingFile} from '../src/features/meeting/meeting-download';
it('attaches the private file download and releases the URL after browser handoff',()=>{
 vi.useFakeTimers();const file=new File(['transport'],'Meeting.zip',{type:'application/zip'}),created=vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:meeting-private'),revoke=vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});let attached=false;
 vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(this:HTMLAnchorElement){attached=document.body.contains(this);expect(this.download).toBe(file.name);expect(this.href).toBe('blob:meeting-private');});
 try{downloadMeetingFile(file);expect(attached).toBe(true);expect(created).toHaveBeenCalledWith(file);expect(document.querySelector('a[download]')).toBeNull();expect(revoke).not.toHaveBeenCalled();vi.advanceTimersByTime(60_000);expect(revoke).toHaveBeenCalledWith('blob:meeting-private');}finally{vi.restoreAllMocks();vi.useRealTimers();}
});
it('cleans up a failed browser handoff without claiming the file was saved',()=>{vi.useFakeTimers();const revoke=vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:kept');vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{throw Error('browser refused');});try{expect(()=>downloadMeetingFile(new File(['kept'],'Meeting.zip'))).toThrow('browser refused');expect(document.querySelector('a[download]')).toBeNull();vi.advanceTimersByTime(60_000);expect(revoke).toHaveBeenCalledWith('blob:kept');}finally{vi.restoreAllMocks();vi.useRealTimers();}});
