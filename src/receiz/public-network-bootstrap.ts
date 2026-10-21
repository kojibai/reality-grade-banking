import {ledgerAssetTradeSide} from './ledger-asset-trade';
import {mergePublicRecords} from './public-network';
import type {PublicNetworkCache} from './public-network-cache';
import {readLedgerDetails} from './ledger-inspection';
import {readLedgerValueOperands} from './ledger-value';

/** Upgrade retained display context without reviving withdrawn public objects. */
export function restorePublicNetworkRows(cache:PublicNetworkCache|null,seed:PublicNetworkCache|null){
 const held=new Map(cache?.records.map(row=>[row.id,row])??[]),seedRows=seed?.records??[],seedById=new Map(seedRows.map(row=>[row.id,row]));
 const allowedSeed=seedRows.filter(row=>!held.has(row.id)&&(!['graph','proofs'].includes(row.source)||!cache?.coverage.some(source=>source.source===row.source&&source.complete)));
 const enriched=(cache?.records??[]).map(row=>{
  const prior=seedById.get(row.id);if(!prior)return row;
  if(['entryHash','artifactDigest','proofHead'].some(key=>row.evidence[key]&&prior.evidence[key]&&row.evidence[key]!==prior.evidence[key]))return row;
  if(ledgerAssetTradeSide(row)||/transfer|send|payment_sent|payment_received/i.test(row.kind))return mergePublicRecords([prior],[row])[0];
  return {...row,details:readLedgerDetails({...prior.details,...row.details}),valueOperands:readLedgerValueOperands({...prior.valueOperands,...row.valueOperands})};
 });
 return mergePublicRecords(allowedSeed,enriched);
}
