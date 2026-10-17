import type {KairosReservePwaCustodyState,KairosReservePwaCustodyStorage} from "../kairosReservePwaCustodyAdapter";
type Ports=Readonly<{keyId:string;uid:string;assertOpen():void;read():Promise<unknown>;write(next:unknown,previous:unknown):Promise<void>;retain(bytes:Uint8Array):Promise<string>;restore(ref:string):Promise<Uint8Array>}>;
/** Cash state includes private account namespaces. Only an encrypted application
 * blob reference is stored in choreography; the generic hardware IDB delegate
 * must never receive this private state. All writes retain existing account CAS. */
export function createBankPreparedCashStorage(input:Ports,slotId:string):KairosReservePwaCustodyStorage {
 async function load(){input.assertOpen();const previous=await input.read(),state=structuredClone(previous) as {schema?:string;keyId?:string;uid?:string;cashHeads?:Record<string,string>};
  if(!state||state.schema!=="receiz.bank.prepared-notes-device.v1"||state.keyId!==input.keyId||state.uid!==input.uid)throw Error("BANK_NOTE_IDENTITY_CHANGED");
  if(state.cashHeads&&(typeof state.cashHeads!=="object"||Array.isArray(state.cashHeads)))throw Error("BANK_NOTE_PRIVATE_SOURCE_INVALID");
  return{previous,state};
 }
 return Object.freeze({
  async read(){const {state}=await load(),ref=state.cashHeads?.[slotId];if(!ref)return null;
   const value=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(await input.restore(ref))) as KairosReservePwaCustodyState;input.assertOpen();return value;
  },
  async write(value:KairosReservePwaCustodyState){const {previous,state}=await load();
   // The native reserve state is a JSON carrier (key files and base64 receipts).
   // Its account namespaces are preserved exactly by the existing native codec.
   const ref=await input.retain(new TextEncoder().encode(JSON.stringify(value)));
   state.cashHeads={...state.cashHeads,[slotId]:ref};input.assertOpen();await input.write(state,previous);input.assertOpen();
  },
 });
}
