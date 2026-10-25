export type OutcomeKey='agent'|'fraud'|'recover'|'get-paid'|'proof';
export interface OutcomePage {key:OutcomeKey;slug:string;path:string;outcome:true;title:string;description:string;lines:string[];eyebrow:string;headline:string[];lead:string;promise:string;visualLabels:string[];storyTitle:string[];storyLead:string;steps:string[][];results:string[][];detailTitle:string[];detail:string;related:string[][];faq:string[][];}
export const outcomePages:OutcomePage[];
