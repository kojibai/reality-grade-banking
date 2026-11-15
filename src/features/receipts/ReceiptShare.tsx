import {useEffect,useId,useRef,useState} from 'react';
import {ArrowUpRight,Download,Link2,Share2,X} from 'lucide-react';
import {CopyFeedbackIcon,useCopyFeedback} from '../../components/CopyFeedback';
import {lockDocumentScroll} from '../../core/scroll-lock';
import {restorePanelFocus} from '../../core/return-focus';
import {receiptDisplayRecord,type LedgerReceipt,type LedgerReceiptContext} from '../../receiz/ledger-receipts';
import {PublicOriginalPurchaseRequired} from '../../receiz/public-original';
import {receiptLedgerUrl,receiptSnapshotDigest,receiptSnapshotUrl,saveReceiptSnapshot} from '../../receiz/receipt-snapshot';
import {compactReceiptLink} from '../../receiz/receipt-sharing';
import './receipt-share.css';
export function ReceiptShare({receipt,onClose,carriedLink,onCopied,readyUrl,originalContext}:{receipt:LedgerReceipt;onClose():void;carriedLink?:string;onCopied?():void;readyUrl?:string;originalContext?:Pick<LedgerReceiptContext,'record'|'sourceReader'>}){
 const dialog=useRef<HTMLDialogElement>(null),titleId=useId(),[url,setUrl]=useState(()=>{const digest=readyUrl?receiptSnapshotDigest(readyUrl):null;return digest?receiptSnapshotUrl(digest):'';}),[error,setError]=useState(''),[downloading,setDownloading]=useState(false),{copied,confirm}=useCopyFeedback(receipt.id);
 useEffect(()=>{const opener=document.activeElement as HTMLElement|null;dialog.current?.showModal();const unlock=lockDocumentScroll();return()=>{dialog.current?.close();unlock();queueMicrotask(()=>{if(opener?.isConnected)restorePanelFocus(opener,true);});};},[]);
 const downloadEpoch=useRef(0),downloadPending=useRef(false),downloadController=useRef<AbortController|null>(null);
 useEffect(()=>{let live=true;if(!readyUrl)saveReceiptSnapshot(receipt).then(value=>{if(live)setUrl(value);},()=>{if(live)setError('The short link could not be saved. You can still copy the carried link.');});return()=>{live=false;};},[receipt,readyUrl]);
 useEffect(()=>{downloadEpoch.current++;downloadPending.current=false;setDownloading(false);return()=>{downloadEpoch.current++;downloadController.current?.abort();};},[receipt,originalContext?.record,originalContext?.sourceReader]);
 const download=async()=>{
  if(downloadPending.current)return;downloadPending.current=true;const epoch=downloadEpoch.current,controller=new AbortController();downloadController.current=controller;setDownloading(true);setError('');
  try{
   const record=originalContext?.record??receiptDisplayRecord(receipt);
   if(record.sourceId!==receipt.id||record.source!==receipt.source||record.kind!==receipt.kind||record.authority!==receipt.authority||record.evidence.artifactDigest!==receipt.evidence.artifactDigest)throw Error('RECEIPT_CONTEXT_MISMATCH');
   const {downloadLedgerOriginal}=await import('../../receiz/ledger-offline-proof');controller.signal.throwIfAborted();
   const file=await downloadLedgerOriginal(record,undefined,controller.signal,originalContext?.sourceReader);if(epoch!==downloadEpoch.current)return;
   const href=URL.createObjectURL(file),anchor=document.createElement('a');anchor.href=href;anchor.download=file.name;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(href),1000);
  }catch(cause){if(epoch===downloadEpoch.current)setError(cause instanceof PublicOriginalPurchaseRequired?cause.message:cause instanceof Error&&cause.message==='ORIGINAL_NOT_SUPPLIED'?'The exact transaction proof is not attached to this record. No incomplete proof was downloaded.':'The original proof could not be downloaded. No display record was substituted.');}
  finally{if(epoch===downloadEpoch.current){downloadPending.current=false;downloadController.current=null;setDownloading(false);}}
 };
 const copy=async()=>{try{await navigator.clipboard.writeText(url||(carriedLink?compactReceiptLink(carriedLink):''));confirm();onCopied?.();}catch{setError('Copy is unavailable on this device.');}};
 const share=()=>{if(!url)return;if(typeof navigator.share!=='function'){void copy();return;}void navigator.share({title:'Receipt',url}).catch((reason:unknown)=>{if(!(reason instanceof Error&&reason.name==='AbortError'))setError('Sharing is unavailable on this device. You can copy the link.');});};
 return <dialog ref={dialog} className="receipt-share-panel" aria-labelledby={titleId} onCancel={event=>{event.preventDefault();onClose();}}><header><div><span>Complete record</span><h2 id={titleId}>Share receipt</h2></div><button className="receipt-share-close" onClick={onClose} aria-label="Close"><X size={20}/></button></header><p>One permanent link. Every carried funding source stays with the receipt.</p><div className="receipt-share-actions"><button disabled={!url&&!(error&&carriedLink)} onClick={()=>void copy()} aria-label="Copy receipt link"><CopyFeedbackIcon copied={copied}/><span>{copied?'Copied':url?'Copy link':error?'Copy carried link':'Preparing link…'}</span></button><button disabled={!url} onClick={share} aria-label="Share receipt"><Share2 size={19}/><span>Share</span></button></div><nav aria-label="Receipt originals"><button disabled={downloading} onClick={()=>void download()}><Download size={17}/><span>{downloading?'Preparing original…':'Download original'}</span></button><a href={receiptLedgerUrl(receipt)} onClick={onClose}><Link2 size={17}/><span>View in Ledger</span><ArrowUpRight size={15}/></a></nav>{error&&<p className="receipt-share-error" role="status">{error}</p>}<small>The saved receipt preserves this event. The Ledger carries subsequent public activity. Source proofs retain their original authority.</small></dialog>;
}
