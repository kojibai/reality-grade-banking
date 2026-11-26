import { inspectNativeCurrencyServicePricingTerms, type NativeCurrencyServicePricingTerms } from '../../native/receiz/app/lib/wallet/bankNotes/nativeCurrencyServicePricing.js';
import { inspectNativeCurrencyChanges, type NativeCurrencyChanges } from '../../native/receiz/app/lib/wallet/bankNotes/nativeAssetCurrency';
import type {OpenIdentity} from './native-identity';
import {openCanonicalProofFile} from './proof-capture';
import {loadReceiz} from './client';

export const governanceNamespace='bankeiz-voting';
export const governanceSchema='receiz.app.bankeiz.governance.public-document.v1';
export const governanceKinds=['charter','ratification','proposal','ballot','mandate','challenge','candidacy','closure'] as const;
type Kind=typeof governanceKinds[number];
export type CharterOffice=Readonly<{
  name:string; seats:number; selection:'Election'|'Custom'; eligibility:'Electorate'|'Open';
  powers:string; term:string; recall:string; procedure:string;
}>;
export type CharterArticle=Readonly<{title:string;text:string}>;
export type CharterPayment=Readonly<{
  budgetId:string;sourceProofObjectId:string;sourceValueHead:string;
  destinationSubjectId:string;expectedDestinationHead:string;amountPhiMicro:string;installment:string;
}>;
export type CharterCurrencyControl=Readonly<{
  assetId:string;minimumPriceUsdCents:string;maximumPriceUsdCents?:string;allowSalesPause:boolean;servicePricing?:NativeCurrencyServicePricingTerms;
}>;
export type CharterCurrencyChange=Readonly<{
  assetId:string;expectedHead:string;changes:NativeCurrencyChanges;
}>;
export type CharterExecution=Readonly<{
  rule:'unanimous-evidence-closure-v1';custodian:string;registerProofObjectId:string;registerGenesisHead:string;treasury:CharterPayment|null;currency?:CharterCurrencyControl;
}>;
export type CharterRules=Readonly<{
  participation?:'open-registration';execution?:CharterExecution;electorate?:readonly string[]; offices?:readonly CharterOffice[]; articles?:readonly CharterArticle[];
  name:string; purpose:string; founders:readonly string[]; membership:string;
  decisions:string; representation:string; amendments:string; appeals:string; treasury:string;
  approvalPercent:number; minimumSupportPercent:number; voteDays:number; appealDays:number; allowMandates:boolean;
}>;
export type DecisionKind='Policy'|'Poll'|'Election'|'Treasury'|'Amendment';
export type GovernanceAttachment=Readonly<{name:string;source:string}>;
export type GovernanceTerms=Readonly<{attachments?:readonly GovernanceAttachment[]}> & (
  | {kind:'charter';rules:CharterRules;logo?:string}
  | {kind:'ratification';charter:string}
  | {kind:'candidacy';charter:string;office:string;statement:string}
  | {kind:'proposal';payment?:CharterPayment;currencyChange?:CharterCurrencyChange;office?:string;nominations?:readonly string[];charter:string;title:string;text:string;decision:DecisionKind;choices:readonly string[]}
  | {kind:'ballot';charter:string;proposal:string;choice:string;previous:string|null}
  | {kind:'mandate';charter:string;delegate:string|null;scope:string;untilKaiPulse:string;previous:string|null}
  | {kind:'closure';charter:string;proposal:string;evidence:readonly string[]}
  | {kind:'challenge';charter:string;proposal:string;text:string});
