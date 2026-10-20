export interface LearningPage {slug:string;path?:string;group:string;title:string;description:string;intro:string;visual:string;sections:[string,string][];related:string[];}
export const learningPages:LearningPage[];
export const learningGroups:string[];
export function learningPath(page:Pick<LearningPage,'slug'|'path'>):string;
export const assetCategories:{label:string;slug:string;description:string;path:string}[];
