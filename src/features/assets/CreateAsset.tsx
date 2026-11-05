import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import {InlineOpening} from '../../components/InlineOpening';
import {ArrowRight,ChevronRight,Landmark,ShieldCheck} from 'lucide-react';
import type {OpenIdentity} from '../../receiz/native-identity';
import type {HeldDeposit} from '../../receiz/deposit-source';
import {composerDefinition,composerDraftWithLink,type AssetComposerDraft} from '../../receiz/asset-composer';
import {AmountInput} from '../../components/AmountInput';
import {NativeOperation} from '../account/NativeOperation';
import {bankOperationDollars} from '../../receiz/bank-operations';
import {retainedPublicProfile} from '../../receiz/public-profile';
import {admittedAssetPublicationItem,admittedAssetPublicationDelivery,admittedAssetPublicationSignatureDelivery,subscribeAssetPublicationAdmissions} from '../../receiz/asset-publication-adoption';
import {retainPublicAsset} from '../../receiz/public-asset-page';
import {AssetComposer} from './AssetComposer';
import {CreatedAssetResult} from './CreatedAssetResult';
import './asset-studio.css';
import './asset-creation-studio.css';
import type {BackedPublicationState} from '../../receiz/backed-asset-publication';
const ImportOriginal=lazy(()=>import('../deposit/LiveDeposit').then(module=>({default:module.LiveDeposit})));
export function CreateAsset({identity,onRefresh,onClose,active:visible=true}:{active?:boolean;identity:OpenIdentity;onRefresh():void;onClose():void}){
 const [draft,setDraft]=useState<AssetComposerDraft>({title:'',description:'',kind:'moment',longForm:'',files:[]}),[link,setLink]=useState(''),[settings,setSettings]=useState({symbol:'',units:'1000'}),[funded,setFunded]=useState(false),[backing,setBacking]=useState('');
 const [reviewing,setReviewing]=useState(false),[importing,setImporting]=useState(false);
 const [result,setResult]=useState<HeldDeposit|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [progress,setProgress]=useState<import('../../receiz/asset-publication').AssetCreationProgress|null>(null),[elapsed,setElapsed]=useState(0);
 const [backedState,setBackedState]=useState<BackedPublicationState|null>(null),[resultBacked,setResultBacked]=useState(false);
 const active=useRef(true),running=useRef(false),revision=useRef(0);
 useEffect(()=>{
  active.current=true;running.current=false;setBusy(false);let current=true;const at=revision.current;
  const stillCurrent=()=>current&&active.current&&at===revision.current;
  void Promise.allSettled([identity.backedAssetPublication?.().then(api=>api.pending())??Promise.resolve(null),identity.pendingAssetPublication?.()??Promise.resolve(null)]).then(async([backed,ordinary])=>{
   if(!stillCurrent())return;
   if(backed.status==='fulfilled'&&backed.value?.state&&backed.value.state.stage!=='published'){setBackedState(backed.value.state);setFunded(true);setResultBacked(true);if(backed.value.deposit)setResult(backed.value.deposit);}
   else if(ordinary.status==='fulfilled'&&ordinary.value){
    setResult(ordinary.value);
    // Continue only this saved, unsigned delivery once, including an earlier
    // refusal whose accepted receipt was not returned. Its existing publisher
    // reuses the exact retained append and persists the returned acknowledgment.
    // Opening an empty editor or a newly created result starts no extra delivery.
    if((ordinary.value.publication?.status==='pending'||ordinary.value.publication?.status==='rejected')&&!ordinary.value.pbiSigned&&identity.retryAssetPublication){
     running.current=true;setBusy(true);
     try{const settled=await identity.retryAssetPublication();if(stillCurrent()&&settled){setResult(settled);onRefresh();}}
     catch(cause){if(stillCurrent())setError(cause instanceof Error?cause.message:'Your original remains saved. Try delivery again.');}
     finally{if(current){running.current=false;if(stillCurrent())setBusy(false);}}
    }
   }
   if(stillCurrent()&&(backed.status==='rejected'||ordinary.status==='rejected'))setError('A saved creation could not be reopened. Your original recovery remains on this device.');
  });
  return()=>{current=false;active.current=false;};
 },[identity]);
 useEffect(()=>{if(!busy||result)return;const started=performance.now();setElapsed(0);const timer=setInterval(()=>setElapsed(Math.floor((performance.now()-started)/1000)),1000);return()=>clearInterval(timer);},[busy,!!result]);
 async function create(){if(running.current)return;running.current=true;revision.current++;setBusy(true);setProgress({stage:'preparing'});setError('');try{
  const selected=result?null:composerDraftWithLink(draft,link);
  const definition=selected?composerDefinition(selected,settings):null;
  if(result&&!identity.retryAssetPublication)throw Error('Reopen your saved asset before retrying delivery.');
  const value=result&&resultBacked?await(await identity.backedAssetPublication()).resume():result?await identity.retryAssetPublication!():await identity.createComposedAsset(definition!,selected!,value=>{if(active.current)setProgress(value);});
  if(active.current){if(value)setResult(value);onRefresh();}
 }catch(cause){if(active.current)setError(cause instanceof Error&&cause.message==='COMPOSER_LINK_INVALID'?'Enter a valid HTTP or HTTPS link.':cause instanceof Error&&cause.message==='COMPOSER_LINK_CLAIM_CAPACITY'?'Shorten the description or link to fit within 2,000 characters.':cause instanceof Error&&cause.message.startsWith('COMPOSER_')?'Check your original, cover and file sizes before creating this asset.':cause instanceof Error?cause.message:'Your asset could not be created. Your selected files remain here.');}finally{running.current=false;if(active.current){setBusy(false);setProgress(null);}}}
 useEffect(()=>{if(!result)return;const digest=result.digest,username=identity.accountUsername?.()??identity.username;if(!username)return;const admitted=()=>{if(!active.current)return;const item=admittedAssetPublicationItem(digest,username),delivery=admittedAssetPublicationDelivery(digest,username),signatureDelivery=admittedAssetPublicationSignatureDelivery(digest,username);if(!item&&!delivery&&!signatureDelivery)return;setResult(current=>current?.digest===digest?{...current,...(item?.hasPbiSignature?{pbiSigned:true}:{}),...(delivery&&!(current.publication?.status==='published'&&delivery.status!=='published')?{publication:delivery}:{}),...(signatureDelivery?{marketPublication:signatureDelivery}:{})}:current);if(signatureDelivery?.status==='published')setBusy(false);};admitted();return subscribeAssetPublicationAdmissions(admitted);},[identity,result?.digest,result?.pbiSigned]);
 async function publishMarket(){if(!result||running.current)return;running.current=true;setBusy(true);setError('');try{const signed=await identity.publishAssetToMarket(result);if(active.current){setResult(signed);}}catch(cause){if(active.current&&!admittedAssetPublicationItem(result.digest,identity.accountUsername?.()??identity.username??'')?.hasPbiSignature)setError(cause instanceof Error&&cause.message==='passkey_cancelled'?'Signing was cancelled. Your original remains saved.':cause instanceof Error?cause.message:'Your original remains saved. Try signing again.');}finally{running.current=false;if(active.current)setBusy(false);}}
 function save(){if(!result)return;const url=URL.createObjectURL(new Blob([new Uint8Array(result.bytes)])),link=document.createElement('a');link.href=url;link.download=result.filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 const username=identity.accountUsername?.()??identity.username;
 const publicItem=result&&username?(admittedAssetPublicationItem(result.digest,username)??retainedPublicProfile(username)?.items.find(item=>item.originalDigest===result.digest)??null):null;
 if(result)return <CreatedAssetResult result={result} settings={settings} busy={busy} error={error} username={username} publicItem={publicItem} onRetryDelivery={create} onPublishMarket={publishMarket} onOpenAsset={()=>{if(publicItem)retainPublicAsset(publicItem);}} onSave={save} onClose={onClose}/>;
 async function adoptBacked(completed?:HeldDeposit|null){const current=await(await identity.backedAssetPublication()).pending(!completed);if(active.current){setResultBacked(true);setBackedState(current.state);if(completed??current.deposit){setResult(completed??current.deposit);onRefresh();}}}
 async function resumeBacked(){if(running.current)return;running.current=true;setBusy(true);setError('');try{const completed=await(await identity.backedAssetPublication()).resume();await adoptBacked(completed);onRefresh();}catch(cause){if(active.current)setError(cause instanceof Error?cause.message:'Your original creation remains saved. Try again when connected.');}finally{running.current=false;if(active.current)setBusy(false);}}
 if(backedState&&!result&&backedState.stage!=='published'){
  if(backedState.stage==='source-held'){const saved=backedState.intent as {definition:ReturnType<typeof composerDefinition>;amountUsdCents:string};return <><NativeOperation identity={identity} operations={async()=>(await identity.backedAssetPublication()).operations()} input={()=>({kind:'fund-asset',definition:saved.definition,fundingRule:'reserve-first-then-settlement',amountUsdCents:saved.amountUsdCents})} inputKey={backedState.intentDigest} title="Asset creation" confirmLabel="Create funded asset" onRefresh={onRefresh} onResult={()=>adoptBacked()}><h1 className="sheet-hero">Continue your asset.</h1><p className="body-copy">{saved.definition.name}. Your original and selected files are saved. Review its backing to continue.</p></NativeOperation><button className="secondary-button" onClick={()=>void identity.backedAssetPublication().then(api=>api.cancel()).then(()=>{setBackedState(null);setResultBacked(false);})}>Cancel creation</button></>;}
  return <><h1 className="sheet-hero">Confirming your asset.</h1><p className="body-copy">Your original creation is saved. Check its recorded outcome to continue.</p><button className="primary-button" disabled={busy} onClick={()=>void resumeBacked()}>{busy?'Checking your creation…':'Continue creation'}</button>{error&&<p className="error-message" role="alert">{error}</p>}<button className="secondary-button" onClick={onClose}>Done</button></>;
 }

 if(importing)return <div className="asset-import-studio"><Suspense fallback={<InlineOpening label="Opening original import"/>}><ImportOriginal identity={identity} onClose={onClose} onRefresh={onRefresh} initialKind="asset" onAssetBack={()=>setImporting(false)} onCreateAsset={()=>setImporting(false)}/></Suspense></div>;
 const fields=<><AssetComposer value={draft} link={link} onLinkChange={value=>{revision.current++;setLink(value);}} onChange={value=>{revision.current++;setDraft(value);}} studio={{onImport:()=>setImporting(true),active:visible,reviewing,onReview:()=>setReviewing(true),onEdit:()=>setReviewing(false),author:username}}/><div className="asset-creation-options" hidden={!reviewing}><button type="button" className="asset-import-entry" aria-label="Use an existing proof" onClick={()=>setImporting(true)}>Already have a proof object?<ArrowRight size={13}/></button><button type="button" className="creation-option" disabled={busy} aria-label={funded?'Remove backing':'Add backing'} aria-expanded={funded} onClick={()=>{revision.current++;setFunded(!funded);}}><span className="creation-option-icon"><Landmark size={19} strokeWidth={1.4}/></span><span>{funded?'Remove backing':'Add backing'}</span><small>Optional</small><ChevronRight size={17}/></button><details className="transaction-proof-details creation-asset-details"><summary>Asset details <span className="small-copy">Optional</span></summary><div className="form-columns"><label className="form-field"><span>Short code</span><input maxLength={8} value={settings.symbol} onChange={event=>setSettings({...settings,symbol:event.target.value.toUpperCase()})} placeholder="Set automatically" autoCapitalize="characters"/></label><label className="form-field"><span>Defined units</span><input inputMode="decimal" value={settings.units} onChange={event=>setSettings({...settings,units:event.target.value})}/></label></div></details></div></>;
 return <div className="asset-creation asset-creation--studio" data-creation-step={reviewing?'review':'canvas'}>{funded?<NativeOperation identity={identity} operations={async()=>(await identity.backedAssetPublication()).operations(composerDraftWithLink(draft,link))} onResult={()=>adoptBacked()} inputKey={JSON.stringify([draft,link,settings,backing])} input={()=>{return{kind:'fund-asset',definition:composerDefinition(composerDraftWithLink(draft,link),settings),fundingRule:'reserve-first-then-settlement',amountUsdCents:bankOperationDollars(backing)};}} title="Asset creation" confirmLabel="Create funded asset" onRefresh={onRefresh}>{fields}<div className="asset-creation-backing" hidden={!reviewing}><AmountInput label="Backing amount" value={backing} onChange={setBacking} dollars/><p className="body-copy small-copy">Your account funds this amount automatically. Backing stays with the asset and cannot be spent separately.</p></div></NativeOperation>:<><fieldset className="moment-form-fields" disabled={busy}>{fields}</fieldset><div className="asset-creation-review-actions" hidden={!reviewing}>{busy&&<section className="asset-seal-progress" role="status" aria-live="polite"><InlineOpening label="Sealing your Original"/><div><strong>{progress?.stage==='saving'?'Saving your Original':progress?.stage==='sealing'?'Sealing your Original':'Preparing your Original'}</strong><span>{elapsed>0?`${elapsed}s elapsed`:'On this device'} · Your original stays here</span></div>{progress?.stage==='sealing'&&progress.ratio!==undefined&&<progress aria-label="Seal progress" max={1} value={progress.ratio}/>}</section>}<div className="note-box"><ShieldCheck size={18}/><p>Your original, artwork, attachments and full text form one public proof object. Sealing publishes the Original on Receiz. Signing unlocks its accrued value. Bankeiz Market listing is separate. Your original keeps the source, ownership and history together.</p></div><button className="primary-button" aria-label={busy?'Creating your asset':'Create asset'} disabled={busy} onClick={()=>void create()}>{busy?'Creating…':<>Create<span className="creation-action-extra"> asset</span></>}<ArrowRight size={17}/></button>{error&&<p className="error-message" role="alert">{error}</p>}</div></>}</div>;
}
