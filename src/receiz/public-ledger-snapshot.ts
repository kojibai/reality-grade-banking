import {mergePublicRecords, publicMarketRecord} from './public-network';
import type {PublicNetworkCache} from './public-network-cache';
import type {PublicMarketCatalog} from './public-market';

/** The saved Ledger and its navigation handoff use the same two public operands. */
export function publicLedgerProofSnapshot(catalog:PublicMarketCatalog, financial:PublicNetworkCache):PublicNetworkCache {
  const records = catalog.items.filter(item=>item.category==='proof').map(publicMarketRecord);
  const observedAt = Date.parse(catalog.observedAt ?? '');
  return {records, capturedAt:catalog.observedAt ?? financial.capturedAt, inspectionVersion:financial.inspectionVersion,
    coverage:[{source:'proofs', complete:catalog.complete, anchorIds:records.map(row=>row.id), ...(Number.isFinite(observedAt)?{observedAt}:{})}]};
}

export function combineLedgerSnapshot(financial:PublicNetworkCache, proofs:PublicNetworkCache):PublicNetworkCache {
  const capturedAt = [financial.capturedAt,proofs.capturedAt].filter((time):time is string=>time!==null).sort((a,b)=>Date.parse(b)-Date.parse(a))[0]??null;
  return {...proofs,capturedAt,records:mergePublicRecords(financial.records,proofs.records),coverage:[...financial.coverage,...proofs.coverage]};
}
