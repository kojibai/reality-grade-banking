import {useRef,useState} from 'react';
import {QrCode} from 'lucide-react';
import type {OpenIdentity} from '../../receiz/native-identity';
import type {BankForwardedNote,BankNoteImage,BankReceivedNoteDeposit} from '../../receiz/offline-notes';
import {createOpticalNoteFrames,readOpticalNoteFrames} from '../../receiz/optical-note-frames';
import {PaymentScanner} from '../account/PaymentScanner';
import {WalletPaymentCode,type OpticalFrames} from '../account/WalletPaymentCode';

export function ForwardNoteHandoff({identity,note,onForwarded,recipient,startScanning=false}:{identity:OpenIdentity;note:BankNoteImage|BankReceivedNoteDeposit|BankForwardedNote;recipient?:string;startScanning?:boolean;onForwarded(value:BankForwardedNote):void}){
  const [scanning,setScanning]=useState(startScanning),[qr,setQr]=useState<OpticalFrames>(),[error,setError]=useState('');
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
    }catch{
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
    }catch{setError('The Note is saved. Reopen the QR to try again.');}
  }
  return <>
    {qr?<><p className="body-copy small-copy">Ask the recipient to scan this in Receive nearby.</p>
      <WalletPaymentCode frames={qr} label="Forwarded Note QR" onError={()=>setError('The Note is saved. Reopen the QR to try again.')}/></>
      : isSent||savedTransfer
        ? <button className="secondary-button" type="button" onClick={()=>void reopen()}><QrCode size={16}/>Show Note QR</button>
        : !scanning&&'forwardable' in note&&note.forwardable?<button className="secondary-button" type="button" onClick={()=>{setError('');setScanning(true);}}><QrCode size={16}/>Send Note nearby</button>:null}
    {scanning&&<><p className="body-copy small-copy">Scan the recipient’s Note receiving QR.</p><PaymentScanner compact onBytes={scan}/>
      <button className="text-button" type="button" onClick={()=>{reader.current=readOpticalNoteFrames('request');setScanning(false);}}>Back</button></>}
    {error&&<p className="body-copy small-copy" role="status">{error}</p>}
  </>;
}
