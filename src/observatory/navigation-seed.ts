import {combineLedgerSnapshot, publicLedgerProofSnapshot} from '../receiz/public-ledger-snapshot';
import {loadPublicNetworkSeed} from '../receiz/public-network-cache';
import {prepareShippedCatalog} from '../receiz/usePublicMarket';
import {preparePublicMarketDocumentSeed} from '../receiz/public-market-document-seed';
import {heldProofCatalog} from '../receiz/usePublicNetwork';
import {collectibleSealTimes} from './circulation-history';
import type {PublicLedgerDocumentSeed} from '../receiz/public-ledger-document-seed';

export type AnalyticsNavigationSeed = Pick<PublicLedgerDocumentSeed,'generation'|'locale'|'timeZone'> & {
  revision:string;publicProfileHeadsRevision:string;observedAt:string|null;
};

/** The complete HTML is already visible. Only attach its reader to the exact
 * shipped financial history and catalog; later public updates use the shared reader. */
export async function openAnalyticsNavigationSeed(frame:AnalyticsNavigationSeed):Promise<PublicLedgerDocumentSeed> {
  const catalog = async () => {
    const held = heldProofCatalog();
    if(held?.complete && held.revision===frame.revision && held.observedAt===frame.observedAt)return held;
    const carried = (await preparePublicMarketDocumentSeed())?.catalog;
    if(carried?.complete && carried.revision===frame.revision && carried.observedAt===frame.observedAt)return carried;
    return prepareShippedCatalog();
  };
  const [ledger,items] = await Promise.all([loadPublicNetworkSeed(),catalog()]);
  if(!ledger || !items.complete || items.revision!==frame.revision || items.observedAt!==frame.observedAt)
    throw Error('The saved Analytics data could not be opened.');
  const financial = {...ledger,records:ledger.records.filter(row=>row.source!=='proofs'),coverage:ledger.coverage.filter(row=>row.source!=='proofs')};
  const directory = {revision:frame.revision,observedAt:frame.observedAt,publicProfileHeadsRevision:frame.publicProfileHeadsRevision,
    publicProfileHeads:items.publicProfileHeads,publicProfileHeadRefusals:items.publicProfileHeadRefusals,
    ...(items.sportsCoverage==='complete'?{collectibleSealTimes:collectibleSealTimes(items)}:{})};
  return {schema:'bank.public-ledger.document.v1',path:'observatory',generation:frame.generation,locale:frame.locale,timeZone:frame.timeZone,
    directory,snapshot:combineLedgerSnapshot(financial,publicLedgerProofSnapshot(items,financial))};
}
