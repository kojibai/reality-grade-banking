export interface CooperativeSector {slug:string;label:string;short:string;art:string;headline:string;description:string;pain:string;produces:string;needs:string;partners:string;claim:string;payment:string;settlement:string;fiat:string;requirements:string[];capabilities:[string,string][];exchange:string;question:string;metric:string}
export const cooperativeSectors:CooperativeSector[];
export interface CommercialObject {id:string;label:string;art:string;identity:string;origin:string;evidence:string;owner:string;authority:string;history:string;valuation:string;basis:string;action:string}
export const commercialObjects:CommercialObject[];
export const networkMembers:{id:string;label:string;art:string;has:string;needs:string;partners:string;rights:string;payments:string;settlement:string;fiat:string}[];
export interface CooperativePage {slug:string;path:string;title:string;description:string;intro:string;sections:never[];cooperativeKind:string}
export const cooperativePages:CooperativePage[];
