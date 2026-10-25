export interface StandardPage {key:string;slug:string;path:string;standard:true;title:string;description:string;lines:string[];headline:string[];lead:string;labels:string[];sections:string[][];related:string[][];faq:string[][];action:string;href:string;}
export const standardPages:StandardPage[];
export const standardHierarchy:readonly (readonly string[])[];
