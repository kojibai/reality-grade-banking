import {useEffect,useRef,useState,type FormEvent} from 'react';
import {ArrowLeft,ArrowRight,Check} from 'lucide-react';
import type {GovernanceTerms,DecisionKind,CharterExecution} from '../../receiz/governance-documents';
import {readGovernanceTerms} from '../../receiz/governance-documents';
import {CharterExecutionFields,PaymentFacts} from './CharterExecutionFields';
import type {OpenIdentity} from '../../receiz/native-identity';
import {charterTemplates, proposalDraft, proposalTemplates, ruleLabels, scopedRepresentation} from './governance-templates';
import type {FoundingDraft} from './founding/prepare';
import {CharterLogoPicker} from './GovernanceFiles';
import {CharterOffices} from './CharterOffices';
import type {GovernanceRow} from '../../receiz/governance-directory';
import type {CurrencyVotingContext} from './VotingBoard';
import {bankOperationDollars} from '../../receiz/bank-operations';
import {inspectNativeCurrencyServicePricingTerms} from '../../../native/receiz/app/lib/wallet/bankNotes/nativeCurrencyServicePricing';
import {VenuePricingFields,emptyVenuePricingTerms} from './VenuePricingFields';
import {eligibleCandidates,type Row} from '../../receiz/governance-view';
import type {GovernanceExecution} from '../../receiz/governance-execution';
import type {GovernanceExecutionRegister} from '../../receiz/governance-execution-register';

