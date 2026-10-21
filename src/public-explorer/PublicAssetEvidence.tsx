import {AccountProfileLink} from '../components/AccountProfileLink';
import {useEffect,useMemo,useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import type {PublicMarketItem} from '../receiz/public-market';
import {publicMarketRecord} from '../receiz/public-network';
import {LedgerFundingTrace} from '../features/ledger/LedgerFundingTrace';
import {LedgerProofDetails} from '../features/ledger/LedgerProofDetails';
import {fetchPublicCardDetails,type PublicCardDetails} from '../receiz/public-card-details';
import '../features/ledger/ledger-inspector.css';
import '../styles/source-links.css';
export function PublicAssetEvidence({item}:{item:PublicMarketItem}){
 const record=useMemo(()=>publicMarketRecord(item),[item]),[selected,setSelected]=useState(''),[history,setHistory]=useState<PublicCardDetails|null>(null),[message,setMessage]=useState('');
 const copies=item.sealedCopies??[],copy=copies.find(copy=>copy.collectibleId===selected)??copies.find(copy=>copy.collectibleId===item.assetId)??copies[0];
 const assetId=copy?.collectibleId??item.assetId,claim=copy?.claimHash;
 const sourceUrl=claim?`https://receiz.com/game/sports/card/${assetId}?claimHash=${claim}`:item.sourceUrl;
 useEffect(()=>{
  if(item.category!=='sports')return;
  const controller=new AbortController();setHistory(null);setMessage('');
  void fetchPublicCardDetails({...item,assetId,sourceUrl,circulationCount:copy?1:item.circulationCount},controller.signal).then(value=>{if(!controller.signal.aborted)setHistory(value);}).catch(()=>{if(!controller.signal.aborted)setMessage('This ownership record could not be refreshed. Open its public source for the available history.');});return()=>controller.abort();
 },[item.id,assetId,sourceUrl]);
 return <div className="public-asset-evidence-body"><LedgerFundingTrace record={record}/>{item.category==='sports'&&<section className="public-asset-history"><h2>Ownership history</h2>{copies.length>1&&<label className="public-copy-select">Sealed copy<select aria-label="Ownership history for sealed copy" value={assetId} onChange={event=>setSelected(event.target.value)}>{copies.map((copy,index)=><option key={copy.collectibleId} value={copy.collectibleId}>Copy {index+1} · {copy.ownerUsername?'@'+copy.ownerUsername:copy.collectibleId}</option>)}</select></label>}<p>Public source records for this copy, in recorded order. Original proofs establish their verification scope.</p>{history?.history&&<ol>{history.history.map(event=><li key={event.id}><span>{new Date(event.at).toLocaleString()}</span><h3>{event.kind.replaceAll('_',' ')}</h3>{event.ownerUsername?<AccountProfileLink username={event.ownerUsername}>@{event.ownerUsername}</AccountProfileLink>:event.ownerDisplayName&&<p>{event.ownerDisplayName}</p>}<details><summary>Event reference</summary><code>{event.id}</code></details></li>)}</ol>}{sourceUrl&&<a className="source-link" href={sourceUrl} target="_blank" rel="noreferrer"><span>Open this copy’s public source</span><ArrowUpRight size={16} aria-hidden="true"/></a>}</section>}{message&&<p role="status">{message}</p>}{item.originalUrl&&item.originalDigest&&<LedgerProofDetails record={record}/>}<details className="ledger-exact-json"><summary>Complete public asset fields</summary><pre>{JSON.stringify(item,null,2)}</pre></details>{item.sourceUrl&&<a className="source-link" href={item.sourceUrl} target="_blank" rel="noreferrer"><span>Open the complete public source</span><ArrowUpRight size={16} aria-hidden="true"/></a>}<p className="body-copy small-copy">The retained original determines the verified scope. Public discovery fields and a valuation do not grant ownership, spend authority or an account balance.</p></div>;
}
