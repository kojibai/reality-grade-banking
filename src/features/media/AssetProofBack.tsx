import {lazy,Suspense,useMemo,useState,useSyncExternalStore} from 'react';
import type {PublicMarketItem} from '../../receiz/public-market';
import {publicAssetManifest,publicManifestLink,type PublicAssetManifestRow} from '../../receiz/public-asset-manifest';
import {retainedProofInspection,subscribeProofInspections} from '../../receiz/proof-inspection';
import {publicMarketRecord} from '../../receiz/public-network';
import './asset-proof-back.css';
const LedgerProofDetails=lazy(()=>import('../ledger/LedgerProofDetails').then(module=>({default:module.LedgerProofDetails})));

/** The public live-player manifest and the complete SDK-admitted original share
 * one back. Opening a side starts no reader; opened media publishes its report. */
export function AssetProofBack({item}:{item:PublicMarketItem}){
 const [inspect,setInspect]=useState(false);
 const inspection=useSyncExternalStore(subscribeProofInspections,()=>retainedProofInspection(item.originalDigest??undefined),()=>null);
 const record=useMemo(()=>publicMarketRecord(item),[item]);
 const rows=useMemo(()=>{
  const manifest=item.proofManifest??publicAssetManifest(item.proofManifestSource??{mediaKind:item.mediaKind,media:{originalDownloadSha256Hex:item.originalDigest}},item),bundle=inspection?.report.verification.bundle as Record<string,unknown>|undefined;
  if(!bundle)return manifest;
  // Older retained catalogues lack display manifest fields. Exact successful
  // SDK inspection can fill only the fields it actually carries.
  const verified=publicAssetManifest({code:bundle.code,pulse:bundle.kaiPulseEternal,verifyPath:bundle.verifyPath,mediaKind:item.mediaKind,recordCardMediaSha256Hex:item.mediaKind==='moment'&&inspection?.report.verification.kind==='png'?bundle.artifactSha256Basis:undefined,proof:{groth16Id:typeof bundle.groth16ProofDigest==='string'?bundle.groth16ProofDigest.slice(0,16).toUpperCase():null,poseidon:bundle.zkPoseidonHash}},item);
  const replacements=new Map(verified.map(row=>[row.label,row]));
  return manifest.map(row=>row.value==='Unavailable'||row.label==='Pulse'&&row.value==='pending'||row.label==='Coordinate'&&row.value.startsWith('pending/')?replacements.get(row.label)??row:row);
 },[item,inspection]);
 return <div className="asset-proof-back-body"><header><span>Proof Manifest</span><h2>{item.title}</h2><p>The same manifest carried by the public live player. Open the original below for independent verification.</p></header><dl>{rows.map((row:PublicAssetManifestRow,index)=>{
  const href=publicManifestLink(row.href);
  return <div key={`${row.label}:${index}`}><dt>{row.label}</dt><dd>{href?<a href={href} target="_blank" rel="noreferrer" download={row.downloadName}>{row.value}</a>:row.value}</dd></div>;
 })}</dl>{item.originalUrl&&item.originalDigest&&<details className="asset-proof-original" onToggle={event=>setInspect(event.currentTarget.open)}><summary>Complete original &amp; independent verification</summary>{inspect&&<Suspense fallback={null}><LedgerProofDetails record={record}/></Suspense>}</details>}{item.sourceUrl&&<a className="asset-proof-source" href={item.sourceUrl} target="_blank" rel="noreferrer">Open public source ↗</a>}</div>;
}
