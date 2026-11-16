export type ProposalPage={proposalPage:'proposals'|'communication';slug:string;path:string;title:string;description:string;heading:string;intro:string;lines:string[];caption:string;sections:unknown[]};
export const proposalPages:ProposalPage[];
export const proposalQuestions:Record<ProposalPage['proposalPage'],Array<[string,string]>>;
export const proposalStages:Array<[string,string,string,string]>;
