export type DemonstrationTransition={id:string;predecessor:string;sender:string;recipient:string;amountCents:number;acceptedInDemonstration:true};
export type DemonstrationState={initialCents:number;step:number;balances:Record<string,number>;transitions:DemonstrationTransition[]};
export function formatMoney(cents:number):string;
export const economyPeople:readonly Readonly<{id:string;name:string;app:string}>[];
export function economyState(step:number):DemonstrationState;
export function chainState(step:number):DemonstrationState;
export const comparisonSteps:readonly Readonly<{title:string;provider:string;native:string;difference:string;providerState:string;nativeState:string}>[];
export const evidenceLayers:readonly Readonly<{key:string;title:string;description:string;binding:string;contract:string}>[];
export const emailSteps:readonly Readonly<{title:string;caption:string}>[];
