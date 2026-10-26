export interface MoneyExample {balanceCents:string;question:string;answer:string;followup:string;followupAnswer:string}
export const moneyExamples:Readonly<Record<string,MoneyExample>>;
export function moneyExample(key?:string):MoneyExample;
