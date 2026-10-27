import {useLayoutEffect,useMemo,useRef,useState,type ReactNode,type Ref} from 'react';
import {ChevronLeft,ChevronRight,Download,Search,ShieldCheck} from 'lucide-react';
import {Sheet} from '../../components/Sheet';
import {ValueChart} from '../../components/ValueChart';
import {formatMoney,formatUnits} from '../../core/money';
import {collectionBranch,type HeldCollection,type HeldCollectible} from '../../receiz/collectibles';
import {CollectibleCardView} from './CollectibleCardView';
import {CollectiblesIcon} from './CollectiblesIcon';
import './collection.css';

const money=new Intl.NumberFormat(undefined,{style:'currency',currency:'USD',maximumFractionDigits:2});
const pageSize=40;
function Pages({page,count,label,onChange}:{page:number;count:number;label:string;onChange:(page:number)=>void}){
 return count>pageSize?<nav className="collection-pages" aria-label={`${label} pages`}><button className="icon-button" aria-label={`Previous ${label.toLowerCase()} page`} disabled={page===0} onClick={()=>onChange(page-1)}><ChevronLeft size={18}/></button><span aria-live="polite">{(page*pageSize+1).toLocaleString()}–{Math.min((page+1)*pageSize,count).toLocaleString()} of {count.toLocaleString()}</span><button className="icon-button" aria-label={`Next ${label.toLowerCase()} page`} disabled={(page+1)*pageSize>=count} onClick={()=>onChange(page+1)}><ChevronRight size={18}/></button></nav>:null;
}
function Disclosure({title,children}:{title:string;children:()=>ReactNode}){
 const [open,setOpen]=useState(false);
 return <details className="collection-disclosure" onToggle={event=>setOpen(event.currentTarget.open)}><summary>{title}<ChevronRight size={16}/></summary>{open&&<div className="collection-disclosure-body">{children()}</div>}</details>;
}
function Artwork({card,large=false}:{card:HeldCollectible;large?:boolean}){
 return <div className={`collection-art${large?' selected':''}`}>{card.artworkUrl?<img src={card.artworkUrl} alt={large?card.title:''} loading="lazy" decoding="async" draggable={false}/>:<CollectiblesIcon size={large?58:32}/>}</div>;
}
const record=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const recordLabels:Record<string,string>={kind:'Event',eventKind:'Event',appendKind:'Event',label:'Event',detail:'Details',fromUsername:'From',toUsername:'To',ownerUsername:'Owner',fromUserId:'Sender account',toUserId:'Recipient account',ownerUserId:'Owner account',at:'Recorded',createdAtMs:'Recorded',occurredAt:'Recorded',createdAt:'Recorded',recordedAt:'Recorded',kaiPulse:'Kai pulse',kai_upulse:'Kai micro-pulse',kaiUPulse:'Kai micro-pulse',claimPulse:'Original Kai',fundingSource:'Funding source',funding_source:'Funding source',source:'Source',sourceId:'Source record',sourceHash:'Source digest',contentHash:'Content digest',amountUsdCents:'Amount',amount_usd_cents:'Amount',priceUsdCents:'Purchase price',settlementPhiMicro:'Settlement',amountPhiMicro:'Amount',proofObjectId:'Proof object',proofHash:'Proof digest',hash:'Proof digest',appendHash:'Append digest',append_hash:'Append digest',previousProofHash:'Parent proof',previousAppendHash:'Parent append',originalEarnerFingerprint:'Original earner',currentOwnerFingerprint:'Owner fingerprint',fromOwnerFingerprint:'Previous owner',toOwnerFingerprint:'New owner',achievementTransferable:'Achievement transferable',collectibleTransferable:'Collectible transferable',transferState:'Ownership',packPurchaseId:'Pack purchase',saleId:'Sale',transferId:'Transfer',walletLedgerEntryId:'Funding record',walletLedgerProofHash:'Funding proof',previousCausalProofHash:'Parent proof',ownershipAppendHash:'Ownership append',cardClaimHash:'Card claim',ownershipRule:'Ownership rule',appendLaw:'Append rule',matchId:'Match',result:'Result',turns:'Turns',energy:'Energy',ratingDelta:'Rating change',battleRule:'Battle rule',growthRule:'Growth rule',feedRule:'Feed rule',combineRule:'Combine rule',evolutionRule:'Evolution rule',decisionLine:'Result details'};
const recordFieldCache=new WeakMap<Record<string,unknown>,Array<{key:string;label:string;value:string}>>();
const recordTime=new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'});
function recordFields(value:Record<string,unknown>){
 const held=recordFieldCache.get(value);if(held)return held;
 const entries=Object.entries(value).filter(([key,input])=>recordLabels[key]&&['string','number','boolean'].includes(typeof input)).map(([key,input])=>{
  const text=String(input);let rendered=typeof input==='boolean'?input?'Yes':'No':text;
  if(/^-?\d{1,24}$/.test(text)){if(['amountUsdCents','amount_usd_cents','priceUsdCents'].includes(key))rendered=formatMoney(text);else if(['amountPhiMicro','settlementPhiMicro'].includes(key))rendered=`${formatUnits(text)} Φ`;}
  if(['at','createdAt','occurredAt','recordedAt','createdAtMs'].includes(key)){const time=key==='createdAtMs'?Number(input):Date.parse(text);if(Number.isFinite(time)&&Math.abs(time)<=8.64e15)rendered=recordTime.format(time);}
  return{key,label:recordLabels[key],value:rendered};
 });recordFieldCache.set(value,entries);return entries;
}
function RecordLines({value}:{value:Record<string,unknown>}){
 return <dl className="collection-record-lines">{recordFields(value).map(field=><div key={field.key}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl>;
}
function Provenance({card}:{card:HeldCollectible}){
 const [page,setPage]=useState(0);
 const history=useMemo(()=>{
  const arrays=[card.asset.ownershipHistory,card.asset.causalOwnershipProofs,card.asset.appends,card.appends.map(row=>row.append_json??row)];
  const seen=new Set<unknown>();
  return arrays.flatMap(input=>Array.isArray(input)?input:[]).filter(value=>value&&typeof value==='object').map(record).filter(event=>{const key=event.hash??event.appendHash??event;if(seen.has(key))return false;seen.add(key);return true;});
 },[card]);
 return <div data-ownership-history>{history.length?history.slice(page*pageSize,(page+1)*pageSize).map((event,index)=><div className="collection-history-event" key={`${page}:${index}`}><RecordLines value={event}/>{Boolean(event.payload)&&<RecordLines value={record(event.payload)}/>} {(Boolean(event.anchors)||Array.isArray(event.steps)&&event.steps.length>0)&&<Disclosure title="Source references">{()=> <>{Array.isArray(event.steps)&&<RecordPages rows={event.steps}/>} {Boolean(event.anchors)&&<RecordLines value={record(event.anchors)}/>}</>}</Disclosure>}</div>):<RecordLines value={record(card.claim.provenance)}/>}<Pages page={page} count={history.length} label="History" onChange={setPage}/><p className="small-copy muted">The retained source record keeps its original ownership and funding references.</p></div>;
}
function RecordPages({rows}:{rows:unknown[]}){
 const [page,setPage]=useState(0);return <>{rows.slice(page*pageSize,(page+1)*pageSize).map((row,index)=><RecordLines key={`${page}:${index}`} value={record(row)}/>)}<Pages page={page} count={rows.length} label="Source" onChange={setPage}/></>;
}
function CardDetails({card,elementRef}:{card:HeldCollectible;elementRef:Ref<HTMLElement>}){
 const [flipped,setFlipped]=useState(false);
 const chart=useMemo(()=>({values:card.value?.history.map(point=>point.usdValue)??[],times:card.value?.history.map(point=>Date.parse(point.at))??[]}),[card]);
 const save=()=>{
  const bytes=new Blob([JSON.stringify({card:card.source,appends:card.appends,acquisitions:card.acquisitions},null,2)],{type:'application/json'}),url=URL.createObjectURL(bytes),link=document.createElement('a');link.href=url;link.download=`${card.collectibleId}-record.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 return <article ref={elementRef} className="collection-item">
  <div className="collection-selected-card"><CollectibleCardView label={card.title} flipped={flipped} onFlip={setFlipped} front={<div className="collection-card-face"><Artwork card={card} large/><span className="collection-card-caption"><small>{card.taxonomy.slice(0,2).join(' · ')}</small><strong>{card.title}</strong><span>{card.rarity}</span></span></div>} back={<div className="collection-card-record"><ShieldCheck size={27}/><small>CARD RECORD</small><h3>{card.title}</h3><dl><div><dt>Original</dt><dd>{card.collectibleId}</dd></div><div><dt>Claim</dt><dd>{card.claimHash}</dd></div></dl><span>One original. A continuing story.</span></div>}/></div>
  <button className="text-button collection-flip" onClick={()=>setFlipped(value=>!value)}>{flipped?'View front':'View back'}</button>
  <header className="collection-item-heading"><p>{card.taxonomy.join(' / ')}</p><h2>{card.title}</h2>{card.value&&<strong>{money.format(card.value.usd)}</strong>}{card.listing&&<span>Listed for {money.format(Number(card.listing.priceUsdCents)/100)}</span>}</header>
  {chart.values.length>0&&<ValueChart values={chart.values} times={chart.times} label={`${card.title} recorded value`} color="navy"/>}
  <dl className="collection-facts">{card.facts.slice(0,4).map(fact=><div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
  <Disclosure title="Value & rarity">{()=> <><dl className="collection-record-lines">{card.facts.map(fact=><div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}{card.value&&<><div><dt>Current recorded value</dt><dd>{money.format(card.value.usd)}</dd></div><div><dt>Original proof value</dt><dd>{money.format(card.value.operands.proofValueUsd)}</dd></div><div><dt>Birth value</dt><dd>{money.format(card.value.operands.birthUsdValue)}</dd></div>{card.value.operands.valuationPulse!==undefined&&<div><dt>Value Kai</dt><dd>{card.value.operands.valuationPulse}</dd></div>}</>}{typeof record(card.claim.proof).rule==='string'&&<div><dt>Original rule</dt><dd>{String(record(card.claim.proof).rule)}</dd></div>}</dl><p className="small-copy muted">Issue numbers identify this card. Draw odds describe its pack; they are separate from an edition limit.</p></>}</Disclosure>
  <Disclosure title="Ownership & provenance">{()=> <><Provenance card={card}/>{card.acquisitions.map((purchase,index)=><RecordLines key={index} value={purchase}/>)}</>}</Disclosure>
  <Disclosure title="Original record">{()=> <><dl className="collection-record-lines"><div><dt>Collectible</dt><dd>{card.collectibleId}</dd></div><div><dt>Claim digest</dt><dd>{card.claimHash}</dd></div></dl><button className="text-button collection-save" onClick={save}><Download size={16}/>Save card record</button></>}</Disclosure>
 </article>;
}
export function CollectionPanel({collection,onClose,active=true,ownerName}:{collection:HeldCollection;onClose:()=>void;active?:boolean;ownerName?:string}){
 const [selectedId,setSelectedId]=useState<string|null>(null),[path,setPath]=useState<string[]>([]),[query,setQuery]=useState(''),[page,setPage]=useState(0);
 const element=useRef<HTMLElement>(null),catalogScroll=useRef(0);
 const selected=selectedId?collection.cards.find(card=>card.id===selectedId):undefined;
 const branch=useMemo(()=>collectionBranch(collection.cards,path),[collection.cards,path]);
 const matches=useMemo(()=>{const term=query.trim().toLocaleLowerCase();return term?branch.cards.filter(card=>`${card.title} ${card.taxonomy.join(' ')}`.toLocaleLowerCase().includes(term)):branch.cards;},[branch.cards,query]);
 useLayoutEffect(()=>{const body=element.current?.closest('.sheet-body');if(body)body.scrollTop=selectedId?0:catalogScroll.current;},[selectedId,page,path,query]);
 const navigate=(next:string[])=>{catalogScroll.current=0;setPath(next);setPage(0);};
 const select=(id:string)=>{catalogScroll.current=element.current?.closest('.sheet-body')?.scrollTop??0;setSelectedId(id);};
 const title=ownerName?`${ownerName}’s collection`:'Your collection';
 return <Sheet active={active} title={selected?'Collectible':title} navigation="back" onClose={()=>selectedId?setSelectedId(null):onClose()}>
  {selected?<CardDetails key={selected.id} card={selected} elementRef={element}/>:<section ref={element} className="collection-catalog" data-collection-catalog>
   <div className="collection-heading"><h1>{ownerName?'The collection.':'Your collection.'}</h1><p>{collection.cards.length.toLocaleString()} {collection.cards.length===1?'collectible':'collectibles'}. Every story, together.</p></div>
   <label className="collection-search"><Search size={18}/><input aria-label="Find a collectible" placeholder="Find a collectible" value={query} onChange={event=>{catalogScroll.current=0;setQuery(event.target.value);setPage(0);}}/></label>
   <nav className="collection-trail" aria-label="Collection categories"><button onClick={()=>navigate([])} aria-current={!path.length?'page':undefined}>All</button>{path.map((part,index)=><span key={index}><ChevronRight size={12}/><button onClick={()=>navigate(path.slice(0,index+1))} aria-current={index===path.length-1?'page':undefined}>{part}</button></span>)}</nav>
   {branch.categories.length>0&&<div className="collection-categories">{branch.categories.map(category=><button key={category.label} onClick={()=>navigate([...path,category.label])} aria-label={category.label}>{category.label}<small>{category.count}</small></button>)}</div>}
   <div className="collection-grid">{matches.slice(page*pageSize,(page+1)*pageSize).map(card=><button key={card.id} className="collection-tile" onClick={()=>select(card.id)} aria-label={`Open ${card.title}`}><Artwork card={card}/><span><small>{card.taxonomy[0]} · {card.rarity}</small><strong>{card.title}</strong>{card.value&&<span>{money.format(card.value.usd)}</span>}</span></button>)}</div>
   {!matches.length&&<p className="empty-state">{query?'No collectibles match your search.':'Your collectibles will appear here.'}</p>}
   <Pages page={page} count={matches.length} label="Collection" onChange={value=>{catalogScroll.current=0;setPage(value);}}/>
   {collection.status==='partial'&&<p className="small-copy muted">{ownerName?'Showing the available public collection.':'Showing the collectibles carried by your saved account.'}</p>}
  </section>}
 </Sheet>;
}
