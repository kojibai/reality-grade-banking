import {expect,it} from 'vitest';
import {atNoteStage,noteFailureStage} from '../src/receiz/note-stage';
it('keeps the exact exception and first failing stage without recording its message or custom fields',async()=>{
 const failure=Object.assign(new DOMException('private token','OperationError'),{ticket:'private ticket'});
 await expect(atNoteStage('device-signer',()=>atNoteStage('saved-notes',async()=>{throw failure;}))).rejects.toBe(failure);
 expect(noteFailureStage(failure)).toEqual({stage:'saved-notes',errorName:'OperationError'});
 expect(JSON.stringify(noteFailureStage(failure))).not.toContain('private');
});
it('bounds unknown exception names and ignores nonobject thrown values',async()=>{
 const failure={name:'private credential name',message:'private'};await atNoteStage('prepared-notes',async()=>{throw failure;}).catch(()=>{});expect(noteFailureStage(failure)).toEqual({stage:'prepared-notes',errorName:'Error'});await expect(atNoteStage('saved-notes',async()=>{throw 'private';})).rejects.toBe('private');expect(noteFailureStage('private')).toBeNull();
});
