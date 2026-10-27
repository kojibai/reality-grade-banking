export interface DailyMoneyMovement {person:string;amountUsdCents:string;memo:string;direction:'sent'|'received'}
export interface DailyMoneyStory {key:string;kind:'pay'|'collect'|'afford'|'insight';question:string;analysis:string;followup:string;prepared:string;authorization:string;initialBalanceCents:string;remainingBalanceCents:string;movements:DailyMoneyMovement[];steps:string[];statuses:string[];outcomeLabel:string;outcomeCaption:string;outcomeValue:string;finalReply:string;facts:{label:string;value:string}[];budget?:{availableCents:string;costCents:string;futureCents:string;remainingCents:string}}
export const dailyMoneyStories:Readonly<Record<string,DailyMoneyStory>>;
export const dailyMoneyKeys:readonly string[];
