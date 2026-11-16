export type ClientWorkDemoOptions={scenarioId?:string;intent?:'proposal'|'invoice'|'document'|'agreement'|'communication'|'management';id?:string;title?:string;body?:string};
export const clientWorkDemoCss:string;
export function clientWorkDemo(options?:ClientWorkDemoOptions):string;
