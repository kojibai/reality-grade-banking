export interface EconomyPage {key:string;slug:string;path:string;economy:true;intro:string;sections:never[];title:string;eyebrow:string;headline:string[];description:string;lead:string;has:string;needs:string;onward:string;art:string;cta:string;problem:string;situation:string;outcomes:[string,string][];requirements:string[];example:string[];prompt:string;prompts:string[];questions:[string,string][];related:string;relatedLabel:string;lines:string[]}
export const economyPeople:{key:string;label:string;application:string;theme:string;has:string;needs:string;next:string;onward:string;art:string}[];
export const economyPages:EconomyPage[];
export const economySuite:(EconomyPage|{key:string;path:string;title:string;label:string;description:string})[];
export function economyPageForPath(path:string):EconomyPage|undefined;
