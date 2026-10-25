export type DocsBlock =
 | {type:'paragraph';text:string}
 | {type:'list';items:string[]}
 | {type:'steps'|'flow';items:string[][];caption?:string}
 | {type:'table';caption:string;columns:string[];rows:string[][]}
 | {type:'note';title:string;text:string}
 | {type:'code';language:string;text:string;caption?:string}
 | {type:'links';items:string[][]};
export interface DocsArticle {slug:string;title:string;summary:string;group:string;sections:{title:string;blocks:DocsBlock[]}[];sources:string[][];related:string[];}
export const docsOrigin:string;
export const docsEdition:{reviewed:string;packages:string;ruleset:string;sourceRevision:string};
export const docsGroups:string[];
export const docsPaths:{title:string;summary:string;slugs:string[]}[];
export const docsArticles:DocsArticle[];
export function articleText(article:DocsArticle):string;
