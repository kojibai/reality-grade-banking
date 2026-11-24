import {GovernanceTime} from './GovernanceTime';
import {receizKaiNow} from '@receiz/sdk';
import {useCallback,useEffect,useRef,useMemo,useState,useSyncExternalStore} from 'react';
import {BookOpen,Download,FileCheck2,LogOut,RefreshCw,Upload} from 'lucide-react';
import {reviewClosure} from '../../receiz/governance-closure';
import {followGovernanceAdditions,notifyGovernancePublication} from '../../receiz/governance-live';
import {governanceLocation,governancePath} from '../../receiz/governance-links';
import {GovernanceRegister,GovernanceHeading} from './GovernanceRegister';
import {saveIdentityRecord} from '../../checkout/CheckoutIdentity';
import {MeetingIdentity} from '../meeting/MeetingIdentity';
import {checkoutIdentitySession} from '../../checkout/checkout-identity';
import type {OpenIdentity} from '../../receiz/native-identity';
import {governanceRowOnProfile,governanceRows,subscribeGovernance,openPublicGovernancePage,refreshGovernanceDirectory,restoreGovernanceDirectory,heldGovernanceOriginal,type GovernanceRow} from '../../receiz/governance-directory';
import {charterAdmitsMember,openGovernanceOriginal,sealGovernanceOriginal,type GovernanceAttachment,type GovernanceOriginal,type GovernanceTerms} from '../../receiz/governance-documents';
import {governanceOutbox,rememberGovernanceDelivery,reopenPendingGovernance,type PendingOriginal} from '../../receiz/governance-outbox';
import {eligibleProposal,voteEnds,charterRatification,governanceTitle,ofKind,type Row} from '../../receiz/governance-view';
import {GovernanceFacts,GovernanceDetail} from './GovernanceDetail';
import {isFoundingSigner,type FoundingOrganization} from './founding/charters';
import type {FoundingDraft} from './founding/prepare';
import {GovernanceFileList,GovernanceFilePicker} from './GovernanceFiles';
import {GovernanceComposer} from './GovernanceComposer';
import {profileUsernameLabel} from '../../receiz/account-name';
import {receivingUsernameForIdentity} from '../../../native/receiz/app/lib/profile/receivingUsername.js';
import {useGovernanceMemberNames} from './governance-member-names';
import './voting.css';

function navigateVoting(path:string){
 const router=document.getElementById('receiz-navigation') as (HTMLElement&{navigate?:(path:string)=>void})|null;
 if(router?.navigate)router.navigate(path);
 else history.pushState(null,'',path);
}

type Screen='list'|'charter'|'proposal'|'detail'|'review'|'saved';
type Props={activeWorkspace?:boolean;accountIdentity?:OpenIdentity|null;accountUid?:string|null;initialDraft?:FoundingOrganization;profile?:{uid:string;name:string;username?:string;publicName?:string;ownerIdentity:OpenIdentity|null};initialDigest?:string};
const closedSessionKey='bank.voting.session.closed';
function closedVotingSession(){try{return sessionStorage.getItem(closedSessionKey)==='1';}catch{return false;}}
const blank=Object.freeze([]) as readonly GovernanceRow[];
const asRow=(o:GovernanceOriginal):GovernanceRow=>({digest:o.digest,document:o.document,pulse:o.pulse,profileUid:null});
function save(file:File){const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}

