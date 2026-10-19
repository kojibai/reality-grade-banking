import type {BankNoteImage,BankNoteInspection,BankOfflineNotes} from './offline-notes';

/** Local presentation only. Financial execution still reopens the original v129
 * runtime and its full sources. No enrollment, signing, writes or empty fallback. */
export function createLocalNoteInventory(input:{keyId:string;uid():string|null;readLegacy():Promise<unknown>;readPrepared():Promise<unknown>;restore(ref:string):Promise<Uint8Array>;inspect(image:Uint8Array):Promise<BankNoteInspection>;assertOpen():void}) {
  const object=(value:unknown):Record<string,any>=>{if(!value||typeof value!=='object'||Array.isArray(value))throw Error('BANK_NOTE_PRIVATE_SOURCE_INVALID');return value as Record<string,any>;};
  async function read(family:'legacy'|'prepared') {
    input.assertOpen();const raw=await(family==='legacy'?input.readLegacy():input.readPrepared());input.assertOpen();if(raw==null)return null;
    const state=object(raw),uid=input.uid();
    if(state.schema!==`receiz.bank.${family==='legacy'?'offline':'prepared'}-notes-device.v1`||state.keyId!==input.keyId||typeof state.uid!=='string'||!state.uid||uid!==null&&state.uid!==uid)throw Error('BANK_NOTE_IDENTITY_CHANGED');
    object(state.notes);
    if(family==='legacy')object(state.deposits);
    else for(const field of ['slots','components','stages','proofs'])object(state[field]);
    if(state.create!==null){const attempt=object(state.create);if(family==='legacy'&&!['preparing','funding','issuing','complete'].includes(attempt.phase))throw Error('BANK_NOTE_PRIVATE_SOURCE_INVALID');}
    return state;
  }
  function pending(state:Record<string,any>|null,family:'legacy'|'prepared'):Awaited<ReturnType<BankOfflineNotes['pending']>> {
    const c=state?.create;if(!c||family==='legacy'&&c.phase==='complete')return null;
    const noteId=family==='legacy'?object(c.intent).noteId:c.noteId,rail=c.rail??'reserve';
    if(typeof noteId!=='string'||!noteId||typeof c.amountUsdCents!=='string'||!/^[1-9]\d{0,8}$/.test(c.amountUsdCents)||BigInt(c.amountUsdCents)>100000000n||!['reserve','settlement'].includes(rail))throw Error('BANK_NOTE_PRIVATE_SOURCE_INVALID');
    return {noteId,rail,amountUsdCents:c.amountUsdCents,canCancel:family==='legacy'&&['preparing','funding'].includes(c.phase)};
  }
  return {
    preparedPending:async()=>pending(await read('prepared'),'prepared'),
    async pending(){const old=pending(await read('legacy'),'legacy'),prepared=pending(await read('prepared'),'prepared');if(old&&prepared)throw Error('BANK_NOTE_COMPETING_ATTEMPTS');return prepared??old;},
    async savedNotes():Promise<BankNoteImage[]> {
      const result:BankNoteImage[]=[];
      for(const family of ['legacy','prepared'] as const){const state=await read(family);if(!state)continue;
        for(const [id,value]of Object.entries(state.notes)){const saved=object(value);
          if(family==='legacy'&&(!saved.imageRef||state.deposits[object(saved.intent).noteId]?.creditRef)||family==='prepared'&&state.journal?.deposits?.[id]?.phase==='complete')continue;
          if(typeof saved.imageRef!=='string'||!saved.imageRef)throw Error('BANK_NOTE_PRIVATE_SOURCE_INVALID');
          const image=await input.restore(saved.imageRef),note=await input.inspect(image);input.assertOpen();
          if(note.noteId!==(family==='legacy'?object(saved.intent).noteId:id))throw Error('BANK_NOTE_PRIVATE_SOURCE_INVALID');
          result.push({...note,image,transferred:saved.transferComplete===true,transferPending:Boolean(saved.transfer)&&saved.transferComplete!==true});
        }
      }
      return result;
    },
  };
}
