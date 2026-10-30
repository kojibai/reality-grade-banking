import type {SigilMetadataLite} from '@receiz/sdk/valuation';
import type {PublicShareInventory,PublicShareContribution} from '../market-share-inventory';
export interface SigilQuoteCalculation{kind:'sigil';pulse:number;metadata:SigilMetadataLite;intrinsicPhi:number;roundedPhi:number;usdPerPhi:number;usdCents:string}
export interface SportsUnitCalculation{pulse:number;seed:string;base:number;birth:number;market:number;score:number;quoteMove:number;signal:number;wave:number;drift:number;trend:number;pressure:number;carry:number;value:number}
export interface SportsCopyCalculation{collectibleId:string;claimHash:string;sealedAt:string;birthUsd:number;valueUsd:number;branch:'before-seal'|'recorded-value'|'projected-model';observation?:{at:string;usdValue:number;pulse?:number};unit?:SportsUnitCalculation}
export interface SportsQuoteCalculation{kind:'collectible';pulse:number;quoteMove:number;unroundedUsd:number;roundedUsd:number;copies?:SportsCopyCalculation[];unit?:SportsUnitCalculation;proofTotalValueUsd?:number;baseUsdValue?:number}
export type MarketUnitCalculation=SigilQuoteCalculation|SportsQuoteCalculation;
export interface MarketQuoteMovementCalculation{pulse:number;currentUsdPerPhi:number;previousUsdPerPhi:number;movement:number}
export type MarketCalculationInventory=Omit<PublicShareInventory,'history'|'capitalizationHistory'>;
export interface GlobalMarketContribution extends Omit<PublicShareContribution,'item'>{id:string;assetId:string;title:string;category:string;copies:number;inventory?:MarketCalculationInventory;valuation?:MarketUnitCalculation}
export interface GlobalMarketCalculation{basisSha256?:string;pulse:number;sourceHash:string;generatedAt:string;usdCents:string;covered:number;listed:number;complete:boolean;outstandingShareQuantityMicro:string;quoteMovement?:MarketQuoteMovementCalculation;assets:GlobalMarketContribution[]}
export function marketCalculationMatches(value:GlobalMarketCalculation|null|undefined,source:{serverPulse:number;proofObjectHash:string;shareCapitalization?:{usdCents:string;covered:number;listed:number}},basisSha256?:string){
 return !!value&&value.pulse===source.serverPulse&&value.sourceHash===source.proofObjectHash&&value.usdCents===source.shareCapitalization?.usdCents&&value.covered===source.shareCapitalization.covered&&value.listed===source.shareCapitalization.listed&&(basisSha256===undefined||value.basisSha256===basisSha256);
}
