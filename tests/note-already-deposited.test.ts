import {expect,it} from 'vitest';
import {noteError} from '../src/features/notes/note-error';
it('reports an already confirmed deposit from its precise native code, including an SDK HTTP payload',()=>{
 expect(noteError(Error('BANK_NOTE_ALREADY_DEPOSITED'))).toBe('This Note has already been deposited.');
 expect(noteError(Object.assign(Error('receiz_http_409'),{payload:{ok:false,error:'wallet_note_already_claimed'}}))).toBe('This Note has already been deposited.');
});
it('keeps unknown consumption conflicts and service/network failures distinct from confirmed deposit',()=>{
 for(const code of ['BANK_NOTE_REDEMPTION_CONFLICT','BANK_NOTE_DEPOSIT_PENDING','bank_note_service_unavailable','Failed to fetch'])expect(noteError(Error(code))).not.toBe('This Note has already been deposited.');
});
