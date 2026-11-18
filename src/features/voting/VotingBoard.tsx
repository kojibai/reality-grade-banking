import {receizKaiNow} from '@receiz/sdk';
import {useCallback,useEffect,useRef,useMemo,useState,useSyncExternalStore} from 'react';
import {BookOpen,Download,FileCheck2,RefreshCw,Upload} from 'lucide-react';
import {reviewClosure} from '../../receiz/governance-closure';
import {followGovernanceAdditions,notifyGovernancePublication} from '../../receiz/governance-live';
import {governanceLocation,governancePath} from '../../receiz/governance-links';
import {GovernanceRegister,GovernanceHeading,governanceExamplePath} from './GovernanceRegister';
import {saveIdentityRecord} from '../../checkout/CheckoutIdentity';
import {MeetingIdentity} from '../meeting/MeetingIdentity';
import {checkoutIdentitySession} from '../../checkout/checkout-identity';
import type {OpenIdentity} from '../../receiz/native-identity';
import {governanceRows,subscribeGovernance,openPublicGovernancePage,refreshGovernanceDirectory,restoreGovernanceDirectory,heldGovernanceOriginal,type GovernanceRow} from '../../receiz/governance-directory';
import {charterElectorate,openGovernanceOriginal,sealGovernanceOriginal,type GovernanceOriginal,type GovernanceTerms} from '../../receiz/governance-documents';
import {governanceOutbox,rememberGovernanceDelivery,reopenPendingGovernance,type PendingOriginal} from '../../receiz/governance-outbox';
import {eligibleProposal,voteEnds,charterRatification,governanceTitle,ofKind,type Row} from '../../receiz/governance-view';
import {GovernanceFacts,GovernanceDetail} from './GovernanceDetail';
import {GovernanceComposer} from './GovernanceComposer';
import './voting.css';

type Screen='list'|'charter'|'proposal'|'detail'|'review'|'saved';
type Props={profile?:{uid:string;name:string;ownerIdentity:OpenIdentity|null};initialDigest?:string};
const blank=Object.freeze([]) as readonly GovernanceRow[];
const asRow=(o:GovernanceOriginal):GovernanceRow=>({digest:o.digest,document:o.document,pulse:o.pulse,profileUid:null});
function save(file:File){const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}

