import {useEffect,useRef,useState} from 'react';
import {QrCode} from 'lucide-react';
import type {OpenIdentity} from '../../receiz/native-identity';
import type {BankForwardedNote,BankNoteImage,BankReceivedNoteDeposit} from '../../receiz/offline-notes';
import {createOpticalNoteFrames,readOpticalNoteFrames} from '../../receiz/optical-note-frames';
import {PaymentScanner} from '../account/PaymentScanner';
import {needsHandoffProof} from '../../receiz/note-handoff-witness';
import {readNoteProofImport} from '../../receiz/note-proof-portability';
import {WalletPaymentCode,type OpticalFrames} from '../account/WalletPaymentCode';

export function ForwardNoteHandoff({identity,note,onForwarded,recipient,startScanning=false}:{identity:OpenIdentity;note:BankNoteImage|BankReceivedNoteDeposit|BankForwardedNote;recipient?:string;startScanning?:boolean;onForwarded(value:BankForwardedNote):void}){
  const checkpointPending='handoffRecovery' in note&&note.handoffRecovery;
  const [recovering,setRecovering]=useState(false);
  const recoveryReader=useRef(readOpticalNoteFrames('wallet'));
  const [scanning,setScanning]=useState(startScanning&&!checkpointPending),[qr,setQr]=useState<OpticalFrames>(),[error,setError]=useState('');
  const reader=useRef(readOpticalNoteFrames('request'));
  const running=useRef(false);
  const show=(bytes:Uint8Array)=>createOpticalNoteFrames('wallet',bytes).then(setQr);
  async function scan(frame:Uint8Array){
    if(running.current)return false;
    try{
      const next=reader.current.push(frame);
      if(!next)return false;
      running.current=true;
      const notes=await identity.offlineNotes!(),request=await next;
      const forwarded='image' in note
        ? await notes.forwardOwnedNote?.(note.noteId,request.bytes)
        : await notes.forwardReceivedNote?.(note.noteId,request.bytes,recipient);
      if(!forwarded)throw Error('BANK_NOTE_FORWARD_UNAVAILABLE');
      setScanning(false);
      onForwarded(forwarded);
      await show(forwarded.proofBytes);
      return true;
    }catch(cause){
      if(needsHandoffProof(cause)){setScanning(false);setRecovering(true);return true;}
      reader.current=readOpticalNoteFrames('request');
      setError('Use the recipient’s Note receiving QR. If this Note was already passed on, reopen its saved QR.');
      return true;
    }finally{running.current=false;}
  }
  const isSent='status' in note&&note.status==='forwarded';
  const savedTransfer='image' in note&&(note.transferPending||note.transferred);
  async function reopen(){
    setError('');
    try{
      if('status' in note&&note.status==='forwarded'){await show(note.proofBytes);return;}
      const notes=await identity.offlineNotes!(),forwarded=await notes.forwardOwnedNote?.(note.noteId);
      if(!forwarded)throw Error('BANK_NOTE_FORWARD_UNAVAILABLE');
      await show(forwarded.proofBytes);
    }catch(cause){if(needsHandoffProof(cause))setRecovering(true);else setError('The Note is saved. Reopen the QR to try again.');}
  }
  async function recover(proof?:Uint8Array){
    if(running.current)return;
    running.current=true;setError('');
    try{
      const notes=await identity.offlineNotes!();
      const restored=await notes.recoverNoteHandoff?.(note.noteId,'image' in note,proof);
      if(!restored)throw Error('BANK_NOTE_FORWARD_UNAVAILABLE');
      setRecovering(false);setScanning(false);
      onForwarded(restored);await show(restored.proofBytes);
    }catch(cause){
      setRecovering(true);
      if(!needsHandoffProof(cause))setError(proof?'This proof doesn’t match the saved handoff.':'Use the exact proof from the original handoff.');
    }finally{running.current=false;}
  }
  useEffect(()=>{
    if(checkpointPending)void recover();
  },[checkpointPending,identity,note.noteId]);
  async function scanRecovery(frame:Uint8Array){
    try{
      const candidate=recoveryReader.current.push(frame);
      if(!candidate)return false;
      await recover((await candidate).bytes);
    }catch{setError('Scan the QR from the original handoff.');}
    recoveryReader.current=readOpticalNoteFrames('wallet');
    return true;
  }
  async function importProof(file?:File){
    if(!file)return;
    try{
      if(file.size>32*1024*1024)throw Error('BANK_NOTE_DEVICE_CAPACITY');
      await recover(await readNoteProofImport(file));
    }catch{setError('Choose the saved proof from the original handoff.');}
  }
  return <>
    {qr?<><p className="body-copy small-copy">Ask the recipient to scan this in Receive nearby.</p>
      <WalletPaymentCode frames={qr} label="Forwarded Note QR" onError={()=>setError('The Note is saved. Reopen the QR to try again.')}/></>
      : recovering?<><p className="body-copy small-copy">This Note was already passed on. Scan the recipient’s saved QR or open the saved proof to recover the handoff.</p>
        <PaymentScanner compact imageLabel="Use QR image" onBytes={scanRecovery}/>
        <label className="form-field"><span>Open saved proof</span><input type="file" accept="image/png,.json,.receiz,.receizbundle" onChange={e=>void importProof(e.target.files?.[0])}/></label>
        <p className="body-copy small-copy">If you no longer have the proof nearby, connect to retrieve your saved copy.</p></>
      : checkpointPending?<button className="secondary-button" type="button" onClick={()=>void recover()}><QrCode size={16}/>Recover handoff</button>
      : isSent||savedTransfer
        ? <button className="secondary-button" type="button" onClick={()=>void reopen()}><QrCode size={16}/>Show Note QR</button>
        : !scanning&&'forwardable' in note&&note.forwardable?<button className="secondary-button" type="button" onClick={()=>{setError('');setScanning(true);}}><QrCode size={16}/>Send Note nearby</button>:null}
    {scanning&&!recovering&&<><p className="body-copy small-copy">Scan the recipient’s Note receiving QR.</p><PaymentScanner compact onBytes={scan}/>
      <button className="text-button" type="button" onClick={()=>{reader.current=readOpticalNoteFrames('request');setScanning(false);}}>Back</button></>}
    {error&&<p className="body-copy small-copy" role="status">{error}</p>}
  </>;
}


export function ReceivedNoteProofQr({identity,noteId}:{identity:OpenIdentity;noteId:string}){
  const [frames,setFrames]=useState<OpticalFrames>(),[unavailable,setUnavailable]=useState(false);
  async function open(){
    try{
      const proof=await (await identity.offlineNotes?.())?.receivedNoteHandoffSource?.(noteId);
      if(!proof)throw Error('BANK_NOTE_SOURCE_REQUIRED');
      setFrames(await createOpticalNoteFrames('wallet',proof));setUnavailable(false);
    }catch{setUnavailable(true);}
  }
  return frames?<WalletPaymentCode frames={frames} label="Received Note proof QR" onError={()=>{setFrames(undefined);setUnavailable(true);}}/>
    : <><button className="text-button" type="button" onClick={()=>void open()}>Show received proof QR</button>
      {unavailable&&<p className="body-copy small-copy" role="status">Open your saved Note proof to share it.</p>}</>;
}
