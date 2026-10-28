export const guidePage:{guide:true;slug:string;path:string;title:string;description:string;lines:string[];caption:string;sections:[]};
export const guideGroups:readonly {id:string;title:string;summary:string}[];
export const guideTasks:readonly {id:string;group:string;slug:string;title:string;why:string;click:string;result:string;evidence:string}[];
export function guideArticleUrl(slug:string):string;
export const guideManualPaths:{id:string;title:string;summary:string;slugs:string[];articles:{slug:string;title:string;summary:string;url:string}[]}[];