export function VotingBoard({profile,initialDigest}:Props){
  const publicRows=useSyncExternalStore(subscribeGovernance,governanceRows,()=>blank);
  const [privateSources,setPrivateSources]=useState<GovernanceOriginal[]>([]),[outbox,setOutbox]=useState<PendingOriginal[]>([]);
  const [identity,setIdentity]=useState<OpenIdentity|null>(profile?.ownerIdentity??null),[screen,setScreen]=useState<Screen>(initialDigest?'detail':'list');
  const [selected,select]=useState(initialDigest??''),[mode,setMode]=useState<'charter'|'proposal'>('charter'),[terms,setTerms]=useState<GovernanceTerms|null>(null);
  const [saved,setSaved]=useState<GovernanceOriginal|null>(null),[error,setError]=useState(''),[delivery,setDelivery]=useState(''),[syncing,setSyncing]=useState(false),[busy,setBusy]=useState(false),[entryBusy,setEntryBusy]=useState(false);
  const trail=useRef<string[]>([]);
  const session=useRef<ReturnType<typeof checkoutIdentitySession>|null>(null),fileInput=useRef<HTMLInputElement>(null),active=useRef(true),acting=useRef(false),currentIdentity=useRef(identity);
  const access=()=>session.current??=checkoutIdentitySession();
  const rows=useMemo(()=>{const published=new Set(publicRows.map(r=>r.digest));return [...publicRows,...privateSources.filter(o=>!published.has(o.digest)).map(asRow)];},[publicRows,privateSources]);
  const chosen=rows.find(r=>r.digest===selected),charters=ofKind(rows,'charter'),actor=identity?.binding.artifactOwnerReceizId??null;
  const eligibleCharters=charters.filter(c=>actor&&charterElectorate(c.document.terms.rules).includes(actor)&&charterRatification(c,rows).complete);
  const publicProfile=Boolean(profile&&!profile.ownerIdentity);
  const [personal,setPersonal]=useState(false);
  const publicDigests=new Set(publicRows.map(r=>r.digest));
  const viewRows=publicProfile||personal?rows.filter(r=>publicProfile?r.profileUid===profile?.uid:r.document.author===actor):publicRows;
  const exact=(digest:string)=>{const local=privateSources.find(o=>o.digest===digest);return local?Promise.resolve(local):heldGovernanceOriginal(digest);};
  const check=(who:OpenIdentity|null)=>{if(!active.current||currentIdentity.current!==who)throw Error('The open identity changed.');};
  const setOwner=useCallback((who:OpenIdentity|null)=>{currentIdentity.current=who;setIdentity(who);setPrivateSources([]);setSaved(null);setOutbox([]);},[]);
  const sync=useCallback(()=>refreshGovernanceDirectory(),[]);
  async function refreshByRequest(){
    if(syncing)return;
    setSyncing(true);
    const before=governanceRows().length;
    try{
      await refreshGovernanceDirectory(true);
      if(active.current){const added=governanceRows().length-before;setDelivery(added>0?added+' new '+(added===1?'record.':'records.'):'Up to date.');}
    }catch{
      if(active.current)setDelivery('Public delivery is unavailable. You can still read the records on this device.');
    }finally{if(active.current)setSyncing(false);}
  }
  useEffect(()=>{active.current=true;void restoreGovernanceDirectory().catch(()=>{});const stop=followGovernanceAdditions(sync);return()=>{stop();active.current=false;const held=session.current;session.current=null;void held?.then(s=>s.close()).catch(()=>{});};},[sync]);
  useEffect(()=>{let live=true;
    if(profile){setOwner(profile.ownerIdentity);return;}
    void access().then(s=>s.restore()).then(who=>{if(live&&who&&!currentIdentity.current)setOwner(who);}).catch(()=>{});
    return()=>{live=false;};
  },[profile?.uid,profile?.ownerIdentity,setOwner]);
  useEffect(()=>{let live=true;if(identity)void governanceOutbox(identity).then(items=>{if(live)setOutbox(items);}).catch(()=>{});return()=>{live=false;};},[identity]);
  useEffect(()=>{
    if(screen!=='detail'||!selected||chosen)return;
    let live=true;
    void openPublicGovernancePage(selected).catch(e=>{if(live)setError(e instanceof Error?e.message:'The linked Original is unavailable.');});
    return()=>{live=false;};
  },[screen,selected,Boolean(chosen)]);
  useEffect(()=>{
    if(profile)return;
    function navigate(){trail.current=[];const id=governanceLocation(new URL(location.href));select(id??'');setScreen(id?'detail':'list');setError('');}
    window.addEventListener('popstate',navigate);return()=>window.removeEventListener('popstate',navigate);
  },[Boolean(profile)]);
  useEffect(()=>{
    if(profile||screen!=='detail'||!chosen)return;
    document.title=governanceTitle(chosen)+' · Public voting';
    const path=governancePath(chosen.document.terms.kind,chosen.digest);
    if(publicDigests.has(chosen.digest)&&location.pathname+location.search!==path)history.replaceState(null,'',path);
    return()=>{document.title='Public voting · Bankeiz';};
  },[Boolean(profile),screen,chosen?.digest,Boolean(chosen&&publicDigests.has(chosen.digest))]);
  function go(digest:string){
    if(screen==='detail'&&selected&&selected!==digest)trail.current.push(selected);
    const next=rows.find(r=>r.digest===digest);
    if(!profile&&next&&publicDigests.has(digest)){const path=governancePath(next.document.terms.kind,digest);if(location.pathname!==path)history.pushState(null,'',path);}
    if(!profile&&!next)history.pushState(null,'','/vote/?original='+encodeURIComponent(digest));
    select(digest);setScreen('detail');setError('');
  }
  function browse(){if(!profile&&governanceLocation(new URL(location.href)))history.pushState(null,'','/vote/');setScreen('list');setError('');}
  function backFromDetail(){
    const previous=trail.current.pop();
    if(previous){select(previous);setError('');const row=rows.find(r=>r.digest===previous);if(!profile&&row&&publicDigests.has(previous))history.replaceState(null,'',governancePath(row.document.terms.kind,previous));}
    else browse();
  }
  function start(kind:'charter'|'proposal',charterId?:string){
    if(entryBusy||acting.current||publicProfile)return;
    void run(async()=>{
      if(!currentIdentity.current){
        const who=await (await access()).open();
        if(!active.current)return;
        setOwner(who);
      }
      if(charterId){
        const target=charters.find(c=>c.digest===charterId),owner=currentIdentity.current?.binding.artifactOwnerReceizId;
        if(!target||!owner||!charterElectorate(target.document.terms.rules).includes(owner))throw Error('This charter accepts proposals from its voting members. Open an enrolled identity to propose here.');
        if(!charterRatification(target,rows).complete)throw Error('The founding members must ratify this charter before proposals open.');
        select(charterId);setMode('proposal');setScreen('proposal');return;
      }
      select('');setMode(kind);setScreen(kind);
    });
  }
  async function ready(who:OpenIdentity){if(active.current){setOwner(who);setPersonal(false);setError('');}}
  const composing=screen==='charter'||screen==='proposal'||screen==='review'&&(terms?.kind==='charter'||terms?.kind==='proposal');
  const entry=<MeetingIdentity service={{importIdentity:async(f,p)=>(await access()).import(f,p),recoverPbi:async()=>(await access()).recoverPbi()}} disabled={busy} onBusy={setEntryBusy} onError={setError} onReady={ready}/>;
  function review(t:GovernanceTerms){setTerms(t);setScreen('review');setError('');}
  async function run(work:()=>Promise<void>){
    if(acting.current)return;acting.current=true;setBusy(true);setError('');
    try{await work();}catch(e){if(active.current)setError(e instanceof Error?e.message:'The operation could not finish.');}
    finally{acting.current=false;if(active.current)setBusy(false);}
  }
  async function confirm(){
    if(!identity||!terms)return;const who=identity;
    if(terms.kind!=='charter'){
      const charter=await exact(terms.charter);check(who);
      if(charter.document.terms.kind!=='charter')throw Error('Select the exact founding charter Original.');
      const rules=charter.document.terms.rules,member=who.binding.artifactOwnerReceizId;
      if(terms.kind==='ratification'&&!rules.founders.includes(member))throw Error('Only a named founder may ratify this charter.');
      if(!['ratification','candidacy','challenge'].includes(terms.kind)&&!charterElectorate(rules).includes(member))throw Error('Only a voting member may take this action.');
      if(terms.kind==='candidacy'){
        const office=rules.offices?.find(o=>o.name===terms.office);
        if(office?.selection!=='Election'||office.eligibility==='Electorate'&&!charterElectorate(rules).includes(member))throw Error('This office does not admit this candidacy.');
      }
      if(terms.kind!=='ratification'&&terms.kind!=='challenge'){
        const required=new Set(charter.document.terms.rules.founders);
        const approvals=ofKind(rows,'ratification').filter(r=>r.document.terms.charter===charter.digest);
        for(const r of approvals){if(!required.has(r.document.author))continue;const o=await exact(r.digest);check(who);if(o.document.terms.kind==='ratification'&&o.document.terms.charter===charter.digest)required.delete(o.document.author);}
        if(required.size)throw Error('All named founders must ratify this exact founding Original first.');
      }
      if(terms.kind==='proposal'&&terms.office){
        const office=rules.offices?.find(o=>o.name===terms.office);
        if(office?.selection!=='Election')throw Error('Choose an elected office in this charter.');
        for(const [i,digest] of terms.nominations!.entries()){
          const candidate=await exact(digest);check(who);const c=candidate.document.terms;
          if(c.kind!=='candidacy'||c.charter!==charter.digest||c.office!==office.name||candidate.document.author!==terms.choices[i]||office.eligibility==='Electorate'&&!charterElectorate(rules).includes(candidate.document.author))throw Error('The candidate evidence differs from the selected office or identity.');
        }
      }
      if(terms.kind==='closure'){await reviewClosure(terms,member,String(receizKaiNow().pulse),exact,rows);check(who);}
      if(terms.kind==='proposal'&&terms.payment&&(!rules.execution?.treasury||JSON.stringify(terms.payment)!==JSON.stringify(rules.execution.treasury)))throw Error('The payment must match the charter’s exact authorized installment.');
      if(terms.kind==='ballot'||terms.kind==='challenge'){
        const p=await exact(terms.proposal);check(who);
        if(p.document.terms.kind!=='proposal'||p.document.terms.charter!==charter.digest)throw Error('The proposal is bound to a different charter.');
        if(terms.kind==='ballot'){
          const proposal=asRow(p) as Row<'proposal'>,founding=asRow(charter) as Row<'charter'>;
          if(!eligibleProposal(proposal,founding,rows)||!p.document.terms.choices.includes(terms.choice))throw Error('Check the proposal, ratifications and candidate evidence before voting.');
          if(BigInt(receizKaiNow().pulse)>=voteEnds(proposal,founding))throw Error('The voting window has closed.');
        }
      }
      if(terms.kind==='mandate'&&(!charter.document.terms.rules.allowMandates||terms.delegate&&!charterElectorate(rules).includes(terms.delegate)))throw Error('The charter does not admit this mandate.');
      if((terms.kind==='ballot'||terms.kind==='mandate')&&terms.previous){const prior=await exact(terms.previous);check(who);const t=prior.document.terms;
        if(prior.document.author!==who.binding.artifactOwnerReceizId||t.kind!==terms.kind||t.charter!==terms.charter||t.kind==='ballot'&&terms.kind==='ballot'&&t.proposal!==terms.proposal||t.kind==='mandate'&&terms.kind==='mandate'&&t.scope!==terms.scope)throw Error('The prior statement does not belong to this action.');}
    }
    check(who);const original=await sealGovernanceOriginal(who,terms);check(who);
    setSaved(original);setPrivateSources(prev=>[...prev.filter(r=>r.digest!==original.digest),original]);setScreen('saved');
    await rememberGovernanceDelivery(who,original);check(who);const pending=await governanceOutbox(who);check(who);setOutbox(pending);
  }
  async function publish(original:GovernanceOriginal){
    const who=identity;if(!who?.publishGovernanceOriginal)throw Error('Open the issuing identity to publish.');
    await rememberGovernanceDelivery(who,original);check(who);await who.publishGovernanceOriginal(original);notifyGovernancePublication();check(who);
    await rememberGovernanceDelivery(who,original,true);check(who);const pending=await governanceOutbox(who);check(who);setOutbox(pending);go(original.digest);
  }
  return <div className="voting-board" aria-label="Voting">
    {screen==='list'&&<>
      <GovernanceHeading mark={!profile} eyebrow={profile?.name} title={publicProfile?'Public voting record':actor?'Voting dashboard':'Public voting'}>
        {!profile&&entry}
        {!publicProfile&&<button disabled={busy||entryBusy} className="gov-primary" onClick={()=>start('charter')}><BookOpen size={16}/>Create charter</button>}
        {profile&&<a href="/vote/">Network</a>}
      </GovernanceHeading>
      {actor&&<div className="gov-scope"><button aria-pressed={!personal} onClick={()=>setPersonal(false)}>Network</button><button aria-pressed={personal} onClick={()=>setPersonal(true)}>My activity</button></div>}
      <GovernanceRegister key={String(personal)+String(publicProfile)} personal={personal||publicProfile} rows={viewRows} network={rows} go={go} path={r=>publicDigests.has(r.digest)?governancePath(r.document.terms.kind,r.digest):null}/>
      <div className="gov-actions gov-tools"><button className="gov-link" onClick={()=>fileInput.current?.click()}><Upload size={16}/>Open governance Original</button><button className="gov-link" disabled={syncing} aria-busy={syncing} onClick={()=>void refreshByRequest()}><RefreshCw size={14}/>Refresh records</button>
      {!profile&&viewRows.length>0&&<a className="gov-link" href={governanceExamplePath}>Explore example</a>}</div>
      {actor&&identity&&<details><summary>My Receiz ID</summary><p>{actor}</p><button onClick={()=>saveIdentityRecord(identity)}><Download size={15}/>Save Identity Record</button></details>}
      {outbox.length>0&&<section><h3>Held on this device</h3>{outbox.map(item=><button className="gov-row" key={item.digest} onClick={()=>void run(async()=>{if(!identity)return;const o=await reopenPendingGovernance(identity,item);check(identity);setSaved(o);setPrivateSources(prev=>[...prev.filter(r=>r.digest!==o.digest),o]);setScreen('saved');})}><strong>{item.title}</strong><small>Open Original and delivery</small></button>)}</section>}
    </>}
    {!profile&&screen!=='list'&&<GovernanceHeading title="Public voting"/>}
    {composing&&identity&&<div hidden={screen==='review'}><GovernanceComposer identity={identity} rows={rows} key={mode+identity.binding.artifactOwnerReceizId} charters={eligibleCharters} onCharter={select} onFound={()=>start('charter')} mode={mode} owner={identity.binding.artifactOwnerReceizId} charter={eligibleCharters.find(r=>r.digest===selected)} onCancel={()=>setScreen(mode==='proposal'&&selected?'detail':'list')} onReview={review}/></div>}
    {screen==='detail'&&(chosen?<><GovernanceDetail identity={publicProfile?null:identity} published={publicDigests.has(chosen.digest)} read={exact} key={chosen.digest} row={chosen} rows={rows} actor={publicProfile?null:actor} go={go} back={backFromDetail} review={review} allowEntry={!publicProfile&&!entryBusy&&!busy} compose={id=>start('proposal',id)} download={r=>void run(async()=>save((await exact(r.digest)).file))}/>{!identity&&!publicProfile&&entry}</>:<div className="gov-stack"><h2>Selected Original</h2><p>The selected Original is not held here yet. Open its exact file or check for public additions.</p><button onClick={()=>fileInput.current?.click()}>Open Original</button><button onClick={browse}>Browse public records</button></div>)}
    {screen==='review'&&terms&&<section className="gov-stack"><h2>Review {terms.kind}</h2><p>Your Receiz owner ID and these terms will be visible in the Original. You can save it on this device and choose when to publish it.</p><GovernanceFacts terms={terms}/><div className="gov-actions"><button disabled={busy} className="gov-primary" onClick={()=>void run(confirm)}><FileCheck2 size={16}/>{busy?'Sealing…':'Seal Original'}</button><button disabled={busy} onClick={()=>setScreen(terms.kind==='charter'?'charter':terms.kind==='proposal'?'proposal':'detail')}>{terms.kind==='charter'||terms.kind==='proposal'?'Edit details':'Back'}</button></div></section>}
    {screen==='saved'&&saved&&<section className="gov-stack"><h2>Your {saved.document.terms.kind} Original</h2><p>Sealed by {saved.document.author}</p><code>{saved.digest}</code><GovernanceFacts terms={saved.document.terms}/><div className="gov-actions"><button disabled={busy} className="gov-primary" onClick={()=>void run(()=>publish(saved))}>{busy?'Publishing…':'Publish publicly'}</button><button onClick={()=>save(saved.file)}><Download size={16}/>Save Original</button><button onClick={()=>setScreen('list')}>Done</button></div></section>}
    <input ref={fileInput} hidden type="file" aria-label="Open governance Original" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void run(async()=>{const o=await openGovernanceOriginal(file);if(!active.current)return;setPrivateSources(prev=>[...prev.filter(r=>r.digest!==o.digest),o]);go(o.digest);});}}/>
    {(entryBusy||busy&&screen==='list')&&<small role="status">Opening identity…</small>}{error&&<p className="gov-error" role="alert">{error}</p>}{delivery&&screen==='list'&&<p className="gov-delivery" role="status">{delivery}</p>}
  </div>;
}