export function VotingBoard({profile,initialDigest,initialDraft,accountIdentity,accountUid,activeWorkspace=true}:Props){
  const publicRows=useSyncExternalStore(subscribeGovernance,governanceRows,()=>blank);
  const [privateSources,setPrivateSources]=useState<GovernanceOriginal[]>([]),[outbox,setOutbox]=useState<PendingOriginal[]>([]);
  const [identity,setIdentity]=useState<OpenIdentity|null>(profile?.ownerIdentity??accountIdentity??null),[screen,setScreen]=useState<Screen>(initialDigest?'detail':'list');
  const [selected,select]=useState(initialDigest??''),[mode,setMode]=useState<'charter'|'proposal'>('charter'),[terms,setTerms]=useState<GovernanceTerms|null>(null);
  const [saved,setSaved]=useState<GovernanceOriginal|null>(null),[error,setError]=useState(''),[delivery,setDelivery]=useState(''),[syncing,setSyncing]=useState(false),[busy,setBusy]=useState(false),[entryBusy,setEntryBusy]=useState(false);
  const [files,setFiles]=useState<File[]>([]);
  const [attachments,setAttachments]=useState<GovernanceAttachment[]>([]),[writing,setWriting]=useState(false);
  const [founding,setFounding]=useState<FoundingDraft|null>(null),[editionSource,setEditionSource]=useState('');
  const previouslyAccountBound=useRef(Boolean(accountIdentity));
  const linkedRecord=useRef(initialDigest??null);
  const pendingFounding=useRef<FoundingOrganization|null>(null);
  const trail=useRef<string[]>([]);
  const session=useRef<ReturnType<typeof checkoutIdentitySession>|null>(null),fileInput=useRef<HTMLInputElement>(null),active=useRef(true),acting=useRef(false),currentIdentity=useRef(identity);
  const access=()=>session.current??=checkoutIdentitySession();
  const rows=useMemo(()=>{const published=new Set(publicRows.map(r=>r.digest));return [...publicRows,...privateSources.filter(o=>!published.has(o.digest)).map(asRow)];},[publicRows,privateSources]);
  const chosen=rows.find(r=>r.digest===selected),charters=ofKind(rows,'charter'),actor=identity?.binding.artifactOwnerReceizId??null;
  const eligibleCharters=charters.filter(c=>actor&&charterAdmitsMember(c.document.terms.rules,actor)&&charterRatification(c,rows).complete);
  const publicProfile=Boolean(profile&&!profile.ownerIdentity);
  const [personal,setPersonal]=useState(Boolean(profile?.ownerIdentity));
  const [preparedName,setPreparedName]=useState<{owner:OpenIdentity;name:string}|null>(null);
  const profileName=identity&&profile?.ownerIdentity===identity?profile.publicName:null;
  const knownName=profileName||identity?.knownProfile?.()?.username||identity?.confirmedAccountUsername?.()||(preparedName?.owner===identity?preparedName?.name:null);
  const closed=useRef(false),resumeAction=useRef<{kind:'charter'|'proposal';charterId?:string}|null>(null);
  useEffect(()=>{
    if(!identity||knownName||!identity.prepareReceivingUsername)return;
    let live=true;
    void identity.prepareReceivingUsername().then(name=>{if(live)setPreparedName({owner:identity,name});}).catch(()=>{});
    return ()=>{live=false;};
  },[identity,knownName]);
  const username=knownName||identity?.accountUsername?.()||identity?.username;
  const publicId=username?profileUsernameLabel(receivingUsernameForIdentity(username,identity?.username??'')):null;
  const member=useGovernanceMemberNames(rows,actor,publicId,profile);
  const publicDigests=new Set(publicRows.map(r=>r.digest));
  const uid=accountUid??identity?.walletReceivingAddress?.();
  const accountUsername=identity?.knownProfile?.()?.username??identity?.confirmedAccountUsername?.()??undefined;
  const viewRows=useMemo(()=>{
    if(profile&&publicProfile)return publicRows.filter(r=>governanceRowOnProfile(r,profile));
    const personalProfile=profile??(uid?{uid,username:accountUsername}:null);
    if(personal)return rows.filter(r=>r.document.author===actor||Boolean(personalProfile&&governanceRowOnProfile(r,personalProfile)));
    return publicRows;
  },[publicRows,rows,publicProfile,personal,actor,profile,uid,accountUsername]);
  const exact=(digest:string)=>{const local=privateSources.find(o=>o.digest===digest);return local?Promise.resolve(local):heldGovernanceOriginal(digest);};
  const check=(who:OpenIdentity|null)=>{if(!active.current||currentIdentity.current!==who)throw Error('The open identity changed.');};
  const setOwner=useCallback((who:OpenIdentity|null)=>{currentIdentity.current=who;setIdentity(who);setFiles([]);setAttachments([]);setWriting(false);setFounding(null);setEditionSource('');setTerms(null);setScreen(prev=>prev==='detail'?prev:'list');setPrivateSources([]);setSaved(null);setOutbox([]);setPreparedName(null);},[]);
  const sync=useCallback(()=>refreshGovernanceDirectory(),[]);
  const directoryPoll=useRef({nextReadAt:0});
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
  useEffect(()=>{active.current=true;void restoreGovernanceDirectory().catch(()=>{});return()=>{active.current=false;const held=session.current;session.current=null;void held?.then(s=>s.close()).catch(()=>{});};},[]);
  useEffect(()=>{if(activeWorkspace)return followGovernanceAdditions(sync,document,window,directoryPoll.current);},[activeWorkspace,sync]);
  useEffect(()=>{let live=true;
    if(profile){setOwner(profile.ownerIdentity);return;}
    if(accountIdentity){
      previouslyAccountBound.current=true;
      closed.current=false;
      if(currentIdentity.current!==accountIdentity){
        const held=session.current;session.current=null;
        void held?.then(s=>s.close()).catch(()=>{});
        setOwner(accountIdentity);
      }
      return;
    }
    if(previouslyAccountBound.current){
      previouslyAccountBound.current=false;
      closed.current=true;
      setOwner(null);setPersonal(false);
      return;
    }
    closed.current=closedVotingSession();
    if(closed.current)return;
    void access().then(s=>s.restore()).then(who=>{if(live&&who&&!currentIdentity.current)setOwner(who);}).catch(()=>{});
    return()=>{live=false;};
  },[profile?.uid,profile?.ownerIdentity,accountIdentity,setOwner]);
  useEffect(()=>{let live=true;if(identity)void governanceOutbox(identity).then(items=>{if(live)setOutbox(items);}).catch(()=>{});return()=>{live=false;};},[identity]);
  useEffect(()=>{
    if(screen!=='detail'||!selected||chosen)return;
    let live=true;
    void openPublicGovernancePage(selected).catch(e=>{if(live)setError(e instanceof Error?e.message:'The linked Original is unavailable.');});
    return()=>{live=false;};
  },[screen,selected,Boolean(chosen)]);
  useEffect(()=>{
    if(profile)return;
    function navigate(){
      if(!/^\/vote(?:\/|$)/.test(location.pathname))return;
      const id=governanceLocation(new URL(location.href));
      if(id===linkedRecord.current)return;
      linkedRecord.current=id;if(!id)document.title='Public voting · Bankeiz';trail.current=[];select(id??'');setScreen(id?'detail':'list');setError('');
    }
    window.addEventListener('popstate',navigate);window.addEventListener('receiz-bank:surface',navigate);
    return()=>{window.removeEventListener('popstate',navigate);window.removeEventListener('receiz-bank:surface',navigate);};
  },[Boolean(profile)]);
  useEffect(()=>{
    if(profile||!activeWorkspace||!/^\/vote(?:\/|$)/.test(location.pathname)||screen!=='detail'||!chosen)return;
    document.title=governanceTitle(chosen)+' · Public voting';
    const path=governancePath(chosen.document.terms.kind,chosen.digest);
    if(publicDigests.has(chosen.digest)&&location.pathname+location.search!==path){
      linkedRecord.current=chosen.digest;history.replaceState(history.state,'',path);
    }
  },[Boolean(profile),activeWorkspace,screen,chosen?.digest,Boolean(chosen&&publicDigests.has(chosen.digest))]);
  function go(digest:string){
    if(screen==='detail'&&selected&&selected!==digest)trail.current.push(selected);
    const next=rows.find(r=>r.digest===digest);
    if(!profile&&next&&publicDigests.has(digest)){linkedRecord.current=digest;const path=governancePath(next.document.terms.kind,digest);if(location.pathname!==path)navigateVoting(path);}
    if(!profile&&!next){linkedRecord.current=digest;navigateVoting('/vote/?original='+encodeURIComponent(digest));}
    select(digest);setScreen('detail');setError('');
  }
  function browse(){if(!profile){if(linkedRecord.current){linkedRecord.current=null;navigateVoting('/vote/');}document.title='Public voting · Bankeiz';}setScreen('list');setError('');}
  function backFromDetail(){
    const previous=trail.current.pop();
    if(previous){select(previous);setError('');const row=rows.find(r=>r.digest===previous);if(!profile&&row&&publicDigests.has(previous)){linkedRecord.current=previous;history.replaceState(history.state,'',governancePath(row.document.terms.kind,previous));}}
    else browse();
  }
  function addAttachment(file:GovernanceAttachment){
    setAttachments(previous=>previous.some(item=>item.source===file.source)?previous:[...previous,file]);
  }
  function openFounding(name:FoundingOrganization){
    void run(async()=>{
      const who=currentIdentity.current;
      if(!who){pendingFounding.current=name;setDelivery('Open @bjklock’s Receiz identity to review this founding draft.');return;}
      if(!isFoundingSigner(who.binding))throw Error('This founding draft belongs to @bjklock. Open that Receiz identity to continue.');
      const {prepareFoundingDraft}=await import('./founding/prepare');
      const draft=await prepareFoundingDraft(name);check(who);
      setAttachments([]);setFiles([]);setEditionSource('');setWriting(false);setFounding(draft);setMode('charter');setScreen('charter');setDelivery('');
    });
  }
  async function createEdition(){
    if(!identity||!founding)return;
    const {holdGovernanceFiles}=await import('../../receiz/governance-material');
    const [attachment]=await holdGovernanceFiles(identity,[founding.file]);check(identity);
    addAttachment(attachment);setEditionSource(attachment.source);
  }
  function start(kind:'charter'|'proposal',charterId?:string,entryCompleted=false){
    if((entryBusy&&!entryCompleted)||acting.current||publicProfile)return;
    setFiles([]);setAttachments([]);setFounding(null);setWriting(false);setEditionSource('');pendingFounding.current=null;
    void run(async()=>{
      if(!currentIdentity.current&&closed.current){
        resumeAction.current={kind,charterId};
        setDelivery('Choose your Identity Record or PBI to continue.');
        return;
      }
      if(!currentIdentity.current){
        const who=await (await access()).open();
        if(!active.current)return;
        setOwner(who);
      }
      if(charterId){
        const target=charters.find(c=>c.digest===charterId),owner=currentIdentity.current?.binding.artifactOwnerReceizId;
        if(!target||!owner||!charterAdmitsMember(target.document.terms.rules,owner))throw Error('This charter accepts proposals from its voting members. Open an enrolled identity to propose here.');
        if(!charterRatification(target,rows).complete)throw Error('The founding members must ratify this charter before proposals open.');
        select(charterId);setMode('proposal');setScreen('proposal');return;
      }
      select('');setMode(kind);setScreen(kind);
    });
  }
  async function ready(who:OpenIdentity){
    if(!active.current)return;
    closed.current=false;
    try{sessionStorage.removeItem(closedSessionKey);}catch{/* Storage can be unavailable in embedded browsers. */}
    setOwner(who);setPersonal(false);setEntryBusy(false);setError('');setDelivery('');
    const pending=resumeAction.current;resumeAction.current=null;
    const organization=pendingFounding.current;pendingFounding.current=null;
    if(organization){openFounding(organization);return;}
    if(pending)start(pending.kind,pending.charterId,true);
  }
  function closeVotingSession(){
    if(profile||acting.current||entryBusy)return;
    closed.current=true;
    try{sessionStorage.setItem(closedSessionKey,'1');}catch{/* The mounted dashboard still closes its session. */}
    const held=session.current;session.current=null;
    void held?.then(s=>s.close()).catch(()=>{});
    pendingFounding.current=null;resumeAction.current=null;trail.current=[];select('');setTerms(null);
    setOwner(null);setPersonal(false);setError('');setDelivery('');setScreen('list');
  }
  const composing=screen==='charter'||screen==='proposal'||screen==='review'&&(terms?.kind==='charter'||terms?.kind==='proposal');
  const entry=<MeetingIdentity service={{importIdentity:async(f,p)=>(await access()).import(f,p),recoverPbi:async()=>(await access()).recoverPbi()}} disabled={busy} onBusy={setEntryBusy} onError={setError} onReady={ready}/>;
  function review(t:GovernanceTerms){if(t.kind!=='charter'&&t.kind!=='proposal'){setFiles([]);setFounding(null);setAttachments([]);}setWriting(false);setTerms(t);setScreen('review');setError('');}
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
      if(!['ratification','candidacy','challenge'].includes(terms.kind)&&!charterAdmitsMember(rules,member))throw Error('Only a voting member may take this action.');
      if(terms.kind==='candidacy'){
        const office=rules.offices?.find(o=>o.name===terms.office);
        if(office?.selection!=='Election'||office.eligibility==='Electorate'&&!charterAdmitsMember(rules,member))throw Error('This office does not admit this candidacy.');
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
          if(c.kind!=='candidacy'||c.charter!==charter.digest||c.office!==office.name||candidate.document.author!==terms.choices[i]||office.eligibility==='Electorate'&&!charterAdmitsMember(rules,candidate.document.author))throw Error('The candidate evidence differs from the selected office or identity.');
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
      if(terms.kind==='mandate'&&(!charter.document.terms.rules.allowMandates||terms.delegate&&!charterAdmitsMember(rules,terms.delegate)))throw Error('The charter does not admit this mandate.');
      if((terms.kind==='ballot'||terms.kind==='mandate')&&terms.previous){const prior=await exact(terms.previous);check(who);const t=prior.document.terms;
        if(prior.document.author!==who.binding.artifactOwnerReceizId||t.kind!==terms.kind||t.charter!==terms.charter||t.kind==='ballot'&&terms.kind==='ballot'&&t.proposal!==terms.proposal||t.kind==='mandate'&&terms.kind==='mandate'&&t.scope!==terms.scope)throw Error('The prior statement does not belong to this action.');}
    }
    check(who);
    if(founding&&!editionSource)throw Error('Create the Constitution Original before sealing the charter.');
    const reviewed=attachments.length?{...terms,attachments}:terms;
    const original=await sealGovernanceOriginal(who,reviewed,files);check(who);
    setFiles([]);setSaved(original);setPrivateSources(prev=>[...prev.filter(r=>r.digest!==original.digest),original]);setScreen('saved');
    await rememberGovernanceDelivery(who,original);check(who);const pending=await governanceOutbox(who);check(who);setOutbox(pending);
  }
  async function publish(original:GovernanceOriginal){
    const who=identity;if(!who?.publishGovernanceOriginal)throw Error('Open the issuing identity to publish.');
    await rememberGovernanceDelivery(who,original);check(who);await who.publishGovernanceOriginal(original);notifyGovernancePublication();check(who);
    await rememberGovernanceDelivery(who,original,true);check(who);const pending=await governanceOutbox(who);check(who);setOutbox(pending);go(original.digest);
  }
  return <div className="voting-board" aria-label="Voting">
    {screen==='list'&&<>
      <GovernanceHeading mark={!profile} eyebrow={profile&&!publicProfile?(publicId?'@'+publicId:undefined):profile?.name} title={profile&&!publicProfile?profile.name:publicProfile?'Public voting record':actor?'Voting dashboard':'Public voting'}>
        {!publicProfile&&<button disabled={busy||entryBusy} className="gov-primary" onClick={()=>start('charter')}><BookOpen size={16}/>Create charter</button>}
      </GovernanceHeading>
      <div className="gov-account-bar">
      {!profile&&!actor&&entry}
      {actor&&<div className="gov-scope"><button aria-pressed={!personal} onClick={()=>setPersonal(false)}>Network</button><button aria-pressed={personal} onClick={()=>setPersonal(true)}>My activity</button></div>}
      {!profile&&actor&&publicId&&<span className="gov-session-name">@{publicId}</span>}
      {!profile&&!accountIdentity&&actor&&<button className="gov-icon gov-logout" type="button" aria-label="Log out of voting" title="Log out of voting" disabled={busy||entryBusy} onClick={closeVotingSession}><LogOut size={18} strokeWidth={1.6}/></button>}
      </div>
      {!publicProfile&&(initialDraft||isFoundingSigner(identity?.binding))&&<div className="gov-actions">{(initialDraft?[initialDraft]:['Receiz','Bankeiz'] as const).map(name=><button type="button" key={name} disabled={busy||entryBusy} onClick={()=>openFounding(name)}>Review {name} founding draft</button>)}</div>}
      <GovernanceRegister member={member} key={String(personal)+String(publicProfile)} personal={personal||publicProfile} initialActivity={personal&&!profile} rows={viewRows} network={rows} go={go} path={r=>publicDigests.has(r.digest)?governancePath(r.document.terms.kind,r.digest):null}/>
      <div className="gov-actions gov-tools" role="group" aria-label="Governance records"><button className="gov-link" aria-label="Open governance Original" onClick={()=>fileInput.current?.click()}><Upload size={16} aria-hidden="true"/>Open Original</button><button className="gov-link" disabled={syncing} aria-busy={syncing} onClick={()=>void refreshByRequest()}><RefreshCw size={16} aria-hidden="true"/>Refresh records</button></div>
      {actor&&identity&&<details><summary>My Receiz ID</summary>{publicId&&<p>@{publicId}</p>}<div className="gov-proof-owner"><small>Proof owner ID</small><code>{actor}</code></div><button onClick={()=>saveIdentityRecord(identity)}><Download size={15}/>Save Identity Record</button></details>}
      {outbox.length>0&&<section><h3>Held on this device</h3>{outbox.map(item=><button className="gov-row" key={item.digest} onClick={()=>void run(async()=>{if(!identity)return;const o=await reopenPendingGovernance(identity,item);check(identity);setSaved(o);setPrivateSources(prev=>[...prev.filter(r=>r.digest!==o.digest),o]);setScreen('saved');})}><strong>{item.title}</strong><small>Open Original and delivery</small></button>)}</section>}
    </>}
    {!profile&&screen!=='list'&&<GovernanceHeading title="Public voting" eyebrow={publicId?'@'+publicId:undefined}/>}
    {composing&&identity&&<div hidden={screen==='review'}><GovernanceComposer founding={founding} member={member} identity={identity} rows={rows} key={mode+identity.binding.artifactOwnerReceizId+(founding?.name??'')} charters={eligibleCharters} onCharter={id=>{select(id);setFiles([]);setAttachments([]);}} onFound={()=>start('charter')} mode={mode} owner={identity.binding.artifactOwnerReceizId} charter={eligibleCharters.find(r=>r.digest===selected)} onCancel={()=>setScreen(mode==='proposal'&&selected?'detail':'list')} onReview={review}/></div>}
    {screen==='detail'&&(chosen?<><GovernanceDetail memberName={member} identity={publicProfile?null:identity} published={publicDigests.has(chosen.digest)} read={exact} key={chosen.digest} row={chosen} rows={rows} actor={publicProfile?null:actor} go={go} back={backFromDetail} review={review} allowEntry={!publicProfile&&!entryBusy&&!busy} compose={id=>start('proposal',id)} download={r=>void run(async()=>save((await exact(r.digest)).file))}/>{!identity&&!publicProfile&&entry}</>:<div className="gov-stack"><h2>Selected Original</h2><p>The selected Original is not held here yet. Open its exact file or check for public additions.</p><button onClick={()=>fileInput.current?.click()}>Open Original</button><button onClick={browse}>Browse public records</button></div>)}
    {screen==='review'&&terms&&<section className="gov-stack"><h2>Review {terms.kind}</h2><p>Your Receiz owner ID and these terms will be visible in the Original. You can save it on this device and choose when to publish it.</p><GovernanceFacts member={member} terms={terms}/>{founding&&!editionSource&&<div className="gov-box"><a href="/vote/constitution-zero/" target="_blank" rel="noreferrer">Read Constitution Zero</a><button type="button" disabled={busy||writing} onClick={()=>void run(createEdition)}>Create Constitution Original</button></div>}
      {attachments.length>0&&<GovernanceFileList files={attachments} remove={source=>{if(source===editionSource)setEditionSource('');setAttachments(all=>all.filter(item=>item.source!==source));}}/>}
      {identity&&['charter','proposal','mandate','challenge','candidacy'].includes(terms.kind)&&<GovernanceFilePicker identity={identity} attach={addAttachment} onEditing={setWriting} files={files} disabled={busy} change={setFiles}/>} <div className="gov-actions"><button disabled={busy||writing||Boolean(founding&&!editionSource)} className="gov-primary" onClick={()=>void run(confirm)}><FileCheck2 size={16}/>{busy?'Sealing…':'Seal Original'}</button><button disabled={busy||writing} onClick={()=>setScreen(terms.kind==='charter'?'charter':terms.kind==='proposal'?'proposal':'detail')}>{terms.kind==='charter'||terms.kind==='proposal'?'Edit details':'Back'}</button></div></section>}
    {screen==='saved'&&saved&&<section className="gov-stack"><h2>Your {saved.document.terms.kind} Original</h2><p>Sealed by {member(saved.document.author)}</p><GovernanceTime pulse={saved.pulse}/><code>{saved.digest}</code><GovernanceFacts member={member} terms={saved.document.terms}/><div className="gov-actions"><button disabled={busy} className="gov-primary" onClick={()=>void run(()=>publish(saved))}>{busy?'Publishing…':'Publish publicly'}</button><button onClick={()=>save(saved.file)}><Download size={16}/>Save Original</button><button onClick={()=>setScreen('list')}>Done</button></div></section>}
    <input ref={fileInput} hidden type="file" aria-label="Open governance Original" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void run(async()=>{const o=await openGovernanceOriginal(file);if(!active.current)return;setPrivateSources(prev=>[...prev.filter(r=>r.digest!==o.digest),o]);go(o.digest);});}}/>
    {(entryBusy||busy&&screen==='list')&&<small role="status">Opening identity…</small>}{error&&<p className="gov-error" role="alert">{error}</p>}{delivery&&screen==='list'&&<p className="gov-delivery" role="status">{delivery}</p>}
  </div>;
}
