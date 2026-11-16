export type ClientWorkProductPage={
 clientWorkProduct:true;slug:string;path:string;title:string;description:string;heading:string;intro:string;
 intent:'invoice'|'management';scenarioId:string;lines:string[];caption:string;
 sections:{title:string;body:string}[];questions:[string,string][];
};
export const clientWorkProductPages:ClientWorkProductPage[];