export type GovernanceDocument=Readonly<{schema:typeof governanceSchema;visibility:'public';author:string;accountUid:string|null;terms:GovernanceTerms}>;
export type GovernanceOriginal=Readonly<{digest:string;file:File;document:GovernanceDocument;pulse:string}>;
const admitted=new WeakSet<GovernanceOriginal>();
const digest=/^[a-f0-9]{64}$/;
const fail=():never=>{throw Error('This Original does not contain a supported public governance document.');};
function fields(value:unknown,expected:string[]):Record<string,unknown>{
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join('|')!==[...expected].sort().join('|'))return fail();
  return value as Record<string,unknown>;
}
function words(value:unknown,max=4000):string{
  if(typeof value!=='string'||!value.trim()||value!==value.trim()||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value))return fail();
  return value;
}
function subject(value:unknown):string{const id=words(value,256);if(/\s/u.test(id))return fail();return id;}
function hash(value:unknown):string{if(typeof value!=='string'||!digest.test(value))return fail();return value;}
function distinct(value:unknown,read:(v:unknown)=>string,max:number,min=1){
  if(!Array.isArray(value)||value.length<min||value.length>max)return fail();const list=value.map(read);
  if(new Set(list).size!==list.length)return fail();return Object.freeze(list);
}
const layout:Record<Kind,string[]>={
  charter:['rules'],candidacy:['charter','office','statement'],ratification:['charter'],proposal:['charter','title','text','decision','choices'],
  ballot:['charter','proposal','choice','previous'],mandate:['charter','delegate','scope','untilKaiPulse','previous'],
  challenge:['charter','proposal','text'],closure:['charter','proposal','evidence'],
};
export const charterElectorate=(rules:CharterRules)=>rules.participation==='open-registration'?[]:rules.electorate??rules.founders;
export const charterAdmitsMember=(rules:CharterRules,owner:string)=>Boolean(owner)&&(rules.participation==='open-registration'||charterElectorate(rules).includes(owner));
function optionalFields(value:unknown,keys:string[]){return keys.filter(k=>Boolean(value&&typeof value==='object'&&Object.hasOwn(value,k)));}
function boundedRows<T>(value:unknown,max:number,read:(entry:unknown)=>T,key:(entry:T)=>string){
  if(!Array.isArray(value)||value.length>max)return fail();
  const rows=value.map(read);if(new Set(rows.map(key)).size!==rows.length)return fail();
  return Object.freeze(rows);
}
function readOffice(value:unknown):CharterOffice{
  const r=fields(value,['name','seats','selection','eligibility','powers','term','recall','procedure']);
  if(typeof r.seats!=='number'||!Number.isInteger(r.seats)||r.seats<1||r.seats>128||
    r.selection!=='Election'&&r.selection!=='Custom'||r.eligibility!=='Electorate'&&r.eligibility!=='Open')return fail();
  return Object.freeze({name:words(r.name,120),seats:r.seats,selection:r.selection,eligibility:r.eligibility,
    powers:words(r.powers),term:words(r.term),recall:words(r.recall),procedure:words(r.procedure)});
}
function readPayment(value:unknown):CharterPayment{
  const v=fields(value,['budgetId','sourceProofObjectId','sourceValueHead','destinationSubjectId','expectedDestinationHead','amountPhiMicro','installment']);
  if(typeof v.destinationSubjectId!=='string'||!/^receiz:subject:[a-f0-9]{64}$/.test(v.destinationSubjectId)||
     typeof v.amountPhiMicro!=='string'||!/^[1-9][0-9]{0,17}$/.test(v.amountPhiMicro))return fail();
  return Object.freeze({budgetId:subject(v.budgetId),sourceProofObjectId:subject(v.sourceProofObjectId),sourceValueHead:hash(v.sourceValueHead),destinationSubjectId:v.destinationSubjectId,expectedDestinationHead:hash(v.expectedDestinationHead),amountPhiMicro:v.amountPhiMicro,installment:subject(v.installment)});
}
function readCurrencyControl(value:unknown):CharterCurrencyControl{
  const r=fields(value,['assetId','minimumPriceUsdCents','allowSalesPause',...optionalFields(value,['maximumPriceUsdCents','servicePricing'])]);
  const minimum=inspectNativeCurrencyChanges({priceUsdCentsPerUnit:r.minimumPriceUsdCents}).priceUsdCentsPerUnit!;
  const maximum='maximumPriceUsdCents'in r?inspectNativeCurrencyChanges({priceUsdCentsPerUnit:r.maximumPriceUsdCents}).priceUsdCentsPerUnit:undefined;
  const servicePricing='servicePricing'in r?inspectNativeCurrencyServicePricingTerms(r.servicePricing):undefined;
  if((maximum===undefined?!servicePricing:BigInt(minimum)>BigInt(maximum))||typeof r.allowSalesPause!=='boolean')return fail();
  return Object.freeze({assetId:hash(r.assetId),minimumPriceUsdCents:minimum,...(maximum?{maximumPriceUsdCents:maximum}:{}),
    allowSalesPause:r.allowSalesPause,...(servicePricing?{servicePricing}:{})});
}
function readCurrencyChange(value:unknown):CharterCurrencyChange{
  const r=fields(value,['assetId','expectedHead','changes']);
  return Object.freeze({assetId:hash(r.assetId),expectedHead:hash(r.expectedHead),changes:Object.freeze(inspectNativeCurrencyChanges(r.changes))});
}
export function checkCharterCurrencyChange(control:CharterCurrencyControl|undefined,proposal:CharterCurrencyChange) {
  if(!control||proposal.assetId!==control.assetId)throw Error('GOVERNANCE_CURRENCY_SCOPE_MISMATCH');
  const {priceUsdCentsPerUnit:price,salesPaused}=proposal.changes;
  if(price&&(control.servicePricing||BigInt(price)<BigInt(control.minimumPriceUsdCents)||control.maximumPriceUsdCents!==undefined&&BigInt(price)>BigInt(control.maximumPriceUsdCents))
    ||salesPaused!==undefined&&!control.allowSalesPause)throw Error('GOVERNANCE_CURRENCY_SCOPE_MISMATCH');
  return proposal;
}
function readExecution(value:unknown):CharterExecution{
  const v=fields(value,['rule','custodian','registerProofObjectId','registerGenesisHead','treasury',...optionalFields(value,['currency'])]);
  if(v.rule!=='unanimous-evidence-closure-v1')return fail();
  return Object.freeze({rule:v.rule,custodian:subject(v.custodian),registerProofObjectId:subject(v.registerProofObjectId),registerGenesisHead:hash(v.registerGenesisHead),treasury:v.treasury===null?null:readPayment(v.treasury),...('currency' in v?{currency:readCurrencyControl(v.currency)}:{})});
}
export function readGovernanceTerms(input:unknown):GovernanceTerms{
  const kind=(input as {kind?:Kind}|null)?.kind;
  if(!kind||!governanceKinds.includes(kind))return fail();
  const acceptsFiles=['charter','proposal','mandate','challenge','candidacy'].includes(kind);
  const v=fields(input,['kind',...layout[kind],...optionalFields(input,[...(acceptsFiles?['attachments']:[]),...(kind==='charter'?['logo']:[])]),...(kind==='proposal'?optionalFields(input,['office','nominations','payment','currencyChange']):[])]);
  const files='attachments' in v?{attachments:boundedRows(v.attachments,256,value=>{
    const file=fields(value,['name','source']),name=words(file.name,240),source=words(file.source,4096);
    if(/[\/\\\u0000-\u001f]/u.test(name)||!/^https:\/\/receiz\.com\/v\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/[0-9]+#material=(?:rmc[12](?::|%3A))[a-f0-9]{64}$/u.test(source))return fail();
    return Object.freeze({name,source});
  },file=>file.source)}:{};
  if(kind==='charter'){
    const logo='logo' in v?words(v.logo,65536):undefined;
    if(logo&&!/^data:image\/(?:png|webp);base64,[A-Za-z0-9+/]+={0,2}$/u.test(logo))return fail();
    const r=fields(v.rules,['name','purpose','founders','membership','decisions','representation','amendments','appeals','treasury','approvalPercent','minimumSupportPercent','voteDays','appealDays','allowMandates',...optionalFields(v.rules,['electorate','offices','articles','execution','participation'])]);
    const integer=(n:unknown,min:number,max:number)=>{if(typeof n!=='number'||!Number.isInteger(n)||n<min||n>max)return fail();return n;};
    if(typeof r.allowMandates!=='boolean')return fail();
    if('participation' in r&&(r.participation!=='open-registration'||'electorate' in r||'execution' in r))return fail();
    const rules={
      ...('participation' in r?{participation:'open-registration' as const}:{}),
      ...('execution' in r?{execution:readExecution(r.execution)}:{}),
      ...('electorate' in r?{electorate:distinct(r.electorate,subject,4096)}:{}),
      ...('offices' in r?{offices:boundedRows(r.offices,64,readOffice,o=>o.name)}:{}),
      ...('articles' in r?{articles:boundedRows(r.articles,128,value=>{const a=fields(value,['title','text']);return Object.freeze({title:words(a.title,160),text:words(a.text,16000)});},a=>a.title)}:{}),
      name:words(r.name,120),purpose:words(r.purpose),founders:distinct(r.founders,subject,256),membership:words(r.membership),decisions:words(r.decisions),representation:words(r.representation),amendments:words(r.amendments),appeals:words(r.appeals),treasury:words(r.treasury),approvalPercent:integer(r.approvalPercent,50,100),minimumSupportPercent:integer(r.minimumSupportPercent,0,100),voteDays:integer(r.voteDays,1,365),appealDays:integer(r.appealDays,1,90),allowMandates:r.allowMandates};
    return Object.freeze({kind,...files,...(logo?{logo}:{}),rules:Object.freeze(rules)});
  }
  const charter=hash(v.charter);
  if(kind==='ratification')return Object.freeze({kind,charter});
  if(kind==='candidacy')return Object.freeze({kind,charter,...files,office:words(v.office,120),statement:words(v.statement)});
  if(kind==='proposal'){
    const decision=v.decision as DecisionKind;
    if(!['Policy','Poll','Election','Treasury','Amendment'].includes(decision))return fail();
    const contest='office' in v||'nominations' in v;
    if(contest&&(decision!=='Election'||!v.office||!v.nominations))return fail();
    const nominations=contest?distinct(v.nominations,hash,256):[];
    const choices=distinct(v.choices,x=>words(x,256),256,contest?1:2);
    if(contest&&nominations.length!==choices.length)return fail();
    if('payment' in v&&(decision!=='Treasury'||choices.length!==2||choices[0]!=='Approve'||choices[1]!=='Reject'))return fail();
    if('currencyChange' in v&&(decision!=='Policy'||choices.length!==2||choices[0]!=='Approve'||choices[1]!=='Reject'))return fail();
    return Object.freeze({kind,charter,...files,...('currencyChange' in v?{currencyChange:readCurrencyChange(v.currencyChange)}:{}),...('payment' in v?{payment:readPayment(v.payment)}:{}),...(contest?{office:words(v.office,120),nominations}:{}),title:words(v.title,160),text:words(v.text),decision,choices});
  }
  if(kind==='closure'){
    const proposal=hash(v.proposal),evidence=distinct(v.evidence,hash,4096,2);
    if(!evidence.includes(charter)||!evidence.includes(proposal)||evidence.some((id,i)=>i>0&&id<=evidence[i-1]))return fail();
    return Object.freeze({kind,charter,proposal,evidence});
  }
  if(kind==='challenge')return Object.freeze({kind,charter,...files,proposal:hash(v.proposal),text:words(v.text)});
  const previous=v.previous===null?null:hash(v.previous);
  if(kind==='ballot')return Object.freeze({kind,charter,proposal:hash(v.proposal),choice:words(v.choice,256),previous});
  if(typeof v.untilKaiPulse!=='string'||! /^(0|[1-9][0-9]{0,24})$/.test(v.untilKaiPulse))return fail();
  return Object.freeze({kind,charter,...files,delegate:v.delegate===null?null:subject(v.delegate),scope:words(v.scope,240),untilKaiPulse:v.untilKaiPulse,previous});
}
export async function openGovernanceOriginal(file:File):Promise<GovernanceOriginal>{
  if(!file.size||file.size>2*1024*1024)return fail();
  const captured=new File([file],file.name,{type:file.type});
  const opened=await openCanonicalProofFile(captured),source=opened.sealedArtifact;
  if(source.kind!=='receiz.native-record-seal'||opened.verifiedPayload.mimeType!=='application/json'||opened.verifiedPayload.bytes.byteLength>512000)return fail();
  const raw=new TextDecoder('utf-8',{fatal:true}).decode(opened.verifiedPayload.bytes);
  const doc=fields(JSON.parse(raw),['schema','visibility','author','accountUid','terms']);
  if(doc.schema!==governanceSchema||doc.visibility!=='public'||subject(doc.author)!==source.continuity.ownerReceizId)return fail();
  const terms=readGovernanceTerms(doc.terms),author=subject(doc.author);
  if(terms.kind==='charter'&&!terms.rules.founders.includes(author)||terms.kind==='mandate'&&terms.delegate===author)return fail();
  const accountUid=doc.accountUid;
  if(accountUid!==null&&(typeof accountUid!=='string'||! /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(accountUid)))return fail();
  const document:GovernanceDocument=Object.freeze({schema:governanceSchema,visibility:'public',author,accountUid,terms});
  const sdk=await loadReceiz();
  if(sdk.canonicalizeReceizV122(document)!==raw)return fail();
  const record=Object.freeze({digest:hash(source.artifactSha256),file:captured,document,pulse:String(source.verification.bundle.kaiPulseEternal)});
  admitted.add(record);return record;
}
export function requireGovernanceOriginal(value:GovernanceOriginal){if(!admitted.has(value))throw Error('Open the complete governance Original first.');return value;}
export async function sealGovernanceOriginal(identity:OpenIdentity,input:GovernanceTerms,files:readonly File[]=[]):Promise<GovernanceOriginal>{
  if(!identity.sealRecordExport)throw Error('Open the identity that will seal this document.');
  const draft=readGovernanceTerms(input);
  const terms=files.length?readGovernanceTerms({...draft,attachments:[...(draft.attachments??[]),...await (await import('./governance-material')).holdGovernanceFiles(identity,files)]}):draft,author=identity.binding.artifactOwnerReceizId;
  if(terms.kind==='charter'&&!terms.rules.founders.includes(author))throw Error('Include your exact Receiz owner ID among the named founders.');
  if(terms.kind==='mandate'&&terms.delegate===author)throw Error('Choose a different representative.');
  const accountUid=identity.walletReceivingAddress?.()??null;
  const sdk=await loadReceiz(),bytes=new TextEncoder().encode(sdk.canonicalizeReceizV122({schema:governanceSchema,visibility:'public',author,accountUid,terms}));
  if(bytes.byteLength>512000)throw Error('This charter exceeds the 512 kB document limit. Shorten the text before sealing.');
  const file=await identity.sealRecordExport({bytes,filename:`governance-${terms.kind}.json`,mimeType:'application/json'});
  const record=await openGovernanceOriginal(file);
  if(record.document.author!==author||sdk.canonicalizeReceizV122(record.document.terms)!==sdk.canonicalizeReceizV122(terms))return fail();
  return record;
}
