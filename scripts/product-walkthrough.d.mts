export const productPreviewCss:string;
export function productScreen(name:string,id?:string,example?:string):string;
export function productWalkthrough(options?:{kind?:string;id?:string;example?:string;compact?:boolean}):string;
export function productMoment(options?:{screen?:string;id?:string;example?:string;title?:string;body?:string;href?:string;label?:string}):string;

export function agentWorkflowMoment(options?:{id?:string;title?:string;body?:string}):string;

export function dailyMoneyWalkthrough(options?:{id?:string;keys?:string[];title?:string}):string;
