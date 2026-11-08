import {lazy,Suspense,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {InlineOpening} from '../../components/InlineOpening';
import {ArrowRight,ChevronRight,Landmark,ShieldCheck} from 'lucide-react';
import type {OpenIdentity} from '../../receiz/native-identity';
import type {HeldDeposit} from '../../receiz/deposit-source';
import {composerDefinition,composerDraftWithLink,type AssetComposerDraft} from '../../receiz/asset-composer';
import {AmountInput} from '../../components/AmountInput';
import {NativeOperation} from '../account/NativeOperation';
import {bankOperationDollars} from '../../receiz/bank-operations';
import {retainedPublicProfile,subscribePublicProfiles} from '../../receiz/public-profile';
import {admittedAssetPublicationItem,admittedAssetPublicationDelivery,admittedAssetPublicationSignatureDelivery,subscribeAssetPublicationAdmissions} from '../../receiz/asset-publication-adoption';
import {retainPublicAsset} from '../../receiz/public-asset-page';
import {AssetComposer} from './AssetComposer';
import {CreatedAssetResult} from './CreatedAssetResult';
import {createdAssetHeldItem,createdAssetHasHeldSignature,retainCreatedAssetResult} from './created-asset-state';
import {createSealTimeEstimator,type AssetDeliveryTiming} from './asset-progress-estimate';
import './asset-studio.css';
import './asset-creation-studio.css';
import type {BackedPublicationState} from '../../receiz/backed-asset-publication';
import {assetPublicationDeliveryTiming,isAssetPublicationDeliveryActive,subscribeAssetPublicationDeliveries,retainAssetPublicationDelivery,type AssetPublicationAttempt} from '../../receiz/asset-publication';
const ImportOriginal=lazy(()=>import('../deposit/LiveDeposit').then(module=>({default:module.LiveDeposit})));
export function CreateAsset({identity,onRefresh,onClose,active:visible=true,marketItems=[]}:{marketItems?:readonly import('../../receiz/public-market').PublicMarketItem[];active?:boolean;identity:OpenIdentity;onRefresh():void;onClose():void}){
 const username=identity.accountUsername?.()??identity.username,accountUid=identity.walletReceivingAddress?.();
 const heldProfile=useSyncExternalStore(subscribePublicProfiles,()=>username?retainedPublicProfile(username):null,()=>null);
 const [draft,setDraft]=useState<AssetComposerDraft>({title:'',description:'',kind:'moment',longForm:'',files:[]}),[link,setLink]=useState(''),[settings,setSettings]=useState({symbol:'',units:'1000'}),[funded,setFunded]=useState(false),[backing,setBacking]=useState('');
 const [reviewing,setReviewing]=useState(false),[importing,setImporting]=useState(false);
 const [result,setResult]=useState<HeldDeposit|null>(null),[busy,setBusy]=useState(false),[signing,setSigning]=useState(false),[error,setError]=useState('');
 const [deliveryAttempt,setDeliveryAttempt]=useState<AssetPublicationAttempt|null>(null);
 const [progress,setProgress]=useState<import('../../receiz/asset-publication').AssetCreationProgress|null>(null),[elapsed,setElapsed]=useState(0);
 const [backedState,setBackedState]=useState<BackedPublicationState|null>(null),[resultBacked,setResultBacked]=useState(false);
 const active=useRef(true),running=useRef(false),signingRunning=useRef(false),revision=useRef(0),sealEstimate=useRef(createSealTimeEstimator());
 const signatureTiming=useRef<AssetDeliveryTiming|undefined>(undefined),signatureAttempt=useRef(0);
 useEffect(()=>{setDeliveryAttempt(null);return subscribeAssetPublicationDeliveries(attempt=>{if(active.current&&attempt.ownerReceizId===identity.binding?.artifactOwnerReceizId)setDeliveryAttempt(attempt);});},[identity]);
 useEffect(()=>{if(deliveryAttempt?.active||!deliveryAttempt?.publication)return;const {sourceDigest,publication}=deliveryAttempt;setResult(current=>current?.digest===sourceDigest?{...current,publication:retainAssetPublicationDelivery(current.publication,publication)}:current);},[deliveryAttempt,result?.digest]);
 useEffect(()=>{
  active.current=true;running.current=false;signingRunning.current=false;setBusy(false);setSigning(false);let current=true;const at=++revision.current;
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
     try{const settled=await identity.retryAssetPublication();if(stillCurrent()&&settled){setResult(current=>retainCreatedAssetResult(current,settled));onRefresh();}}
     catch(cause){if(stillCurrent())setError(cause instanceof Error?cause.message:'Your original remains saved. Try delivery again.');}
     finally{if(current){running.current=false;if(stillCurrent())setBusy(false);}}
    }
   }
   if(stillCurrent()&&(backed.status==='rejected'||ordinary.status==='rejected'))setError('A saved creation could not be reopened. Your original recovery remains on this device.');
  });
  return()=>{current=false;active.current=false;};
 },[identity]);
 useEffect(()=>{if(!busy||result)return;const started=performance.now();setElapsed(0);const timer=setInterval(()=>setElapsed(Math.floor((performance.now()-started)/1000)),1000);return()=>clearInterval(timer);},[busy,!!result]);
 async function create(){if(running.current)return;running.current=true;const at=++revision.current;sealEstimate.current.reset();setBusy(true);setProgress({stage:'preparing'});setError('');try{
  const selected=result?null:composerDraftWithLink(draft,link);
  const definition=selected?composerDefinition(selected,settings):null;
  if(result&&!identity.retryAssetPublication)throw Error('Reopen your saved asset before retrying delivery.');
  const value=result&&resultBacked?await(await identity.backedAssetPublication()).resume():result?await identity.retryAssetPublication!():await identity.createComposedAsset(definition!,selected!,value=>{if(active.current){sealEstimate.current.update(value,performance.now());setProgress(value);}});
  if(active.current&&at===revision.current){if(value)setResult(current=>retainCreatedAssetResult(current,value));onRefresh();}
 }catch(cause){if(active.current&&at===revision.current)setError(cause instanceof Error&&cause.message==='COMPOSER_LINK_INVALID'?'Enter a valid HTTP or HTTPS link.':cause instanceof Error&&cause.message==='COMPOSER_LINK_CLAIM_CAPACITY'?'Shorten the description or link to fit within 2,000 characters.':cause instanceof Error&&cause.message.startsWith('COMPOSER_')?'Check your original, cover and file sizes before creating this asset.':cause instanceof Error?cause.message:'Your asset could not be created. Your selected files remain here.');}finally{if(at===revision.current){running.current=false;if(active.current){setBusy(false);setProgress(null);}}}}
 useEffect(()=>{if(!result)return;const digest=result.digest,username=identity.accountUsername?.()??identity.username;if(!username)return;const admitted=()=>{if(!active.current)return;const item=admittedAssetPublicationItem(digest,username),delivery=admittedAssetPublicationDelivery(digest,username),signatureDelivery=admittedAssetPublicationSignatureDelivery(digest,username);if(!item&&!delivery&&!signatureDelivery)return;if(item?.hasPbiSignature&&signingRunning.current&&!signatureTiming.current)signatureTiming.current={attemptId:`signature:${++signatureAttempt.current}`,sourceDigest:digest,phase:'signature',sizeBytes:result.bytes.byteLength,startedAtMs:performance.now()};setResult(current=>current?.digest===digest?{...current,...(item?.hasPbiSignature?{pbiSigned:true}:{}),...(delivery?{publication:retainAssetPublicationDelivery(current.publication,delivery)}:{}),...(signatureDelivery?{marketPublication:retainAssetPublicationDelivery(current.marketPublication,signatureDelivery)}:{})}:current);if(signatureDelivery?.status==='published')setBusy(false);};admitted();return subscribeAssetPublicationAdmissions(admitted);},[identity,result?.digest,result?.pbiSigned]);
 async function publishMarket(){if(!result||signingRunning.current)return;signingRunning.current=true;const at=revision.current;signatureTiming.current=undefined;setSigning(true);setError('');try{const signed=await identity.publishAssetToMarket(result);if(active.current&&at===revision.current){
  const username=identity.accountUsername?.()??identity.username??'',sourceDelivery=admittedAssetPublicationDelivery(signed.digest,username),signatureDelivery=admittedAssetPublicationSignatureDelivery(signed.digest,username);
  // Public admission may finish before this older delivery call returns.
  // Keep the held Source confirmation and select only the current PBI append.
  setResult(current=>retainCreatedAssetResult(current,{...signed,publication:retainAssetPublicationDelivery(current?.digest===signed.digest?current.publication:undefined,retainAssetPublicationDelivery(sourceDelivery??undefined,signed.publication)),marketPublication:retainAssetPublicationDelivery(current?.digest===signed.digest?current.marketPublication:undefined,retainAssetPublicationDelivery(signatureDelivery??undefined,signed.marketPublication))}));
 }}catch(cause){if(active.current&&at===revision.current&&!admittedAssetPublicationItem(result.digest,identity.accountUsername?.()??identity.username??'')?.hasPbiSignature)setError(cause instanceof Error&&cause.message==='passkey_cancelled'?'Signing was cancelled. Your original remains saved.':cause instanceof Error?cause.message:'Your original remains saved. Try signing again.');}finally{if(at===revision.current){signingRunning.current=false;if(active.current)setSigning(false);}}}
 const savingOriginal=useRef<{digest:string;revision:number}|null>(null);
 async function save(){
  if(!result)return;const selected=result,at=revision.current;if(savingOriginal.current?.digest===selected.digest&&savingOriginal.current.revision===at)return;const attempt={digest:selected.digest,revision:at};savingOriginal.current=attempt;setError('');
  const assertCurrent=()=>{if(!active.current||at!==revision.current)throw Error('ORIGINAL_FILE_SELECTION_CHANGED');};
  try{const {createdAssetOriginalFile}=await import('../../receiz/created-asset-file');assertCurrent();const file=await createdAssetOriginalFile(identity,selected,assertCurrent);assertCurrent();
   const url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download=file.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(cause){if(active.current&&at===revision.current)setError(cause instanceof Error?cause.message:'Your Original could not be saved. Its held proof is unchanged.');}
  finally{if(savingOriginal.current===attempt)savingOriginal.current=null;}
 }
 const publicItem=result&&username?(admittedAssetPublicationItem(result.digest,username,accountUid??undefined)??(!accountUid||heldProfile?.userId===accountUid?heldProfile?.items.find(item=>item.originalDigest===result.digest):null)??createdAssetHeldItem(result,marketItems,username,accountUid)):null;
 const heldSigned=!!result&&createdAssetHasHeldSignature(result,publicItem,username,accountUid);
 useEffect(()=>{if(heldSigned)setResult(current=>current&&!current.pbiSigned?{...current,pbiSigned:true}:current);},[heldSigned,result?.digest]);
 const shownResult=result&&heldSigned&&!result.pbiSigned?{...result,pbiSigned:true}:result;
 // Closing a completed creation finishes this editor visit. The retained
 // Original and its optional signature remain in Assets; an unfinished draft
 // or interrupted source delivery keeps its existing recovery path.
 useEffect(()=>{
  if(visible||!shownResult||!shownResult.pbiSigned&&shownResult.publication?.status!=='published'&&shownResult.marketPublication?.status!=='published')return;
  void identity.dismissAssetCreation?.(shownResult.digest).catch(()=>{/* Exact source and pending delivery remain retained if local persistence is unavailable. */});
  revision.current++;running.current=false;signingRunning.current=false;signatureTiming.current=undefined;
  setResult(null);setDeliveryAttempt(null);setBusy(false);setSigning(false);setError('');setProgress(null);
  setDraft({title:'',description:'',kind:'moment',longForm:'',files:[]});setLink('');setSettings({symbol:'',units:'1000'});
  setReviewing(false);setImporting(false);setFunded(false);setBacking('');setBackedState(null);setResultBacked(false);
 },[visible,shownResult?.digest,shownResult?.pbiSigned,shownResult?.publication?.status,shownResult?.marketPublication?.status,marketItems,username,accountUid]);
 const delivering=!!result&&(busy||(deliveryAttempt?.sourceDigest===result.digest?deliveryAttempt.active:!!identity.binding&&isAssetPublicationDeliveryActive(identity.binding.artifactOwnerReceizId,result.digest)));
 const sourceTiming=result?(deliveryAttempt?.sourceDigest===result.digest?deliveryAttempt.timing:identity.binding?assetPublicationDeliveryTiming(identity.binding.artifactOwnerReceizId,result.digest):undefined):undefined;
 if(result)return <CreatedAssetResult result={shownResult!} settings={settings} busy={signing} deliveryActive={delivering} deliveryTiming={result.pbiSigned?signatureTiming.current:sourceTiming} allowLocalSigning={!resultBacked} error={error} username={username} publicItem={publicItem} onRetryDelivery={create} onPublishMarket={publishMarket} onOpenAsset={()=>{if(publicItem)retainPublicAsset(publicItem);}} onSave={save} onClose={onClose}/>;
 async function adoptBacked(completed?:HeldDeposit|null){const current=await(await identity.backedAssetPublication()).pending(!completed);if(active.current){setResultBacked(true);setBackedState(current.state);if(completed??current.deposit){setResult(previous=>retainCreatedAssetResult(previous,(completed??current.deposit)!));onRefresh();}}}
 async function resumeBacked(){if(running.current)return;running.current=true;setBusy(true);setError('');try{const completed=await(await identity.backedAssetPublication()).resume();await adoptBacked(completed);onRefresh();}catch(cause){if(active.current)setError(cause instanceof Error?cause.message:'Your original creation remains saved. Try again when connected.');}finally{running.current=false;if(active.current)setBusy(false);}}
 if(backedState&&!result&&backedState.stage!=='published'){
  if(backedState.stage==='source-held'){const saved=backedState.intent as {definition:ReturnType<typeof composerDefinition>;amountUsdCents:string};return <><NativeOperation identity={identity} operations={async()=>(await identity.backedAssetPublication()).operations()} input={()=>({kind:'fund-asset',definition:saved.definition,fundingRule:'reserve-first-then-settlement',amountUsdCents:saved.amountUsdCents})} inputKey={backedState.intentDigest} title="Asset creation" confirmLabel="Create funded asset" onRefresh={onRefresh} onResult={()=>adoptBacked()}><h1 className="sheet-hero">Continue your asset.</h1><p className="body-copy">{saved.definition.name}. Your original and selected files are saved. Review its backing to continue.</p></NativeOperation><button className="secondary-button" onClick={()=>void identity.backedAssetPublication().then(api=>api.cancel()).then(()=>{setBackedState(null);setResultBacked(false);})}>Cancel creation</button></>;}
  return <><h1 className="sheet-hero">Confirming your asset.</h1><p className="body-copy">Your original creation is saved. Check its recorded outcome to continue.</p><button className="primary-button" disabled={busy} onClick={()=>void resumeBacked()}>{busy?'Checking your creation…':'Continue creation'}</button>{error&&<p className="error-message" role="alert">{error}</p>}<button className="secondary-button" onClick={onClose}>Done</button></>;
 }

 if(importing)return <div className="asset-import-studio"><Suspense fallback={<InlineOpening label="Opening original import"/>}><ImportOriginal identity={identity} onClose={onClose} onRefresh={onRefresh} initialKind="asset" onAssetBack={()=>setImporting(false)} onCreateAsset={()=>setImporting(false)}/></Suspense></div>;
 const sealRemaining=progress?.stage==='sealing'?sealEstimate.current.remainingMs(performance.now()):null;
 const sealEstimateLabel=sealRemaining===null?null:`About ${sealRemaining>=60_000?`${Math.ceil(sealRemaining/60_000)} min`:`${Math.max(1,Math.ceil(sealRemaining/1000))}s`} remaining`;
 const fields=<><AssetComposer value={draft} link={link} onLinkChange={value=>{revision.current++;setLink(value);}} onChange={value=>{revision.current++;setDraft(value);}} studio={{onImport:()=>setImporting(true),active:visible,reviewing,onReview:()=>setReviewing(true),onEdit:()=>setReviewing(false),author:username}}/><div className="asset-creation-options" hidden={!reviewing}><button type="button" className="asset-import-entry" aria-label="Use an existing proof" onClick={()=>setImporting(true)}>Already have a proof object?<ArrowRight size={13}/></button><button type="button" className="creation-option" disabled={busy} aria-label={funded?'Remove backing':'Add backing'} aria-expanded={funded} onClick={()=>{revision.current++;setFunded(!funded);}}><span className="creation-option-icon"><Landmark size={19} strokeWidth={1.4}/></span><span>{funded?'Remove backing':'Add backing'}</span><small>Optional</small><ChevronRight size={17}/></button><details className="transaction-proof-details creation-asset-details"><summary>Asset details <span className="small-copy">Optional</span></summary><div className="form-columns"><label className="form-field"><span>Short code</span><input maxLength={8} value={settings.symbol} onChange={event=>setSettings({...settings,symbol:event.target.value.toUpperCase()})} placeholder="Set automatically" autoCapitalize="characters"/></label><label className="form-field"><span>Defined units</span><input inputMode="decimal" value={settings.units} onChange={event=>setSettings({...settings,units:event.target.value})}/></label></div></details></div></>;
 return <div className="asset-creation asset-creation--studio" data-creation-step={reviewing?'review':'canvas'}>{funded?<NativeOperation identity={identity} operations={async()=>(await identity.backedAssetPublication()).operations(composerDraftWithLink(draft,link))} onResult={()=>adoptBacked()} inputKey={JSON.stringify([draft,link,settings,backing])} input={()=>{return{kind:'fund-asset',definition:composerDefinition(composerDraftWithLink(draft,link),settings),fundingRule:'reserve-first-then-settlement',amountUsdCents:bankOperationDollars(backing)};}} title="Asset creation" confirmLabel="Create funded asset" onRefresh={onRefresh}>{fields}<div className="asset-creation-backing" hidden={!reviewing}><AmountInput label="Backing amount" value={backing} onChange={setBacking} dollars/><p className="body-copy small-copy">Your account funds this amount automatically. Backing stays with the asset and cannot be spent separately.</p></div></NativeOperation>:<><fieldset className="moment-form-fields" disabled={busy}>{fields}</fieldset><div className="asset-creation-review-actions" hidden={!reviewing}>{busy&&<section className="asset-seal-progress" role="status" aria-live="polite"><InlineOpening label="Sealing your Original"/><div><strong>{progress?.stage==='saving'?'Saving your Original':progress?.stage==='sealing'?'Sealing your Original':'Preparing your Original'}</strong><span>{sealEstimateLabel??(elapsed>0?`${elapsed}s elapsed`:'On this device')} · Your original stays here</span></div>{progress?.stage==='sealing'&&progress.ratio!==undefined&&<progress aria-label="Seal progress" max={1} value={progress.ratio}/>}</section>}<div className="note-box"><ShieldCheck size={18}/><p>Your original, artwork, attachments and full text form one public proof object. Sealing publishes the Original on Receiz. Signing unlocks its accrued value. Bankeiz Market listing is separate. Your original keeps the source, ownership and history together.</p></div><button className="primary-button" aria-label={busy?'Creating your asset':'Create asset'} disabled={busy} onClick={()=>void create()}>{busy?'Creating…':<>Create<span className="creation-action-extra"> asset</span></>}<ArrowRight size={17}/></button>{error&&<p className="error-message" role="alert">{error}</p>}</div></>}</div>;
}
