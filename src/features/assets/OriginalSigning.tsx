import type {OpenIdentity} from '../../receiz/native-identity';
import type {HeldDeposit} from '../../receiz/deposit-source';
import type {PublicMarketItem} from '../../receiz/public-market';
import {useEffect,useRef,useState} from 'react';
import {Fingerprint} from 'lucide-react';
import {InlineOpening} from '../../components/InlineOpening';
import {retainedAssetPublicationSource} from '../../receiz/asset-publication-adoption';
import {resolvePublicOriginalUrl,PublicOriginalPurchaseRequired} from '../../receiz/public-original';
import {readPublicLedgerBytes} from '../../receiz/public-ledger-transfer';
import './original-signing.css';

/** Only a display entry into the existing owner-signing operation. No reads or
 * PBI work happen until the owner explicitly chooses this control. */
export function OriginalSigning({identity,source,item}:{identity:OpenIdentity;source?:HeldDeposit;item?:PublicMarketItem}){
 const username=identity.accountUsername?.()??identity.username,digest=source?.digest??item?.originalDigest;
 if(!digest||(source?.pbiSigned??item?.hasPbiSignature)!==false||item?.hasPbiSignature||source?.nativeAsset||source?.kind==='intake'
  ||item&&item.ownerUsername!==username)return null;
 return <UnsignedOriginalSigning key={identity.binding.keyId+digest} identity={identity} source={source} item={item} digest={digest}/>;
}
function UnsignedOriginalSigning({identity,source,item,digest}:{identity:OpenIdentity;source?:HeldDeposit;item?:PublicMarketItem;digest:string}){
 const [busy,setBusy]=useState(false),[signed,setSigned]=useState(false),[error,setError]=useState('');
 const running=useRef(false),lifetime=useRef<AbortController|null>(null);
 useEffect(()=>{const controller=new AbortController();lifetime.current=controller;setSigned(false);setError('');setBusy(false);running.current=false;return()=>{controller.abort();};},[identity,digest]);
 if(signed)return null;
 async function sign(){
  if(running.current||!digest)return;
  const controller=lifetime.current;if(!controller||controller.signal.aborted)return;
  running.current=true;setBusy(true);setError('');
  try{
   let original=source;
   if(!original){
    // A Showcase-only Original may not be held on this device yet. Reuse the
    // exact retained file first; otherwise read only this selected Original.
    let file=retainedAssetPublicationSource(digest);
    if(!file){
     if(!item?.originalUrl)throw Error('This Original’s source is not available. Open its proof to inspect it.');
     const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(90000)]),url=new URL(await resolvePublicOriginalUrl(item.originalUrl,digest,signal));
     const response=await fetch('/api/bank/public-market/original?path='+encodeURIComponent(url.pathname+url.search),{credentials:'omit',redirect:'error',signal});
     if(response.status===402)throw new PublicOriginalPurchaseRequired();
     if(!response.ok)throw Error('The Original could not be opened. Its saved proof is unchanged.');
     const bytes=await readPublicLedgerBytes(response,16*1024*1024);signal.throwIfAborted();
     file=new File([new Uint8Array(bytes)],'original.receizbundle',{type:'application/vnd.receiz.bundle+json'});
    }
    controller.signal.throwIfAborted();original=await identity.holdProof(file);
   }
   controller.signal.throwIfAborted();
   if(original.digest!==digest)throw Error('This source does not match the selected Original.');
   const result=await identity.publishAssetToMarket(original);
   if(!controller.signal.aborted){if(result.pbiSigned)setSigned(true);else throw Error('The signature was not confirmed. Your Original remains saved.');}
  }catch(cause){if(!controller.signal.aborted)setError(cause instanceof Error&&cause.message==='passkey_cancelled'?'Signing was cancelled. Your Original remains saved.':cause instanceof Error?cause.message:'Your Original remains saved. Try signing again.');}
  finally{if(!controller.signal.aborted){running.current=false;setBusy(false);}}
 }
 return <span className="original-unlock-control"><button type="button" className="original-unlock-button" disabled={busy} aria-label="Unlock value with PBI" title="Sign this Original with PBI to unlock its value" onClick={()=>void sign()}>{busy?<InlineOpening compact label="Signing Original"/>:<Fingerprint size={19} strokeWidth={1.5}/>}</button>{error&&<span className="original-unlock-error" role="alert">{error}</span>}</span>;
}
