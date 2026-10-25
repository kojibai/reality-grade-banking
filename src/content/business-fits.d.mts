export interface BusinessFit {slug:string;label:string;group:string;story:string;headline:string;description:string;pain:string;scenario:string;question:string;benefits:[string,string][];steps:string[];visualLabels:string[]}
export const businessFits:BusinessFit[];
export const fitGroups:{id:string;label:string}[];
export const fitGoals:{id:string;label:string}[];
export const directoryPage:{slug:string;path:string;title:string;description:string;intro:string;sections:never[]};
export const businessFitPages:(typeof directoryPage & {fit:BusinessFit})[];

export function businessFitStart(fit:BusinessFit):{title:string;question:string;hint:string};
