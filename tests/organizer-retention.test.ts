import {it,expect,vi} from 'vitest';
import {openOrganizerRetention} from '../src/receiz/organizer-retention';
it('retains only display in the existing identity vault, coalesces writes and never repeats identical saves',async()=>{
 const owner='owner',source={schema:'bankeiz.organizer-display.v1' as const,accountUid:owner,contacts:[],events:null,ranges:[],username:null};
 const save=vi.fn(async()=>{}),retention=await openOrganizerRetention({accountUid:owner,load:async()=>null,save,isOpen:()=>true});
 retention.capture(source);retention.capture(source);await retention.flush();expect(save).toHaveBeenCalledTimes(1);
 retention.capture(source);await retention.flush();expect(save).toHaveBeenCalledTimes(1);
 expect(JSON.stringify(save.mock.calls)).not.toMatch(/token|passphrase|authorization/i);
});
it('rejects another account and never lets a storage failure stop a user operation',async()=>{
 const save=vi.fn(async()=>{throw Error('disk');}),retention=await openOrganizerRetention({accountUid:'owner',load:async()=>({schema:'bankeiz.organizer-display.v1',accountUid:'other',contacts:[],events:null,ranges:[],username:null}),save,isOpen:()=>true});
 expect(retention.known()).toBeNull();retention.capture({schema:'bankeiz.organizer-display.v1',accountUid:'owner',contacts:[],events:null,ranges:[],username:null});await expect(retention.flush()).resolves.toBeUndefined();
});
