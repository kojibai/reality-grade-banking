import observation from './public-directory.json';
import type {PublicMarketCatalog} from '../receiz/public-market';
import {readPublicProfileHeads} from '../receiz/public-profile-header';
import type {ObservatoryDirectory} from '../receiz/public-ledger-document-seed';

let shipped:(PublicMarketCatalog & ObservatoryDirectory)|undefined;

/** The same anonymous cards and audience readings are available on every entrance. */
export function shippedObservatoryDirectory(){
  return shipped??={
    items:[],complete:false,sourceCount:0,revision:observation.observedAt,observedAt:null,
    publicProfileHeads:readPublicProfileHeads(observation.cards.map(profile=>({
      profile,viewer:{canView:true},unavailableDecorators:['profile-details'],
    }))),
    audience:{observedAt:observation.audience.observedAt,heads:readPublicProfileHeads(observation.audience.heads)},
  };
}