type Props={currency?:CurrencyVotingContext;founding?:FoundingDraft|null;member?:(id:string)=>string;identity?:OpenIdentity;mode:'charter'|'proposal';owner:string;rows:readonly GovernanceRow[];charter?:Row<'charter'>;charters:readonly Row<'charter'>[];onCharter:(id:string)=>void;onFound:()=>void;onReview:(terms:GovernanceTerms)=>void;onCancel:()=>void};
export function GovernanceComposer({currency,founding,member,identity,mode,owner,charter,charters,onCharter,onFound,rows,onReview,onCancel}:Props){
  const [logo,setLogo]=useState(founding?.logo??''),[logoBusy,setLogoBusy]=useState(false);
  const [step,setStep]=useState(1),[organization,setOrganization]=useState<string>(founding?.name??''),[founders,setFounders]=useState('');
  const templates=founding?{...charterTemplates,[founding.name]:founding.rules}:charterTemplates;
  const [template,setTemplate]=useState<string>(founding?.name??'Member association');
  const [openRoll,setOpenRoll]=useState(Boolean(founding));
  const [holderVoting,setHolderVoting]=useState(false);
  const [custody,setCustody]=useState<'existing'|'founder'|'managed'>('existing');
  const founderCustody=custody==='founder';
  const [managed,setManaged]=useState<{keyId:string;register:GovernanceExecutionRegister}|null>(null);
  const [workerPreparing,setWorkerPreparing]=useState(false);
  const setupWorker=useRef<AbortController|null>(null);
  useEffect(()=>()=>setupWorker.current?.abort(),[]);
  const [founderKey,setFounderKey]=useState<string>();
  const founderKeyId=founderKey??identity?.binding.keyId??'';
  const [custodian,setCustodian]=useState(''),[custodianKey,setCustodianKey]=useState('');
  const [registerOriginal,setRegisterOriginal]=useState<File|null>(null);
  const [founderRegisterOriginal,setFounderRegisterOriginal]=useState<File|null>(null);
  const [createdFounderRegister,setCreatedFounderRegister]=useState<GovernanceExecutionRegister|null>(null);
  const [registrationDays,setRegistrationDays]=useState(7),[rollReviewDays,setRollReviewDays]=useState(1);
  const [quorum,setQuorum]=useState(20);
  type CharterDraft = (typeof charterTemplates)[string];
  const [charterEdits,setCharterEdits]=useState<Record<string, Partial<CharterDraft>>>({});
  const rules={...templates[template],...charterEdits[template]};
  function editRules(change:Partial<CharterDraft>){
    setCharterEdits(all=>({...all,[template]:{...all[template],...change}}));
  }
  function setRepresentation(enabled:boolean){
    const generated=[charterTemplates['Member association'].representation,scopedRepresentation];
    const representation=generated.includes(rules.representation)?(enabled?scopedRepresentation:generated[0]):rules.representation;
    editRules({allowMandates:enabled,representation});
  }
  const [separate,setSeparate]=useState(false),[electorate,setElectorate]=useState('');
  const [executions,setExecutions]=useState<Record<string,CharterExecution|undefined>>({});
  const execution=executions[template];
  const [office,setOffice]=useState(''),[selected,setSelected]=useState<string[]>([]);
  const [decision,setDecision]=useState<DecisionKind>('Policy'),[error,setError]=useState('');
  const [minimumPrice,setMinimumPrice]=useState(''),[maximumPrice,setMaximumPrice]=useState(''),[allowSalesPause,setAllowSalesPause]=useState(true);
  const [venuePricing,setVenuePricing]=useState(false),[venueTerms,setVenueTerms]=useState(emptyVenuePricingTerms);
  const proposalUsesVenuePricing=!!charter?.document.terms.rules.execution?.currency?.servicePricing;
  const [newPrice,setNewPrice]=useState(''),[saleStatus,setSaleStatus]=useState<'current'|'open'|'paused'>('current'),[building,setBuilding]=useState(false);
  const [startingPoints,setStartingPoints]=useState<Record<string,string>>({});
  const scope=JSON.stringify([charter?.digest,decision]);
  const startingPoint=startingPoints[scope]??Object.keys(proposalTemplates[decision])[0];
  const draftKey=JSON.stringify([charter?.digest,decision,startingPoint]);
  const [edits,setEdits]=useState<Record<string,Partial<{title:string;text:string;options:string}>>>({});
  const proposed=charter?proposalDraft(decision,startingPoint,charter.document.terms.rules,office):null;
  const changes=edits[draftKey];
  const title=changes?.title??proposed?.title??'',body=changes?.text??proposed?.text??'';
  const options=changes?.options??proposed?.choices.join('\n')??'';
  function editProposal(change:Partial<{title:string;text:string;options:string}>){
    setEdits(all=>({...all,[draftKey]:{...all[draftKey],...change}}));
  }
  const payment=charter?.document.terms.rules.execution?.treasury;
  const [budgetDrafts,setBudgetDrafts]=useState<Record<string,Record<string,string>>>({});
  const budget=budgetDrafts[draftKey]??{};
  const guidedBudget=mode==='proposal'&&decision==='Treasury'&&!payment&&startingPoint!=='Custom';
  const budgetFields=['Budget or project','Amount and currency','Recipient','Purpose and release conditions'] as const;
  function updateBudget(key:string,value:string){setBudgetDrafts(all=>({...all,[draftKey]:{...all[draftKey],[key]:value}}));}
  const candidates=charter&&office?eligibleCandidates(charter,office,rows):[];
  const electiveOffices=charter?.document.terms.rules.offices?.filter(o=>o.selection==='Election')??[];
  const election=mode==='proposal'&&decision==='Election';
  const bindingBinary=Boolean(charter?.document.terms.rules.execution&&(decision==='Policy'||decision==='Treasury'&&payment));
  async function ensureFounderRegister(device:GovernanceExecution){
    if(createdFounderRegister)return createdFounderRegister;
    const register=await device.createRegister();
    setCreatedFounderRegister(register);
    return register;
  }
  async function saveFounderRegister(){
    if(!identity?.governanceExecution)return;
    setBuilding(true);setError('');
    try{
      let file=founderRegisterOriginal;
      if(!file){
        const device=await identity.governanceExecution();
        const created=await ensureFounderRegister(device);
        file=await device.exportHeldRegister(created.registerProofObjectId);
      }
      const url=URL.createObjectURL(file),link=document.createElement('a');
      link.href=url;link.download=file.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
    }catch(e){setError(e instanceof Error?e.message:'The register Original could not be saved.');}
    finally{setBuilding(false);}
  }
  async function createManagedWorker(){
    if(!currency||!identity?.currencyGovernance||!identity.governanceExecution||setupWorker.current)return;
    const controller=new AbortController();
    setupWorker.current=controller;setWorkerPreparing(true);setError('');
    try{
      for(let attempt=0;attempt<45;attempt++){
        controller.signal.throwIfAborted();
        const result=await identity.currencyGovernance({schema:'receiz.bank.managed-currency-worker.v1',assetId:currency.assetId}) as {
          status?:string;custodian?:string;keyId?:string;register?:Parameters<typeof import('../../receiz/governance-execution-register').exactRegisterFile>[0];
        };
        controller.signal.throwIfAborted();
        if(result?.status==='ready'){
          if(!result.custodian||result.custodian===owner||!result.keyId||!/^[a-f0-9]{64}$/u.test(result.keyId)||!result.register)
            throw Error('Receiz did not return a verified worker register.');
          const [{exactRegisterFile},device]=await Promise.all([import('../../receiz/governance-execution-register'),identity.governanceExecution()]);
          const register=await device.retainCustodianRegisterGenesis(await exactRegisterFile(result.register),result.custodian);
          controller.signal.throwIfAborted();
          setManaged({keyId:result.keyId,register});
          return;
        }
        if(result?.status!=='preparing')throw Error('Worker setup was interrupted. Try again to resume.');
        await new Promise(resolve=>setTimeout(resolve,2000));
      }
      throw Error('The worker is still preparing. Select Create worker again to resume.');
    }catch(error){
      if(!controller.signal.aborted)setError(error instanceof Error?error.message:'Worker setup is temporarily unavailable.');
    }finally{
      setupWorker.current=null;
      if(!controller.signal.aborted)setWorkerPreparing(false);
    }
  }
  async function submit(e:FormEvent){
    e.preventDefault();setError('');
    if(mode==='proposal'&&!charter){setError('Choose a governing charter before writing a proposal.');return;}
    if(mode==='charter'&&step===1){setStep(2);return;}
    try{
      const policyText=Object.fromEntries((Object.keys(ruleLabels) as (keyof typeof ruleLabels)[]).map(k=>[k,rules[k].trim()]));
      const offices=rules.offices.map(o=>({...o,name:o.name.trim(),powers:o.powers.trim(),term:o.term.trim(),procedure:o.procedure.trim(),recall:o.recall.trim()}));
      const articles=rules.articles.map(a=>({title:a.title.trim(),text:a.text.trim()}));
      const text=guidedBudget?[body.trim(),...budgetFields.map(k=>k+' · '+(budget[k]??'').trim())].join('\n\n'):body.trim();
      if(guidedBudget&&budgetFields.some(k=>!budget[k]?.trim()))throw Error('Complete the budget, cost, recipient and conditions before review.');
      if(text.length>4000)throw Error('Shorten the proposal and budget details to fit 4,000 characters.');
      let selectedExecution=execution;
      if(currency&&mode==='charter'){
        if(!identity?.governanceExecution)throw Error('Open your identity to create the currency charter.');
        const price=BigInt(currency.priceUsdCentsPerUnit);
        const min=currency.poolPricing?String(price):bankOperationDollars(minimumPrice);
        const servicePricing=!currency.poolPricing&&venuePricing
          ? inspectNativeCurrencyServicePricingTerms({
            ...venueTerms, venues: [...venueTerms.venues].sort((left,right)=>left.id<right.id?-1:left.id>right.id?1:0),
          }) : undefined;
        const max=currency.poolPricing?String(price):servicePricing&&!maximumPrice.trim()?undefined:bankOperationDollars(maximumPrice);
        if(BigInt(min)>price||max!==undefined&&BigInt(max)<price)throw Error('The current price must fit the charter’s price range.');
        setBuilding(true);
        const terms={assetId:currency.assetId,minimumPriceUsdCents:min,...(max===undefined?{}:{maximumPriceUsdCents:max}),
          allowSalesPause,...(servicePricing?{servicePricing}:{})};
        if(holderVoting){
          const registerOwner=founderCustody?owner:custody==='managed'?managed?.register.custodian:custodian.trim();
          const signerKey=(founderCustody?founderKeyId:custody==='managed'?managed?.keyId??'':custodianKey).trim();
          const file=founderCustody?founderRegisterOriginal:registerOriginal;
          if(founders.trim())throw Error('Use one founder to link this open holder charter from Bankeiz.');
          if(!/^[a-f0-9]{64}$/u.test(signerKey)||!registerOwner||(!founderCustody&&registerOwner===owner))
            throw Error('Select founder custody or enter an independent custodian’s Receiz ID and public key ID.');
          if(!file&&custody==='existing')throw Error('Choose the custodian’s starting register Original.');
          const register=custody==='managed'?managed?.register:file
            ? founderCustody?await (await identity.governanceExecution()).selectRegister(file)
              :await (await identity.governanceExecution()).retainCustodianRegisterGenesis(file,registerOwner)
            : await ensureFounderRegister(await identity.governanceExecution());
          if(!register||register.head!==register.registerGenesisHead)throw Error('Choose the custodian’s starting register Original.');
          selectedExecution={rule:'registered-roll-closure-v1',custodian:register.custodian,
            registerProofObjectId:register.registerProofObjectId,registerGenesisHead:register.registerGenesisHead,treasury:null,currency:terms,
            ...(founderCustody?{custody:'founder-custodian-v1' as const}:{}),
            custodianKeyId:signerKey,registrationDays,rollReviewDays,quorumPercent:quorum,
            eligibility:{rule:'native-currency-holders-v1',minimumQuantityMicro:'1'}};
        }else{
          const register=await (await identity.governanceExecution()).createRegister();
          selectedExecution={rule:'unanimous-evidence-closure-v1',custodian:register.custodian,
            registerProofObjectId:register.registerProofObjectId,registerGenesisHead:register.registerGenesisHead,treasury:null,currency:terms};
        }
      }
      let currencyChange;
      if(currency&&mode==='proposal'){
        if(!currency.settingsHead||charter?.digest!==currency.charterDigest)throw Error('This charter must be linked to the currency before proposing a change.');
        const price=!currency.poolPricing&&!proposalUsesVenuePricing&&newPrice.trim()?bankOperationDollars(newPrice):undefined;
        const paused=saleStatus==='current'?undefined:saleStatus==='paused';
        const changes={...(price&&price!==currency.priceUsdCentsPerUnit?{priceUsdCentsPerUnit:price}:{}),
          ...(paused!==undefined&&paused!==currency.salesPaused?{salesPaused:paused}:{})};
        if(!Object.keys(changes).length)throw Error(currency.poolPricing||proposalUsesVenuePricing?'Choose a new sales setting.':'Choose a new purchase price or sales setting.');
        currencyChange={assetId:currency.assetId,expectedHead:currency.settingsHead,changes};
      }
      const terms=mode==='charter'?{kind:'charter',...(logo?{logo}:{}),rules:{...rules,...policyText,offices,articles,...(holderVoting?{allowMandates:false}:{}),...(openRoll?{participation:'open-registration'}:{}),...(!openRoll&&selectedExecution?{execution:selectedExecution}:{}),...(!openRoll&&!holderVoting&&separate?{electorate:electorate.split(/\r?\n/).map(v=>v.trim()).filter(Boolean)}:{}),name:organization.trim(),purpose:rules.purpose.trim(),founders:[...new Set([owner,...founders.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)])]}}:
        {kind:'proposal',charter:charter?.digest,title:title.trim(),text,decision,...(currencyChange?{currencyChange}:{}),...(election?{office,nominations:selected,choices:selected.map(d=>candidates.find(c=>c.digest===d)?.document.author)}:{...(decision==='Treasury'&&payment?{payment}:{}),choices:bindingBinary?['Approve','Reject']:options.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)})};
      const reviewed=readGovernanceTerms(terms);
      if(reviewed.kind==='charter'&&!reviewed.rules.founders.includes(owner))throw Error('Include your own Receiz owner ID among the founders.');
      onReview(reviewed);
    }catch(e){setError(e instanceof Error?e.message:'Check the governance terms.');}finally{setBuilding(false);}
  }
  return <form className="gov-form" onSubmit={event=>void submit(event)}>
    <button type="button" className="gov-link" onClick={()=>step===2?setStep(1):onCancel()}><ArrowLeft size={16}/>Back</button>
    <h2>{mode==='proposal'?'Create proposal':step===1?'Found an organization':'Set the charter rules'}</h2>
    {mode==='proposal'&&<><label>Governing charter<select required value={charter?.digest??''} onChange={e=>{setOffice('');setSelected([]);setNewPrice('');setError('');onCharter(e.target.value);}}><option value="">Choose a charter</option>{charters.map(c=><option key={c.digest} value={c.digest}>{c.document.terms.rules.name}</option>)}</select></label>
      {!charters.length&&!currency&&<div><p>You can propose in a ratified charter that lists you as a voting member.</p><button type="button" onClick={onFound}>Create charter</button></div>}</>}
    {step===1&&(mode==='charter'||charter)&&<>
      {mode==='charter'?<label>Starting point<select value={template} onChange={e=>{setTemplate(e.target.value);setError('');}}>{Object.keys(templates).map(k=><option key={k}>{k}</option>)}</select></label>:
        <div className="gov-fields">
          {!currency&&<label>Decision type<select value={decision} onChange={e=>{setDecision(e.target.value as DecisionKind);setError('');}}>{Object.keys(proposalTemplates).map(d=><option key={d}>{d}</option>)}</select></label>}
          <label>Proposal template<select value={startingPoint} onChange={e=>setStartingPoints({...startingPoints,[scope]:e.target.value})}>{[...Object.keys(proposalTemplates[decision]),'Custom'].map(t=><option key={t}>{t}</option>)}</select></label>
        </div>}
      <label>{mode==='charter'?'Organization name':'Proposal title'}<input required maxLength={mode==='charter'?120:160} value={mode==='charter'?organization:title} onChange={e=>mode==='charter'?setOrganization(e.target.value):editProposal({title:e.target.value})}/></label>
      <label>{mode==='charter'?'Purpose and scope':'What should members decide?'}<textarea required rows={4} maxLength={4000} value={mode==='charter'?rules.purpose:body} onChange={e=>mode==='charter'?editRules({purpose:e.target.value}):editProposal({text:e.target.value})}/></label>
      {mode==='charter'?<><CharterLogoPicker logo={logo} change={setLogo} busy={setLogoBusy}/><p>Founding member <strong>{member?.(owner)??owner}</strong></p><label>Additional founders <small>One Receiz owner ID per line. Each founder ratifies the charter.</small><textarea value={founders} onChange={e=>setFounders(e.target.value)}/></label>
        {!currency&&<label className="gov-check"><input type="checkbox" checked={openRoll} onChange={e=>setOpenRoll(e.target.checked)}/>Open participation for advisory votes</label>}
        {!openRoll&&!holderVoting&&<label className="gov-check"><input type="checkbox" checked={separate} onChange={e=>setSeparate(e.target.checked)}/>Choose a separate voting membership</label>}
        {!openRoll&&!holderVoting&&separate&&<label>Voting members <small>One Receiz owner ID per line. Only these members may propose and vote.</small><textarea required value={electorate} onChange={e=>setElectorate(e.target.value)}/></label>}</>:<>
        {election?<><label>Office<select required value={office} onChange={e=>{setOffice(e.target.value);setSelected([]);}}><option value="">Choose an elected office</option>{electiveOffices.map(o=><option key={o.name}>{o.name}</option>)}</select></label>
          {!electiveOffices.length&&<p>This charter lists no elected offices. Its amendment procedure describes how members can propose one.</p>}
          <fieldset className="gov-box"><legend>Candidate statements</legend>{candidates.map(c=><label className="gov-check" key={c.digest}><input type="checkbox" checked={selected.includes(c.digest)} onChange={e=>setSelected(v=>e.target.checked?[...v.filter(d=>candidates.find(x=>x.digest===d)?.document.author!==c.document.author),c.digest]:v.filter(d=>d!==c.digest))}/>{member?.(c.document.author)??c.document.author} · {c.document.terms.statement}</label>)}{!candidates.length&&<p>Candidates can submit their own statements from the charter.</p>}</fieldset></>:bindingBinary?<p>Ballot choices · Approve / Reject</p>:<label>Ballot choices <small>One choice per line.</small><textarea required value={options} onChange={e=>editProposal({options:e.target.value})}/></label>}
        {currency&&<div className="gov-fields">{!currency.poolPricing&&!proposalUsesVenuePricing&&<label>New purchase price (USD)<input inputMode="decimal" value={newPrice} onChange={e=>setNewPrice(e.target.value)}/></label>}
          {charter?.document.terms.rules.execution?.currency?.allowSalesPause&&<label>New sales<select value={saleStatus} onChange={e=>setSaleStatus(e.target.value as typeof saleStatus)}>
            <option value="current">Keep current setting</option><option value="open">Open</option><option value="paused">Paused</option></select></label>}</div>}
        {decision==='Treasury'&&payment&&<PaymentFacts payment={payment}/>}
        {guidedBudget&&<fieldset className="gov-box gov-form"><legend>Budget request</legend>{budgetFields.map(k=><label key={k}>{k}<input required maxLength={360} value={budget[k]??''} onChange={e=>updateBudget(k,e.target.value)}/></label>)}</fieldset>}
        {decision==='Treasury'&&!payment&&<small>This charter can record a funding decision. A payment requires an authorized Settlement installment.</small>}
      </>}
    </>}
    {step===2&&<>
      {!holderVoting&&<label className="gov-check"><input type="checkbox" checked={rules.allowMandates} onChange={e=>setRepresentation(e.target.checked)}/>Permit scoped representative mandates</label>}
      {(Object.keys(ruleLabels) as (keyof typeof ruleLabels)[]).map(k=><label key={k}>{ruleLabels[k]}<textarea required maxLength={4000} value={rules[k]} onChange={e=>editRules({[k]:e.target.value})}/></label>)}
      {currency&&<fieldset className="gov-box gov-form"><legend>Currency rules</legend>
        {currency.poolPricing?<p>The pool sets prices. This charter governs new sales.</p>:<><label>Lowest purchase price (USD)<input required inputMode="decimal" value={minimumPrice} onChange={e=>setMinimumPrice(e.target.value)}/></label>
        <label>{venuePricing?'Maximum purchase price (optional, USD)':'Highest purchase price (USD)'}<input required={!venuePricing} inputMode="decimal" value={maximumPrice} onChange={e=>setMaximumPrice(e.target.value)}/></label>
        <label className="gov-check"><input type="checkbox" checked={venuePricing} onChange={e=>setVenuePricing(e.target.checked)}/>Set the purchase price from verified venue traffic</label>
        {venuePricing&&<VenuePricingFields value={venueTerms} onChange={setVenueTerms}/>}</>}
        <label className="gov-check"><input type="checkbox" checked={allowSalesPause} onChange={e=>setAllowSalesPause(e.target.checked)}/>Allow votes to pause or reopen sales</label>
        <label className="gov-check"><input type="checkbox" checked={holderVoting} onChange={e=>setHolderVoting(e.target.checked)}/>Open voting to currency holders</label>
        {holderVoting&&<div className="gov-fields">
          <fieldset disabled={workerPreparing||building}>
            <legend>Voting custodian</legend>
            <label className="gov-check"><input type="radio" name="voting-custodian" checked={custody==='existing'} onChange={()=>setCustody('existing')}/>Use an existing custodian</label>
            <label className="gov-check"><input type="radio" name="voting-custodian" checked={founderCustody} onChange={()=>setCustody('founder')}/>Serve as the founding custodian</label>
            {identity?.currencyGovernance&&<label className="gov-check"><input type="radio" name="voting-custodian" checked={custody==='managed'} onChange={()=>setCustody('managed')}/>Create a managed worker</label>}
          </fieldset>
          {custody==='managed'?<div className="gov-stack">
            <p className="small-copy">Receiz keeps the worker’s key and starting register. The worker can process holder votes after you sign and link the charter.</p>
            {managed?<p role="status">Worker ready · {managed.register.custodian}</p>
              :<button type="button" disabled={workerPreparing||building} onClick={()=>void createManagedWorker()}>{workerPreparing?'Preparing worker…':'Create worker'}</button>}
          </div>:founderCustody?<div className="gov-stack">
            <label>Custodian public key ID <small>Use a key admitted to your Receiz account.</small><input required pattern="[a-f0-9]{64}" value={founderKeyId} onChange={e=>setFounderKey(e.target.value)}/></label>
            <p className="small-copy">Bankeiz creates and keeps the starting register when you review the charter. You can also use an existing register.</p>
            <label>Use an existing starting register Original<input type="file" disabled={building} onChange={e=>setFounderRegisterOriginal(e.target.files?.[0]??null)}/></label>
            {(founderRegisterOriginal||createdFounderRegister)&&<button type="button" disabled={building} onClick={()=>void saveFounderRegister()}>Save register Original</button>}
          </div>:<>
            <label>Custodian Receiz ID<input required value={custodian} onChange={e=>setCustodian(e.target.value)}/></label>
            <label>Custodian public key ID<input required pattern="[a-f0-9]{64}" value={custodianKey} onChange={e=>setCustodianKey(e.target.value)}/></label>
            <label>Custodian register Original<input type="file" required onChange={e=>setRegisterOriginal(e.target.files?.[0]??null)}/></label>
          </>}
          <label>Registration period (days)<input type="number" value={registrationDays} required min={1} max={90} onChange={e=>setRegistrationDays(Number(e.target.value))}/></label>
          <label>Roll review period (days)<input type="number" value={rollReviewDays} required min={1} max={90} onChange={e=>setRollReviewDays(Number(e.target.value))}/></label>
          <label>Quorum (%)<input type="number" value={quorum} required min={1} max={100} onChange={e=>setQuorum(Number(e.target.value))}/></label>
        </div>}
      </fieldset>}
      {!currency&&identity&&!openRoll&&<CharterExecutionFields identity={identity} owner={owner} value={execution} change={v=>setExecutions(all=>({...all,[template]:v}))}/>}
      <CharterOffices offices={rules.offices} articles={rules.articles} setOffices={offices=>editRules({offices})} setArticles={articles=>editRules({articles})}/>
      <div className="gov-fields">{([['Approval threshold (%)','approvalPercent',50,100],['Minimum affirmative electorate (%)','minimumSupportPercent',0,100],['Voting period (days)','voteDays',1,365],['Challenge period (days)','appealDays',1,90]] as const).map(([label,key,min,max])=><label key={key}>{label}<input type="number" min={min} max={max} required value={rules[key]} onChange={e=>editRules({[key]:Number(e.target.value)})}/></label>)}</div>
    </>}
    {error&&<p role="alert">{error}</p>}
    <button className="gov-primary" type="submit" disabled={logoBusy||building||workerPreparing||Boolean(currency&&step===2&&holderVoting&&custody==='managed'&&!managed)||mode==='proposal'&&(!charter||election&&(!office||!selected.length))}>{mode==='charter'&&step===1?<><ArrowRight size={16}/>Continue</>:<><Check size={16}/>{identity?'Review Original':'Review draft'}</>}</button>
  </form>;
}
